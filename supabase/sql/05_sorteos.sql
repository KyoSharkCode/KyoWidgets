-- KyoWidgets · Sorteos de AletaBot
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- El estado del sorteo (premio, abierto o cerrado, ganador…) y sus opciones se guardan
-- en la tabla kyo_ajustes que ya tienes (filas "sorteo" y "sorteo_ajustes").
-- Esta tabla guarda quién participa en cada sorteo ("ronda"). Cada persona entra una sola
-- vez por ronda aunque escriba !participar muchas veces o lo hagan cien a la vez.

create table if not exists public.kyo_sorteo (
  ronda   int  not null,
  login   text not null,
  nombre  text not null,
  sub     boolean not null default false,
  ts      timestamptz not null default now(),
  primary key (ronda, login)
);
alter table public.kyo_sorteo enable row level security;
create index if not exists kyo_sorteo_ronda_ts on public.kyo_sorteo (ronda, ts desc);
