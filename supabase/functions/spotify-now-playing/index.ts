// KyoWidgets · spotify-now-playing
// Devuelve la canción que suena ahora en tu Spotify, lista para el overlay.
// El overlay la consulta cada pocos segundos.
//
// Secretos necesarios: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
// (el permiso de tu cuenta lo guarda spotify-auth en la tabla private_tokens)

import { createClient } from "jsr:@supabase/supabase-js@2";
// --- CORS (permite que los overlays llamen a esta función) ---
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}
// -------------------------------------------------------------

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let accessToken = "";
let accessExp = 0;
let cache: { at: number; body: unknown } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < accessExp - 30_000) return accessToken;

  const { data } = await db.from("private_tokens").select("value").eq("id", "spotify_refresh").maybeSingle();
  if (!data?.value) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${Deno.env.get("SPOTIFY_CLIENT_ID")}:${Deno.env.get("SPOTIFY_CLIENT_SECRET")}`),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: data.value }),
  });
  const tok = await res.json().catch(() => ({}));
  if (!res.ok || !tok.access_token) return null;

  accessToken = tok.access_token;
  accessExp = Date.now() + (tok.expires_in ?? 3600) * 1000;
  // Spotify a veces entrega un permiso nuevo: lo guardamos para no perderlo
  if (tok.refresh_token && tok.refresh_token !== data.value) {
    await db.from("private_tokens").upsert({ id: "spotify_refresh", value: tok.refresh_token, updated_at: new Date().toISOString() });
  }
  return accessToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Pequeña caché: aunque haya varios overlays abiertos, Spotify recibe como mucho 1 consulta cada 3 s
  if (cache && Date.now() - cache.at < 3000) return json(cache.body);

  const token = await getAccessToken();
  if (!token) return json({ ok: false, error: "no_conectado" }, 200);

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", {
    headers: { Authorization: `Bearer ${token}` },
  });

  let body: Record<string, unknown>;
  if (res.status === 204) {
    body = { ok: true, playing: false };
  } else if (res.status === 401) {
    accessToken = ""; // se renovará en la siguiente consulta
    body = { ok: false, error: "token_caducado" };
  } else if (!res.ok) {
    body = { ok: false, error: "spotify_" + res.status };
  } else {
    const d = await res.json();
    const item = d.item ?? {};
    const isEpisode = d.currently_playing_type === "episode";
    const images = (isEpisode ? item.images : item.album?.images) ?? [];
    body = {
      ok: true,
      playing: !!d.is_playing,
      id: item.id ?? null,
      title: item.name ?? "",
      artist: isEpisode ? (item.show?.name ?? "") : (item.artists ?? []).map((a: { name: string }) => a.name).join(", "),
      album: isEpisode ? "" : (item.album?.name ?? ""),
      cover: images[0]?.url ?? null,
      progress_ms: d.progress_ms ?? 0,
      duration_ms: item.duration_ms ?? 0,
      at: Date.now(),
    };
  }
  cache = { at: Date.now(), body };
  return json(body);
});
