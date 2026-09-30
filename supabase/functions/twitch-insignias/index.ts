// KyoWidgets · twitch-insignias
// Devuelve las imágenes de las insignias de Twitch (globales + las de tu canal, como tus
// insignias de sub personalizadas) para el Chat propio. Twitch solo las da con la clave
// de la app, por eso las pide esta función y el chat no necesita ninguna clave.
//
//   GET            → {ok:true, insignias:{"broadcaster/1":"https://…", "subscriber/12":"https://…", …}}
//   GET ?canal=xx  → las de otro canal (por defecto el tuyo)
//
// "Verify JWT" puede quedarse ACTIVADO (el chat envía la anon key de config.js).
// Secretos: TWITCH_CLIENT_SECRET (el mismo de AletaBot).

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
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" } });

// Se guardan un rato en memoria: las insignias casi nunca cambian
const cache: Record<string, { ts: number; mapa: Record<string, string> }> = {};

function aMapa(lista: any[], mapa: Record<string, string>) {
  for (const set of lista || []) for (const v of set.versions || []) {
    const u = v.image_url_2x || v.image_url_1x;
    if (u) mapa[set.set_id + "/" + v.id] = u;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const login = (new URL(req.url).searchParams.get("canal") || CANAL).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const c = cache[login];
  if (c && Date.now() - c.ts < 3600_000) return json({ ok: true, insignias: c.mapa });

  const app = await tokenApp();
  if (!app) return json({ ok: false, error: "sin_token_app" }, 500);

  const mapa: Record<string, string> = {};
  const glob = await helix("/chat/badges/global", app);
  aMapa(glob.body?.data, mapa);
  const u = await helix("/users?login=" + encodeURIComponent(login), app);
  const id = u.body?.data?.[0]?.id;
  if (id) { const ch = await helix("/chat/badges?broadcaster_id=" + id, app); aMapa(ch.body?.data, mapa); } // las del canal pisan a las globales

  if (!Object.keys(mapa).length) return json({ ok: false, error: "twitch" }, 502);
  cache[login] = { ts: Date.now(), mapa };
  return json({ ok: true, insignias: mapa });
});
