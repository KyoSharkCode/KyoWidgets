// KyoWidgets · bot-comandos
// Los comandos del chat de AletaBot (!discord, !amor, !so…). Lo usa la pestaña
// 🦈 AletaBot de Kyo Estudio. Quien RESPONDE en el chat es twitch-bot-events.
//
//   POST {clave, accion:"leer"}                       → {ok, comandos, contadores}
//   POST {clave, accion:"guardar", comandos:[…]}      → los guarda (se aplican en ~10 s)
//   POST {clave, accion:"contador", nombre, valor}    → cambia un contador $(count)
//   POST {clave, accion:"probar", texto, comandos?}   → {ok, comando, respuesta} sin escribir en el chat
//
// La lista es privada (solo con tu código): algún comando puede llevar enlaces personales.
// "Verify JWT" puede quedarse ACTIVADO (el Estudio envía la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY. Tablas: kyo_ajustes y kyo_contadores (sql/04_comandos.sql).

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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

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
const estadoError = (e: string) => e === "clave" ? 401 : e === "bloqueado" ? 429 : 500;
// ---------- Motor de comandos (igual en twitch-bot-events y bot-comandos) ----------
// Entiende la misma sintaxis que Nightbot, para poder copiar los comandos tal cual:
//   $(user) $(touser) $(channel) $(query) $(1)…$(9) $(count) $(random 1-100)
//   $(urlfetch URL) $(customapi URL) $(twitch usuario "texto con {{url}} {{game}} {{name}} {{title}}")
type Comando = { nombre: string; respuesta: string; activo: boolean; nivel: string; espera: number };
type Quien = { nombre: string; login: string; badges: string[] };
const NIVELES = ["todos", "subs", "vips", "mods", "streamer"];

let _cmds: { ts: number; lista: Comando[] } | null = null;
async function leerComandos(db: any, fresco = false): Promise<Comando[]> {
  if (!fresco && _cmds && Date.now() - _cmds.ts < 10_000) return _cmds.lista;
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", "comandos").maybeSingle();
  const lista = Array.isArray(data?.datos?.comandos) ? data.datos.comandos : [];
  _cmds = { ts: Date.now(), lista };
  return lista;
}

// El comando se reconoce por la primera palabra del mensaje: "!amor", "hola", "f"…
function buscarComando(lista: Comando[], texto: string): Comando | null {
  const primera = (texto.trim().split(/\s+/)[0] || "").toLowerCase();
  if (!primera) return null;
  return lista.find((c) => c.activo !== false && c.nombre === primera) || null;
}

function nivelDe(badges: string[]) {
  if (badges.includes("broadcaster")) return 4;
  if (badges.includes("moderator")) return 3;
  if (badges.includes("vip")) return 2;
  if (badges.includes("subscriber") || badges.includes("founder")) return 1;
  return 0;
}
const puedeUsar = (c: Comando, q: Quien) => nivelDe(q.badges) >= Math.max(0, NIVELES.indexOf(c.nivel || "todos"));

async function traerTexto(url: string) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "AletaBot (KyoWidgets)" } });
    clearTimeout(t);
    return (await r.text()).trim().replace(/\s+/g, " ").slice(0, 400);
  } catch { return ""; }
}

async function datosTwitch(login: string, plantilla: string) {
  const l = login.toLowerCase();
  let nombre = login, juego = "", titulo = "";
  const app = await tokenApp();
  if (app) {
    const u = await helix("/users?login=" + encodeURIComponent(l), app);
    const yo = u.body?.data?.[0];
    if (yo) {
      nombre = yo.display_name || login;
      const ch = await helix("/channels?broadcaster_id=" + yo.id, app);
      juego = ch.body?.data?.[0]?.game_name || "";
      titulo = ch.body?.data?.[0]?.title || "";
    }
  }
  return plantilla
    .replace(/\{\{url\}\}/g, "https://twitch.tv/" + l)
    .replace(/\{\{(name|displayName)\}\}/g, nombre)
    .replace(/\{\{game\}\}/g, juego)
    .replace(/\{\{title\}\}/g, titulo);
}

// Rellena las variables y devuelve el texto que escribirá AletaBot
async function componerRespuesta(c: Comando, texto: string, q: Quien, canal: string, count: number) {
  const args = texto.trim().split(/\s+/).slice(1);
  const touser = (args[0] || q.nombre).replace(/^@/, "");
  const simples: Record<string, string> = { user: q.nombre, sender: q.nombre, touser, channel: canal, query: args.join(" ") };
  let r = String(c.respuesta || "");
  r = r.replace(/\$\((user|sender|touser|channel|query)\)/gi, (_, k) => simples[String(k).toLowerCase()]);
  r = r.replace(/\$\(([1-9])\)/g, (_, n) => args[Number(n) - 1] || "");
  r = r.replace(/\$\(count\)/gi, () => String(count));
  r = r.replace(/\$\(random\s+(-?\d+)\s*-\s*(-?\d+)\)/gi, (_, a, b) => {
    const x = Math.min(+a, +b), y = Math.max(+a, +b);
    return String(x + Math.floor(Math.random() * (y - x + 1)));
  });
  for (const m of [...r.matchAll(/\$\(twitch\s+@?(\w+)(?:\s+"([^"]*)")?\)/gi)]) {
    const v = await datosTwitch(m[1], m[2] ?? "{{url}}");
    r = r.replace(m[0], () => v);
  }
  for (const m of [...r.matchAll(/\$\((?:urlfetch|customapi)\s+([^\s)]+)\)/gi)]) {
    const v = await traerTexto(m[1]);
    r = r.replace(m[0], () => v);
  }
  // Twitch no acepta "/me" desde la API: se quita y el mensaje sale normal
  return r.replace(/^\/me\s+/i, "").trim().slice(0, 480);
}
// ---------- fin del motor de comandos ----------

// Limpia lo que llega del Estudio: campos conocidos, tamaños limitados y sin nombres repetidos
function limpiar(l: unknown): Comando[] {
  const vistos = new Set<string>();
  return (Array.isArray(l) ? l : []).slice(0, 200).map((c: any) => ({
    nombre: (String(c?.nombre ?? "").trim().toLowerCase().split(/\s+/)[0] || "").slice(0, 30),
    respuesta: String(c?.respuesta ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 500),
    activo: c?.activo !== false,
    nivel: NIVELES.includes(c?.nivel) ? c.nivel : "todos",
    espera: Math.max(0, Math.min(3600, Math.round(Number(c?.espera ?? 5)) || 0)),
  })).filter((c) => c.nombre && c.respuesta && !vistos.has(c.nombre) && vistos.add(c.nombre));
}

async function contadores(db: any) {
  const { data, error } = await db.from("kyo_contadores").select("nombre, valor");
  const o: Record<string, number> = {};
  (data || []).forEach((r: any) => { o[r.nombre] = Number(r.valor) || 0; });
  return { contadores: o, sql: !error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

  if (body.accion === "leer") {
    const { data, error } = await db.from("kyo_ajustes").select("datos, updated_at").eq("id", "comandos").maybeSingle();
    if (error) return json({ ok: false, error: "tabla" }, 500);
    const k = await contadores(db);
    return json({ ok: true, comandos: limpiar(data?.datos?.comandos), actualizado: data?.updated_at ?? null, contadores: k.contadores, sql: k.sql });
  }

  if (body.accion === "guardar") {
    const comandos = limpiar(body.comandos);
    const ahora = new Date().toISOString();
    const { error } = await db.from("kyo_ajustes").upsert({ id: "comandos", datos: { v: 1, comandos }, updated_at: ahora });
    if (error) return json({ ok: false, error: "tabla" }, 500);
    return json({ ok: true, total: comandos.length, actualizado: ahora });
  }

  if (body.accion === "contador") {
    const nombre = String(body.nombre ?? "").trim().toLowerCase().slice(0, 30);
    const valor = Math.max(0, Math.min(1e12, Math.round(Number(body.valor) || 0)));
    if (!nombre) return json({ ok: false, error: "nombre" }, 400);
    const { error } = await db.from("kyo_contadores").upsert({ nombre, valor });
    if (error) return json({ ok: false, error: "sql" }, 500);
    return json({ ok: true, nombre, valor });
  }

  if (body.accion === "probar") {
    const txt = String(body.texto ?? "").slice(0, 300);
    const lista = Array.isArray(body.comandos) ? limpiar(body.comandos) : await leerComandos(db, true);
    const cmd = buscarComando(lista, txt);
    if (!cmd) return json({ ok: true, comando: null });
    let count = 0;
    if (/\$\(count\)/i.test(cmd.respuesta)) {
      const { data } = await db.from("kyo_contadores").select("valor").eq("nombre", cmd.nombre).maybeSingle();
      count = (Number(data?.valor) || 0) + 1; // el que saldría la próxima vez (no se suma al probar)
    }
    const q: Quien = { nombre: "KyoSumiVT", login: CANAL, badges: ["broadcaster"] };
    const respuesta = await componerRespuesta(cmd, txt, q, CANAL, count);
    return json({ ok: true, comando: cmd.nombre, respuesta });
  }

  return json({ ok: false, error: "accion" }, 400);
});
