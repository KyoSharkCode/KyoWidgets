// KyoWidgets · AletaBot IA · fase 1: menciones y conversación
// Lo usa twitch-bot-events (para contestar en el chat) y aleta-ia (el panel 🧠 IA del Estudio).
//
// Camino de un mensaje, de lo más barato a lo más caro:
//   1. Código: ¿la IA está activa? ¿la nombran, le responden o ya estaban conversando?
//   2. Código: espera por persona, tope del directo y tope de gasto del mes (función SQL kyo_ia_permiso).
//   3. Haiku: filtro previo (¿hay que contestar?, ¿es problemático?).
//   4. Sonnet: la respuesta, con la personalidad en caché + los últimos mensajes + el hilo con esa persona.
//   5. Código: se limpia la respuesta y se apuntan los tokens gastados.
//
// Tablas y funciones SQL: sql/09_ia.sql. Ajustes en kyo_ajustes (filas "ia", "ia_personalidad", "directo", "ia_error").

import {
  AJUSTES_IA, aplicarOrden, detectar, esperaPara, hiloNuevo, hiloSigue, hiloVivo, leerOrden, limpiarAjustes,
  limpiarEntrada, limpiarSalida, rolDe, trozosSecretos, type AjustesIA, type Disparo, type Hilo, type Uso,
} from "./texto.ts";
import { instrucciones, mensajeFiltro, mensajesChat, type Linea, type Quien, type Veredicto } from "./prompt.ts";
import { conversar, filtrar, hayClave, type Llamada } from "./claude.ts";

// Lo que twitch-bot-events le presta a la IA para hablar con Twitch
export type Contexto = {
  idBot: string;
  // escribe en el chat (como respuesta al mensaje "responderA" si se da). true si Twitch lo aceptó
  decir: (mensaje: string, responderA?: string) => Promise<boolean>;
  // pregunta a Twitch si el canal está en directo: {id, inicio}, null si no, undefined si Twitch no contestó
  enVivo: () => Promise<{ id: string; inicio: string } | null | undefined>;
};

type Directo = { id: string; inicio: string; enVivo: boolean; fuente: "eventsub" | "helix"; visto: string };
type Estado = { ajustes: AjustesIA; personalidad: string; directo: Directo | null };

const ahoraISO = () => new Date().toISOString();
const hace = (iso: string | undefined) => (iso ? Date.now() - Date.parse(iso) : Infinity);

// ---------- Ajustes, personalidad y directo (una sola consulta, recordada unos segundos) ----------
let _estado: { ts: number; e: Estado } | null = null;
export async function leerEstado(db: any, fresco = false): Promise<Estado> {
  if (!fresco && _estado && Date.now() - _estado.ts < 8000) return _estado.e;
  const { data } = await db.from("kyo_ajustes").select("id, datos").in("id", ["ia", "ia_personalidad", "directo"]);
  const fila = (id: string) => (data || []).find((r: any) => r.id === id)?.datos;
  const d = fila("directo");
  const e: Estado = {
    ajustes: limpiarAjustes(fila("ia") || AJUSTES_IA),
    personalidad: String(fila("ia_personalidad")?.texto || ""),
    directo: d?.id ? d : null,
  };
  _estado = { ts: Date.now(), e };
  return e;
}
async function guardarFila(db: any, id: string, datos: unknown) {
  _estado = null;
  return await db.from("kyo_ajustes").upsert({ id, datos, updated_at: ahoraISO() });
}
export const guardarAjustes = (db: any, a: unknown) => guardarFila(db, "ia", limpiarAjustes(a));
export const guardarPersonalidad = (db: any, texto: unknown) =>
  guardarFila(db, "ia_personalidad", { texto: String(texto ?? "").replace(/\r/g, "").trim().slice(0, 4000) });

// ---------- ¿Hay directo ahora? ----------
// Lo normal es que Twitch avise (stream.online / stream.offline → eventoDirecto). Si esos avisos aún no
// están activados, o el aviso de fin se perdió, se le pregunta a Twitch de vez en cuando.
async function directoActual(db: any, fila: Directo | null, ctx: Contexto): Promise<{ id: string; enVivo: boolean }> {
  const fuera = { id: "fuera-" + ahoraISO().slice(0, 10), enVivo: false };
  const preguntar = !fila
    || (fila.fuente === "helix" && hace(fila.visto) > 120_000)
    || (fila.enVivo && hace(fila.inicio) > 14 * 3600_000 && hace(fila.visto) > 600_000);
  if (!preguntar) return fila!.enVivo ? { id: fila!.id, enVivo: true } : fuera;
  const v = await ctx.enVivo();
  if (v === undefined) return fila?.enVivo ? { id: fila.id, enVivo: true } : fuera; // Twitch no contestó: se queda lo que había
  const nueva: Directo = {
    id: v ? v.id : (fila?.id || "ninguno"), inicio: v ? v.inicio : (fila?.inicio || ahoraISO()),
    enVivo: !!v, fuente: fila?.fuente === "eventsub" ? "eventsub" : "helix", visto: ahoraISO(),
  };
  await guardarFila(db, "directo", nueva);
  return v ? { id: v.id, enVivo: true } : fuera;
}

// Avisos de Twitch: empieza o termina el directo (los recibe twitch-bot-events)
export async function eventoDirecto(db: any, tipo: string, ev: any) {
  if (tipo === "stream.online") {
    await guardarFila(db, "directo", { id: String(ev?.id || "directo-" + Date.now()), inicio: ev?.started_at || ahoraISO(), enVivo: true, fuente: "eventsub", visto: ahoraISO() });
    await db.rpc("kyo_ia_limpiar"); // de paso, borra conversaciones y registros viejos
  } else if (tipo === "stream.offline") {
    const { directo } = await leerEstado(db, true);
    await guardarFila(db, "directo", { id: directo?.id || "ninguno", inicio: directo?.inicio || ahoraISO(), enVivo: false, fuente: "eventsub", visto: ahoraISO() });
  }
}

// ---------- Gasto ----------
let _gasto: { ts: number; usd: number } | null = null;
export async function gastoMes(db: any, fresco = false): Promise<number> {
  if (!fresco && _gasto && Date.now() - _gasto.ts < 45_000) return _gasto.usd;
  const { data, error } = await db.rpc("kyo_ia_gasto_mes");
  const usd = error ? 0 : Number(data) || 0;
  _gasto = { ts: Date.now(), usd };
  return usd;
}

// Apunta cada llamada (tokens y coste) y, si falló, deja el último error a la vista del Estudio
async function apuntar(db: any, directo: string, tarea: string, r: Llamada<unknown>) {
  if (r.ok) {
    const u: Uso = r.uso;
    if (_gasto) _gasto.usd += r.coste;
    await db.from("kyo_ia_uso").insert({
      directo, tarea, modelo: r.modelo, entrada: u.entrada, salida: u.salida,
      cache_lectura: u.cacheLectura, cache_escritura: u.cacheEscritura, coste: r.coste,
    });
  } else {
    await db.from("kyo_ajustes").upsert({ id: "ia_error", datos: { ts: ahoraISO(), tarea, error: r.error, detalle: r.detalle }, updated_at: ahoraISO() });
  }
}

// ---------- Contexto del chat ----------
// Los últimos mensajes guardados en kyo_chat (sin el que se está contestando, que puede haberse guardado ya)
async function chatReciente(db: any, login: string, texto: string, cuantos = 15): Promise<Linea[]> {
  const { data } = await db.from("kyo_chat").select("usuario, texto").order("id", { ascending: false }).limit(cuantos + 3);
  const l: Linea[] = (data || []).reverse();
  const i = l.map((x) => x.usuario === login && x.texto === texto.slice(0, 500)).lastIndexOf(true);
  if (i >= l.length - 3 && i >= 0) l.splice(i, 1);
  return l.slice(-cuantos).map((x) => ({ usuario: x.usuario, texto: limpiarEntrada(x.texto, 200) })).filter((x) => x.texto);
}

async function leerHilo(db: any, userId: string): Promise<Hilo> {
  const { data } = await db.from("kyo_ia_hilo").select("turnos, seguidos, actualizado").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { turnos: Array.isArray(data.turnos) ? data.turnos : [], seguidos: Number(data.seguidos) || 0, actualizado: data.actualizado };
}

// ---------- Filtro + respuesta ----------
type Pensado = { veredicto: Veredicto | null; respuesta: string; coste: number; error?: string };
async function pensar(db: any, o: { directo: string; chat: Linea[]; hilo: Hilo; q: Quien; texto: string; disparo: Disparo; personalidad: string; tarea?: string }): Promise<Pensado> {
  const f = await filtrar(mensajeFiltro(o.chat, o.q, o.texto, o.disparo));
  await apuntar(db, o.directo, "filtro", f);
  if (!f.ok) return { veredicto: null, respuesta: "", coste: 0, error: f.error };
  if (!f.valor?.responder) return { veredicto: f.valor, respuesta: "", coste: f.coste };

  const sistema = instrucciones(o.personalidad);
  const r = await conversar(sistema, mensajesChat(o.chat, hiloVivo(o.hilo) ? o.hilo!.turnos : [], o.q, o.texto));
  await apuntar(db, o.directo, o.tarea || "chat", r);
  if (!r.ok) return { veredicto: f.valor, respuesta: "", coste: f.coste, error: r.error };
  return { veredicto: f.valor, respuesta: limpiarSalida(r.valor, trozosSecretos(sistema)), coste: f.coste + r.coste };
}

// ---------- Mensajes del chat ----------
// Lo llama twitch-bot-events con cada mensaje que no era un comando.
export async function atenderIA(db: any, ev: any, ctx: Contexto): Promise<void> {
  const bruto = String(ev?.message?.text || "").trim();
  if (!bruto || bruto.startsWith("!")) return;
  // chat compartido con otro canal: solo se contesta a los mensajes escritos en el canal de Kyo
  if (ev.source_broadcaster_user_id && ev.source_broadcaster_user_id !== ev.broadcaster_user_id) return;
  const userId = String(ev.chatter_user_id || ""), login = String(ev.chatter_user_login || "").toLowerCase();
  if (!userId) return;

  const est = await leerEstado(db);
  const aj = est.ajustes;
  if (aj.estado !== "activa" || !hayClave() || aj.ignorar.includes(login)) return;

  const hilo = await leerHilo(db, userId);
  let disparo = detectar(ev, ctx.idBot, aj.nombres);
  if (!disparo) { if (!hiloSigue(hilo)) return; disparo = "hilo"; }

  const badges: string[] = (ev.badges || []).map((b: any) => b.set_id);
  const rol = rolDe(badges);
  const directo = await directoActual(db, est.directo, ctx);
  if (aj.soloEnDirecto && !directo.enVivo && rol !== "streamer" && rol !== "mod") return;
  if (await gastoMes(db) >= aj.topeMes) return;

  const { data: permiso, error } = await db.rpc("kyo_ia_permiso", {
    p_user: userId, p_directo: directo.id, p_espera: esperaPara(aj, hilo, rol === "streamer"), p_tope: aj.topeDirecto,
  });
  if (error) { await apuntar(db, directo.id, "permiso", { ok: false, error: "api", detalle: "Falta ejecutar 09_ia.sql: " + error.message }); return; }
  if (permiso === "tope") { await ctx.decir("💤 Hmph… por hoy ya he hablado bastante. Mañana más (si me apetece) 🦈"); return; }
  if (permiso !== "ok") return;

  const q: Quien = { nombre: ev.chatter_user_name || login, rol };
  const texto = limpiarEntrada(bruto);
  const p = await pensar(db, { directo: directo.id, chat: await chatReciente(db, login, bruto), hilo, q, texto, disparo, personalidad: est.personalidad });

  if (p.veredicto && (p.veredicto.motivo === "toxico" || p.veredicto.avisar_mods)) {
    await db.from("kyo_ia_aviso").insert({ usuario: login, texto: bruto.slice(0, 500), motivo: p.veredicto.motivo, grave: p.veredicto.avisar_mods });
  }
  if (!p.respuesta) return;
  if (!await ctx.decir(p.respuesta, ev.message_id)) return;

  await Promise.allSettled([
    db.rpc("kyo_ia_contar", { p_directo: directo.id }),
    db.from("kyo_ia_hilo").upsert({ user_id: userId, nombre: q.nombre.slice(0, 40), ...hiloNuevo(hilo, texto, p.respuesta) }),
  ]);
}

// ---------- Comandos !ia (Kyo y sus mods) ----------
const usd = (n: number) => n.toFixed(2).replace(".", ",");
const NOMBRE_ESTADO = { activa: "activa ✅", pausada: "en pausa ⏸️", apagada: "apagada 🔌" };

// Devuelve true si el mensaje era un comando !ia y ya está atendido.
export async function comandoIA(db: any, texto: string, badges: string[], ctx: Contexto): Promise<boolean> {
  const orden = leerOrden(texto);
  const rol = rolDe(badges);
  if (!orden || (rol !== "streamer" && rol !== "mod")) return false;

  const est = await leerEstado(db, true);
  if (orden === "estado") {
    const directo = await directoActual(db, est.directo, ctx);
    const [{ data: d }, gasto] = await Promise.all([
      db.from("kyo_directo").select("respuestas").eq("id", directo.id).maybeSingle(),
      gastoMes(db, true),
    ]);
    await ctx.decir(
      "🧠 IA " + NOMBRE_ESTADO[est.ajustes.estado] + (hayClave() ? "" : " (falta la clave de Claude en Supabase)") +
      " · " + (Number(d?.respuestas) || 0) + "/" + est.ajustes.topeDirecto + " respuestas " + (directo.enVivo ? "en este directo" : "hoy fuera de directo") +
      " · gasto del mes ≈ " + usd(gasto) + " de " + usd(est.ajustes.topeMes) + " USD",
    );
    return true;
  }
  const r = aplicarOrden(orden, est.ajustes.estado, rol === "streamer");
  if (r.estado !== est.ajustes.estado) await guardarAjustes(db, { ...est.ajustes, estado: r.estado });
  if (r.aviso) await ctx.decir(r.aviso);
  return true;
}

// ---------- Para el Estudio (función aleta-ia) ----------
// Prueba un mensaje como si lo escribiera alguien del chat, SIN escribir nada en Twitch. Gasta tokens de verdad.
export async function probarIA(db: any, o: { texto: unknown; nombre?: unknown; personalidad?: unknown }) {
  if (!hayClave()) return { ok: false, error: "sin_clave" };
  const est = await leerEstado(db, true);
  if (await gastoMes(db, true) >= est.ajustes.topeMes) return { ok: false, error: "tope_mes" };
  const texto = limpiarEntrada(o.texto);
  if (!texto) return { ok: false, error: "vacio" };
  const personalidad = typeof o.personalidad === "string" ? o.personalidad.slice(0, 4000) : est.personalidad;
  const p = await pensar(db, {
    directo: "pruebas", chat: [], hilo: null, q: { nombre: String(o.nombre || "viewer_de_prueba"), rol: "viewer" },
    texto, disparo: "mencion", personalidad, tarea: "prueba",
  });
  if (p.error) return { ok: false, error: p.error };
  return { ok: true, filtro: p.veredicto, respuesta: p.respuesta, coste: p.coste };
}

export async function resumenIA(db: any) {
  const [est, res, avisos, err] = await Promise.all([
    leerEstado(db, true),
    db.rpc("kyo_ia_resumen"),
    db.from("kyo_ia_aviso").select("ts, usuario, texto, motivo, grave").order("id", { ascending: false }).limit(20),
    db.from("kyo_ajustes").select("datos").eq("id", "ia_error").maybeSingle(),
  ]);
  return {
    ajustes: est.ajustes, personalidad: est.personalidad, directo: est.directo,
    clave: hayClave(), sql: !res.error,
    resumen: res.data || { mes: 0, directos: [] },
    avisos: avisos.data || [],
    error: err.data?.datos || null,
  };
}
