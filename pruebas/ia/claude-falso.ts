// Sustituto de ../_shared/aleta/claude.ts para las pruebas: no llama a Claude ni gasta nada.
// pruebas/ia/probar.mjs decide qué contesta cada "modelo" cambiando `guion`.
import { costeDe, MODELO_CHAT, MODELO_TAREAS } from "../../supabase/functions/_shared/aleta/texto.ts";

export const guion: {
  clave: boolean;
  filtro: (contenido: string) => any;
  chat: (sistema: string, mensajes: any[]) => any;
  saludo: (sistema: string, contenido: string) => any;
  apodo: (apodo: string) => any;
  historia: (contenido: string) => any;
  banco: (tipo: string, tema: string, n: number) => any;
  llamadas: { tarea: string; contenido: any; sistema?: string }[];
} = {
  clave: true,
  filtro: () => ({ responder: true, motivo: "ok", avisar_mods: false, dato: "", apodo: "" }),
  chat: () => "H-hola… no es que me alegre de verte ni nada 🦈",
  saludo: () => "¿Pepa? Hmph, ya era hora 🦈",
  apodo: () => true,
  historia: (c) => (c.includes("<tarea>terminar") ? "Y al final todos merendaron juntos." : c.includes("<tarea>empezar") ? "Había una vez una tiburona con una cafetería." : "Entonces entró un pulpo pidiendo ocho cafés."),
  banco: () => [],
  llamadas: [],
};

export const hayClave = () => guion.clave;

const uso = (entrada: number, salida: number) => ({ entrada, salida, cacheLectura: 0, cacheEscritura: 0 });

export async function filtrar(contenido: string) {
  guion.llamadas.push({ tarea: "filtro", contenido });
  const v = guion.filtro(contenido);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(500, 30);
  return { ok: true, valor: v, modelo: MODELO_TAREAS, uso: u, coste: costeDe(MODELO_TAREAS, u) };
}

export async function conversar(sistema: string, mensajes: any[]) {
  guion.llamadas.push({ tarea: "chat", contenido: mensajes, sistema });
  const v = guion.chat(sistema, mensajes);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(900, 60);
  return { ok: true, valor: v, modelo: MODELO_CHAT, uso: u, coste: costeDe(MODELO_CHAT, u) };
}

export async function escribirSaludo(sistema: string, contenido: string) {
  guion.llamadas.push({ tarea: "saludo", contenido, sistema });
  const v = guion.saludo(sistema, contenido);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(700, 40);
  return { ok: true, valor: v, modelo: MODELO_TAREAS, uso: u, coste: costeDe(MODELO_TAREAS, u) };
}

export async function revisarApodo(apodo: string) {
  guion.llamadas.push({ tarea: "apodo", contenido: apodo });
  const v = guion.apodo(apodo);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(200, 10);
  return { ok: true, valor: v, modelo: MODELO_TAREAS, uso: u, coste: costeDe(MODELO_TAREAS, u) };
}

export async function escribirHistoria(contenido: string) {
  guion.llamadas.push({ tarea: "historia", contenido });
  const v = guion.historia(contenido);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(600, 50);
  return { ok: true, valor: v, modelo: MODELO_TAREAS, uso: u, coste: costeDe(MODELO_TAREAS, u) };
}

export async function generarPreguntas(tipo: string, tema: string, n: number) {
  guion.llamadas.push({ tarea: "banco", contenido: { tipo, tema, n } });
  const v = guion.banco(tipo, tema, n);
  if (v?.error) return { ok: false, error: v.error, detalle: "fallo de prueba" };
  const u = uso(500, 1500);
  return { ok: true, valor: v, modelo: MODELO_TAREAS, uso: u, coste: costeDe(MODELO_TAREAS, u) };
}
