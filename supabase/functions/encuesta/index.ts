// KyoWidgets · encuesta
// Las encuestas de AletaBot, y la fuente única del overlay de sorteos y encuestas.
//
//   GET                                                → {sorteo, encuesta}: lo lee el overlay de OBS cada 2 s
//   POST {clave, accion:"abrir", pregunta, opciones}   → abre una encuesta (2 a 6 opciones) y AletaBot la anuncia
//   POST {clave, accion:"cerrar"}                      → la cierra y AletaBot dice el resultado
//   POST {clave, accion:"cancelar"}                    → la quita de la pantalla
//   POST {clave, accion:"ajustes", ajustes?}           → lee o guarda las opciones (minutos)
//
// En el chat: !encuesta ¿Pregunta? | opción 1 | opción 2 …, !encuesta cerrar, !encuesta cancelar
// (tú y tus mods). La gente vota escribiendo solo el número (eso lo hace twitch-bot-events).
// Si tiene tiempo límite, se cierra sola y AletaBot anuncia el resultado una sola vez.
// "Verify JWT" puede quedarse ACTIVADO (el overlay y el Estudio envían la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY.
// Tablas: kyo_ajustes, kyo_sorteo (05_sorteos.sql), kyo_voto + kyo_votos (06_encuestas.sql), kyo_usar (04_comandos.sql).

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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
// ---------- Motor de sorteos (igual en twitch-bot-events y sorteo) ----------
// Estado en kyo_ajustes (filas "sorteo" y "sorteo_ajustes"); participantes en kyo_sorteo.
type Ganador = { login: string; nombre: string; en: string };
type Sorteo = {
  estado: "inactivo" | "abierto" | "cerrado" | "ganador"; ronda: number; premio: string; palabra: string;
  soloSubs: boolean; suerteSubs: boolean; sinRepetir: boolean; abierto: string | null; cierra: string | null;
  ganador: Ganador | null; ganadores: string[]; recientes: string[];
};
type AjustesSorteo = { palabra: string; soloSubs: boolean; suerteSubs: boolean; sinRepetir: boolean; minutos: number };
const AJ_SORTEO: AjustesSorteo = { palabra: "!participar", soloSubs: false, suerteSubs: false, sinRepetir: false, minutos: 0 };
const SORTEO_VACIO: Sorteo = {
  estado: "inactivo", ronda: 0, premio: "", palabra: "!participar", soloSubs: false, suerteSubs: false, sinRepetir: false,
  abierto: null, cierra: null, ganador: null, ganadores: [], recientes: [],
};

async function leerFila(db: any, id: string, def: any) {
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", id).maybeSingle();
  return Object.assign({}, def, data?.datos || {});
}
async function guardarFila(db: any, id: string, datos: unknown) {
  await db.from("kyo_ajustes").upsert({ id, datos, updated_at: new Date().toISOString() });
}
const leerSorteo = (db: any): Promise<Sorteo> => leerFila(db, "sorteo", SORTEO_VACIO);
const leerAjustesSorteo = (db: any): Promise<AjustesSorteo> => leerFila(db, "sorteo_ajustes", AJ_SORTEO);

function limpiarAjustesSorteo(a: any): AjustesSorteo {
  const palabra = (String(a?.palabra ?? "").trim().toLowerCase().split(/\s+/)[0] || "!participar").slice(0, 30);
  return {
    palabra, soloSubs: !!a?.soloSubs, suerteSubs: !!a?.suerteSubs, sinRepetir: !!a?.sinRepetir,
    minutos: Math.max(0, Math.min(120, Math.round(Number(a?.minutos) || 0))),
  };
}
const abiertoAhora = (s: Sorteo) => s.estado === "abierto" && (!s.cierra || Date.parse(s.cierra) > Date.now());

async function abrirSorteo(db: any, premio: string) {
  const [s, aj] = await Promise.all([leerSorteo(db), leerAjustesSorteo(db)]);
  const ronda = (Number(s.ronda) || 0) + 1;
  await db.from("kyo_sorteo").delete().lt("ronda", ronda);
  const ahora = Date.now();
  const n: Sorteo = {
    estado: "abierto", ronda, premio: (premio.trim() || "Sorteo").slice(0, 60), palabra: aj.palabra,
    soloSubs: aj.soloSubs, suerteSubs: aj.suerteSubs, sinRepetir: aj.sinRepetir,
    abierto: new Date(ahora).toISOString(), cierra: aj.minutos > 0 ? new Date(ahora + aj.minutos * 60_000).toISOString() : null,
    ganador: null, ganadores: [], recientes: s.recientes || [],
  };
  await guardarFila(db, "sorteo", n);
  return n;
}

async function participar(db: any, s: Sorteo, p: { login: string; nombre: string; sub: boolean }) {
  if (!abiertoAhora(s) || (s.soloSubs && !p.sub)) return false;
  const { error } = await db.from("kyo_sorteo")
    .upsert({ ronda: s.ronda, login: p.login, nombre: p.nombre.slice(0, 40), sub: p.sub }, { onConflict: "ronda,login", ignoreDuplicates: true });
  return !error;
}

async function contarSorteo(db: any, ronda: number) {
  const { count } = await db.from("kyo_sorteo").select("login", { count: "exact", head: true }).eq("ronda", ronda);
  return count || 0;
}

async function cerrarSorteo(db: any) {
  const s = await leerSorteo(db);
  if (s.estado === "abierto") { s.estado = "cerrado"; s.cierra = new Date().toISOString(); await guardarFila(db, "sorteo", s); }
  return s;
}

async function cancelarSorteo(db: any) {
  const s = await leerSorteo(db);
  s.estado = "inactivo";
  await guardarFila(db, "sorteo", s);
  return s;
}

// Elige al azar (con suerte doble para subs si está activado). Al volver a sortear no sale nadie que ya ganó en este sorteo.
async function elegirGanador(db: any): Promise<{ s: Sorteo; error?: string; total?: number }> {
  const s = await leerSorteo(db);
  if (s.estado === "inactivo" || !s.ronda) return { s, error: "sin_sorteo" };
  const { data } = await db.from("kyo_sorteo").select("login, nombre, sub").eq("ronda", s.ronda).limit(10000);
  const todos = data || [];
  const fuera = new Set([...(s.ganadores || []), ...(s.sinRepetir ? (s.recientes || []) : [])]); // "no repetir": fuera los últimos 5 ganadores
  const lista = todos.filter((p: any) => !fuera.has(p.login));
  if (!lista.length) return { s, error: todos.length ? "sin_mas" : "vacio", total: todos.length };
  const peso = (p: any) => (s.suerteSubs && p.sub ? 2 : 1);
  const total = lista.reduce((a: number, p: any) => a + peso(p), 0);
  const tiro = (crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * total;
  let acc = 0, g = lista[lista.length - 1];
  for (const p of lista) { acc += peso(p); if (tiro < acc) { g = p; break; } }
  s.estado = "ganador";
  s.ganador = { login: g.login, nombre: g.nombre, en: new Date().toISOString() };
  s.ganadores = [...(s.ganadores || []), g.login];
  s.recientes = [g.login, ...(s.recientes || []).filter((x) => x !== g.login)].slice(0, 5);
  if (!s.cierra || Date.parse(s.cierra) > Date.now()) s.cierra = new Date().toISOString();
  await guardarFila(db, "sorteo", s);
  return { s, total: todos.length };
}

// Lo que ve el overlay de OBS (sin datos internos)
async function sorteoPublico(db: any) {
  const s = await leerSorteo(db);
  let total = 0, nombres: string[] = [];
  if (s.estado !== "inactivo" && s.ronda) {
    const { data, count } = await db.from("kyo_sorteo").select("nombre", { count: "exact" }).eq("ronda", s.ronda).order("ts", { ascending: false }).limit(40);
    total = count || 0;
    nombres = (data || []).map((r: any) => r.nombre).reverse();
  }
  return {
    estado: s.estado === "abierto" && !abiertoAhora(s) ? "cerrado" : s.estado,
    ronda: s.ronda, premio: s.premio, palabra: s.palabra, soloSubs: s.soloSubs, cierra: s.cierra,
    total, nombres, ganador: s.ganador ? { nombre: s.ganador.nombre, en: s.ganador.en } : null, ahora: new Date().toISOString(),
  };
}

// Lo que dice AletaBot en el chat
const TXT_SORTEO = {
  abierto: (s: Sorteo) => "🎁 ¡Sorteo abierto! Premio: " + s.premio + ". Escribe " + s.palabra + " para participar" +
    (s.soloSubs ? " (solo subs)" : "") + (s.cierra ? " · se cierra en " + Math.round((Date.parse(s.cierra) - Date.now()) / 60000) + " min" : "") + " 🦈",
  cerrado: (s: Sorteo, n: number) => "🔒 ¡Se cerraron las entradas del sorteo de " + s.premio + "! " + n + (n === 1 ? " participante" : " participantes") + ". ¡Pronto sabremos quién gana!",
  ganador: (s: Sorteo) => "🎉 ¡Felicidades @" + (s.ganador?.nombre || "") + "! Ganaste el sorteo de " + s.premio + " 🦈💙",
  vacio: () => "🫧 Nadie ha participado todavía en el sorteo.",
  sin_mas: () => "🫧 Ya no quedan participantes sin premio en este sorteo.",
  cancelado: () => "El sorteo se canceló.",
  estado: (s: Sorteo, n: number) => s.estado === "inactivo" ? "No hay ningún sorteo activo ahora mismo."
    : "🎁 Sorteo de " + s.premio + ": " + n + (n === 1 ? " participante" : " participantes") + (abiertoAhora(s) ? ". Escribe " + s.palabra + " para entrar." : " (entradas cerradas)."),
};

async function decirEnChat(db: any, mensaje: string) {
  const bot = await tokenBot(db);
  const canal = await idCanal();
  if (!bot || !canal || !mensaje) return;
  await helix("/chat/messages", bot.access_token, {
    method: "POST",
    body: JSON.stringify({ broadcaster_id: canal, sender_id: bot.id, message: mensaje.slice(0, 480) }),
  });
}
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
// El overlay tarda unos segundos en revelar al ganador: AletaBot lo dice justo después
const PAUSA_GANADOR = 6500;
// ---------- fin del motor de sorteos ----------
// ---------- Motor de encuestas (igual en twitch-bot-events y encuesta) ----------
// Usa leerFila / guardarFila del motor de sorteos. Estado en kyo_ajustes (filas "encuesta"
// y "encuesta_ajustes"); votos en kyo_voto; recuento con la función kyo_votos.
type Encuesta = {
  estado: "inactivo" | "abierta" | "cerrada"; ronda: number; pregunta: string; opciones: string[];
  abierta: string | null; cierra: string | null; cerradaEn: string | null;
};
const ENC_VACIA: Encuesta = { estado: "inactivo", ronda: 0, pregunta: "", opciones: [], abierta: null, cierra: null, cerradaEn: null };
const leerEncuesta = (db: any): Promise<Encuesta> => leerFila(db, "encuesta", ENC_VACIA);
const leerAjustesEncuesta = (db: any): Promise<{ minutos: number }> => leerFila(db, "encuesta_ajustes", { minutos: 0 });
const limpiarAjustesEncuesta = (a: any) => ({ minutos: Math.max(0, Math.min(120, Math.round(Number(a?.minutos) || 0))) });
const encuestaAbierta = (e: Encuesta) => e.estado === "abierta" && (!e.cierra || Date.parse(e.cierra) > Date.now());

// "¿Qué jugamos? | LoL | Fortnite | ZZZ" → pregunta + 2 a 6 opciones
function partirEncuesta(texto: string) {
  const partes = String(texto).split("|").map((s) => s.trim()).filter(Boolean);
  if (partes.length < 3) return null;
  return { pregunta: partes[0].slice(0, 90), opciones: partes.slice(1, 7).map((o) => o.slice(0, 40)) };
}

async function abrirEncuesta(db: any, pregunta: string, opciones: string[]) {
  const [e, aj] = await Promise.all([leerEncuesta(db), leerAjustesEncuesta(db)]);
  const ronda = (Number(e.ronda) || 0) + 1;
  await db.from("kyo_voto").delete().lt("ronda", ronda);
  const ahora = Date.now();
  const n: Encuesta = {
    estado: "abierta", ronda, pregunta: pregunta.slice(0, 90), opciones: opciones.slice(0, 6).map((o) => o.slice(0, 40)),
    abierta: new Date(ahora).toISOString(), cierra: aj.minutos > 0 ? new Date(ahora + aj.minutos * 60_000).toISOString() : null, cerradaEn: null,
  };
  await guardarFila(db, "encuesta", n);
  return n;
}

// Un voto por persona; si vuelve a votar, se cambia
async function votar(db: any, e: Encuesta, login: string, n: number) {
  if (!encuestaAbierta(e) || !(n >= 1 && n <= e.opciones.length)) return false;
  const { error } = await db.from("kyo_voto").upsert({ ronda: e.ronda, login, opcion: n, ts: new Date().toISOString() }, { onConflict: "ronda,login" });
  return !error;
}

async function recuento(db: any, e: Encuesta) {
  const votos = e.opciones.map(() => 0);
  if (!e.ronda) return votos;
  const { data } = await db.rpc("kyo_votos", { p_ronda: e.ronda });
  (data || []).forEach((r: any) => { const i = Number(r.opcion) - 1; if (i >= 0 && i < votos.length) votos[i] = Number(r.votos) || 0; });
  return votos;
}
function ganadoras(votos: number[]) {
  const max = Math.max(0, ...votos);
  return max > 0 ? votos.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0) : [];
}

// Solo la primera llamada por encuesta devuelve true (así AletaBot anuncia el resultado una vez,
// aunque el overlay esté en varias escenas de OBS a la vez). Usa kyo_usar de 04_comandos.sql.
async function primerAnuncio(db: any, ronda: number) {
  const { data, error } = await db.rpc("kyo_usar", { p_nombre: "encuesta-" + ronda, p_espera: 86400, p_sumar: false });
  return error ? true : Number(data) !== -1;
}

async function cerrarEncuesta(db: any) {
  const e = await leerEncuesta(db);
  if (e.estado === "abierta") {
    e.estado = "cerrada"; e.cerradaEn = new Date().toISOString();
    if (!e.cierra || Date.parse(e.cierra) > Date.now()) e.cierra = e.cerradaEn;
    await guardarFila(db, "encuesta", e);
  }
  return { e, votos: await recuento(db, e) };
}
async function cancelarEncuesta(db: any) {
  const e = await leerEncuesta(db);
  e.estado = "inactivo";
  await guardarFila(db, "encuesta", e);
  return e;
}

// Lo que ve el overlay. Si se acabó el tiempo, la cierra y devuelve el anuncio para el chat (una sola vez).
async function encuestaPublica(db: any) {
  const e = await leerEncuesta(db);
  let anuncio: string | null = null;
  if (e.estado === "abierta" && e.cierra && Date.parse(e.cierra) <= Date.now()) {
    e.estado = "cerrada"; e.cerradaEn = e.cierra;
    await guardarFila(db, "encuesta", e);
    if (await primerAnuncio(db, e.ronda)) anuncio = "cerrada";
  }
  const votos = e.estado === "inactivo" ? [] : await recuento(db, e);
  if (anuncio) anuncio = TXT_ENC.resultado(e, votos);
  return {
    pub: {
      estado: e.estado, ronda: e.ronda, pregunta: e.pregunta, opciones: e.opciones, votos,
      total: votos.reduce((a, b) => a + b, 0), cierra: e.cierra, cerradaEn: e.cerradaEn,
      ganadoras: e.estado === "cerrada" ? ganadoras(votos) : [], ahora: new Date().toISOString(),
    },
    anuncio,
  };
}

const pct = (v: number, t: number) => (t ? Math.round((v / t) * 100) : 0);
const TXT_ENC = {
  abierta: (e: Encuesta) => "📊 ¡Encuesta! " + e.pregunta + " → " + e.opciones.map((o, i) => (i + 1) + ") " + o).join(" · ") +
    ". Vota escribiendo solo el número" + (e.cierra ? " (tienes " + Math.round((Date.parse(e.cierra) - Date.now()) / 60000) + " min)" : "") + " 🦈",
  resultado: (e: Encuesta, votos: number[]) => {
    const t = votos.reduce((a, b) => a + b, 0), g = ganadoras(votos);
    if (!t) return "📊 La encuesta «" + e.pregunta + "» terminó sin votos 🫧";
    if (g.length > 1) return "📊 ¡Empate en «" + e.pregunta + "»! " + g.map((i) => "\"" + e.opciones[i] + "\"").join(" y ") + " con " + pct(votos[g[0]], t) + "% cada una 🌊";
    return "📊 Resultado de «" + e.pregunta + "»: ganó \"" + e.opciones[g[0]] + "\" con " + pct(votos[g[0]], t) + "% (" + votos[g[0]] + (votos[g[0]] === 1 ? " voto" : " votos") + ") 🎉🦈";
  },
  estado: (e: Encuesta, votos: number[]) => e.estado === "inactivo" ? "No hay ninguna encuesta activa ahora mismo."
    : "📊 " + e.pregunta + " → " + e.opciones.map((o, i) => (i + 1) + ") " + o + " " + pct(votos[i], votos.reduce((a, b) => a + b, 0)) + "%").join(" · ") +
      (encuestaAbierta(e) ? ". Vota con el número." : " (cerrada)."),
  ayuda: () => "Para abrir una encuesta: !encuesta ¿Pregunta? | opción 1 | opción 2 (hasta 6 opciones)",
  cancelada: () => "La encuesta se canceló.",
};
// ---------- fin del motor de encuestas ----------

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;
const enSegundoPlano = (p: Promise<unknown>) => { if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(p); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const [so, en] = await Promise.allSettled([sorteoPublico(db), encuestaPublica(db)]);
    if (en.status === "fulfilled" && en.value.anuncio) enSegundoPlano(decirEnChat(db, en.value.anuncio));
    return json({
      ok: true,
      sorteo: so.status === "fulfilled" ? so.value : null,
      encuesta: en.status === "fulfilled" ? en.value.pub : null,
    });
  }
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

  const estado = async () => ({ ok: true, encuesta: (await encuestaPublica(db)).pub });
  switch (body.accion) {
    case "abrir": {
      const pregunta = String(body.pregunta ?? "").trim();
      const opciones = (Array.isArray(body.opciones) ? body.opciones : []).map((o: unknown) => String(o ?? "").trim()).filter(Boolean);
      if (!pregunta || opciones.length < 2) return json({ ok: false, error: "faltan_opciones" }, 400);
      const e = await abrirEncuesta(db, pregunta, opciones);
      enSegundoPlano(decirEnChat(db, TXT_ENC.abierta(e)));
      return json(await estado());
    }
    case "cerrar": {
      const r = await cerrarEncuesta(db);
      if (r.e.estado === "cerrada" && await primerAnuncio(db, r.e.ronda)) enSegundoPlano(decirEnChat(db, TXT_ENC.resultado(r.e, r.votos)));
      return json(await estado());
    }
    case "cancelar": {
      await cancelarEncuesta(db);
      return json(await estado());
    }
    case "ajustes": {
      if (body.ajustes) { const a = limpiarAjustesEncuesta(body.ajustes); await guardarFila(db, "encuesta_ajustes", a); return json({ ok: true, ajustes: a }); }
      return json({ ok: true, ajustes: limpiarAjustesEncuesta(await leerAjustesEncuesta(db)) });
    }
  }
  return json({ ok: false, error: "accion" }, 400);
});
