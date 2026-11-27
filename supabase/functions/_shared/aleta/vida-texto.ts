// KyoWidgets · AletaBot IA · la vida de AletaBot · reglas puras (sin red ni base de datos)
// Para que no exista solo dentro del personaje, AletaBot tiene:
//   - memoria de sí misma: lo que va contando de ella (su "canon") y un diario corto de cada directo;
//   - un ánimo distinto cada directo (lo elige el código, o lo fija Kyo desde el Estudio);
//   - noción de dónde está: a qué se juega, cuánto lleva el directo y qué hora es.
// Todo se guarda en kyo_ajustes (filas "aleta_canon", "aleta_diario", "aleta_animo" y "canal").

import { claves, limpiarDato, limpiarEntrada, normalizar } from "./texto.ts";

export type Diario = { directo: string; fecha: string; texto: string };
export type Animo = { texto: string; manual: boolean; directo: string | null };
export type Canal = { juego: string; titulo: string; visto: string };
export type Vida = { canon: string[]; diario: Diario[]; animo: Animo | null; canal: Canal | null };

export const CANON_MAX = 24;  // cosas que recuerda haber dicho de sí misma
export const DIARIO_MAX = 4;  // directos de los que guarda diario

// Lo que llega de la base de datos, con forma segura
export function aVida(canon: any, diario: any, animo: any, canal: any): Vida {
  return {
    canon: (Array.isArray(canon?.lista) ? canon.lista : []).map((x: unknown) => limpiarDato(x)).filter(Boolean).slice(-CANON_MAX),
    diario: (Array.isArray(diario?.lista) ? diario.lista : [])
      .map((d: any) => ({ directo: String(d?.directo || ""), fecha: String(d?.fecha || ""), texto: limpiarEntrada(d?.texto, 420) }))
      .filter((d: Diario) => d.texto).slice(-DIARIO_MAX),
    animo: animo?.texto ? { texto: limpiarEntrada(animo.texto, 200), manual: animo.manual === true, directo: animo.directo ? String(animo.directo) : null } : null,
    canal: canal?.visto ? { juego: limpiarEntrada(canal.juego, 60), titulo: limpiarEntrada(canal.titulo, 140), visto: String(canal.visto) } : null,
  };
}

// ---------- Canon: lo que ha dicho de sí misma ----------
// Añade una cosa nueva. Si repite algo que ya estaba, o es otra variante del mismo tema (comparten dos
// palabras con contenido: "calamares crocantes con salsita" / "calamares crocantes calientes"), sustituye
// la anterior por la nueva: así la lista no se llena de versiones de lo mismo.
// Devuelve la misma lista (el mismo objeto) si no cambia nada.
export function sumarCanon(canon: string[], nuevo: string, juntarTema = true): string[] {
  const dato = limpiarDato(nuevo);
  if (!dato) return canon;
  const n = normalizar(dato);
  if (canon.some((c) => normalizar(c) === n)) return canon;
  const tema = new Set(claves(dato));
  const mismoTema = (c: string) => juntarTema && new Set(claves(c).filter((w) => tema.has(w))).size >= 2;
  const resto = canon.filter((c) => { const v = normalizar(c); return !(v.includes(n) || n.includes(v) || mismoTema(c)); });
  return [...resto, dato].slice(-CANON_MAX);
}

// ---------- Ánimo del día ----------
// Uno por directo. Cambia cómo suena, no quién es.
export const ANIMOS = [
  "Hiperactiva: hoy no puedes estarte quieta y todo te parece emocionante.",
  "Con sueño: dormiste poco y andas a media máquina; estás más tierna de lo que te gustaría y se te escapa algún bostezo.",
  "Competitiva: hoy quieres ganar a lo que sea y retas al chat por cualquier tontería.",
  "Nostálgica: te vienen recuerdos de otros directos y de cuando llegaste al arrecife.",
  "Orgullosa de Kyo: hoy la ves con muy buenos ojos y te cuesta más de lo normal disimularlo.",
  "Gruñona: amaneciste de mal genio y rezongas más, pero se te pasa en cuanto alguien te hace reír.",
  "Curiosa: hoy te dio por preguntar cosas del mundo de arriba y de la vida de la gente del chat.",
  "Juguetona: tienes ganas de bromas y le sigues el juego a quien te lo proponga.",
  "Tranquila: hoy estás en calma, más sincera y menos a la defensiva que de costumbre.",
  "Hambrienta: no dejas de pensar en comida y cualquier tema acaba recordándote a algo rico.",
  "Mimosa: hoy tienes ganas de compañía y de que te pongan atención, aunque antes muerta que pedirlo directamente.",
  "Inspirada: te salen comparaciones raras y frases de poeta mala, y te quedas tan tranquila.",
];
// El mismo directo da siempre el mismo ánimo (aunque el bot se reinicie)
export function elegirAnimo(directoId: string): string {
  let h = 2166136261; // FNV-1a: reparte bien aunque los identificadores se parezcan
  for (const c of String(directoId)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ANIMOS[(h >>> 0) % ANIMOS.length];
}
// El ánimo que toca ahora. Uno fijado por Kyo vale para el siguiente directo entero (y para las pruebas
// de antes, sin gastarse) y después vuelve a elegir ella.
export function animoPara(a: Animo | null, directoId: string, enVivo = true): { animo: Animo; cambia: boolean } {
  if (a && a.directo === directoId) return { animo: a, cambia: false };
  if (a && a.manual && !a.directo) return enVivo ? { animo: { ...a, directo: directoId }, cambia: true } : { animo: a, cambia: false };
  return { animo: { texto: elegirAnimo(directoId), manual: false, directo: directoId }, cambia: true };
}

// ---------- Fechas y duraciones ----------
const ZONA_OK = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){1,2}$/;
export const limpiarZona = (z: unknown) => (typeof z === "string" && ZONA_OK.test(z) ? z : "");

export function duracion(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60), m = min % 60;
  return h + " h" + (m ? " " + m + " min" : "");
}
function fecha(iso: string | number, zona: string, opciones: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try { return new Intl.DateTimeFormat("es", { ...opciones, ...(zona ? { timeZone: zona } : {}) }).format(d); } catch { return ""; }
}

// ---------- Lo que ve el modelo ----------
// Su memoria: va en las instrucciones (en un bloque aparte que solo cambia cuando aprende algo o empieza otro directo).
export function memoriaPropia(v: Vida, zona = ""): string {
  const partes: string[] = [];
  if (v.canon.length) partes.push("Cosas que has contado de ti misma (son verdad para siempre; no te contradigas):\n" + v.canon.map((c) => "- " + c).join("\n"));
  if (v.diario.length) {
    partes.push("Tu diario de los últimos directos (lo más reciente al final):\n" + v.diario.map((d) => {
      const cuando = fecha(d.fecha, zona, { weekday: "long", day: "numeric", month: "long" });
      return "- " + (cuando ? "(" + cuando + ") " : "") + d.texto;
    }).join("\n"));
  }
  if (v.animo?.texto) partes.push("Cómo estás hoy: " + v.animo.texto + " Que se note de fondo en cómo hablas; no lo anuncies por tu cuenta. Si alguien te pregunta cómo estás o cómo te sientes hoy, ahí sí puedes contarlo con tus palabras, si quieres: como cualquier persona, a veces lo dices y a veces te haces la dura.");
  if (!partes.length) return "";
  return "# Tu memoria\nEsto es tuyo: lo que has contado de ti y lo que has vivido. Úsalo como quien se acuerda de su propia vida, cuando venga a cuento; no lo recites ni lo saques en cada mensaje.\n\n" + partes.join("\n\n");
}

// Dónde está ahora mismo: va con cada mensaje (cambia a cada minuto, así que no entra en la caché).
export function bloqueDirecto(o: { enVivo: boolean; inicio?: string; canal: Canal | null; zona: string; ahora?: number }): string {
  const ahora = o.ahora ?? Date.now();
  const hora = o.zona ? fecha(ahora, o.zona, { weekday: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const l: string[] = [];
  if (o.enVivo) {
    const lleva = o.inicio ? Date.parse(o.inicio) : NaN;
    l.push("Kyo está en directo" + (isNaN(lleva) ? "" : " desde hace " + duracion(ahora - lleva)) + ".");
    if (o.canal?.juego) l.push("Juego o categoría: " + o.canal.juego + ".");
    if (o.canal?.titulo) l.push("Título del directo: «" + o.canal.titulo + "».");
  } else {
    l.push("Ahora mismo Kyo no está en directo.");
  }
  if (hora) l.push("Para Kyo ahora es " + hora + ".");
  return "<directo>\n" + l.join(" ") + "\n</directo>\n";
}

// ---------- Diario ----------
// Añade la entrada de un directo (una por directo) y se queda con las últimas
export function sumarDiario(diario: Diario[], entrada: Diario): Diario[] {
  return [...diario.filter((d) => d.directo !== entrada.directo), entrada].slice(-DIARIO_MAX);
}
// !olvidame: fuera las entradas del diario que nombran a esa persona
export function quitarDeDiario(diario: Diario[], nombres: string[]): Diario[] {
  const n = nombres.map((x) => normalizar(x).trim()).filter((x) => x.length >= 3);
  if (!n.length) return diario;
  const limpio = diario.filter((d) => !n.some((x) => normalizar(d.texto).includes(x)));
  return limpio.length === diario.length ? diario : limpio;
}

// ---------- Iniciativa ----------
// ¿Hay ambiente en el chat como para que AletaBot comente algo por su cuenta?
// (varios mensajes recientes de más de una persona, sin contar los suyos ni los comandos)
export function chatConAmbiente(chat: { usuario: string; texto: string; ts: string }[], propios: string[], ahora = Date.now()): boolean {
  const vivos = chat.filter((m) => ahora - Date.parse(m.ts) < 6 * 60_000 && !propios.includes(m.usuario.toLowerCase()) && !m.texto.trim().startsWith("!"));
  return vivos.length >= 5 && new Set(vivos.map((m) => m.usuario)).size >= 2;
}
