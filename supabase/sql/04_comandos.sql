-- KyoWidgets · Comandos del chat de AletaBot
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- La lista de comandos se guarda en la tabla kyo_ajustes que ya tienes (fila id = 'comandos').
-- Esta tabla guarda los contadores ($(count)) y la última vez que se usó cada comando,
-- para la espera entre usos (cooldown).

create table if not exists public.kyo_contadores (
  nombre  text primary key,
  valor   bigint not null default 0,
  ultimo  timestamptz
);
alter table public.kyo_contadores enable row level security;

-- Usa un comando de forma segura aunque lo escriban dos personas a la vez:
-- devuelve el contador nuevo, o -1 si el comando aún está en espera.
create or replace function public.kyo_usar(p_nombre text, p_espera int, p_sumar boolean)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  insert into kyo_contadores (nombre) values (p_nombre) on conflict (nombre) do nothing;
  update kyo_contadores
     set valor = valor + case when p_sumar then 1 else 0 end,
         ultimo = now()
   where nombre = p_nombre
     and (ultimo is null or ultimo <= now() - make_interval(secs => greatest(p_espera, 0)))
  returning valor into v;
  return coalesce(v, -1);
end;
$$;

-- Solo las funciones de Supabase (service role) pueden usarla
revoke all on function public.kyo_usar(text, int, boolean) from public, anon, authenticated;
