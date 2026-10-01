// KyoWidgets · prediccion
// Las predicciones de Twitch (con tus puntos del canal), desde el Estudio o con !prediccion.
//
//   GET                                                    → estado público (lo lee el overlay cada 2 s)
//   POST {clave, accion:"abrir", titulo, opciones, segundos?} → abre una predicción (2 a 10 opciones) y AletaBot la anuncia
//   POST {clave, accion:"bloquear"}                          → cierra las apuestas
//   POST {clave, accion:"resolver", opcion}                  → elige la opción ganadora (1…n) y reparte los puntos
//   POST {clave, accion:"cancelar"}                          → la cancela y devuelve los puntos
//   POST {clave, accion:"ajustes", ajustes?}                 → lee o guarda el tiempo para apostar por defecto
//
// Necesita tu canal conectado: Estudio → 🔌 Conexiones → "Conectar mi canal" (con TU cuenta KyoSumiVT).
// Si ya hay una predicción en marcha, no abre otra (error "ocupada").
// "Verify JWT" puede quedarse ACTIVADO (el overlay y el Estudio envían la anon key).
// Secretos: TWITCH_CLIENT_SECRET, KYO_SETUP_KEY. Sin SQL nuevo (usa kyo_ajustes y private_tokens).

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

async function decirEnChat(db: any, mensaje: string) {
  const bot = await tokenBot(db);
  const canal = await idCanal();
  if (!bot || !canal || !mensaje) return;
  await helix("/chat/messages", bot.access_token, {
    method: "POST",
    body: JSON.stringify({ broadcaster_id: canal, sender_id: bot.id, message: mensaje.slice(0, 480) }),
  });
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

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;
const enSegundoPlano = (p: Promise<unknown>) => { if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(p); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    try { return json(await prediccionPublica(db)); }
    catch { return json({ ok: false, error: "twitch", prediccion: { estado: "inactivo" } }); }
  }
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

  const responder = async (r: any, anuncio?: (p: any) => string) => {
    if (r.error) return json({ ok: false, error: r.error, detalle: r.detalle || undefined });
    if (anuncio && r.p) enSegundoPlano(decirEnChat(db, anuncio(r.p)));
    _pred = null;
    return json(await prediccionPublica(db));
  };

  switch (body.accion) {
    case "abrir": {
      const opciones = (Array.isArray(body.opciones) ? body.opciones : []).map((o: unknown) => String(o ?? "")).filter((o: string) => o.trim());
      return responder(await abrirPrediccion(db, String(body.titulo ?? ""), opciones, Number(body.segundos) || null), TXT_PRED.abierta);
    }
    case "bloquear": return responder(await terminarPrediccion(db, "LOCKED"), TXT_PRED.bloqueada);
    case "resolver": return responder(await terminarPrediccion(db, "RESOLVED", Number(body.opcion)), TXT_PRED.resultado);
    case "cancelar": return responder(await terminarPrediccion(db, "CANCELED"), TXT_PRED.cancelada);
    case "ajustes": {
      if (body.ajustes) {
        const a = limpiarAjustesPred(body.ajustes);
        await db.from("kyo_ajustes").upsert({ id: "prediccion_ajustes", datos: a, updated_at: new Date().toISOString() });
        return json({ ok: true, ajustes: a });
      }
      return json({ ok: true, ajustes: await leerAjustesPred(db) });
    }
  }
  return json({ ok: false, error: "accion" }, 400);
});
