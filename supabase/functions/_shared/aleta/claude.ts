// KyoWidgets · AletaBot IA · llamadas a Claude
// Dos modelos, cada uno para lo suyo:
//   - Haiku 5.5  → el filtro previo (¿hay que contestar?, ¿es problemático?). Barato y rápido.
//   - Sonnet 5.5 → la respuesta que AletaBot escribe en el chat.
// La clave vive en Supabase → Edge Functions → Secrets, con el nombre ANTHROPIC_API_KEY.
// Nunca se escribe en el código ni en el repo.

import Anthropic from "npm:@anthropic-ai/sdk@1.10.0";
import { costeDe, MODELO_CHAT, MODELO_TAREAS, usoDe, type Uso } from "./texto.ts";
import { APODO_ESQUEMA, APODO_SISTEMA, FILTRO_ESQUEMA, FILTRO_SISTEMA, leerApodoVale, leerVeredicto, mensajeApodo, type Veredicto } from "./prompt.ts";

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
async function haiku(sistema: string, contenido: string, maxTokens: number, esquema?: Record<string, unknown>): Promise<Llamada<string>> {
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
    });
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

// La respuesta de AletaBot. valor = "" cuando el modelo se niega a contestar (AletaBot se calla).
export async function conversar(sistema: string, mensajes: Anthropic.MessageParam[]): Promise<Llamada<string>> {
  const c = cliente();
  if (!c) return { ok: false, error: "sin_clave", detalle: "Falta el secreto ANTHROPIC_API_KEY" };
  try {
    const m = await c.messages.create({
      model: MODELO_CHAT,
      max_tokens: 160, // 1-2 frases de chat; lo que pase de ahí se corta
      // El system prompt es idéntico en todas las llamadas: con cache_control se guarda en caché
      // y las siguientes veces cuesta una fracción.
      system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
      // Sin razonamiento previo (en Sonnet 5.5 se desactiva así): el pensamiento se cobra como salida
      // y se comería el max_tokens de un mensaje de chat.
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      messages: mensajes,
    });
    const uso = usoDe(m.usage);
    const valor = m.stop_reason === "refusal" ? "" : textoDe(m);
    return { ok: true, valor, modelo: MODELO_CHAT, uso, coste: costeDe(MODELO_CHAT, uso) };
  } catch (e) { return fallo(e); }
}
