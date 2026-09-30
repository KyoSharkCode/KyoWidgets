-- KyoWidgets · Encuestas de AletaBot
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- El estado de la encuesta (pregunta, opciones, abierta o cerrada…) se guarda en la tabla
-- kyo_ajustes que ya tienes (filas "encuesta" y "encuesta_ajustes").
-- Esta tabla guarda los votos: uno por persona y encuesta ("ronda"). Si alguien vota otra
-- vez, se cambia su voto (no suma dos).

create table if not exists public.kyo_voto (
  ronda   int  not null,
  login   text not null,
  opcion  int  not null,
  ts      timestamptz not null default now(),
  primary key (ronda, login)
);
alter table public.kyo_voto enable row level security;

-- Recuento de una encuesta: votos por opción
create or replace function public.kyo_votos(p_ronda int)
returns table (opcion int, votos bigint)
language sql
stable
security definer
set search_path = public
as $$
  select opcion, count(*) from kyo_voto where ronda = p_ronda group by opcion;
$$;

-- Solo las funciones de Supabase (service role) pueden usarla
revoke all on function public.kyo_votos(int) from public, anon, authenticated;
