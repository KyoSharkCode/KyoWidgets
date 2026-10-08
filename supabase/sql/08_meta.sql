-- KyoWidgets · Meta de donaciones (lee los tips de StreamElements y guarda el total en Supabase)
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- Los ajustes (título, meta, moneda, fecha de inicio, ajuste manual) viven en kyo_ajustes (fila id = 'meta').
-- Cada donación se guarda UNA vez (por su id de StreamElements), así que nunca se cuenta doble
-- y el total no se pierde aunque reinicies OBS o el widget.

create table if not exists public.kyo_meta_tips (
  id       text primary key,          -- _id del tip en StreamElements
  monto    numeric not null,
  moneda   text not null default 'EUR',
  donante  text,
  mensaje  text,
  fecha    timestamptz not null default now()
);
create index if not exists kyo_meta_tips_fecha on public.kyo_meta_tips (fecha);
alter table public.kyo_meta_tips enable row level security;

-- Suma de las donaciones de una moneda desde una fecha
create or replace function public.kyo_meta_total(p_desde timestamptz, p_moneda text)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(monto), 0) from kyo_meta_tips where fecha >= p_desde and upper(moneda) = upper(p_moneda);
$$;

-- Solo las funciones de Supabase (service role) pueden usarla
revoke all on function public.kyo_meta_total(timestamptz, text) from public, anon, authenticated;
grant execute on function public.kyo_meta_total(timestamptz, text) to service_role;
