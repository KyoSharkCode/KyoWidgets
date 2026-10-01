// KyoWidgets · twitch-bot-auth
// Conecta la cuenta de AletaBot UNA SOLA VEZ y guarda su permiso (token) en la tabla privada.
//
// IMPORTANTE: ábrelo estando conectada en el navegador CON LA CUENTA DE ALETABOT
// (no con tu cuenta principal KyoSumiVT), o el permiso quedará a nombre de la cuenta
// equivocada. Si acabas de crear la cuenta desde "cuentas adicionales", cámbiate a
// AletaBot con tu foto de perfil (arriba a la derecha) antes de pulsar "Conectar".
//
// Rutas:
//   POST {accion:"conectar", clave, volver}   → {ok:true, url} con el enlace de Twitch; al terminar vuelve a volver#bot=ok (o #bot=error-...)
//   POST {accion:"conectar", cuenta:"canal", …} → igual, pero para TU cuenta (KyoSumiVT), solo con permiso de
//                                                predicciones; vuelve a volver#canal=ok. Se guarda en "twitch_canal".
//   GET  ?estado=1                            → {conectado, desde, cuenta, secretos, canal:{conectado, desde, cuenta}}
// El código viaja dentro del POST (no en la dirección), así no queda en el historial.
// Con 3 fallos seguidos se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
//
// "Verify JWT" debe estar DESACTIVADO en esta función (Twitch vuelve desde el navegador).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY (los mismos de siempre).

import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------- Ayudantes de Twitch (iguales en las 4 funciones de AletaBot) ----------
// El Client ID no es secreto. El Client Secret vive en Supabase Secrets (TWITCH_CLIENT_SECRET).
const CLIENT_ID = "4hlqrvmfb4j2jhz2odxzd92xb7ny1l";
const CANAL = Deno.env.get("TWITCH_BROADCASTER") || "kyosumivt";

const clientSecret = () => Deno.env.get("TWITCH_CLIENT_SECRET") ?? "";

// El secreto que firma los avisos de EventSub. Se calcula a partir de tu KYO_SETUP_KEY,
// así no hace falta crear ni guardar ningún secreto nuevo en Supabase.
async function secretoEventos(): Promise<string> {
  const clave = Deno.env.get("KYO_SETUP_KEY") ?? "";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kyo-eventsub:" + clave));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tokenApp(): Promise<string | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: clientSecret(), grant_type: "client_credentials" }),
  });
  const j = await res.json().catch(() => ({}));
  return res.ok && j.access_token ? (j.access_token as string) : null;
}

async function helix(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch("https://api.twitch.tv/helix" + path, {
    ...opts,
    headers: { ...(opts.headers || {}), "Client-Id": CLIENT_ID, Authorization: "Bearer " + token, "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

type TokenBot = { access_token: string; refresh_token: string; expira: string; id: string; login: string };

// Lee el token de AletaBot de la tabla privada y lo renueva solo si hace falta.
async function tokenBot(db: any): Promise<TokenBot | null> {
  const { data } = await db.from("private_tokens").select("value").eq("id", "twitch_bot").maybeSingle();
  if (!data?.value) return null;
  let t: TokenBot;
  try { t = JSON.parse(data.value); } catch { return null; }
  if (new Date(t.expira).getTime() > Date.now() + 5 * 60_000) return t;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: clientSecret(), grant_type: "refresh_token", refresh_token: t.refresh_token }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) return new Date(t.expira).getTime() > Date.now() ? t : null;

  const nuevo: TokenBot = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || t.refresh_token,
    expira: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(),
    id: t.id,
    login: t.login,
  };
  await db.from("private_tokens").upsert({ id: "twitch_bot", value: JSON.stringify(nuevo), updated_at: new Date().toISOString() });
  return nuevo;
}

// El id numérico de tu canal (se guarda solo un rato en memoria, no hace falta tabla).
let _canal: { id: string; ts: number } | null = null;
async function idCanal(): Promise<string | null> {
  if (_canal && Date.now() - _canal.ts < 3600_000) return _canal.id;
  const app = await tokenApp();
  if (!app) return null;
  const r = await helix("/users?login=" + encodeURIComponent(CANAL), app);
  const id = r.body?.data?.[0]?.id || null;
  if (id) _canal = { id, ts: Date.now() };
  return id;
}
// ---------- fin de los ayudantes ----------

const SCOPES = "user:bot user:read:chat user:write:chat";
// Tu cuenta (la del canal) solo da permiso para ver y gestionar predicciones con tus puntos del canal
const SCOPES_CANAL = "channel:read:predictions channel:manage:predictions";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

// ---------- Código de acceso con límite de intentos (igual que en spotify-auth y anuncios) ----------
// Compara las huellas SHA-256 en tiempo constante (no da pistas de cuántas letras acertaste)
async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function comprobarClave(db: any, req: Request, clave: unknown) {
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
const volverA = (v: string | undefined, estado: string, que = "bot") => {
  if (!v || !/^https:\/\//.test(v)) return json({ resultado: estado });
  return Response.redirect(v.split("#")[0] + "#" + que + "=" + encodeURIComponent(estado), 302);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const p = url.searchParams;
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  const secret = clientSecret();
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitch-bot-auth`;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Botón "Conectar AletaBot" del Estudio (con código de acceso)
  if (req.method === "POST") {
    let body: any = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
    const c = await comprobarClave(db, req, body?.clave);
    if (!c.ok) return json(c);
    if (body.accion !== "conectar") return json({ ok: false, error: "accion" }, 400);
    if (!secret) return json({ ok: false, error: "faltan_secretos" });
    const volver = String(body.volver ?? "");
    const canal = body.cuenta === "canal";
    if (!/^https:\/\//.test(volver)) return json({ ok: false, error: "volver" });
    // Un "state" aleatorio de un solo uso (10 min) y la web a la que volver, guardados en privado
    const state = crypto.randomUUID();
    const { error } = await db.from("private_tokens").upsert({
      id: "twitch_state",
      value: JSON.stringify({ s: state, v: volver.split("#")[0], exp: Date.now() + 10 * 60_000, c: canal ? "canal" : "bot" }),
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ ok: false, error: "tabla" });
    const auth = new URL("https://id.twitch.tv/oauth2/authorize");
    auth.search = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: canal ? SCOPES_CANAL : SCOPES,
      state,
      force_verify: "true",
    }).toString();
    return json({ ok: true, url: auth.toString() });
  }

  // ¿AletaBot está conectada?
  if (p.get("estado")) {
    const { data } = await db.from("private_tokens").select("value, updated_at").eq("id", "twitch_bot").maybeSingle();
    let cuenta: string | null = null;
    if (data?.value) { try { cuenta = JSON.parse(data.value).login ?? null; } catch { /* ignora */ } }
    const { data: dc } = await db.from("private_tokens").select("value, updated_at").eq("id", "twitch_canal").maybeSingle();
    let cuentaCanal: string | null = null;
    if (dc?.value) { try { cuentaCanal = JSON.parse(dc.value).login ?? null; } catch { /* ignora */ } }
    return json({
      conectado: !!data, desde: data?.updated_at ?? null, cuenta, secretos: !!(secret && setupKey),
      canal: { conectado: !!dc, desde: dc?.updated_at ?? null, cuenta: cuentaCanal },
    });
  }

  // Twitch vuelve aquí con ?code=... o ?error=...
  if (p.get("code") || p.get("error")) {
    const { data } = await db.from("private_tokens").select("value").eq("id", "twitch_state").maybeSingle();
    let st: { s?: string; v?: string; exp?: number; c?: string } = {};
    try { st = JSON.parse(data?.value ?? "{}"); } catch { /* sin state guardado */ }
    // Si el state no coincide, no se redirige a ninguna parte
    if (!st.s || st.s !== p.get("state") || !st.exp || Date.now() > st.exp) return json({ resultado: "error-state" }, 400);
    await db.from("private_tokens").delete().eq("id", "twitch_state"); // un solo uso
    const que = st.c === "canal" ? "canal" : "bot";
    if (p.get("error")) return volverA(st.v, "error-cancelado", que);

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, grant_type: "authorization_code", code: p.get("code")!, redirect_uri: redirectUri }),
    });
    const tok = await res.json().catch(() => ({}));
    if (!res.ok || !tok.access_token || !tok.refresh_token) return volverA(st.v, "error-twitch", que);

    const quien = await helix("/users", tok.access_token);
    const yo = quien.body?.data?.[0];
    if (!yo) return volverA(st.v, "error-usuario", que);
    // Las predicciones solo se pueden hacer con la cuenta dueña del canal
    if (que === "canal" && String(yo.login).toLowerCase() !== CANAL.toLowerCase()) return volverA(st.v, "error-cuenta", que);

    const valor = JSON.stringify({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expira: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
      id: yo.id,
      login: yo.login,
    });
    const { error } = await db.from("private_tokens").upsert({ id: que === "canal" ? "twitch_canal" : "twitch_bot", value: valor, updated_at: new Date().toISOString() });
    if (error) return volverA(st.v, "error-tabla", que);
    return volverA(st.v, "ok", que);
  }

  return json({ ok: false, error: "ruta" }, 404);
});
