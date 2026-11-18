-- KyoWidgets · IA de AletaBot (fase 2: memoria de viewers)
-- Pega esto en Supabase > SQL Editor > New query > Run. Necesita 09_ia.sql (ya ejecutado).
--
-- Un perfil pequeño por persona del chat: nombre, cómo prefiere que la llamen, primera visita,
-- en cuántos directos ha estado y hasta 3 datos que ella misma le ha contado a AletaBot.
-- RLS activado y NINGUNA política: solo las Edge Functions pueden leerla o escribirla.
-- Los perfiles de quien lleva un año sin venir se borran solos.

create table if not exists public.kyo_viewer (
  user_id           text primary key,                    -- el id de Twitch (no cambia aunque cambie el nombre)
  login             text not null default '',
  nombre            text not null default '',
  apodo             text,                                -- cómo prefiere que la llamen
  primera           timestamptz not null default now(),  -- primera visita
  ultima            timestamptz not null default now(),
  directos          int not null default 0,              -- en cuántos directos ha escrito
  ultimo_directo    text,                                -- el último directo que se le contó
  saludado          text,                                -- el último directo en el que ya se resolvió su saludo
  saludo_pendiente  text,                                -- directo en el que espera turno para ser saludada
  datos             jsonb not null default '[]'::jsonb,  -- hasta 3 frases cortas
  no_recordar       boolean not null default false,      -- pidió !olvidame: no se guarda nada de ella
  ultimo_comando    timestamptz                          -- para la espera entre comandos de memoria
);
alter table public.kyo_viewer enable row level security;
create index if not exists kyo_viewer_ultima on public.kyo_viewer (ultima desc);
create index if not exists kyo_viewer_pendiente on public.kyo_viewer (saludo_pendiente) where saludo_pendiente is not null;

-- El directo recuerda cuándo fue el último saludo y cuántos lleva
alter table public.kyo_directo add column if not exists ultimo_saludo timestamptz;
alter table public.kyo_directo add column if not exists saludos int not null default 0;

-- Alguien escribe en el chat durante un directo. Cuenta su visita (una vez por directo) y decide el saludo.
--   p_saludar  false = no saludar a esta persona ahora (saludos apagados, es Kyo, o ya le está hablando a AletaBot)
--   p_desde    a partir de cuántos directos alguien cuenta como habitual
--   p_espera   segundos como mínimo entre dos saludos
--   p_tope     saludos como máximo en un directo
-- Devuelve {perfil, nuevo, resuelto, saludar}:
--   perfil    lo que se recuerda de la persona (null si pidió !olvidame)
--   nuevo     true si es su primer mensaje de este directo
--   resuelto  true si ya no hay nada pendiente con ella en este directo
--   saludar   a quién saludar AHORA en un solo mensaje (ella y, si los hay, otros habituales que esperaban turno)
create or replace function public.kyo_viewer_visita(
  p_user text, p_login text, p_nombre text, p_directo text,
  p_saludar boolean, p_desde int, p_espera int, p_tope int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d kyo_directo;
  v kyo_viewer;
  nuevo boolean;
  resuelto boolean := true;
  lista jsonb := '[]'::jsonb;
begin
  -- El directo se bloquea primero: así dos mensajes a la vez no saludan dos veces
  insert into kyo_directo (id) values (p_directo) on conflict (id) do nothing;
  select * into d from kyo_directo where id = p_directo for update;

  insert into kyo_viewer (user_id, login, nombre) values (p_user, p_login, p_nombre) on conflict (user_id) do nothing;
  select * into v from kyo_viewer where user_id = p_user for update;
  if v.no_recordar then
    return jsonb_build_object('perfil', null, 'nuevo', false, 'resuelto', true, 'saludar', '[]'::jsonb);
  end if;

  nuevo := v.ultimo_directo is distinct from p_directo;
  update kyo_viewer
     set login = p_login, nombre = p_nombre, ultima = now(),
         directos = directos + case when nuevo then 1 else 0 end,
         ultimo_directo = p_directo
   where user_id = p_user
  returning * into v;

  if v.saludado is distinct from p_directo then
    if not p_saludar or v.directos < p_desde or d.saludos >= p_tope then
      -- no toca saludo: queda resuelto para este directo
      update kyo_viewer set saludado = p_directo, saludo_pendiente = null where user_id = p_user;
    elsif d.ultimo_saludo is null or d.ultimo_saludo <= now() - make_interval(secs => greatest(p_espera, 0)) then
      -- se saluda ahora: a esta persona y a quien estuviera esperando turno (4 como mucho)
      update kyo_viewer set saludo_pendiente = p_directo where user_id = p_user;
      with elegidos as (
        select user_id from kyo_viewer
         where saludo_pendiente = p_directo and not no_recordar
         order by (user_id = p_user) desc, ultima
         limit 4
      ), marcados as (
        update kyo_viewer k set saludado = p_directo, saludo_pendiente = null
          from elegidos e where k.user_id = e.user_id
        returning k.nombre, k.apodo, k.directos, k.primera, k.datos, (k.user_id = p_user) as yo
      )
      select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'apodo', apodo, 'directos', directos, 'primera', primera, 'datos', datos) order by yo desc), '[]'::jsonb)
        into lista from marcados;
      update kyo_directo set ultimo_saludo = now(), saludos = saludos + 1 where id = p_directo;
    else
      -- hubo un saludo hace un momento: espera turno (se saludará junto al siguiente habitual, o con su próximo mensaje)
      update kyo_viewer set saludo_pendiente = p_directo where user_id = p_user;
      resuelto := false;
    end if;
  end if;

  return jsonb_build_object(
    'perfil', jsonb_build_object('nombre', v.nombre, 'apodo', v.apodo, 'directos', v.directos, 'primera', v.primera, 'datos', v.datos),
    'nuevo', nuevo, 'resuelto', resuelto, 'saludar', lista);
end;
$$;

-- Comandos de memoria del chat. p_orden: 'ver' | 'olvidar' | 'recordar' | 'apodo' | 'turno'.
-- Devuelve {estado, perfil}. estado: 'ok', 'espera' (escribió otro comando hace nada) o 'sin_memoria' (pidió !olvidame).
create or replace function public.kyo_viewer_orden(
  p_user text, p_login text, p_nombre text, p_orden text, p_valor text, p_espera int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v kyo_viewer;
  pronto boolean;
  ya boolean;
begin
  select * into v from kyo_viewer where user_id = p_user for update;
  pronto := found and p_espera > 0 and v.ultimo_comando is not null
            and v.ultimo_comando > now() - make_interval(secs => p_espera);

  if p_orden = 'olvidar' then
    -- Borrar se hace SIEMPRE. Se borra todo y solo queda la marca de "no guardar nada de esta persona".
    -- (Si ya estaba borrado y lo repite enseguida, devuelve 'espera' para que AletaBot no conteste otra vez.)
    ya := found and v.no_recordar and pronto;
    insert into kyo_viewer (user_id, no_recordar, ultimo_comando) values (p_user, true, now())
    on conflict (user_id) do update
      set login = '', nombre = '', apodo = null, datos = '[]'::jsonb, directos = 0,
          ultimo_directo = null, saludado = null, saludo_pendiente = null,
          primera = now(), ultima = now(), no_recordar = true, ultimo_comando = now();
    delete from kyo_ia_hilo where user_id = p_user;
    return jsonb_build_object('estado', case when ya then 'espera' else 'ok' end);
  end if;

  if pronto then
    return jsonb_build_object('estado', 'espera');
  end if;

  if p_orden = 'recordar' then
    insert into kyo_viewer (user_id, login, nombre, ultimo_comando) values (p_user, p_login, p_nombre, now())
    on conflict (user_id) do update
      set no_recordar = false, login = p_login, nombre = p_nombre, ultimo_comando = now();
    return jsonb_build_object('estado', 'ok');
  end if;

  -- ver, apodo y turno: no crean perfil a quien pidió que no se guardara nada
  if found and v.no_recordar then
    update kyo_viewer set ultimo_comando = now() where user_id = p_user;
    return jsonb_build_object('estado', 'sin_memoria');
  end if;

  insert into kyo_viewer (user_id, login, nombre, ultimo_comando) values (p_user, p_login, p_nombre, now())
  on conflict (user_id) do update set ultimo_comando = now();
  if p_orden = 'apodo' then
    update kyo_viewer set apodo = nullif(left(p_valor, 20), '') where user_id = p_user;
  end if;
  select * into v from kyo_viewer where user_id = p_user;
  return jsonb_build_object('estado', 'ok',
    'perfil', jsonb_build_object('nombre', v.nombre, 'apodo', v.apodo, 'directos', v.directos, 'primera', v.primera, 'datos', v.datos));
end;
$$;

-- Limpieza (se ejecuta sola al empezar cada directo): perfiles de quien no viene desde hace un año
create or replace function public.kyo_viewer_limpiar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from kyo_viewer where ultima < now() - interval '365 days' and not no_recordar;
$$;

-- Solo las funciones de Supabase (service role) pueden usarlas
revoke all on function public.kyo_viewer_visita(text, text, text, text, boolean, int, int, int) from public, anon, authenticated;
revoke all on function public.kyo_viewer_orden(text, text, text, text, text, int) from public, anon, authenticated;
revoke all on function public.kyo_viewer_limpiar() from public, anon, authenticated;
