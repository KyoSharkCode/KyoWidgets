// KyoWidgets · AletaBot IA · llamadas a Claude
// Dos modelos, cada uno para lo suyo:
//   - Haiku 5.5  → el filtro previo (¿hay que contestar?, ¿es problemático?). Barato y rápido.
//   - Sonnet 5.5 → la respuesta que AletaBot escribe en el chat.
// La clave vive en Supabase → Edge Functions → Secrets, con el nombre ANTHROPIC_API_KEY.
// Nunca se escribe en el código ni en el repo.

import Anthropic from "npm:@anthropic-ai/sdk@1.10.0";
import { costeDe, MODELO_CHAT, MODELO_TAREAS, usoDe, type Uso } from "./texto.ts";
import {
  APODO_ESQUEMA, APODO_SISTEMA, BANCO_ESQUEMA, DIARIO_SISTEMA, FILTRO_ESQUEMA, FILTRO_SISTEMA, HISTORIA_SISTEMA, instruccionesBanco,
  leerApodoVale, leerBanco, leerRespuesta, leerVeredicto, mensajeApodo, mensajeBanco, RESPUESTA_ESQUEMA, type Respuesta, type Veredicto,
} from "./prompt.ts";

export const hayClave = () => !!(Deno.env.get("ANTHROPIC_API_KEY") ?? "").trim();

let _cliente: Anthropic | null = null;
function cliente(): Anthropic | null {
  const clave = (Deno.env.get("ANTHROPIC_API_KEY") ?? "").trim();
  if (!clave) return null;
  // un solo reintento y 20 s como mucho: en un chat, una respuesta que llega tarde ya no sirve
  return _cliente ??= new Anthropic({ apiKey: clave, maxRetries: 1, timeout: 20_000 });
}

export type Llamada<T> =
  | { ok: true; valor: T; modelo: string; uso: Uso; coste: number }
  | { ok: false; error: "sin_clave" | "clave" | "limite" | "peticion" | "red" | "api"; detalle: string };

function fallo(e: unknown): Llamada<never> {
  const detalle = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "clave", detalle };
  if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "limite", detalle };
  if (e instanceof Anthropic.BadRequestError) return { ok: false, error: "peticion", detalle };
  if (e instanceof Anthropic.APIConnectionError) return { ok: false, error: "red", detalle };
  return { ok: false, error: "api", detalle };
}

const textoDe = (m: Anthropic.Message) => m.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();

// Una tarea corta para Haiku. Con "esquema" contesta en JSON con esa forma; sin él, texto normal.
// valor = "" si el modelo se niega a contestar.
async function haiku(sistema: string, contenido: string, maxTokens: number, esquema?: Record<string, unknown>, esperaMs?: number): Promise<Llamada<string>> {
  const c = cliente();
  if (!c) return { ok: false, error: "sin_clave", detalle: "Falta el secreto ANTHROPIC_API_KEY" };
  try {
    const m = await c.messages.create({
      model: MODELO_TAREAS,
      max_tokens: maxTokens,
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      thinking: { type: "disabled" }, // son tareas mecánicas: sin razonamiento no se pagan tokens de pensamiento
      output_config: esquema ? { effort: "low", format: { type: "json_schema", schema: esquema } } : { effort: "low" },
      messages: [{ role: "user", content: contenido }],
    }, esperaMs ? { timeout: esperaMs } : undefined);
    const uso = usoDe(m.usage);
    return { ok: true, valor: m.stop_reason === "refusal" ? "" : textoDe(m), modelo: MODELO_TAREAS, uso, coste: costeDe(MODELO_TAREAS, uso) };
  } catch (e) { return fallo(e); }
}

// Filtro previo. valor = null cuando el modelo no dio un veredicto válido (se trata como "no contestar").
export async function filtrar(contenido: string): Promise<Llamada<Veredicto | null>> {
  const r = await haiku(FILTRO_SISTEMA, contenido, 300, FILTRO_ESQUEMA);
  return r.ok ? { ...r, valor: leerVeredicto(r.valor) } : r;
}

// El saludo a los habituales que llegan. valor = "" si no salió nada (se usa uno de repuesto).
export const escribirSaludo = (sistema: string, contenido: string): Promise<Llamada<string>> => haiku(sistema, contenido, 160);

// ¿Se puede usar este apodo en público? (para !llamame)
export async function revisarApodo(apodo: string): Promise<Llamada<boolean>> {
  const r = await haiku(APODO_SISTEMA, mensajeApodo(apodo), 60, APODO_ESQUEMA);
  return r.ok ? { ...r, valor: leerApodoVale(r.valor) } : r;
}

// Genera preguntas de trivia o adivinanzas para el banco (desde el Estudio, antes de jugar).
// Devuelve lo que escribió el modelo sin limpiar: quien llama lo pasa por limpiarPregunta.
export async function generarPreguntas(tipo: "trivia" | "adivinanza", tema: string, n: number): Promise<Llamada<unknown[]>> {
  // es una respuesta larga (hasta 20 preguntas): se le da más tiempo que a un mensaje de chat
  const r = await haiku(instruccionesBanco(tipo), mensajeBanco(tema, n), 400 + n * 220, BANCO_ESQUEMA, 90_000);
  return r.ok ? { ...r, valor: leerBanco(r.valor) } : r;
}

// Un trozo de la historia colectiva. valor = "" si no salió nada.
export const escribirHistoria = (contenido: string): Promise<Llamada<string>> => haiku(HISTORIA_SISTEMA, contenido, 200);

// El diario del directo que acaba de terminar. valor = "" si no salió nada.
export const escribirDiario = (contenido: string): Promise<Llamada<string>> => haiku(DIARIO_SISTEMA, contenido, 220, undefined, 45_000);

// Si la API rechazó pedir la respuesta "con forma" y hubo que repetirla como texto, queda apuntado aquí
// (quien llama lo deja a la vista del Estudio). Se lee una vez y se borra.
let _avisoForma = "";
export function avisoForma(): string { const a = _avisoForma; _avisoForma = ""; return a; }

// Lo que dice AletaBot (Sonnet). Devuelve el mensaje y, si contó algo nuevo de sí misma, la nota para recordarlo.
// mensaje = "" cuando el modelo se niega a contestar o decide callar (AletaBot no dice nada).
//   sistema  las reglas + la personalidad: idénticas en todas las llamadas.
//   memoria  lo que recuerda de sí misma (canon, diario, ánimo): cambia poco (una vez por directo, o al aprender algo).
// Los dos bloques van a la caché por separado, así que al cambiar la memoria no se vuelve a pagar el primero.
export async function conversar(sistema: string, memoria: string, mensajes: Anthropic.MessageParam[]): Promise<Llamada<Respuesta>> {
  const c = cliente();
  if (!c) return { ok: false, error: "sin_clave", detalle: "Falta el secreto ANTHROPIC_API_KEY" };
  const pedir = (conForma: boolean) => c.messages.create({
    model: MODELO_CHAT,
    max_tokens: 280, // un mensaje de chat (y, a veces, una nota corta); lo que pase de ahí se corta
    system: [
      { type: "text" as const, text: sistema, cache_control: { type: "ephemeral" as const } },
      ...(memoria ? [{ type: "text" as const, text: memoria, cache_control: { type: "ephemeral" as const } }] : []),
    ],
    // Sin razonamiento previo (en Sonnet 5.5 se desactiva así): el pensamiento se cobra como salida
    // y se comería el max_tokens de un mensaje de chat.
    thinking: { type: "between_tools" },
    output_config: conForma ? { effort: "low", format: { type: "json_schema", schema: RESPUESTA_ESQUEMA } } : { effort: "low" },
    messages: mensajes,
  });
  try {
    let m: Anthropic.Message;
    try { m = await pedir(true); }
    catch (e) {
      // Si la API no aceptara pedir la respuesta con forma, se pide como texto normal: AletaBot no se queda muda
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      _avisoForma = (e.message || "petición rechazada").slice(0, 300);
      m = await pedir(false);
    }
    const uso = usoDe(m.usage);
    const valor = m.stop_reason === "refusal" ? { mensaje: "", sobreMi: "" } : leerRespuesta(textoDe(m));
    return { ok: true, valor, modelo: MODELO_CHAT, uso, coste: costeDe(MODELO_CHAT, uso) };
  } catch (e) { return fallo(e); }
}
