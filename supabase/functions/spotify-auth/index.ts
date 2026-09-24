// KyoWidgets · spotify-auth
// Conecta TU cuenta de Spotify una sola vez y guarda el permiso (refresh token)
// en la tabla privada. Lo usa el botón "Conectar Spotify" de Kyo Estudio.
//
// Importante: Supabase no deja que las funciones muestren páginas web (las
// enseña como texto), así que esta función solo redirige y responde JSON.
//
// Rutas (todas por parámetros):
//   ?verificar=1&clave=XXX   → {ok:true} si la clave es correcta (código de acceso del Estudio)
//   ?estado=1                → {conectado:true|false}
//   ?clave=XXX&volver=URL    → te manda a Spotify; al terminar vuelve a URL#spotify=ok (o #spotify=error-...)
//
// "Verify JWT" debe estar DESACTIVADO en esta función (Spotify vuelve desde el navegador).
// Secretos: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, KYO_SETUP_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const SCOPES = "user-read-currently-playing user-read-playback-state";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

// El "state" que viaja por Spotify lleva la clave y la web a la que volver
const pack = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function unpack(s: string): { c?: string; v?: string } {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  } catch { return {}; }
}
// En el "state" no viaja la clave, solo su huella (SHA-256)
async function huella(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kyo:" + t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const volverA = (v: string | undefined, estado: string) => {
  if (!v || !/^https:\/\//.test(v)) return json({ resultado: estado });
  return Response.redirect(v.split("#")[0] + "#spotify=" + encodeURIComponent(estado), 302);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const p = url.searchParams;
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/spotify-auth`;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Código de acceso del Estudio
  if (p.get("verificar")) {
    if (!setupKey) return json({ ok: false, error: "falta_KYO_SETUP_KEY" });
    return json({ ok: p.get("clave") === setupKey });
  }

  // ¿Spotify está conectado?
  if (p.get("estado")) {
    const { data, error } = await db.from("private_tokens").select("updated_at").eq("id", "spotify_refresh").maybeSingle();
    return json({
      conectado: !!data,
      desde: data?.updated_at ?? null,
      tabla: !error,
      secretos: !!(clientId && clientSecret && setupKey),
    });
  }

  // 2) Spotify vuelve aquí con ?code=... o ?error=...
  if (p.get("code") || p.get("error")) {
    const st = unpack(p.get("state") ?? "");
    if (p.get("error")) return volverA(st.v, "error-cancelado");
    if (!setupKey || st.c !== await huella(setupKey)) return volverA(st.v, "error-clave");

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code: p.get("code")!, redirect_uri: redirectUri }),
    });
    const tok = await res.json().catch(() => ({}));
    if (!res.ok || !tok.refresh_token) return volverA(st.v, "error-spotify");

    const { error } = await db.from("private_tokens")
      .upsert({ id: "spotify_refresh", value: tok.refresh_token, updated_at: new Date().toISOString() });
    if (error) return volverA(st.v, "error-tabla");
    return volverA(st.v, "ok");
  }

  // 1) Botón "Conectar Spotify": ?clave=...&volver=...
  if (!clientId || !clientSecret || !setupKey) return json({ ok: false, error: "faltan_secretos" }, 400);
  if (p.get("clave") !== setupKey) return volverA(p.get("volver") ?? undefined, "error-clave");

  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: pack({ c: await huella(setupKey), v: p.get("volver") ?? "" }),
    show_dialog: "true",
  }).toString();
  return Response.redirect(auth.toString(), 302);
});
