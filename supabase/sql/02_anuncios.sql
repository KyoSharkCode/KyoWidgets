-- KyoWidgets · anuncios en vivo de las escenas (Ya regreso / Terminando)
-- Pega esto en Supabase > SQL Editor > New query > Run.

-- Tabla privada para ajustes del Estudio (de momento, los anuncios).
-- RLS activado y NINGUNA política: solo la Edge Function "anuncios"
-- (con la service role) puede leerla o escribirla.
create table if not exists public.kyo_ajustes (
  id          text primary key,
  datos       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.kyo_ajustes enable row level security;
