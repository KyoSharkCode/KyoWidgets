// KyoWidgets · AletaBot IA · lo que comparten la conversación (ia.ts) y la memoria (memoria.ts):
// los ajustes, saber si hay directo, el gasto del mes y el registro de cada llamada a Claude.
// Ajustes en kyo_ajustes (filas "ia", "ia_personalidad", "directo", "ia_hilos", "ia_error"). Tablas: sql/09_ia.sql.
//
// Cada consulta a la base de datos cuenta para los límites del plan gratis de Supabase (logs), así que
// un mensaje normal del chat no debe costar ninguna: todo lo que hace falta para decidir si un mensaje
// va para AletaBot se lee junto, en una sola consulta, y se recuerda unos segundos.

import { AJUSTES_IA, HILO_SIGUE, limpiarAjustes, type AjustesIA, type Uso } from "./texto.ts";
import { aJuego, juegoActivo, type Juego } from "./juegos-texto.ts";
import { aVida, type Vida } from "./vida-texto.ts";
import type { Llamada } from "./claude.ts";

// Lo que twitch-bot-events le presta a la IA para hablar con Twitch
export type Contexto = {
  idBot: string;
  // escribe en el chat (como respuesta al mensaje "responderA" si se da). true si Twitch lo aceptó
  decir: (mensaje: string, responderA?: string) => Promise<boolean>;
  // pregunta a Twitch si el canal está en directo: {id, inicio}, null si no, undefined si Twitch no contestó
  enVivo: () => Promise<{ id: string; inicio: string } | null | undefined>;
  // pregunta a Twitch a qué se está jugando y el título del directo (undefined si Twitch no contestó)
  canal?: () => Promise<{ juego: string; titulo: string } | undefined>;
  // esperar unos milisegundos (los juegos lo usan para los tiempos; las pruebas lo sustituyen por un reloj de mentira)
  dormir?: (ms: number) => Promise<void>;
};

// fin: cuándo terminó. alias: el id que le da Twitch cuando el directo se cortó y volvió (aquí sigue siendo
// el mismo directo). reanudado: cuándo volvió.
export type Directo = { id: string; inicio: string; enVivo: boolean; fuente: "eventsub" | "helix"; visto: string; fin?: string; alias?: string; reanudado?: string };

// Si Kyo vuelve a emitir menos de una hora después de terminar, el directo se cayó y lo retomó: es el mismo
// (mismos saludos, mismo ánimo, un solo diario), aunque Twitch le dé otro identificador.
export const REANUDA_MS = 60 * 60_000;
export function filaOnline(fila: Directo | null, twitchId: string, inicio: string, fuente: "eventsub" | "helix", ahora = Date.now()): Directo {
  const vivo = { enVivo: true, fuente, visto: new Date(ahora).toISOString() };
  if (fila?.id && fila.id !== "ninguno") {
    if (fila.id === twitchId || fila.alias === twitchId) return { ...fila, ...vivo, fin: undefined };
    if (!fila.enVivo && fila.fin && ahora - Date.parse(fila.fin) < REANUDA_MS) {
      return { ...fila, ...vivo, fin: undefined, alias: twitchId, reanudado: vivo.visto };
    }
  }
  return { id: twitchId, inicio, ...vivo };
}
const filaOffline = (fila: Directo | null, fuente: "eventsub" | "helix"): Directo => ({
  ...(fila || {}), id: fila?.id || "ninguno", inicio: fila?.inicio || ahoraISO(), enVivo: false, fuente, visto: ahoraISO(),
  fin: fila && !fila.enVivo && fila.fin ? fila.fin : ahoraISO(),
});
// hilos: con quién acaba de hablar AletaBot (id de Twitch → cuándo le contestó, en milisegundos)
// juego: el juego en marcha (trivia, adivinanzas o historia), si lo hay
// vida: lo que AletaBot recuerda de sí misma, su ánimo de hoy y lo que sabe del canal
export type Estado = { ajustes: AjustesIA; personalidad: string; directo: Directo | null; hilos: Record<string, number>; juego: Juego; vida: Vida };

export const ahoraISO = () => new Date(Date.now()).toISOString();
const hace = (iso: string | undefined) => (iso ? Date.now() - Date.parse(iso) : Infinity);

// ---------- Ajustes, personalidad, directo, conversaciones abiertas y juego (una sola consulta, recordada 15 s) ----------
// Mientras hay un juego en marcha se recuerda solo 2 s: las respuestas del chat tienen que compararse con la pregunta actual.
let _estado: { ts: number; e: Estado } | null = null;
export async function leerEstado(db: any, fresco = false): Promise<Estado> {
  if (!fresco && _estado && Date.now() - _estado.ts < (juegoActivo(_estado.e.juego) ? 2000 : 15_000)) return _estado.e;
  const { data } = await db.from("kyo_ajustes").select("id, datos")
    .in("id", ["ia", "ia_personalidad", "directo", "ia_hilos", "juego", "aleta_canon", "aleta_diario", "aleta_animo", "canal"]);
  const fila = (id: string) => (data || []).find((r: any) => r.id === id)?.datos;
  const d = fila("directo");
  const e: Estado = {
    ajustes: limpiarAjustes(fila("ia") || AJUSTES_IA),
    personalidad: String(fila("ia_personalidad")?.texto || ""),
    directo: d?.id ? d : null,
    hilos: fila("ia_hilos") || {},
    juego: aJuego(fila("juego")),
    vida: aVida(fila("aleta_canon"), fila("aleta_diario"), fila("aleta_animo"), fila("canal")),
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

// Una parte de la vida de AletaBot (canon, diario, ánimo o datos del canal): se guarda y se actualiza
// lo recordado en memoria, sin obligar a releer los ajustes.
export async function guardarVida(db: any, parte: "canon" | "diario" | "animo" | "canal", valor: unknown) {
  const id = parte === "canal" ? "canal" : "aleta_" + parte;
  const datos = parte === "canon" || parte === "diario" ? { lista: valor } : (valor ?? {});
  const r = await db.from("kyo_ajustes").upsert({ id, datos, updated_at: ahoraISO() });
  if (_estado) {
    const v = _estado.e.vida;
    _estado.e.vida = aVida(
      parte === "canon" ? datos : { lista: v.canon }, parte === "diario" ? datos : { lista: v.diario },
      parte === "animo" ? datos : v.animo, parte === "canal" ? datos : v.canal,
    );
  }
  return r;
}
// Lo último guardado de una parte (antes de añadirle algo, por si otro mensaje la cambió hace un momento)
export async function leerVidaFresca(db: any): Promise<Vida> {
  const { data } = await db.from("kyo_ajustes").select("id, datos").in("id", ["aleta_canon", "aleta_diario", "aleta_animo", "canal"]);
  const fila = (id: string) => (data || []).find((r: any) => r.id === id)?.datos;
  const v = aVida(fila("aleta_canon"), fila("aleta_diario"), fila("aleta_animo"), fila("canal"));
  if (_estado) _estado.e.vida = v;
  return v;
}

// El juego en marcha: se guarda y se actualiza lo recordado en memoria
export async function guardarJuego(db: any, j: Juego) {
  await db.from("kyo_ajustes").upsert({ id: "juego", datos: j, updated_at: ahoraISO() });
  if (_estado) _estado.e.juego = j;
}
export async function leerJuego(db: any): Promise<Juego> {
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", "juego").maybeSingle();
  const j = aJuego(data?.datos);
  if (_estado) _estado.e.juego = j;
  return j;
}

// AletaBot acaba de contestar a alguien: se apunta para que su siguiente mensaje, aunque no la nombre,
// pueda contar como continuación. Así no hay que consultar la conversación de cada persona que escribe.
export async function marcarHilo(db: any, userId: string) {
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", "ia_hilos").maybeSingle();
  const ahora = Date.now(), vivos: Record<string, number> = {};
  for (const [k, v] of Object.entries(data?.datos || {})) if (ahora - Number(v) < HILO_SIGUE * 1000) vivos[k] = Number(v);
  vivos[userId] = ahora;
  await db.from("kyo_ajustes").upsert({ id: "ia_hilos", datos: vivos, updated_at: ahoraISO() });
  if (_estado) _estado.e.hilos = vivos;
}

// ---------- ¿Hay directo ahora? ----------
// Lo normal es que Twitch avise (stream.online / stream.offline → eventoDirecto). Si esos avisos aún no
// están activados, o el aviso de fin se perdió, se le pregunta a Twitch de vez en cuando.
export async function directoActual(db: any, fila: Directo | null, ctx: Contexto): Promise<{ id: string; enVivo: boolean }> {
  const fuera = { id: "fuera-" + ahoraISO().slice(0, 10), enVivo: false };
  const preguntar = !fila
    || (fila.fuente === "helix" && hace(fila.visto) > 120_000)
    || (fila.enVivo && hace(fila.inicio) > 14 * 3600_000 && hace(fila.visto) > 600_000);
  if (!preguntar) return fila!.enVivo ? { id: fila!.id, enVivo: true } : fuera;
  const v = await ctx.enVivo();
  if (v === undefined) return fila?.enVivo ? { id: fila.id, enVivo: true } : fuera; // Twitch no contestó: se queda lo que había
  const fuente = fila?.fuente === "eventsub" ? "eventsub" : "helix";
  const nueva: Directo = v ? filaOnline(fila, v.id, v.inicio, fuente) : filaOffline(fila, fuente);
  // se guarda y se actualiza lo recordado en memoria (sin obligar a releer los ajustes)
  await db.from("kyo_ajustes").upsert({ id: "directo", datos: nueva, updated_at: ahoraISO() });
  if (_estado) _estado.e.directo = nueva;
  return v ? { id: nueva.id, enVivo: true } : fuera;
}

// Avisos de Twitch: empieza o termina el directo (los recibe twitch-bot-events)
// Devuelve cómo queda el directo (null si el aviso no era de empezar ni de terminar).
export async function eventoDirecto(db: any, tipo: string, ev: any): Promise<Directo | null> {
  if (tipo === "stream.online") {
    const { directo } = await leerEstado(db, true);
    const nueva = filaOnline(directo, String(ev?.id || "directo-" + Date.now()), ev?.started_at || ahoraISO(), "eventsub");
    await guardarFila(db, "directo", nueva);
    // de paso, borra conversaciones y registros viejos, y los perfiles de quien no viene desde hace un año
    await db.rpc("kyo_ia_limpiar");
    await db.rpc("kyo_viewer_limpiar");
    await db.rpc("kyo_juego_limpiar");
    return nueva;
  }
  if (tipo === "stream.offline") {
    const { directo } = await leerEstado(db, true);
    const nueva = filaOffline(directo, "eventsub");
    await guardarFila(db, "directo", nueva);
    return nueva;
  }
  return null;
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
export async function apuntar(db: any, directo: string, tarea: string, r: Llamada<unknown>) {
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
