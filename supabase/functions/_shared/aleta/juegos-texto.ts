// KyoWidgets · AletaBot IA · fase 3: juegos · reglas puras (sin red ni base de datos)
// El estado de cada juego (turnos, puntos, tiempos) lo lleva el código. La IA solo escribe el contenido:
// las preguntas del banco (antes de jugar) y los trozos de la historia colectiva.

import { limpiarEntrada, limpiarNombre, normalizar } from "./texto.ts";

export type TipoJuego = "trivia" | "adivinanza" | "historia";
export type Pregunta = { id?: number; pregunta: string; respuestas: string[]; pista: string };
export type Aporte = { u: string; n: string; t: string };
export type Marcador = Record<string, { n: string; p: number }>;

// El estado del juego en marcha (kyo_ajustes, fila "juego")
export type Juego = {
  estado: "activo" | "inactivo";
  tipo: TipoJuego;
  partida: number;      // cuándo empezó (ms): identifica la partida
  ronda: number;        // sube con cada pregunta o cada tramo de la historia
  resuelta: boolean;    // la ronda ya tiene dueño (alguien acertó, se acabó el tiempo o está preparándose la siguiente)
  resueltaEn: string;
  rescatada: boolean;
  pistaDada: boolean;
  abierta: string;
  cierra: string;
  n: number;            // pregunta o tramo actual (1…total)
  total: number;
  // trivia y adivinanzas
  pregunta: string;
  respuestas: string[];
  pista: string;
  cola: Pregunta[];     // las preguntas que faltan
  marcador: Marcador;   // puntos de esta partida
  // historia colectiva
  tema: string;
  texto: string[];      // lo que lleva escrito AletaBot
  aportes: Aporte[];    // lo que ha aportado el chat en este tramo
  autores: string[];
};

export const JUEGO_VACIO: Juego = {
  estado: "inactivo", tipo: "trivia", partida: 0, ronda: 0, resuelta: true, resueltaEn: "", rescatada: false, pistaDada: false,
  abierta: "", cierra: "", n: 0, total: 0, pregunta: "", respuestas: [], pista: "", cola: [], marcador: {},
  tema: "", texto: [], aportes: [], autores: [],
};
export const aJuego = (d: any): Juego => ({ ...JUEGO_VACIO, ...(d && typeof d === "object" ? d : {}) });
export const juegoActivo = (j: Juego | null | undefined): boolean => !!j && j.estado === "activo";

// Tiempos (segundos)
export const PREPARACION = 15;       // entre el anuncio y la primera pregunta (da tiempo a que todo el bot se entere)
export const PAUSA = 4;              // entre el resultado y la siguiente pregunta
export const TIEMPO_HISTORIA = 75;   // lo que dura cada tramo de la historia
export const RONDAS_HISTORIA = 5;
export const APORTES_PARA_SEGUIR = 3;
export const PRESUPUESTO = 100;      // segundos que un mismo aviso de Twitch puede quedarse esperando (límite de Supabase: 150)
export const ATASCO = 35;            // si una ronda resuelta no avanza en este tiempo, otro mensaje la rescata

// ---------- Comprobar respuestas ----------
const ARTICULOS = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "the", "a", "an", "de", "del", "al"]);
// "¡El Zelda!" → ["zelda"]: minúsculas, sin acentos ni signos, sin artículos
export function palabrasDe(s: string): string[] {
  const p = normalizar(s).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter(Boolean);
  const sin = p.filter((x) => !ARTICULOS.has(x));
  return sin.length ? sin : p;
}

// ¿El mensaje contiene una de las respuestas válidas? Devuelve la respuesta acertada (tal como está en el banco) o null.
// La respuesta tiene que aparecer entera y en orden ("es mario bros!" acierta "Mario Bros"; "mar" no acierta "Mario").
// Un mensaje larguísimo no cuenta: así nadie acierta soltando una lista de palabras.
export function acierta(mensaje: string, respuestas: string[]): string | null {
  const m = palabrasDe(mensaje);
  if (!m.length || m.length > 10) return null;
  return buscar(m, respuestas);
}
function buscar(m: string[], respuestas: string[]): string | null {
  for (const r of respuestas) {
    const p = palabrasDe(r);
    if (!p.length) continue;
    for (let i = 0; i + p.length <= m.length; i++) {
      if (p.every((x, k) => m[i + k] === x)) return r;
    }
  }
  return null;
}

// La pista: la del banco si la hay; si no, la primera letra y cuántas letras tiene
export function pistaDe(pista: string, respuestas: string[]): string {
  if (pista) return pista;
  const r = String(respuestas[0] || "");
  const letras = Array.from(r.replace(/\s+/g, ""));
  if (!letras.length) return "no tengo pista para esta 🫧";
  const palabras = r.trim().split(/\s+/).length;
  return "empieza por «" + letras[0].toUpperCase() + "» y tiene " + letras.length + " letras" + (palabras > 1 ? " en " + palabras + " palabras" : "");
}

// ---------- Banco de preguntas ----------
// Limpia una pregunta que viene de Claude o del Estudio. null si no sirve.
export function limpiarPregunta(p: any): Pregunta | null {
  const pregunta = limpiarEntrada(p?.pregunta, 220);
  const bruto = Array.isArray(p?.respuestas) ? p.respuestas : String(p?.respuestas ?? "").split(/[|,;]/);
  const vistos = new Set<string>();
  const respuestas = bruto.map((r: unknown) => limpiarEntrada(r, 40)).filter((r: string) => {
    const k = palabrasDe(r).join(" ");
    return k && !vistos.has(k) && vistos.add(k);
  }).slice(0, 6);
  if (Array.from(pregunta).length < 8 || !respuestas.length) return null;
  // la respuesta no puede estar dentro de la propia pregunta
  if (buscar(palabrasDe(pregunta), respuestas)) return null;
  return { pregunta, respuestas, pista: limpiarEntrada(p?.pista, 120) };
}
export const limpiarCategoria = (s: unknown) => limpiarEntrada(s, 30).toLowerCase();

// ---------- Comandos de los juegos ----------
export type OrdenJuego =
  | { orden: "empezar"; tipo: "trivia" | "adivinanza"; n: number; categoria: string }
  | { orden: "historia"; texto: string }   // empezar (mods, con el tema) o aportar (cualquiera)
  | { orden: "fin" }                        // !historia fin (mods)
  | { orden: "parar" }                      // !juego parar (mods)
  | { orden: "puntos" } | { orden: "top" };

export function leerOrdenJuego(texto: string): OrdenJuego | null {
  const t = String(texto || "").trim();
  const primera = normalizar(t.split(/\s+/)[0] || "");
  const resto = t.slice((t.split(/\s+/)[0] || "").length).trim();
  const r = normalizar(resto);
  if (primera === "!trivia" || primera === "!adivinanza" || primera === "!adivinanzas") {
    if (["parar", "para", "stop", "fin", "cancelar"].includes(r)) return { orden: "parar" };
    // "!trivia 8 anime" → 8 preguntas de la categoría "anime" (los dos son opcionales)
    const m = /^(\d{1,2})?\s*(.*)$/.exec(resto) || [];
    return {
      orden: "empezar", tipo: primera === "!trivia" ? "trivia" : "adivinanza",
      n: Math.max(1, Math.min(15, Number(m[1]) || 5)), categoria: limpiarCategoria(m[2] || ""),
    };
  }
  if (primera === "!historia") {
    if (["fin", "final", "terminar", "acabar"].includes(r)) return { orden: "fin" };
    if (["parar", "para", "stop", "cancelar"].includes(r)) return { orden: "parar" };
    return { orden: "historia", texto: limpiarEntrada(resto, 140) };
  }
  if (primera === "!juego" || primera === "!juegos") return ["parar", "para", "stop", "fin", "cancelar"].includes(r) ? { orden: "parar" } : null;
  if (primera === "!puntos") return { orden: "puntos" };
  if (primera === "!top" || primera === "!ranking") return { orden: "top" };
  return null;
}

// ---------- Lo que dice AletaBot durante los juegos (texto fijo: no gasta IA) ----------
const NOMBRE_JUEGO = { trivia: "Trivia", adivinanza: "Adivinanzas", historia: "Historia colectiva" };

export function podio(m: Marcador, cuantos = 3): string {
  const l = Object.values(m).sort((a, b) => b.p - a.p).slice(0, cuantos);
  return l.map((x, i) => ["🥇", "🥈", "🥉"][i] + " " + limpiarNombre(x.n) + " " + x.p).join(" · ");
}

export const TXT_JUEGO = {
  empieza: (tipo: "trivia" | "adivinanza", total: number, seg: number) =>
    "🎮 ¡" + NOMBRE_JUEGO[tipo] + "! " + total + (total === 1 ? " pregunta" : " preguntas") + ", " + seg + " s cada una. Escribe la respuesta en el chat: " +
    "el primero que acierte se lleva el punto. Empezamos en " + PREPARACION + " segundos… 🦈",
  pregunta: (j: Juego, seg: number) => (j.tipo === "adivinanza" ? "🧩" : "❓") + " (" + j.n + "/" + j.total + ") " + j.pregunta + " ⏳ " + seg + " s",
  pista: (p: string) => "💡 Pista: " + p,
  acierto: (nombre: string, respuesta: string, puntos: number) =>
    "✅ ¡" + limpiarNombre(nombre) + " acierta! Era: " + respuesta + " · lleva " + puntos + (puntos === 1 ? " punto" : " puntos"),
  tiempo: (respuesta: string) => "⏰ ¡Tiempo! Era: " + respuesta,
  fin: (j: Juego) => Object.keys(j.marcador).length
    ? "🏆 ¡Se acabó! " + podio(j.marcador) + " · Tus puntos totales: !puntos"
    : "🫧 Se acabó… y nadie acertó ninguna. Hmph, qué vergüenza.",
  parado: (j: Juego) => "🛑 Juego parado." + (Object.keys(j.marcador).length ? " Así iba: " + podio(j.marcador) : ""),
  nada: () => "No hay ningún juego en marcha.",
  ocupado: (j: Juego) => "🎮 Ya hay un juego en marcha (" + NOMBRE_JUEGO[j.tipo] + "). Para pararlo: !juego parar",
  sinPreguntas: (tipo: "trivia" | "adivinanza", categoria: string) =>
    "🫧 No tengo " + (tipo === "trivia" ? "preguntas" : "adivinanzas") + " aprobadas" + (categoria ? " de «" + categoria + "»" : "") + ". Kyo puede generarlas en el Estudio → 🧠 IA → Juegos.",
  apagados: () => "🎮 Los juegos están desactivados ahora mismo.",
  historiaAyuda: () => "📖 Para empezar una historia: !historia y el tema (por ejemplo: !historia una tiburona que abre una cafetería)",
  historiaEmpieza: (inicio: string) => "📖 Historia colectiva · " + inicio + " ✍️ Continúala con !historia y tu frase (una por persona). En un rato sigo yo.",
  historiaSigue: (j: Juego, trozo: string) => "📖 (" + j.n + "/" + j.total + ") " + trozo + " ✍️ ¿Y ahora? !historia y tu frase",
  historiaFin: (trozo: string, autores: string[]) => "📖 " + trozo + " — FIN ✨" + (autores.length ? " Gracias a: " + autores.slice(0, 8).map(limpiarNombre).join(", ") : ""),
  historiaSola: () => "📖 Nadie siguió la historia… así que se queda sin final. Hmph 🫧",
  puntos: (nombre: string, puntos: number, puesto: number) => puntos > 0
    ? "🏅 " + limpiarNombre(nombre) + ": " + puntos + (puntos === 1 ? " punto" : " puntos") + " · puesto " + puesto
    : "🏅 " + limpiarNombre(nombre) + ": todavía no tienes puntos. Se ganan acertando en !trivia y en las adivinanzas.",
  top: (l: { nombre: string; puntos: number }[]) => l.length
    ? "🏆 Top: " + l.map((x, i) => (i + 1) + ") " + limpiarNombre(x.nombre) + " " + x.puntos).join(" · ")
    : "🏆 Todavía no hay puntos. ¡Que alguien pida una !trivia!",
};
