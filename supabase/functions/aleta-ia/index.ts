// KyoWidgets · aleta-ia
// La IA de AletaBot vista desde Kyo Estudio (pestaña 🧠 IA). Quien CONTESTA en el chat es
// twitch-bot-events; esta función solo guarda los ajustes y enseña el gasto.
//
//   POST {clave, accion:"leer"}                              → {ok, ajustes, personalidad, personalidadBase, clave, sql, resumen, avisos, error, directo}
//   POST {clave, accion:"guardar", ajustes?, personalidad?}  → guarda (se aplica en ~10 s)
//   POST {clave, accion:"probar", texto, nombre?, personalidad?} → {ok, filtro, respuesta, coste} SIN escribir en el chat
//                                                               (usa la personalidad que mandes, aunque no esté guardada; gasta tokens de verdad)
//   POST {clave, accion:"probarSaludo", personalidad?}        → {ok, respuesta, coste}: cómo saludaría a un habitual de ejemplo
//   POST {clave, accion:"viewers", buscar?}                  → {ok, viewers, total, sql}: los perfiles que recuerda (100 como mucho)
//   POST {clave, accion:"borrarViewer", user_id}             → borra del todo el perfil de esa persona
//   POST {clave, accion:"vida"}                              → {ok, canon, diario, animo, canal}: lo que AletaBot recuerda de sí misma
//   POST {clave, accion:"cambiarVida", canon? | animo? | borrarDiario?} → cambia su lista de recuerdos, fija el ánimo o borra un día del diario
//   POST {clave, accion:"juegos"}                            → {ok, preguntas, totales, ranking, historias, juego, sql}
//   POST {clave, accion:"generarBanco", tipo, tema, n}       → pide a Claude n preguntas (quedan pendientes de aprobar). Gasta tokens
//   POST {clave, accion:"guardarPregunta", id?, tipo, categoria, pregunta, respuestas, pista} → añade o corrige una (queda aprobada)
//   POST {clave, accion:"aprobarBanco", ids? | todas:true}   → aprueba preguntas pendientes
//   POST {clave, accion:"borrarBanco", id | pendientes:true} → borra una pregunta, o todas las pendientes
//   POST {clave, accion:"reiniciarPuntos"}                   → pone a cero los puntos de todo el mundo
//
// "Verify JWT" puede quedarse ACTIVADO (el Estudio envía la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: KYO_SETUP_KEY y ANTHROPIC_API_KEY (la clave de la Consola de Claude). Tablas: sql/09_ia.sql, sql/10_viewers.sql y sql/11_juegos.sql.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { comprobarClave, estadoAcceso } from "../_shared/acceso.ts";
import {
  aprobarBanco, borrarBanco, borrarViewer, cambiarVida, generarBanco, guardarAjustes, guardarPersonalidad, guardarPregunta, leerVida,
  listarViewers, probarIA, probarSaludo, reiniciarPuntos, resumenIA, resumenJuegos,
} from "../_shared/aleta/ia.ts";
import { PERSONALIDAD_BASE } from "../_shared/aleta/prompt.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // el navegador recuerda el permiso CORS y no repite el OPTIONS (cada uno cuenta como invocación)
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// El acceso (sesión de Google o código) se comprueba en ../_shared/acceso.ts

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoAcceso(c.error!));

  if (body.accion === "leer") {
    return json({ ok: true, personalidadBase: PERSONALIDAD_BASE, ...(await resumenIA(db)) });
  }

  if (body.accion === "guardar") {
    if (body.ajustes !== undefined) {
      const { error } = await guardarAjustes(db, body.ajustes);
      if (error) return json({ ok: false, error: "tabla" }, 500);
    }
    if (body.personalidad !== undefined) {
      const { error } = await guardarPersonalidad(db, body.personalidad);
      if (error) return json({ ok: false, error: "tabla" }, 500);
    }
    return json({ ok: true, personalidadBase: PERSONALIDAD_BASE, ...(await resumenIA(db)) });
  }

  if (body.accion === "probar") {
    const r = await probarIA(db, { texto: body.texto, nombre: body.nombre, personalidad: body.personalidad });
    return json(r, r.ok ? 200 : 400);
  }

  if (body.accion === "probarSaludo") {
    const r = await probarSaludo(db, body.personalidad);
    return json(r, r.ok ? 200 : 400);
  }

  if (body.accion === "viewers") {
    return json({ ok: true, ...(await listarViewers(db, body.buscar)) });
  }

  if (body.accion === "borrarViewer") {
    const r = await borrarViewer(db, body.user_id);
    return json(r, r.ok ? 200 : 400);
  }

  if (body.accion === "vida") return json({ ok: true, ...(await leerVida(db)) });
  if (body.accion === "cambiarVida") {
    const r = await cambiarVida(db, { canon: body.canon, animo: body.animo, borrarDiario: body.borrarDiario });
    return json(r, r.ok ? 200 : 400);
  }
  if (body.accion === "juegos") return json({ ok: true, ...(await resumenJuegos(db)) });
  if (["generarBanco", "guardarPregunta", "aprobarBanco", "borrarBanco", "reiniciarPuntos"].includes(body.accion)) {
    const r = body.accion === "generarBanco" ? await generarBanco(db, { tipo: body.tipo, tema: body.tema, n: body.n })
      : body.accion === "guardarPregunta" ? await guardarPregunta(db, body)
      : body.accion === "aprobarBanco" ? await aprobarBanco(db, { ids: body.ids, todas: body.todas })
      : body.accion === "borrarBanco" ? await borrarBanco(db, { id: body.id, pendientes: body.pendientes })
      : await reiniciarPuntos(db);
    if (!r.ok) return json(r, 400);
    return json({ ...r, ...(await resumenJuegos(db)) });
  }

  return json({ ok: false, error: "accion" }, 400);
});
