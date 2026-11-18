-- KyoWidgets · IA de AletaBot (fase 3: juegos con el chat)
-- Pega esto en Supabase > SQL Editor > New query > Run. Necesita 09_ia.sql (ya ejecutado).
--
-- Trivia, adivinanzas e historia colectiva. El estado del juego en marcha se guarda en la tabla
-- kyo_ajustes que ya tienes (fila "juego"). Estas tablas guardan el banco de preguntas, los puntos
-- y las historias terminadas. RLS activado y NINGUNA política: solo las Edge Functions pueden usarlas.

-- Banco de preguntas (trivia y adivinanzas). Las genera Claude desde el Estudio y tú las apruebas.
create table if not exists public.kyo_banco (
  id          bigint generated always as identity primary key,
  tipo        text not null,                       -- 'trivia' | 'adivinanza'
  categoria   text not null default '',
  pregunta    text not null,
  respuestas  jsonb not null default '[]'::jsonb,  -- la primera es la que se anuncia; las demás, otras formas válidas
  pista       text not null default '',
  estado      text not null default 'pendiente',   -- 'pendiente' (sin revisar) | 'activa' (se puede usar)
  usos        int not null default 0,
  ultima      timestamptz,
  creada      timestamptz not null default now()
);
alter table public.kyo_banco enable row level security;
create index if not exists kyo_banco_tipo on public.kyo_banco (tipo, estado, usos);

-- Puntos de cada persona (suma de todas las partidas)
create table if not exists public.kyo_puntos (
  user_id      text primary key,
  nombre       text not null default '',
  puntos       int not null default 0,
  actualizado  timestamptz not null default now()
);
alter table public.kyo_puntos enable row level security;
create index if not exists kyo_puntos_top on public.kyo_puntos (puntos desc);

-- Historias colectivas terminadas (para verlas en el Estudio)
create table if not exists public.kyo_historia (
  id       bigint generated always as identity primary key,
  ts       timestamptz not null default now(),
  tema     text not null default '',
  texto    text not null,
  autores  jsonb not null default '[]'::jsonb
);
alter table public.kyo_historia enable row level security;

-- Esperas de los comandos de los juegos (!puntos, !top, empezar partida)
create table if not exists public.kyo_juego_espera (
  clave   text primary key,
  ultimo  timestamptz not null default now()
);
alter table public.kyo_juego_espera enable row level security;

-- true si ya pasó la espera de esa clave (y la vuelve a poner en marcha); false si aún no
create or replace function public.kyo_juego_turno(p_clave text, p_seg int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare quien text;
begin
  insert into kyo_juego_espera (clave, ultimo) values (p_clave, now())
  on conflict (clave) do update set ultimo = now()
    where kyo_juego_espera.ultimo <= now() - make_interval(secs => greatest(p_seg, 0))
  returning clave into quien;
  return quien is not null;
end;
$$;

-- Saca p_n preguntas aprobadas al azar, primero las menos usadas, y las marca como usadas
create or replace function public.kyo_banco_tomar(p_tipo text, p_categoria text, p_n int)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with elegidas as (
    select id from kyo_banco
     where tipo = p_tipo and estado = 'activa' and (p_categoria = '' or categoria = p_categoria)
     order by usos, random()
     limit greatest(least(p_n, 15), 0)
  ), marcadas as (
    update kyo_banco b set usos = usos + 1, ultima = now()
      from elegidas e where b.id = e.id
    returning b.id, b.pregunta, b.respuestas, b.pista
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'pregunta', pregunta, 'respuestas', respuestas, 'pista', pista) order by random()), '[]'::jsonb)
    from marcadas;
$$;

-- Un paso del juego en marcha, seguro aunque lleguen varios mensajes a la vez: solo el primero se lo lleva.
-- Todos exigen que el juego siga activo y que la ronda sea p_ronda (así un aviso atrasado no toca la ronda siguiente).
--   'acierto'  alguien acertó: cierra la ronda, le suma un punto (partida y total). Devuelve {ok, puntos, total}
--   'tiempo'   se acabó el tiempo: cierra la ronda
--   'pista'    toca dar la pista (una sola vez por ronda)
--   'rescate'  la ronda se cerró hace más de p_valor segundos y nadie siguió: quien llama se encarga de seguir
--   'aporte'   historia colectiva: guarda la frase de p_user (una por persona y tramo). Devuelve {ok, n}
-- Devuelve {ok:false} si ya lo hizo otro o no toca.
create or replace function public.kyo_juego_paso(p_ronda int, p_paso text, p_user text, p_nombre text, p_valor text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb;
  pts int;
  tot int;
  lista jsonb;
begin
  select datos into j from kyo_ajustes where id = 'juego' for update;
  if j is null or j->>'estado' <> 'activo' or (j->>'ronda')::int <> p_ronda then
    return jsonb_build_object('ok', false);
  end if;

  if p_paso = 'rescate' then
    if not coalesce((j->>'resuelta')::boolean, false) or coalesce((j->>'rescatada')::boolean, false)
       or nullif(j->>'resueltaEn', '') is null
       or (j->>'resueltaEn')::timestamptz > now() - make_interval(secs => greatest(coalesce(nullif(p_valor, '')::int, 30), 5)) then
      return jsonb_build_object('ok', false);
    end if;
    update kyo_ajustes set datos = j || jsonb_build_object('rescatada', true), updated_at = now() where id = 'juego';
    return jsonb_build_object('ok', true);
  end if;

  if coalesce((j->>'resuelta')::boolean, false) then
    return jsonb_build_object('ok', false);
  end if;

  if p_paso = 'pista' then
    if coalesce((j->>'pistaDada')::boolean, false) then return jsonb_build_object('ok', false); end if;
    update kyo_ajustes set datos = j || jsonb_build_object('pistaDada', true), updated_at = now() where id = 'juego';
    return jsonb_build_object('ok', true);
  end if;

  if p_paso = 'tiempo' then
    update kyo_ajustes set datos = j || jsonb_build_object('resuelta', true, 'resueltaEn', now(), 'rescatada', false), updated_at = now() where id = 'juego';
    return jsonb_build_object('ok', true);
  end if;

  if p_paso = 'acierto' then
    pts := coalesce((j->'marcador'->p_user->>'p')::int, 0) + 1;
    j := jsonb_set(j, array['marcador'], coalesce(j->'marcador', '{}'::jsonb) || jsonb_build_object(p_user, jsonb_build_object('n', p_nombre, 'p', pts)));
    update kyo_ajustes set datos = j || jsonb_build_object('resuelta', true, 'resueltaEn', now(), 'rescatada', false), updated_at = now() where id = 'juego';
    insert into kyo_puntos (user_id, nombre, puntos) values (p_user, p_nombre, 1)
    on conflict (user_id) do update set puntos = kyo_puntos.puntos + 1, nombre = p_nombre, actualizado = now()
    returning puntos into tot;
    return jsonb_build_object('ok', true, 'puntos', pts, 'total', tot);
  end if;

  if p_paso = 'aporte' then
    -- una frase por persona y tramo: si repite, se cambia la suya
    select coalesce(jsonb_agg(a), '[]'::jsonb) into lista
      from jsonb_array_elements(coalesce(j->'aportes', '[]'::jsonb)) a where a->>'u' <> p_user;
    if jsonb_array_length(lista) >= 8 then return jsonb_build_object('ok', false, 'n', jsonb_array_length(lista)); end if;
    lista := lista || jsonb_build_array(jsonb_build_object('u', p_user, 'n', p_nombre, 't', left(p_valor, 140)));
    update kyo_ajustes set datos = j || jsonb_build_object('aportes', lista), updated_at = now() where id = 'juego';
    return jsonb_build_object('ok', true, 'n', jsonb_array_length(lista));
  end if;

  return jsonb_build_object('ok', false);
end;
$$;

-- Los puntos y el puesto de una persona
create or replace function public.kyo_puntos_de(p_user text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'puntos', coalesce((select puntos from kyo_puntos where user_id = p_user), 0),
    'puesto', (select count(*) + 1 from kyo_puntos where puntos > coalesce((select puntos from kyo_puntos where user_id = p_user), 0)));
$$;

-- Limpieza (se ejecuta sola al empezar cada directo): esperas viejas e historias de más de un año
create or replace function public.kyo_juego_limpiar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from kyo_juego_espera where ultimo < now() - interval '1 day';
  delete from kyo_historia where ts < now() - interval '365 days';
$$;

-- Solo las funciones de Supabase (service role) pueden usarlas
revoke all on function public.kyo_juego_turno(text, int) from public, anon, authenticated;
revoke all on function public.kyo_banco_tomar(text, text, int) from public, anon, authenticated;
revoke all on function public.kyo_juego_paso(int, text, text, text, text) from public, anon, authenticated;
revoke all on function public.kyo_puntos_de(text) from public, anon, authenticated;
revoke all on function public.kyo_juego_limpiar() from public, anon, authenticated;
