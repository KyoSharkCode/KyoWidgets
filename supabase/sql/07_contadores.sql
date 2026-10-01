-- KyoWidgets · Contadores personalizados (muertes, rage quits, lo que quieras)
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- La lista de contadores (nombre e icono) se guarda en kyo_ajustes (fila id = 'contadores')
-- y la clave del Stream Deck en la fila 'contadores_token'.
-- Los valores usan la tabla kyo_contadores de los comandos de AletaBot, con el prefijo
-- "contador:" para no mezclarse con los $(count) de los comandos.

create table if not exists public.kyo_contadores (
  nombre  text primary key,
  valor   bigint not null default 0,
  ultimo  timestamptz
);
alter table public.kyo_contadores enable row level security;

-- Suma, resta o fija un contador de forma segura aunque pulses el Stream Deck muy rápido.
-- Nunca baja de 0. Devuelve el valor nuevo.
create or replace function public.kyo_contador(p_nombre text, p_delta bigint, p_fijar bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  insert into kyo_contadores (nombre) values (p_nombre) on conflict (nombre) do nothing;
  update kyo_contadores
     set valor = least(999999999, greatest(0, case when p_fijar is not null then p_fijar else valor + p_delta end)),
         ultimo = now()
   where nombre = p_nombre
  returning valor into v;
  return v;
end;
$$;

-- Solo las funciones de Supabase (service role) pueden usarla
revoke all on function public.kyo_contador(text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.kyo_contador(text, bigint, bigint) to service_role;
