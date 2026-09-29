// KyoWidgets · spotify-auth
// Conecta TU cuenta de Spotify una sola vez y guarda el permiso (refresh token)
// en la tabla privada. Lo usa el botón "Conectar Spotify" de Kyo Estudio.
//
// Importante: Supabase no deja que las funciones muestren páginas web (las
// enseña como texto), así que esta función solo redirige y responde JSON.
//
// Rutas:
//   POST {accion:"verificar", clave}          → {ok:true} si la clave es correcta (código de acceso del Estudio)
//   POST {accion:"conectar", clave, volver}   → {ok:true, url} con el enlace de Spotify; al terminar vuelve a volver#spotify=ok (o #spotify=error-...)
//   GET  ?estado=1                            → {conectado:true|false}
// El código viaja dentro del POST (no en la dirección), así no queda en el historial.
// Con 3 fallos seguidos se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
//
// "Verify JWT" debe estar DESACTIVADO en esta función (Spotify vuelve desde el navegador).
// Secretos: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, KYO_SETUP_KEY

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SCOPES = "user-read-currently-playing user-read-playback-state";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- Código de acceso con límite de intentos ----------
// Compara las huellas SHA-256 en tiempo constante (no da pistas de cuántas letras acertaste)
async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function comprobarClave(db: SupabaseClient, req: Request, clave: unknown) {
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  if (!setupKey) return { ok: false, error: "falta_KYO_SETUP_KEY" };
  const ip = "ip:" + (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
  const { data: r, error } = await db.rpc("kyo_intento", { p_ip: ip });
  if (error || !r) return { ok: false, error: "falta_intentos" };
  if (r.bloqueado) return { ok: false, error: "bloqueado", espera: r.espera };
  if (!(await igual(String(clave ?? ""), setupKey))) {
    return r.espera > 0 ? { ok: false, error: "bloqueado", espera: r.espera } : { ok: false, error: "clave", quedan: r.quedan };
  }
  await db.rpc("kyo_intento_ok", { p_ip: ip });
  return { ok: true };
}
// -------------------------------------------------------------

// Vuelta al Estudio. Solo se usa la web que guardó el Estudio al pulsar "Conectar"
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

  // Acciones del Estudio (con código de acceso)
  if (req.method === "POST") {
    let body: any = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
    const c = await comprobarClave(db, req, body?.clave);
    if (!c.ok) return json(c);

    if (body.accion === "verificar") return json({ ok: true });

    if (body.accion === "conectar") {
      if (!clientId || !clientSecret) return json({ ok: false, error: "faltan_secretos" });
      const volver = String(body.volver ?? "");
      if (!/^https:\/\//.test(volver)) return json({ ok: false, error: "volver" });
      // Un "state" aleatorio de un solo uso (10 min) y la web a la que volver, guardados en privado
      const state = crypto.randomUUID();
      const { error } = await db.from("private_tokens").upsert({
        id: "spotify_state",
        value: JSON.stringify({ s: state, v: volver.split("#")[0], exp: Date.now() + 10 * 60_000 }),
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ ok: false, error: "tabla" });
      const auth = new URL("https://accounts.spotify.com/authorize");
      auth.search = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: SCOPES,
        state,
        show_dialog: "true",
      }).toString();
      return json({ ok: true, url: auth.toString() });
    }
    return json({ ok: false, error: "accion" }, 400);
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

  // Spotify vuelve aquí con ?code=... o ?error=...
  if (p.get("code") || p.get("error")) {
    const { data } = await db.from("private_tokens").select("value").eq("id", "spotify_state").maybeSingle();
    let st: { s?: string; v?: string; exp?: number } = {};
    try { st = JSON.parse(data?.value ?? "{}"); } catch { /* sin state guardado */ }
    // Si el state no coincide, no se redirige a ninguna parte
    if (!st.s || st.s !== p.get("state") || !st.exp || Date.now() > st.exp) return json({ resultado: "error-state" }, 400);
    await db.from("private_tokens").delete().eq("id", "spotify_state"); // un solo uso
    if (p.get("error")) return volverA(st.v, "error-cancelado");

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

  return json({ ok: false, error: "ruta" }, 404);
});
