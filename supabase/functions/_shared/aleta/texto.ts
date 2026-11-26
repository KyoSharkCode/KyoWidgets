// KyoWidgets · AletaBot IA · lógica pura (sin red ni base de datos)
// Todo lo de aquí se puede probar en el PC con: node pruebas/ia/probar.mjs
// Decide si un mensaje va para AletaBot, limpia lo que entra y lo que sale,
// entiende los comandos !ia y calcula el coste de cada llamada.

// ---------- Ajustes ----------
export type EstadoIA = "activa" | "pausada" | "apagada";
export type AjustesIA = {
  estado: EstadoIA;
  cooldown: number;       // segundos entre conversaciones nuevas, por persona
  esperaHilo: number;     // segundos entre turnos dentro de una conversación ya abierta
  turnosHilo: number;     // turnos rápidos seguidos antes de volver al cooldown normal
  topeDirecto: number;    // respuestas de IA como máximo en un directo (0 = sin tope)
  topePersona: number;    // respuestas de IA como máximo a cada persona en un directo
  topeMes: number;        // gasto máximo del mes, en USD (al llegar, la IA se calla sola)
  soloEnDirecto: boolean; // fuera de directo solo contesta a Kyo y a sus mods (para probar)
  nombres: string[];      // palabras que cuentan como "me están hablando a mí"
  ignorar: string[];      // otras cuentas bot a las que nunca contesta
  memoria: boolean;       // recordar a los viewers (perfil pequeño por persona)
  saludos: boolean;       // saludar a los habituales cuando llegan (una vez por directo)
  saludarDesde: number;   // a partir de cuántos directos alguien cuenta como habitual
  juegos: boolean;        // trivia, adivinanzas e historia colectiva
  tiempoPregunta: number; // segundos para contestar cada pregunta de trivia (las adivinanzas, un 50 % más)
  iniciativa: boolean;    // de vez en cuando comenta algo por su cuenta, sin que la nombren
  cadaMinutos: number;    // como mucho un comentario por su cuenta cada tantos minutos
  zona: string;           // la zona horaria de Kyo (la manda el Estudio), para que sepa qué hora es
};

export const AJUSTES_IA: AjustesIA = {
  estado: "apagada",
  cooldown: 30,
  esperaHilo: 6,
  turnosHilo: 6,
  topeDirecto: 0,
  topePersona: 100,
  topeMes: 40,
  soloEnDirecto: true,
  nombres: ["aletabot", "aleta"],
  ignorar: ["streamelements", "nightbot", "streamlabs", "moobot", "fossabot", "sery_bot", "wizebot"],
  memoria: true,
  saludos: true,
  saludarDesde: 3,
  juegos: true,
  tiempoPregunta: 30,
  iniciativa: true,
  cadaMinutos: 12,
  zona: "",
};

const entero = (v: unknown, min: number, max: number, def: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
};
const palabras = (v: unknown, max: number, def: string[]) => {
  const l = (Array.isArray(v) ? v : String(v ?? "").split(/[,\s]+/))
    .map((s) => normalizar(String(s)).replace(/[^a-z0-9_]/g, "").slice(0, 25)).filter((s) => s.length >= 3);
  const unicas = [...new Set(l)].slice(0, max);
  return unicas.length ? unicas : def;
};

// Limpia lo que llega del Estudio o de la base de datos: campos conocidos y valores dentro de límites
export function limpiarAjustes(a: any): AjustesIA {
  const d = AJUSTES_IA;
  const topeMes = Number(a?.topeMes);
  return {
    estado: ["activa", "pausada", "apagada"].includes(a?.estado) ? a.estado : d.estado,
    cooldown: entero(a?.cooldown, 5, 600, d.cooldown),
    esperaHilo: entero(a?.esperaHilo, 2, 120, d.esperaHilo),
    turnosHilo: entero(a?.turnosHilo, 1, 20, d.turnosHilo),
    topeDirecto: entero(a?.topeDirecto, 0, 5000, d.topeDirecto),
    topePersona: entero(a?.topePersona, 1, 1000, d.topePersona),
    topeMes: Number.isFinite(topeMes) ? Math.max(1, Math.min(1000, Math.round(topeMes * 100) / 100)) : d.topeMes,
    soloEnDirecto: a?.soloEnDirecto !== false,
    nombres: palabras(a?.nombres, 6, d.nombres),
    ignorar: a?.ignorar === undefined ? d.ignorar : palabras(a?.ignorar, 30, []),
    memoria: a?.memoria !== false,
    saludos: a?.saludos !== false,
    saludarDesde: entero(a?.saludarDesde, 2, 100, d.saludarDesde),
    juegos: a?.juegos !== false,
    tiempoPregunta: entero(a?.tiempoPregunta, 15, 60, d.tiempoPregunta),
    iniciativa: a?.iniciativa !== false,
    cadaMinutos: entero(a?.cadaMinutos, 5, 120, d.cadaMinutos),
    zona: typeof a?.zona === "string" && /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){1,2}$/.test(a.zona) ? a.zona : "",
  };
}

// ---------- Texto ----------
// minúsculas y sin acentos, para comparar ("Áleta" = "aleta")
export function normalizar(s: string): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const cortar = (s: string, n: number) => Array.from(s).slice(0, n).join("");

// Lo que escribe un viewer, antes de enseñárselo al modelo: sin caracteres de control,
// sin < > (así nadie puede cerrar nuestras etiquetas y colar texto como si fuera del sistema)
// y con un tamaño máximo.
export function limpiarEntrada(s: unknown, max = 400): string {
  const t = String(s ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, " ")
    .replace(/</g, "‹").replace(/>/g, "›")
    .replace(/\s+/g, " ").trim();
  return cortar(t, max).trim();
}

// Los nombres de usuario también llegan de fuera: solo letras, números y poco más
export function limpiarNombre(s: unknown): string {
  return cortar(String(s ?? "").replace(/[^\p{L}\p{N}_ .-]/gu, "").trim(), 30) || "alguien";
}

// ---------- ¿Me hablan a mí? ----------
export type Disparo = "mencion" | "respuesta" | "hilo";

// ev es el evento channel.chat.message de Twitch. Devuelve null si el mensaje no va para AletaBot.
// ("hilo" lo decide quien llama: es cuando la persona ya estaba conversando con ella.)
export function detectar(ev: any, idBot: string, nombres: string[]): Disparo | null {
  if (idBot && ev?.reply?.parent_user_id === idBot) return "respuesta";
  const frag = Array.isArray(ev?.message?.fragments) ? ev.message.fragments : [];
  if (idBot && frag.some((f: any) => f?.type === "mention" && f?.mention?.user_id === idBot)) return "mencion";
  const t = normalizar(ev?.message?.text || "");
  for (const n of nombres) {
    if (!n) continue;
    // la palabra entera, con o sin @ delante ("aleta", "@AletaBot,") pero no dentro de otra ("maleta", "aletazo")
    const re = new RegExp("(^|[^a-z0-9_])@?" + n.replace(/[^a-z0-9_]/g, "") + "(?![a-z0-9_])");
    if (re.test(t)) return "mencion";
  }
  return null;
}

export function rolDe(badges: string[]): "streamer" | "mod" | "vip" | "sub" | "viewer" {
  if (badges.includes("broadcaster")) return "streamer";
  if (badges.includes("moderator")) return "mod";
  if (badges.includes("vip")) return "vip";
  if (badges.includes("subscriber") || badges.includes("founder")) return "sub";
  return "viewer";
}

// ---------- Lo que dice AletaBot ----------
const ENLACE = /(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|tv|gg|io|ly|xyz|ru|me|co|app|dev|es|mx|ar|cl|info|link|shop|live)\b(?:\/\S*)?/gi;

// Trozos largos de las instrucciones que NUNCA deberían aparecer en una respuesta.
// Si el modelo los repitiera (porque alguien consiguió sonsacárselos), el mensaje no sale.
export function trozosSecretos(instrucciones: string): string[] {
  return normalizar(instrucciones).split(/[\n.!?:;]+/).map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 45);
}

// Limpia la respuesta del modelo antes de mandarla al chat. Devuelve "" si no se debe mandar.
export function limpiarSalida(bruto: string, secretos: string[] = [], max = 320): string {
  let t = String(bruto ?? "").replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮﻿]/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^["'«“]+|["'»”]+$/g, "").trim();
  // AletaBot contesta "respondiendo" al mensaje, y Twitch ya pone delante el @nombre: si el modelo
  // también lo escribe, saldría dos veces. Fuera las menciones del principio.
  t = t.replace(/^(?:@[\p{L}\p{N}_]+[,:]?\s*)+/u, "").trim();
  // un bot no debe escribir comandos: fuera "/me", "/ban…", ".timeout…" y "!comando" al empezar
  t = t.replace(/^\/me\s+/i, "");
  // (un solo símbolo pegado a una letra; "...hmph" y "¡hola!" se quedan como están)
  while (/^[\/.!](?=\p{L})/u.test(t)) t = t.slice(1).trim();
  t = t.replace(ENLACE, "").replace(/\s+([,.!?])/g, "$1").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const plano = normalizar(t).replace(/\s+/g, " ");
  if (secretos.some((s) => plano.includes(s))) return "";
  const letras = Array.from(t);
  if (letras.length > max) {
    // corta en el final de la última frase que quepa; si no hay, en la última palabra
    const corto = letras.slice(0, max).join("");
    const fin = Math.max(corto.lastIndexOf(". "), corto.lastIndexOf("! "), corto.lastIndexOf("? "), corto.lastIndexOf("… "));
    t = fin > max * 0.4 ? corto.slice(0, fin + 1) : corto.slice(0, Math.max(corto.lastIndexOf(" "), 1)).trim() + "…";
  }
  return t;
}

// ---------- Comandos !ia (Kyo y sus mods) ----------
export type OrdenIA = "estado" | "pausar" | "seguir" | "apagar" | "encender";
export function leerOrden(texto: string): OrdenIA | null {
  const p = normalizar(texto).trim().split(/\s+/);
  if (p[0] !== "!ia") return null;
  const a = p[1] || "";
  if (!a || a === "estado" || a === "info") return "estado";
  if (["pausa", "pausar", "para", "parar", "stop", "callate", "silencio"].includes(a)) return "pausar";
  if (["sigue", "seguir", "reanudar", "reanuda", "continua", "continuar", "habla"].includes(a)) return "seguir";
  if (["apagar", "apaga", "off"].includes(a)) return "apagar";
  if (["encender", "enciende", "on", "activar", "activa"].includes(a)) return "encender";
  return "estado";
}

// Aplica la orden. Pausar y seguir: Kyo y mods. Apagar: Kyo y mods. Volver a encender tras apagar: solo Kyo.
export function aplicarOrden(orden: OrdenIA, estado: EstadoIA, esStreamer: boolean): { estado: EstadoIA; aviso: string } {
  if (orden === "pausar") {
    if (estado === "apagada") return { estado, aviso: "🧠 La IA ya estaba apagada del todo." };
    return { estado: "pausada", aviso: "⏸️ IA en pausa. Para que vuelva a hablar: !ia sigue" };
  }
  if (orden === "seguir") {
    if (estado === "apagada") return esStreamer
      ? { estado: "activa", aviso: "▶️ IA encendida otra vez 🦈" }
      : { estado, aviso: "🔒 La IA está apagada del todo: solo Kyo puede volver a encenderla (!ia encender)." };
    return { estado: "activa", aviso: "▶️ IA activa otra vez 🦈" };
  }
  if (orden === "apagar") return { estado: "apagada", aviso: "🔌 IA apagada del todo. Solo Kyo puede volver a encenderla (!ia encender o desde el Estudio)." };
  if (orden === "encender") {
    if (estado === "activa") return { estado, aviso: "🧠 La IA ya estaba activa." };
    if (estado === "pausada" || esStreamer) return { estado: "activa", aviso: "▶️ IA encendida 🦈" };
    return { estado, aviso: "🔒 Solo Kyo puede volver a encender la IA." };
  }
  return { estado, aviso: "" };
}

// ---------- Coste ----------
// Precios en USD por millón de tokens (estimación para vigilar el gasto; la factura real es la de la Consola de Claude).
export const MODELO_CHAT = "claude-sonnet-5-5";
export const MODELO_TAREAS = "claude-haiku-5-5";
type Precio = { entrada: number; salida: number; cacheLectura: number; cacheEscritura: number };
export const PRECIOS: Record<string, Precio> = {
  [MODELO_CHAT]: { entrada: 2, salida: 10, cacheLectura: 0.10, cacheEscritura: 2.5 },
  [MODELO_TAREAS]: { entrada: 0.10, salida: 0.50, cacheLectura: 0.01, cacheEscritura: 0.125 },
};
export type Uso = { entrada: number; salida: number; cacheLectura: number; cacheEscritura: number };

export function usoDe(u: any): Uso {
  return {
    entrada: Number(u?.input_tokens) || 0,
    salida: Number(u?.output_tokens) || 0,
    cacheLectura: Number(u?.cache_read_input_tokens) || 0,
    cacheEscritura: Number(u?.cache_creation_input_tokens) || 0,
  };
}
export function costeDe(modelo: string, u: Uso): number {
  const p = PRECIOS[modelo] || PRECIOS[MODELO_CHAT];
  return (u.entrada * p.entrada + u.salida * p.salida + u.cacheLectura * p.cacheLectura + u.cacheEscritura * p.cacheEscritura) / 1e6;
}

// ---------- Conversación (hilo) ----------
export type Turno = { r: "u" | "a"; t: string };
export type Hilo = { turnos: Turno[]; seguidos: number; actualizado: string } | null;
export const HILO_VIVE = 180;   // segundos sin hablar tras los que la conversación se olvida
export const HILO_SIGUE = 90;   // segundos en los que un mensaje sin mención puede ser continuación

export function hiloVivo(h: Hilo, ahora = Date.now()): boolean {
  return !!h && h.turnos.length > 0 && ahora - Date.parse(h.actualizado) < HILO_VIVE * 1000;
}
// ¿Puede ser que siga hablando con AletaBot aunque no la nombre? (ella contestó hace poco)
export function hiloSigue(h: Hilo, ahora = Date.now()): boolean {
  return hiloVivo(h, ahora) && h!.turnos[h!.turnos.length - 1].r === "a" && ahora - Date.parse(h!.actualizado) < HILO_SIGUE * 1000;
}
// Cuánto tiene que esperar esta persona antes de que AletaBot le vuelva a contestar
export function esperaPara(a: AjustesIA, h: Hilo, esStreamer: boolean, ahora = Date.now()): number {
  if (esStreamer) return 0;
  if (hiloVivo(h, ahora) && h!.seguidos < a.turnosHilo) return a.esperaHilo;
  return a.cooldown;
}
// El hilo después de un intercambio (se quedan solo los últimos turnos)
export function hiloNuevo(h: Hilo, pregunta: string, respuesta: string, ahora = Date.now()): NonNullable<Hilo> {
  const vivo = hiloVivo(h, ahora);
  const turnos = [...(vivo ? h!.turnos : []), { r: "u" as const, t: pregunta }, { r: "a" as const, t: respuesta }].slice(-8);
  return { turnos, seguidos: (vivo ? h!.seguidos : 0) + 1, actualizado: new Date(ahora).toISOString() };
}

// ---------- Memoria de viewers (fase 2) ----------
// Lo poco que AletaBot recuerda de cada persona. Solo guarda lo que esa persona le cuenta a ella.
export type Perfil = { nombre: string; apodo: string | null; directos: number; primera: string; datos: string[] };
export const DATOS_MAX = 3;

export const nombreDe = (p: { nombre: string; apodo?: string | null }) => p.apodo || p.nombre;

// Lo que llega de la base de datos, con forma segura
export function aPerfil(f: any): Perfil | null {
  if (!f) return null;
  return {
    nombre: limpiarNombre(f.nombre || f.login),
    apodo: f.apodo ? limpiarApodo(f.apodo) || null : null,
    directos: Number(f.directos) || 0,
    primera: String(f.primera || ""),
    datos: (Array.isArray(f.datos) ? f.datos : []).map((d: unknown) => limpiarDato(d)).filter(Boolean).slice(-DATOS_MAX),
  };
}

// Un apodo: letras, números y poco más, corto. "" si no vale.
export function limpiarApodo(s: unknown): string {
  const t = String(s ?? "").replace(/^@+/, "").replace(/[^\p{L}\p{N}_ .-]/gu, "").replace(/\s+/g, " ").trim();
  return cortar(t, 20).trim();
}

// Un dato recordado: una frase corta, en una línea. "" si no vale.
export function limpiarDato(s: unknown): string {
  const t = limpiarEntrada(s, 90).replace(/[.。]+$/, "").trim();
  return Array.from(t).length >= 4 ? t : "";
}

// Añade un dato nuevo: si repite uno que ya había, lo sustituye; si no caben más, sale el más viejo.
export function fusionarDatos(datos: string[], nuevo: string, max = DATOS_MAX): string[] {
  const n = normalizar(nuevo);
  const sinRepetir = datos.filter((d) => { const v = normalizar(d); return !(v === n || v.includes(n) || n.includes(v)); });
  return [...sinRepetir, nuevo].slice(-max);
}

const mesAnio = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es", { month: "long", year: "numeric" }); };

// Las notas sobre quien habla, tal como las ve el modelo. "" si no hay nada que contar.
export function perfilTexto(p: Perfil | null, primerMensajeHoy = false): string {
  if (!p) return "";
  const l: string[] = [];
  if (p.apodo) l.push("Prefiere que le llamen: " + p.apodo);
  if (p.directos > 0) l.push("Directos en los que ha estado: " + p.directos + (mesAnio(p.primera) ? " (viene desde " + mesAnio(p.primera) + ")" : ""));
  if (p.datos.length) l.push("Cosas que te ha contado: " + p.datos.join("; "));
  if (primerMensajeHoy && p.directos > 1) l.push("Es su primer mensaje de este directo.");
  return l.length ? "<perfil>\n" + l.join("\n") + "\n</perfil>\n" : "";
}

// ---------- Comandos de memoria (cualquiera del chat) ----------
export type OrdenMemoria = { orden: "olvidar" | "recordar" | "ver" | "apodo"; valor: string };
export function leerOrdenMemoria(texto: string): OrdenMemoria | null {
  const t = String(texto || "").trim();
  const primera = normalizar(t.split(/\s+/)[0] || "");
  const resto = t.slice((t.split(/\s+/)[0] || "").length).trim();
  if (["!olvidame", "!olvidarme", "!borrarmisdatos"].includes(primera)) return { orden: "olvidar", valor: "" };
  if (primera === "!recuerdame") return { orden: "recordar", valor: "" };
  if (primera === "!misdatos") return { orden: "ver", valor: "" };
  if (primera === "!llamame") return { orden: "apodo", valor: resto };
  return null;
}

// Lo que contesta AletaBot a !misdatos
export function textoMisDatos(nombre: string, p: Perfil | null): string {
  if (!p) return "🫧 " + nombre + ": no guardo nada de ti.";
  const d = new Date(p.primera);
  const desde = isNaN(d.getTime()) ? "" : d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  return "📋 " + nombre + ": " +
    (p.apodo ? "te llamo " + p.apodo + ", " : "") +
    (desde ? "te vi por primera vez el " + desde + ", " : "") +
    "has estado en " + p.directos + (p.directos === 1 ? " directo" : " directos") +
    (p.datos.length ? " y recuerdo: " + p.datos.join("; ") : " y no recuerdo nada más") +
    ". Para borrarlo todo: !olvidame";
}

export const TXT_MEMORIA = {
  olvidado: (n: string) => "🫧 Listo, " + n + ": borré todo lo que recordaba de ti y no voy a guardar nada más. Si cambias de idea: !recuerdame",
  recordar: (n: string) => "✨ Listo, " + n + ": de ahora en adelante vuelvo a acordarme de ti.",
  apodo: (a: string) => "📝 Anotado: de ahora en adelante te llamo " + a + ".",
  apodoAyuda: () => "📝 Para decirme cómo llamarte: !llamame TuApodo (hasta 20 letras).",
  apodoNo: () => "💢 Ese apodo no me sirve. Intenta con otro.",
  apodoAhoraNo: () => "🫧 Ahora mismo no puedo cambiar apodos. Intenta más tarde.",
  sinMemoria: (n: string) => "🫧 " + n + ": me pediste que no guardara nada de ti. Si quieres que vuelva a acordarme: !recuerdame",
};

// Saludo de repuesto, por si Claude falla justo en ese momento
const lista = (n: string[]) => n.length <= 1 ? (n[0] || "") : n.slice(0, -1).join(", ") + " y " + n[n.length - 1];
export function saludoDeRepuesto(nombres: string[], azar = Math.random()): string {
  const quien = lista(nombres), varios = nombres.length > 1;
  const frases = varios
    ? ["¿" + quien + "? Hmph, ya era hora de que aparecieran 🦈", "Miren quiénes llegan: " + quien + ". N-no es que los estuviera esperando 💢", "¡" + quien + "! Siéntense y no hagan ruido… bueno, un poquito sí ✨"]
    : ["¿" + quien + "? Hmph, ya era hora de que aparecieras 🦈", "Mira quién llega: " + quien + ". N-no es que te estuviera esperando 💢", "¡" + quien + "! Llegas tarde… digo, hola ✨"];
  return frases[Math.floor(azar * frases.length) % frases.length];
}
