// KyoWidgets · twitch-bot-subscribe
// Activa la "oreja" 24/7: le pide a Twitch que le avise a AletaBot (vía twitch-bot-events)
// cada vez que alguien escribe en tu chat, aunque no tengas OBS ni el Estudio abiertos.
// Se pulsa UNA VEZ, y otra vez si cambias tu KYO_SETUP_KEY o el proyecto de Supabase.
//
//   POST {clave}   → crea las suscripciones de EventSub "channel.chat.message" (el chat) y
//                    "stream.online" / "stream.offline" (para que la IA sepa cuándo hay directo)
//
// "Verify JWT" puede quedarse ACTIVADO (el Estudio envía la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY. Necesita que AletaBot ya esté conectada.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { comprobarClave, estadoAcceso } from "../_shared/acceso.ts";

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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // el navegador recuerda el permiso CORS y no repite el OPTIONS (cada uno cuenta como invocación)
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

// El acceso (sesión de Google o código) se comprueba en ../_shared/acceso.ts

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoAcceso(c.error!));

  const bot = await tokenBot(db);
  if (!bot) return json({ ok: false, error: "sin_bot" }, 400);

  const canal = await idCanal();
  if (!canal) return json({ ok: false, error: "sin_canal" }, 500);

  const app = await tokenApp();
  if (!app) return json({ ok: false, error: "sin_token_app" }, 500);

  // Borra las suscripciones anteriores y crea unas nuevas. Así, si cambias tu KYO_SETUP_KEY
  // (con la que se firma cada aviso), basta con volver a pulsar "Activar escucha 24/7".
  const TIPOS = ["channel.chat.message", "stream.online", "stream.offline"];
  for (const tipo of TIPOS) {
    const existentes = await helix("/eventsub/subscriptions?type=" + tipo, app);
    for (const s of existentes.body?.data || []) {
      if (s.condition?.broadcaster_user_id === canal) await helix("/eventsub/subscriptions?id=" + encodeURIComponent(s.id), app, { method: "DELETE" });
    }
  }

  const callback = `${Deno.env.get("SUPABASE_URL")}/functions/v1/twitch-bot-events`;
  const transport = { method: "webhook", callback, secret: await secretoEventos() };
  const r = await helix("/eventsub/subscriptions", app, {
    method: "POST",
    body: JSON.stringify({ type: "channel.chat.message", version: "1", condition: { broadcaster_user_id: canal, user_id: bot.id }, transport }),
  });
  if (!r.ok) return json({ ok: false, error: "twitch", detalle: r.body }, 502);

  // Inicio y fin del directo (no necesitan ningún permiso). Si fallaran, el chat sigue funcionando
  // y la IA le pregunta a Twitch si hay directo cuando lo necesita.
  const directo: Record<string, boolean> = {};
  for (const tipo of ["stream.online", "stream.offline"]) {
    const d = await helix("/eventsub/subscriptions", app, {
      method: "POST",
      body: JSON.stringify({ type: tipo, version: "1", condition: { broadcaster_user_id: canal }, transport }),
    });
    directo[tipo] = d.ok;
  }
  return json({ ok: true, estado: r.body?.data?.[0]?.status || null, directo });
});
