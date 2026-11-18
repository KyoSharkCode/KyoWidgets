-- KyoWidgets · IA de AletaBot (fase 1: menciones y conversación)
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- Los ajustes y la personalidad se guardan en la tabla kyo_ajustes que ya tienes
-- (filas "ia", "ia_personalidad", "directo" e "ia_error"). Estas tablas nuevas guardan
-- las conversaciones cortas, las esperas por persona y el registro de tokens gastados.
-- Todas tienen RLS activado y NINGUNA política: solo las Edge Functions pueden usarlas.

-- Un registro por directo (o por día, fuera de directo): cuántas veces ha contestado la IA
create table if not exists public.kyo_directo (
  id          text primary key,
  inicio      timestamptz not null default now(),
  respuestas  int not null default 0,
  aviso_tope  boolean not null default false
);
alter table public.kyo_directo enable row level security;

-- La última vez que la IA atendió a cada persona (para la espera entre mensajes)
create table if not exists public.kyo_ia_turno (
  user_id  text primary key,
  ultimo   timestamptz not null default now()
);
alter table public.kyo_ia_turno enable row level security;

-- La conversación en curso con cada persona (solo los últimos turnos; se borra sola al día siguiente)
create table if not exists public.kyo_ia_hilo (
  user_id      text primary key,
  nombre       text not null default '',
  turnos       jsonb not null default '[]'::jsonb,
  seguidos     int not null default 0,
  actualizado  timestamptz not null default now()
);
alter table public.kyo_ia_hilo enable row level security;

-- Registro de uso: una fila por llamada a Claude, con sus tokens y su coste estimado en USD
create table if not exists public.kyo_ia_uso (
  id               bigint generated always as identity primary key,
  ts               timestamptz not null default now(),
  directo          text not null,
  tarea            text not null,
  modelo           text not null,
  entrada          int not null default 0,
  salida           int not null default 0,
  cache_lectura    int not null default 0,
  cache_escritura  int not null default 0,
  coste            numeric(12,6) not null default 0
);
alter table public.kyo_ia_uso enable row level security;
create index if not exists kyo_ia_uso_ts on public.kyo_ia_uso (ts desc);
create index if not exists kyo_ia_uso_directo on public.kyo_ia_uso (directo);

-- Mensajes que el filtro marcó como problemáticos (se ven en Kyo Estudio → 🧠 IA)
create table if not exists public.kyo_ia_aviso (
  id       bigint generated always as identity primary key,
  ts       timestamptz not null default now(),
  usuario  text not null,
  texto    text not null,
  motivo   text not null,
  grave    boolean not null default false
);
alter table public.kyo_ia_aviso enable row level security;

-- ¿Puede la IA atender ahora a esta persona? Seguro aunque escriban varios a la vez.
--   'ok'       → adelante (y empieza a contar su espera)
--   'espera'   → esa persona tiene que esperar un poco más
--   'tope'     → se acabó el tope del directo (solo la primera vez, para avisar en el chat)
--   'tope_ya'  → se acabó el tope y ya se avisó
create or replace function public.kyo_ia_permiso(p_user text, p_directo text, p_espera int, p_tope int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  avisado boolean;
  quien text;
begin
  insert into kyo_directo (id) values (p_directo) on conflict (id) do nothing;
  select respuestas, aviso_tope into n, avisado from kyo_directo where id = p_directo for update;
  if n >= p_tope then
    if avisado then return 'tope_ya'; end if;
    update kyo_directo set aviso_tope = true where id = p_directo;
    return 'tope';
  end if;
  insert into kyo_ia_turno (user_id, ultimo) values (p_user, now())
  on conflict (user_id) do update set ultimo = now()
    where kyo_ia_turno.ultimo <= now() - make_interval(secs => greatest(p_espera, 0))
  returning user_id into quien;
  if quien is null then return 'espera'; end if;
  return 'ok';
end;
$$;

-- Suma una respuesta al directo (cuando AletaBot ya la escribió en el chat)
create or replace function public.kyo_ia_contar(p_directo text)
returns int
language sql
security definer
set search_path = public
as $$
  update kyo_directo set respuestas = respuestas + 1 where id = p_directo returning respuestas;
$$;

-- Gasto estimado del mes en curso, en USD
create or replace function public.kyo_ia_gasto_mes()
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(coste), 0) from kyo_ia_uso where ts >= date_trunc('month', now());
$$;

-- Resumen para el Estudio: gasto del mes y los últimos 20 directos con sus tokens
create or replace function public.kyo_ia_resumen()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'mes', (select coalesce(sum(coste), 0) from kyo_ia_uso where ts >= date_trunc('month', now())),
    'directos', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.ultimo desc)
      from (
        select directo as id, min(ts) as inicio, max(ts) as ultimo,
               count(*) filter (where tarea = 'chat') as respuestas,
               count(*) as llamadas,
               sum(entrada) as entrada, sum(salida) as salida,
               sum(cache_lectura) as cache_lectura, sum(cache_escritura) as cache_escritura,
               sum(coste) as coste
        from kyo_ia_uso
        group by directo
        order by max(ts) desc
        limit 20
      ) x
    ), '[]'::jsonb)
  );
$$;

-- Limpieza (se ejecuta sola al empezar cada directo): conversaciones y esperas de más de un día,
-- avisos de más de 60 días y registros de uso de más de 400 días.
create or replace function public.kyo_ia_limpiar()
returns void
language sql
security definer
set search_path = public
as $$
  delete from kyo_ia_hilo where actualizado < now() - interval '1 day';
  delete from kyo_ia_turno where ultimo < now() - interval '1 day';
  delete from kyo_ia_aviso where ts < now() - interval '60 days';
  delete from kyo_ia_uso where ts < now() - interval '400 days';
  delete from kyo_directo where inicio < now() - interval '400 days';
$$;

-- Solo las funciones de Supabase (service role) pueden usarlas
revoke all on function public.kyo_ia_permiso(text, text, int, int) from public, anon, authenticated;
revoke all on function public.kyo_ia_contar(text) from public, anon, authenticated;
revoke all on function public.kyo_ia_gasto_mes() from public, anon, authenticated;
revoke all on function public.kyo_ia_resumen() from public, anon, authenticated;
revoke all on function public.kyo_ia_limpiar() from public, anon, authenticated;
