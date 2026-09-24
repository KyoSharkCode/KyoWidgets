-- KyoWidgets · configuración inicial
-- Pega esto en Supabase > SQL Editor > New query > Run.

-- Tabla privada para guardar el token de Spotify.
-- Tiene RLS activado y NINGUNA política: solo las Edge Functions
-- (con la service role) pueden leerla o escribirla. Nadie desde fuera.
create table if not exists public.private_tokens (
  id          text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

alter table public.private_tokens enable row level security;
