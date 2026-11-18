// Sustituto de ../_shared/aleta/claude.ts para las pruebas: no llama a Claude ni gasta nada.
// pruebas/ia/probar.mjs decide qué contesta cada "modelo" cambiando `guion`.
import { costeDe, MODELO_CHAT, MODELO_TAREAS } from "../../supabase/functions/_shared/aleta/texto.ts";

export const guion: {
  clave: boolean;
  filtro: (contenido: string) => any;
  chat: (sistema: string, mensajes: any[]) => any;
  llamadas: { tarea: string; contenido: any; sistema?: string }[];
} = {
  clave: true,
  filtro: () => ({ responder: true, motivo: "ok", avisar_mods: false }),
  chat: () => "H-hola… no es que me alegre de verte ni nada 🦈",
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
