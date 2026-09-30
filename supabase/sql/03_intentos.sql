-- KyoWidgets · límite de intentos del código de acceso
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- Cada conexión tiene 3 intentos. Al fallar el 3.º queda bloqueada 15 min;
-- si vuelve a fallar 3 veces tras el bloqueo, el siguiente dura el doble (hasta 24 h).
-- Además, si entre todas las conexiones hay 20 fallos en una hora, se bloquea todo 1 hora.
-- Acertar el código borra los fallos de esa conexión.

create table if not exists public.kyo_intentos (
  ip          text primary key,
  fallos      int not null default 0,
  nivel       int not null default 0,
  hasta       timestamptz,
  desde       timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

-- RLS activado y NINGUNA política: solo las Edge Functions (service role) la tocan.
alter table public.kyo_intentos enable row level security;

-- Cuenta un intento ANTES de comprobar el código (así no se puede saltar
-- enviando muchos a la vez). Devuelve si está bloqueado y cuántos quedan.
create or replace function public.kyo_intento(p_ip text)
returns jsonb language plpgsql set search_path = public as $$
declare
  g kyo_intentos; r kyo_intentos; ahora timestamptz := now(); espera int := 0;
begin
  delete from kyo_intentos where actualizado < ahora - interval '2 days' and ip <> '*';
  insert into kyo_intentos(ip) values ('*') on conflict do nothing;
  insert into kyo_intentos(ip) values (p_ip) on conflict do nothing;
  select * into g from kyo_intentos where ip = '*' for update;
  select * into r from kyo_intentos where ip = p_ip for update;

  if g.hasta > ahora then
    return jsonb_build_object('bloqueado', true, 'espera', ceil(extract(epoch from g.hasta - ahora)));
  end if;
  if r.hasta > ahora then
    return jsonb_build_object('bloqueado', true, 'espera', ceil(extract(epoch from r.hasta - ahora)));
  end if;

  -- Un día sin intentos: se olvida el historial de esa conexión
  if r.actualizado < ahora - interval '1 day' then r.fallos := 0; r.nivel := 0; end if;
  r.fallos := r.fallos + 1;
  if r.fallos >= 3 then
    r.nivel := r.nivel + 1; r.fallos := 0;
    r.hasta := ahora + least(interval '15 minutes' * power(2, r.nivel - 1), interval '24 hours');
    espera := ceil(extract(epoch from r.hasta - ahora));
  end if;
  update kyo_intentos set fallos = r.fallos, nivel = r.nivel, hasta = r.hasta, actualizado = ahora where ip = p_ip;

  if g.desde < ahora - interval '1 hour' then g.fallos := 0; g.desde := ahora; end if;
  g.fallos := g.fallos + 1;
  if g.fallos >= 20 then g.hasta := ahora + interval '1 hour'; g.fallos := 0; g.desde := ahora; end if;
  update kyo_intentos set fallos = g.fallos, desde = g.desde, hasta = g.hasta, actualizado = ahora where ip = '*';

  return jsonb_build_object('bloqueado', false, 'quedan', case when espera > 0 then 0 else 3 - r.fallos end, 'espera', espera);
end $$;

-- Código correcto: se borran los fallos de esa conexión
create or replace function public.kyo_intento_ok(p_ip text)
returns void language plpgsql set search_path = public as $$
begin
  delete from kyo_intentos where ip = p_ip;
  update kyo_intentos set fallos = greatest(fallos - 1, 0) where ip = '*';
end $$;

-- Nadie desde fuera puede llamar a estas funciones: solo las Edge Functions
revoke all on function public.kyo_intento(text) from public, anon, authenticated;
revoke all on function public.kyo_intento_ok(text) from public, anon, authenticated;
grant execute on function public.kyo_intento(text) to service_role;
grant execute on function public.kyo_intento_ok(text) to service_role;
