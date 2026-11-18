-- KyoWidgets · IA de AletaBot: tope de respuestas por persona
-- Pega esto en Supabase > SQL Editor > New query > Run. Necesita 09_ia.sql (ya ejecutado).
--
-- Además del tope del directo (que ahora puede quitarse poniendo 0), cada persona tiene su propio
-- máximo de respuestas por directo. Así nadie agota la IA de los demás.

-- Cuántas respuestas lleva cada persona en el directo actual
alter table public.kyo_ia_turno add column if not exists directo text;
alter table public.kyo_ia_turno add column if not exists respuestas int not null default 0;
alter table public.kyo_ia_turno add column if not exists aviso boolean not null default false;

-- ¿Puede la IA atender ahora a esta persona? Seguro aunque escriban varios a la vez.
--   p_tope          respuestas como máximo en el directo (0 = sin tope)
--   p_tope_persona  respuestas como máximo a esta persona en el directo (0 = sin tope)
--   'ok'               → adelante (y empieza a contar su espera)
--   'espera'           → esa persona tiene que esperar un poco más
--   'tope'             → se acabó el tope del directo (solo la primera vez, para avisar en el chat)
--   'tope_ya'          → se acabó el tope del directo y ya se avisó
--   'tope_persona'     → esta persona llegó a su máximo (solo la primera vez, para avisarle)
--   'tope_persona_ya'  → llegó a su máximo y ya se le avisó
drop function if exists public.kyo_ia_permiso(text, text, int, int);
create or replace function public.kyo_ia_permiso(p_user text, p_directo text, p_espera int, p_tope int, p_tope_persona int default 0)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  avisado boolean;
  t kyo_ia_turno;
begin
  insert into kyo_directo (id) values (p_directo) on conflict (id) do nothing;
  select respuestas, aviso_tope into n, avisado from kyo_directo where id = p_directo for update;
  if p_tope > 0 and n >= p_tope then
    if avisado then return 'tope_ya'; end if;
    update kyo_directo set aviso_tope = true where id = p_directo;
    return 'tope';
  end if;

  insert into kyo_ia_turno (user_id, ultimo, directo) values (p_user, 'epoch', p_directo) on conflict (user_id) do nothing;
  select * into t from kyo_ia_turno where user_id = p_user for update;
  -- directo nuevo: su cuenta empieza de cero
  if t.directo is distinct from p_directo then
    update kyo_ia_turno set directo = p_directo, respuestas = 0, aviso = false where user_id = p_user returning * into t;
  end if;
  if p_tope_persona > 0 and t.respuestas >= p_tope_persona then
    if t.aviso then return 'tope_persona_ya'; end if;
    update kyo_ia_turno set aviso = true where user_id = p_user;
    return 'tope_persona';
  end if;
  if t.ultimo > now() - make_interval(secs => greatest(p_espera, 0)) then return 'espera'; end if;
  update kyo_ia_turno set ultimo = now() where user_id = p_user;
  return 'ok';
end;
$$;

-- Suma una respuesta al directo y a la persona (cuando AletaBot ya la escribió en el chat)
drop function if exists public.kyo_ia_contar(text);
create or replace function public.kyo_ia_contar(p_directo text, p_user text default null)
returns int
language sql
security definer
set search_path = public
as $$
  update kyo_ia_turno set respuestas = respuestas + 1 where user_id = p_user and directo = p_directo;
  update kyo_directo set respuestas = respuestas + 1 where id = p_directo returning respuestas;
$$;

-- Solo las funciones de Supabase (service role) pueden usarlas
revoke all on function public.kyo_ia_permiso(text, text, int, int, int) from public, anon, authenticated;
revoke all on function public.kyo_ia_contar(text, text) from public, anon, authenticated;
