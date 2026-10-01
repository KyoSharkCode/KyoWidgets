// KyoWidgets · twitch-bot-events
// Aquí es donde Twitch llama SOLO, 24/7, cada vez que alguien escribe en tu chat
// (no lo abre nadie a mano). Guarda los últimos mensajes en la tabla kyo_chat (para el
// Chat propio, los Sorteos y las Encuestas) y responde a los COMANDOS del chat que
// configuras en Kyo Estudio → 🦈 AletaBot (se guardan en kyo_ajustes, fila "comandos").
// También lleva los SORTEOS: !participar (todos) y !sorteo / !ganador (tú y tus mods),
// y las ENCUESTAS: se vota escribiendo solo el número y se abren con !encuesta (tú y tus mods),
// y las PREDICCIONES de Twitch (puntos del canal) con !prediccion (tú y tus mods; necesita tu canal conectado).
//
// "Verify JWT" debe estar DESACTIVADO en esta función (Twitch la llama sin tus claves).
// Secretos: KYO_SETUP_KEY y TWITCH_CLIENT_SECRET (la firma se calcula con KYO_SETUP_KEY).
// Tablas: kyo_chat (sql/03_bot.sql), kyo_contadores + función kyo_usar (sql/04_comandos.sql) kyo_sorteo (sql/05_sorteos.sql) y kyo_voto + kyo_votos (sql/06_encuestas.sql).

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
// Un sorteo sigue "en curso" mientras está abierto o cerrado sin ganador: no se puede abrir otro encima
const sorteoEnCurso = (s: Sorteo) => s.estado === "abierto" || s.estado === "cerrado";

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
  ocupado: (s: Sorteo) => "🎁 Ya hay un sorteo en marcha (" + s.premio + "), espera a que termine. Para quitarlo: !sorteo cancelar",
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

// Sorteos por el chat. Devuelve true si el mensaje era del sorteo (y ya está atendido).
let _sorteo: { ts: number; s: Sorteo } | null = null;
async function sorteoReciente(db: any) {
  if (_sorteo && Date.now() - _sorteo.ts < 2000) return _sorteo.s;
  const s = await leerSorteo(db);
  _sorteo = { ts: Date.now(), s };
  return s;
}
async function atenderSorteo(db: any, ev: any, txt: string, badges: string[]): Promise<boolean> {
  const primera = (txt.trim().split(/\s+/)[0] || "").toLowerCase();
  const esMod = badges.includes("broadcaster") || badges.includes("moderator");
  if (primera === "!sorteo" && esMod) {
    _sorteo = null;
    const arg = txt.trim().slice(primera.length).trim(), a = arg.toLowerCase();
    if (!arg) { const s = await leerSorteo(db); await decirEnChat(db, TXT_SORTEO.estado(s, s.ronda ? await contarSorteo(db, s.ronda) : 0)); }
    else if (a === "cerrar") { const s = await cerrarSorteo(db); if (s.estado !== "inactivo") await decirEnChat(db, TXT_SORTEO.cerrado(s, await contarSorteo(db, s.ronda))); }
    else if (a === "cancelar") { await cancelarSorteo(db); await decirEnChat(db, TXT_SORTEO.cancelado()); }
    else {
      const actual = await leerSorteo(db);
      if (sorteoEnCurso(actual)) await decirEnChat(db, TXT_SORTEO.ocupado(actual));
      else { const s = await abrirSorteo(db, arg); await decirEnChat(db, TXT_SORTEO.abierto(s)); }
    }
    return true;
  }
  if (primera === "!ganador" && esMod) {
    _sorteo = null;
    const r = await elegirGanador(db);
    if (r.error) { await decirEnChat(db, r.error === "vacio" ? TXT_SORTEO.vacio() : r.error === "sin_mas" ? TXT_SORTEO.sin_mas() : TXT_SORTEO.estado(r.s, 0)); return true; }
    await esperar(PAUSA_GANADOR);
    await decirEnChat(db, TXT_SORTEO.ganador(r.s));
    return true;
  }
  const s = await sorteoReciente(db);
  if (s.estado !== "inactivo" && primera === s.palabra) {
    const sub = badges.includes("subscriber") || badges.includes("founder");
    await participar(db, s, { login: ev.chatter_user_login, nombre: ev.chatter_user_name || ev.chatter_user_login, sub });
    return true;
  }
  return false;
}

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
// Mientras una encuesta está abierta no se puede abrir otra encima

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
  ocupada: () => "📊 Ya hay una encuesta, espera a que termine. Para quitarla: !encuesta cancelar",
};
// ---------- fin del motor de encuestas ----------

// Encuestas por el chat. Devuelve true si el mensaje era de la encuesta (y ya está atendido).
let _enc: { ts: number; e: Encuesta } | null = null;
async function encuestaReciente(db: any) {
  if (_enc && Date.now() - _enc.ts < 2000) return _enc.e;
  const e = await leerEncuesta(db);
  _enc = { ts: Date.now(), e };
  return e;
}
async function atenderEncuesta(db: any, ev: any, txt: string, badges: string[]): Promise<boolean> {
  const t = txt.trim();
  const primera = (t.split(/\s+/)[0] || "").toLowerCase();
  const esMod = badges.includes("broadcaster") || badges.includes("moderator");
  if (primera === "!encuesta" && esMod) {
    _enc = null;
    const arg = t.slice(primera.length).trim(), a = arg.toLowerCase();
    if (!arg) { const e = await leerEncuesta(db); await decirEnChat(db, TXT_ENC.estado(e, await recuento(db, e))); }
    else if (a === "cerrar") { const r = await cerrarEncuesta(db); if (r.e.estado === "cerrada" && await primerAnuncio(db, r.e.ronda)) await decirEnChat(db, TXT_ENC.resultado(r.e, r.votos)); }
    else if (a === "cancelar") { await cancelarEncuesta(db); await decirEnChat(db, TXT_ENC.cancelada()); }
    else {
      const p = partirEncuesta(arg);
      if (!p) await decirEnChat(db, TXT_ENC.ayuda());
      else if (encuestaAbierta(await leerEncuesta(db))) await decirEnChat(db, TXT_ENC.ocupada());
      else await decirEnChat(db, TXT_ENC.abierta(await abrirEncuesta(db, p.pregunta, p.opciones)));
    }
    return true;
  }
  // Votos: el mensaje es solo un número (1, 2, 3…)
  if (/^[1-9]$/.test(t)) {
    const e = await encuestaReciente(db);
    if (e.estado === "abierta") { await votar(db, e, ev.chatter_user_login, Number(t)); return true; }
  }
  return false;
}

// ---------- Motor de predicciones (igual en twitch-bot-events y prediccion) ----------
// Son las predicciones de verdad de Twitch (con puntos del canal). Twitch solo deja hacerlas con
// el permiso de TU cuenta: se conecta en 🔌 Conexiones → "Conectar mi canal" (private_tokens "twitch_canal").
// Ajustes (tiempo para apostar por defecto) en kyo_ajustes, fila "prediccion_ajustes".

// Lee el token de tu canal y lo renueva solo si hace falta (igual que el de AletaBot)
async function tokenCanal(db: any): Promise<TokenBot | null> {
  const { data } = await db.from("private_tokens").select("value").eq("id", "twitch_canal").maybeSingle();
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
    access_token: j.access_token, refresh_token: j.refresh_token || t.refresh_token,
    expira: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(), id: t.id, login: t.login,
  };
  await db.from("private_tokens").upsert({ id: "twitch_canal", value: JSON.stringify(nuevo), updated_at: new Date().toISOString() });
  return nuevo;
}

type AjustesPred = { segundos: number };
const AJ_PRED: AjustesPred = { segundos: 120 };
const leerAjustesPred = async (db: any): Promise<AjustesPred> => {
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", "prediccion_ajustes").maybeSingle();
  return limpiarAjustesPred(Object.assign({}, AJ_PRED, data?.datos || {}));
};
const limpiarAjustesPred = (a: any): AjustesPred => ({ segundos: Math.max(30, Math.min(1800, Math.round(Number(a?.segundos) || 120))) });
// Twitch cuenta letras, no bytes: cortamos por caracteres (los emojis no se parten)
const cortar = (s: unknown, n: number) => Array.from(String(s ?? "").trim()).slice(0, n).join("");
const predEnCurso = (p: any) => !!p && (p.status === "ACTIVE" || p.status === "LOCKED");

// La predicción más reciente del canal (o null). Error: sin_canal | permiso | twitch
async function prediccionActual(db: any): Promise<{ tk?: TokenBot; p?: any; error?: string }> {
  const tk = await tokenCanal(db);
  if (!tk) return { error: "sin_canal" };
  const r = await helix("/predictions?broadcaster_id=" + tk.id + "&first=1", tk.access_token);
  if (!r.ok) return { tk, error: r.status === 401 || r.status === 403 ? "permiso" : "twitch" };
  return { tk, p: r.body?.data?.[0] || null };
}

// "¿Gana Kyo? | Sí | No | 5m" → título, 2 a 10 opciones y (opcional) tiempo para apostar
function partirPrediccion(texto: string) {
  const partes = String(texto).split("|").map((s) => s.trim()).filter(Boolean);
  let segundos: number | null = null;
  const t = partes.length >= 4 ? /^(\d{1,4})\s*(s|seg|m|min)?$/i.exec(partes[partes.length - 1]) : null;
  if (t) { partes.pop(); segundos = Number(t[1]) * (/^m/i.test(t[2] || "") ? 60 : 1); }
  if (partes.length < 3) return null;
  return { titulo: partes[0], opciones: partes.slice(1, 11), segundos };
}

async function abrirPrediccion(db: any, titulo: string, opciones: string[], segundos?: number | null) {
  const titulo45 = cortar(titulo, 45);
  const ops = opciones.map((o) => cortar(o, 25)).filter(Boolean).slice(0, 10);
  if (!titulo45 || ops.length < 2) return { error: "faltan_opciones" };
  const a = await prediccionActual(db);
  if (a.error) return { error: a.error };
  if (predEnCurso(a.p)) return { error: "ocupada", p: a.p };
  const ventana = segundos ? limpiarAjustesPred({ segundos }).segundos : (await leerAjustesPred(db)).segundos;
  const r = await helix("/predictions", a.tk!.access_token, {
    method: "POST",
    body: JSON.stringify({ broadcaster_id: a.tk!.id, title: titulo45, outcomes: ops.map((title) => ({ title })), prediction_window: ventana }),
  });
  if (!r.ok) {
    const m = String(r.body?.message || "").toLowerCase();
    return { error: /active|already/.test(m) ? "ocupada" : r.status === 403 ? "permiso" : "twitch", detalle: r.body?.message || "" };
  }
  _pred = null;
  return { p: r.body?.data?.[0] };
}

// estado: LOCKED (cerrar apuestas), RESOLVED (con la opción ganadora, 1…n) o CANCELED (devuelve los puntos)
async function terminarPrediccion(db: any, estado: "LOCKED" | "RESOLVED" | "CANCELED", ganadora?: number) {
  const a = await prediccionActual(db);
  if (a.error) return { error: a.error };
  const p = a.p;
  if (!predEnCurso(p)) return { error: "sin_prediccion" };
  if (estado === "LOCKED" && p.status !== "ACTIVE") return { error: "ya_bloqueada", p };
  const cuerpo: any = { broadcaster_id: a.tk!.id, id: p.id, status: estado };
  if (estado === "RESOLVED") {
    const o = p.outcomes?.[(Number(ganadora) || 0) - 1];
    if (!o) return { error: "opcion_mala", p };
    cuerpo.winning_outcome_id = o.id;
  }
  const r = await helix("/predictions", a.tk!.access_token, { method: "PATCH", body: JSON.stringify(cuerpo) });
  if (!r.ok) return { error: r.status === 403 ? "permiso" : "twitch", detalle: r.body?.message || "" };
  _pred = null;
  return { p: r.body?.data?.[0] || p };
}

// Lo que ve el overlay (y el Estudio). Caché de 1,5 s para no llamar a Twitch de más
let _pred: { ts: number; d: any } | null = null;
function publicaDe(p: any) {
  if (!p) return { estado: "inactivo" };
  const ops = (p.outcomes || []).map((o: any) => ({
    titulo: o.title, puntos: Number(o.channel_points) || 0, gente: Number(o.users) || 0,
    top: o.top_predictors?.[0] ? { nombre: o.top_predictors[0].user_name, gano: Number(o.top_predictors[0].channel_points_won) || 0, uso: Number(o.top_predictors[0].channel_points_used) || 0 } : null,
  }));
  const g = (p.outcomes || []).findIndex((o: any) => o.id === p.winning_outcome_id);
  const cierra = p.created_at ? new Date(Date.parse(p.created_at) + (Number(p.prediction_window) || 0) * 1000).toISOString() : null;
  return {
    estado: String(p.status || "").toLowerCase(), // active | locked | resolved | canceled
    id: p.id, titulo: p.title, opciones: ops, ganadora: g, ventana: Number(p.prediction_window) || 0,
    creada: p.created_at || null, cierra, bloqueada: p.locked_at || null, terminada: p.ended_at || null,
    total: ops.reduce((a: number, o: any) => a + o.puntos, 0), gente: ops.reduce((a: number, o: any) => a + o.gente, 0),
  };
}
async function prediccionPublica(db: any) {
  if (_pred && Date.now() - _pred.ts < 1500) return { ..._pred.d, ahora: new Date().toISOString() };
  const a = await prediccionActual(db);
  const d = a.error ? { ok: false, error: a.error, prediccion: { estado: "inactivo" } } : { ok: true, prediccion: publicaDe(a.p) };
  _pred = { ts: Date.now(), d };
  return { ...d, ahora: new Date().toISOString() };
}

const fmtPts = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : String(n);
const fmtTiempo = (s: number) => s >= 60 ? Math.round(s / 60) + " min" : s + " s";
const TXT_PRED = {
  abierta: (p: any) => "🔮 ¡Predicción! " + p.title + " → " + (p.outcomes || []).map((o: any, i: number) => (i + 1) + ") " + o.title).join(" · ") +
    ". Apuesta tus puntos del canal (tienes " + fmtTiempo(Number(p.prediction_window) || 0) + ") 🦈",
  bloqueada: (p: any) => "🔒 ¡Apuestas cerradas! " + p.title + " · Ahora a esperar el resultado 🌊",
  resultado: (p: any) => {
    const o = (p.outcomes || []).find((x: any) => x.id === p.winning_outcome_id);
    if (!o) return "🔮 La predicción «" + p.title + "» terminó.";
    const top = o.top_predictors?.[0];
    return "🔮 ¡Ganó \"" + o.title + "\"! " + (top ? "@" + top.user_name + " se lleva " + fmtPts(Number(top.channel_points_won) || 0) + " puntos 🎉🦈" : "Nadie apostó por ella 🫧");
  },
  cancelada: () => "🔮 La predicción se canceló: se devolvieron los puntos 🫧",
  ocupada: () => "🔮 Ya hay una predicción, espera a que termine. Para quitarla: !prediccion cancelar",
  ayuda: () => "🔮 Para abrir: !prediccion ¿Pregunta? | opción 1 | opción 2 (hasta 10; al final puedes poner el tiempo, como | 5m). Luego: !prediccion bloquear · !prediccion gana 1 · !prediccion cancelar",
  estado: (p: any) => !predEnCurso(p) ? "No hay ninguna predicción activa ahora mismo."
    : "🔮 " + p.title + " → " + (p.outcomes || []).map((o: any, i: number) => (i + 1) + ") " + o.title + " " + fmtPts(Number(o.channel_points) || 0)).join(" · ") +
      (p.status === "LOCKED" ? " (apuestas cerradas)" : ""),
  error: (e: string) => ({
    sin_canal: "🔮 Kyo aún no conectó su canal para las predicciones.",
    permiso: "🔮 Twitch no dejó hacerlo: Kyo tiene que volver a conectar su canal.",
    sin_prediccion: "No hay ninguna predicción activa ahora mismo.",
    ya_bloqueada: "🔒 Las apuestas ya estaban cerradas. Ahora: !prediccion gana 1, 2…",
    opcion_mala: "Esa opción no existe: usa !prediccion gana 1, 2…",
    faltan_opciones: "🔮 Para abrir: !prediccion ¿Pregunta? | opción 1 | opción 2",
  } as Record<string, string>)[e] || "🔮 Twitch no dejó hacerlo ahora mismo 🫧",
};
// ---------- fin del motor de predicciones ----------

// Predicciones por el chat (tú y tus mods). Devuelve true si el mensaje era de la predicción.
async function atenderPrediccion(db: any, txt: string, badges: string[]): Promise<boolean> {
  const t = txt.trim();
  const primera = (t.split(/\s+/)[0] || "").toLowerCase();
  if (!["!prediccion", "!predicción", "!pred"].includes(primera)) return false;
  if (!(badges.includes("broadcaster") || badges.includes("moderator"))) return false;
  const arg = t.slice(primera.length).trim(), a = arg.toLowerCase().split(/\s+/);
  let r: any;
  if (!arg) {
    const x = await prediccionActual(db);
    await decirEnChat(db, x.error ? TXT_PRED.error(x.error) : TXT_PRED.estado(x.p));
    return true;
  }
  if (["bloquear", "cerrar"].includes(a[0])) { r = await terminarPrediccion(db, "LOCKED"); if (!r.error) await decirEnChat(db, TXT_PRED.bloqueada(r.p)); }
  else if (["gana", "ganador", "ganadora", "resolver"].includes(a[0])) { r = await terminarPrediccion(db, "RESOLVED", Number(a[1])); if (!r.error) await decirEnChat(db, TXT_PRED.resultado(r.p)); }
  else if (a[0] === "cancelar") { r = await terminarPrediccion(db, "CANCELED"); if (!r.error) await decirEnChat(db, TXT_PRED.cancelada()); }
  else {
    const p = partirPrediccion(arg);
    if (!p) { await decirEnChat(db, TXT_PRED.ayuda()); return true; }
    r = await abrirPrediccion(db, p.titulo, p.opciones, p.segundos);
    if (!r.error) await decirEnChat(db, TXT_PRED.abierta(r.p));
  }
  if (r?.error) await decirEnChat(db, r.error === "ocupada" ? TXT_PRED.ocupada() : TXT_PRED.error(r.error));
  return true;
}

// Responde a un mensaje del chat si es un comando
const vistos = new Set<string>(); // por si Twitch reenvía el mismo aviso
async function atender(db: any, ev: any, idBot: string, idMensaje: string) {
  const txt = String(ev?.message?.text || "");
  if (!txt || ev.chatter_user_id === idBot) return; // AletaBot no se responde a sí misma
  if (vistos.has(idMensaje)) return;
  vistos.add(idMensaje); if (vistos.size > 500) vistos.clear();

  const badges: string[] = (ev.badges || []).map((b: any) => b.set_id);
  try { if (await atenderSorteo(db, ev, txt, badges)) return; }
  catch { /* si el sorteo falla (p. ej. falta 05_sorteos.sql), los comandos siguen funcionando */ }
  try { if (await atenderEncuesta(db, ev, txt, badges)) return; }
  catch { /* igual con la encuesta (p. ej. falta 06_encuestas.sql) */ }
  try { if (await atenderPrediccion(db, txt, badges)) return; }
  catch { /* y con la predicción */ }

  const c = buscarComando(await leerComandos(db), txt);
  if (!c) return;
  const q: Quien = { nombre: ev.chatter_user_name || ev.chatter_user_login, login: ev.chatter_user_login, badges };
  if (!puedeUsar(c, q)) return;

  // Espera entre usos + contador, de forma segura aunque lo escriban varios a la vez
  const { data: v, error } = await db.rpc("kyo_usar", { p_nombre: c.nombre, p_espera: c.espera ?? 5, p_sumar: /\$\(count\)/i.test(c.respuesta) });
  if (!error && Number(v) === -1) return; // aún en espera
  const respuesta = await componerRespuesta(c, txt, q, ev.broadcaster_user_login || CANAL, error ? 0 : Number(v));
  if (!respuesta) return;

  const bot = await tokenBot(db);
  if (!bot) return;
  await helix("/chat/messages", bot.access_token, {
    method: "POST",
    body: JSON.stringify({ broadcaster_id: ev.broadcaster_user_id, sender_id: bot.id, message: respuesta }),
  });
}

async function guardarEnChat(db: any, ev: any) {
  await db.from("kyo_chat").insert({ usuario: ev?.chatter_user_login || "?", texto: String(ev?.message?.text || "").slice(0, 500) });
  // se queda solo con los últimos 300 mensajes
  const { data: viejo } = await db.from("kyo_chat").select("id").order("id", { ascending: false }).range(300, 300).maybeSingle();
  if (viejo?.id) await db.from("kyo_chat").delete().lte("id", viejo.id);
}

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

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
    const trabajo = Promise.allSettled([
      guardarEnChat(db, ev),
      atender(db, ev, datos.subscription?.condition?.user_id || "", id),
    ]);
    // Se contesta a Twitch enseguida y el trabajo sigue en segundo plano
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(trabajo);
    else await trabajo;
  }

  // revocation u otros tipos: solo confirmamos que llegó
  return new Response("ok", { status: 200 });
});
