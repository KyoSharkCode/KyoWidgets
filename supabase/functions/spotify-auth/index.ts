// KyoWidgets · spotify-auth
// Conecta TU cuenta de Spotify una sola vez y guarda el permiso (refresh token)
// en la tabla privada. Nunca lo muestra en pantalla.
//
// Uso: abre en el navegador
//   https://<tu-proyecto>.supabase.co/functions/v1/spotify-auth?clave=<KYO_SETUP_KEY>
//
// IMPORTANTE: esta función debe tener "Verify JWT" DESACTIVADO,
// porque Spotify vuelve a ella directamente desde el navegador.
//
// Secretos necesarios: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, KYO_SETUP_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";

const SCOPES = "user-read-currently-playing user-read-playback-state";

function page(title: string, msg: string, ok: boolean) {
  const color = ok ? "#6FE3F0" : "#ff8fa3";
  return new Response(
    `<!doctype html><html lang="es"><meta charset="utf-8"><title>${title}</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0A1030;color:#F5F3FB;font-family:system-ui,sans-serif">
<div style="max-width:520px;padding:32px;border-radius:24px;background:#121a45;box-shadow:0 0 0 3px ${color},0 0 30px ${color}55;text-align:center">
<h1 style="margin:0 0 12px;color:${color}">${title}</h1><p style="margin:0;line-height:1.6">${msg}</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" }, status: ok ? 200 : 400 },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/spotify-auth`;

  if (!clientId || !clientSecret || !setupKey) {
    return page("Faltan secretos", "Añade SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y KYO_SETUP_KEY en Supabase &gt; Edge Functions &gt; Secrets.", false);
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // 2) Spotify vuelve aquí con ?code=...&state=...
  if (code || error) {
    if (error) return page("Conexión cancelada", "Spotify no dio permiso. Vuelve a intentarlo.", false);
    if (url.searchParams.get("state") !== setupKey) return page("Enlace no válido", "La clave no coincide.", false);

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code: code!, redirect_uri: redirectUri }),
    });
    const tok = await res.json().catch(() => ({}));
    if (!res.ok || !tok.refresh_token) {
      return page("Algo falló", "Spotify no devolvió el permiso. Revisa que la Redirect URI de tu app sea exactamente:<br><code>" + redirectUri + "</code>", false);
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: dbErr } = await db.from("private_tokens")
      .upsert({ id: "spotify_refresh", value: tok.refresh_token, updated_at: new Date().toISOString() });
    if (dbErr) return page("No se pudo guardar", "¿Ejecutaste el archivo 01_setup.sql en el SQL Editor?", false);

    return page("¡Spotify conectado! 🦈", "Ya puedes cerrar esta pestaña. El widget de música empezará a mostrar lo que escuchas.", true);
  }

  // 1) Primer paso: ?clave=... → te manda a Spotify a dar permiso
  if (url.searchParams.get("clave") !== setupKey) {
    return page("Falta la clave", "Abre este enlace añadiendo <code>?clave=TU_KYO_SETUP_KEY</code> al final.", false);
  }
  const auth = new URL("https://accounts.spotify.com/authorize");
  auth.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: setupKey,
    show_dialog: "true",
  }).toString();
  return Response.redirect(auth.toString(), 302);
});
