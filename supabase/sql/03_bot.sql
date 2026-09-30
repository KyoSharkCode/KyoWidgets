-- KyoWidgets · Bot de Twitch (AletaBot)
-- Pega esto en Supabase > SQL Editor > New query > Run.
--
-- El permiso (token) de AletaBot se guarda en la tabla "private_tokens" que ya
-- creaste en 01_setup.sql (fila con id = 'twitch_bot'), así que no hace falta
-- tocar nada ahí. Esta tabla nueva solo guarda los últimos mensajes del chat,
-- para el futuro Chat propio, los Sorteos y las Encuestas.

create table if not exists public.kyo_chat (
  id       bigint generated always as identity primary key,
  usuario  text not null,
  texto    text not null,
  ts       timestamptz not null default now()
);

alter table public.kyo_chat enable row level security;
create index if not exists kyo_chat_ts on public.kyo_chat (ts desc);
