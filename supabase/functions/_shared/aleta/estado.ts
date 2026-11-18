// KyoWidgets · AletaBot IA · lo que comparten la conversación (ia.ts) y la memoria (memoria.ts):
// los ajustes, saber si hay directo, el gasto del mes y el registro de cada llamada a Claude.
// Ajustes en kyo_ajustes (filas "ia", "ia_personalidad", "directo", "ia_hilos", "ia_error"). Tablas: sql/09_ia.sql.
//
// Cada consulta a la base de datos cuenta para los límites del plan gratis de Supabase (logs), así que
// un mensaje normal del chat no debe costar ninguna: todo lo que hace falta para decidir si un mensaje
// va para AletaBot se lee junto, en una sola consulta, y se recuerda unos segundos.

import { AJUSTES_IA, HILO_SIGUE, limpiarAjustes, type AjustesIA, type Uso } from "./texto.ts";
import type { Llamada } from "./claude.ts";

// Lo que twitch-bot-events le presta a la IA para hablar con Twitch
export type Contexto = {
  idBot: string;
  // escribe en el chat (como respuesta al mensaje "responderA" si se da). true si Twitch lo aceptó
  decir: (mensaje: string, responderA?: string) => Promise<boolean>;
  // pregunta a Twitch si el canal está en directo: {id, inicio}, null si no, undefined si Twitch no contestó
  enVivo: () => Promise<{ id: string; inicio: string } | null | undefined>;
};

export type Directo = { id: string; inicio: string; enVivo: boolean; fuente: "eventsub" | "helix"; visto: string };
// hilos: con quién acaba de hablar AletaBot (id de Twitch → cuándo le contestó, en milisegundos)
export type Estado = { ajustes: AjustesIA; personalidad: string; directo: Directo | null; hilos: Record<string, number> };

export const ahoraISO = () => new Date(Date.now()).toISOString();
const hace = (iso: string | undefined) => (iso ? Date.now() - Date.parse(iso) : Infinity);

// ---------- Ajustes, personalidad, directo y conversaciones abiertas (una sola consulta, recordada 15 s) ----------
let _estado: { ts: number; e: Estado } | null = null;
export async function leerEstado(db: any, fresco = false): Promise<Estado> {
  if (!fresco && _estado && Date.now() - _estado.ts < 15_000) return _estado.e;
  const { data } = await db.from("kyo_ajustes").select("id, datos").in("id", ["ia", "ia_personalidad", "directo", "ia_hilos"]);
  const fila = (id: string) => (data || []).find((r: any) => r.id === id)?.datos;
  const d = fila("directo");
  const e: Estado = {
    ajustes: limpiarAjustes(fila("ia") || AJUSTES_IA),
    personalidad: String(fila("ia_personalidad")?.texto || ""),
    directo: d?.id ? d : null,
    hilos: fila("ia_hilos") || {},
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
  const nueva: Directo = {
    id: v ? v.id : (fila?.id || "ninguno"), inicio: v ? v.inicio : (fila?.inicio || ahoraISO()),
    enVivo: !!v, fuente: fila?.fuente === "eventsub" ? "eventsub" : "helix", visto: ahoraISO(),
  };
  // se guarda y se actualiza lo recordado en memoria (sin obligar a releer los ajustes)
  await db.from("kyo_ajustes").upsert({ id: "directo", datos: nueva, updated_at: ahoraISO() });
  if (_estado) _estado.e.directo = nueva;
  return v ? { id: v.id, enVivo: true } : fuera;
}

// Avisos de Twitch: empieza o termina el directo (los recibe twitch-bot-events)
export async function eventoDirecto(db: any, tipo: string, ev: any) {
  if (tipo === "stream.online") {
    await guardarFila(db, "directo", { id: String(ev?.id || "directo-" + Date.now()), inicio: ev?.started_at || ahoraISO(), enVivo: true, fuente: "eventsub", visto: ahoraISO() });
    // de paso, borra conversaciones y registros viejos, y los perfiles de quien no viene desde hace un año
    await db.rpc("kyo_ia_limpiar");
    await db.rpc("kyo_viewer_limpiar");
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
