// KyoWidgets · twitch-bot-auth
// Conecta la cuenta de AletaBot UNA SOLA VEZ y guarda su permiso (token) en la tabla privada.
//
// IMPORTANTE: ábrelo estando conectada en el navegador CON LA CUENTA DE ALETABOT
// (no con tu cuenta principal KyoSumiVT), o el permiso quedará a nombre de la cuenta
// equivocada. Si acabas de crear la cuenta desde "cuentas adicionales", cámbiate a
// AletaBot con tu foto de perfil (arriba a la derecha) antes de pulsar "Conectar".
//
// Rutas (todas por parámetros):
//   ?verificar=1&clave=XXX   → {ok:true} si la clave es correcta
//   ?estado=1                → {conectado, desde, cuenta, secretos}
//   ?clave=XXX&volver=URL    → te manda a Twitch; al terminar vuelve a URL#bot=ok (o #bot=error-...)
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
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

const pack = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function unpack(s: string): { c?: string; v?: string } {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  } catch { return {}; }
}
async function huella(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("kyo:" + t));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const volverA = (v: string | undefined, estado: string) => {
  if (!v || !/^https:\/\//.test(v)) return json({ resultado: estado });
  return Response.redirect(v.split("#")[0] + "#bot=" + encodeURIComponent(estado), 302);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const p = url.searchParams;
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  const secret = clientSecret();
  const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitch-bot-auth`;
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Código de acceso del Estudio
  if (p.get("verificar")) {
    if (!setupKey) return json({ ok: false, error: "falta_KYO_SETUP_KEY" });
    return json({ ok: p.get("clave") === setupKey });
  }

  // ¿AletaBot está conectada?
  if (p.get("estado")) {
    const { data } = await db.from("private_tokens").select("value, updated_at").eq("id", "twitch_bot").maybeSingle();
    let cuenta: string | null = null;
    if (data?.value) { try { cuenta = JSON.parse(data.value).login ?? null; } catch { /* ignora */ } }
    return json({ conectado: !!data, desde: data?.updated_at ?? null, cuenta, secretos: !!(secret && setupKey) });
  }

  // 2) Twitch vuelve aquí con ?code=... o ?error=...
  if (p.get("code") || p.get("error")) {
    const st = unpack(p.get("state") ?? "");
    if (p.get("error")) return volverA(st.v, "error-cancelado");
    if (!setupKey || st.c !== await huella(setupKey)) return volverA(st.v, "error-clave");

    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: secret, grant_type: "authorization_code", code: p.get("code")!, redirect_uri: redirectUri }),
    });
    const tok = await res.json().catch(() => ({}));
    if (!res.ok || !tok.access_token || !tok.refresh_token) return volverA(st.v, "error-twitch");

    const quien = await helix("/users", tok.access_token);
    const yo = quien.body?.data?.[0];
    if (!yo) return volverA(st.v, "error-usuario");

    const valor = JSON.stringify({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expira: new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString(),
      id: yo.id,
      login: yo.login,
    });
    const { error } = await db.from("private_tokens").upsert({ id: "twitch_bot", value: valor, updated_at: new Date().toISOString() });
    if (error) return volverA(st.v, "error-tabla");
    return volverA(st.v, "ok");
  }

  // 1) Botón "Conectar AletaBot": ?clave=...&volver=...
  if (!secret || !setupKey) return json({ ok: false, error: "faltan_secretos" }, 400);
  if (p.get("clave") !== setupKey) return volverA(p.get("volver") ?? undefined, "error-clave");

  const auth = new URL("https://id.twitch.tv/oauth2/authorize");
  auth.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: pack({ c: await huella(setupKey), v: p.get("volver") ?? "" }),
    force_verify: "true",
  }).toString();
  return Response.redirect(auth.toString(), 302);
});
