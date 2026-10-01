// KyoWidgets · sorteo
// Los sorteos de AletaBot.
//
//   GET                                       → estado público (lo lee el overlay de OBS cada 2 s)
//   POST {clave, accion:"abrir", premio}       → abre un sorteo nuevo y AletaBot lo anuncia
//   POST {clave, accion:"cerrar"}              → cierra las entradas
//   POST {clave, accion:"ganador"}             → elige ganador (otra vez = vuelve a sortear sin repetir)
//   POST {clave, accion:"cancelar"}            → lo quita de la pantalla
//   POST {clave, accion:"ajustes", ajustes?}   → lee o guarda las opciones (palabra, solo subs…)
//
// En el chat también se maneja con !sorteo <premio>, !sorteo cerrar, !sorteo cancelar y
// !ganador (tú y tus mods), y la gente entra con !participar (eso lo hace twitch-bot-events).
// "Verify JWT" puede quedarse ACTIVADO (el overlay y el Estudio envían la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY. Tablas: kyo_ajustes y kyo_sorteo (sql/05_sorteos.sql).

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

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;
const enSegundoPlano = (p: Promise<unknown>) => { if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(p); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    try { return json({ ok: true, ...(await sorteoPublico(db)) }); }
    catch { return json({ ok: false, error: "tabla" }, 500); }
  }
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

  switch (body.accion) {
    case "abrir": {
      if (sorteoEnCurso(await leerSorteo(db))) return json({ ok: false, error: "ocupado" });
      const s = await abrirSorteo(db, String(body.premio ?? ""));
      enSegundoPlano(decirEnChat(db, TXT_SORTEO.abierto(s)));
      return json({ ok: true, ...(await sorteoPublico(db)) });
    }
    case "cerrar": {
      const s = await cerrarSorteo(db);
      if (s.estado !== "inactivo") { const n = await contarSorteo(db, s.ronda); enSegundoPlano(decirEnChat(db, TXT_SORTEO.cerrado(s, n))); }
      return json({ ok: true, ...(await sorteoPublico(db)) });
    }
    case "ganador": {
      const r = await elegirGanador(db);
      if (r.error) return json({ ok: false, error: r.error });
      enSegundoPlano(esperar(PAUSA_GANADOR).then(() => decirEnChat(db, TXT_SORTEO.ganador(r.s))));
      return json({ ok: true, ...(await sorteoPublico(db)) });
    }
    case "cancelar": {
      await cancelarSorteo(db);
      return json({ ok: true, ...(await sorteoPublico(db)) });
    }
    case "ajustes": {
      if (body.ajustes) { const a = limpiarAjustesSorteo(body.ajustes); await guardarFila(db, "sorteo_ajustes", a); return json({ ok: true, ajustes: a }); }
      return json({ ok: true, ajustes: limpiarAjustesSorteo(await leerAjustesSorteo(db)) });
    }
  }
  return json({ ok: false, error: "accion" }, 400);
});
