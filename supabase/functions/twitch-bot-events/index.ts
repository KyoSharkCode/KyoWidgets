// KyoWidgets · twitch-bot-events
// Aquí es donde Twitch llama SOLO, 24/7, cada vez que alguien escribe en tu chat
// (no lo abre nadie a mano). Guarda los últimos mensajes en la tabla kyo_chat, que
// usarán el Chat propio, los Sorteos y las Encuestas.
//
// "Verify JWT" debe estar DESACTIVADO en esta función (Twitch la llama sin tus claves).
// Secretos: KYO_SETUP_KEY y TWITCH_CLIENT_SECRET (la firma se calcula con KYO_SETUP_KEY).
// Tabla: kyo_chat (sql/03_bot.sql).

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

const texto = (b: ArrayBuffer) => new TextDecoder().decode(b);
async function firmaValida(id: string, ts: string, cuerpo: string, firma: string) {
  const clave = await crypto.subtle.importKey("raw", new TextEncoder().encode(await secretoEventos()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(id + ts + cuerpo));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return firma === "sha256=" + hex;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const tipo = req.headers.get("Twitch-Eventsub-Message-Type") || "";
  const id = req.headers.get("Twitch-Eventsub-Message-Id") || "";
  const ts = req.headers.get("Twitch-Eventsub-Message-Timestamp") || "";
  const firma = req.headers.get("Twitch-Eventsub-Message-Signature") || "";
  const cuerpo = texto(await req.arrayBuffer());

  if (!await firmaValida(id, ts, cuerpo, firma)) return new Response("firma", { status: 403 });

  let datos: any = null;
  try { datos = JSON.parse(cuerpo); } catch { return new Response("json", { status: 400 }); }

  // Twitch comprueba que la función existe antes de activar la suscripción
  if (tipo === "webhook_callback_verification") {
    return new Response(datos.challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  if (tipo === "notification" && datos.subscription?.type === "channel.chat.message") {
    const ev = datos.event;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await db.from("kyo_chat").insert({ usuario: ev?.chatter_user_login || "?", texto: String(ev?.message?.text || "").slice(0, 500) });
    // se queda solo con los últimos 300 mensajes
    const { data: viejo } = await db.from("kyo_chat").select("id").order("id", { ascending: false }).range(300, 300).maybeSingle();
    if (viejo?.id) await db.from("kyo_chat").delete().lte("id", viejo.id);
  }

  // revocation u otros tipos: solo confirmamos que llegó
  return new Response("ok", { status: 200 });
});
