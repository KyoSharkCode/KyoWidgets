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
//
// "Verify JWT" puede quedarse ACTIVADO (el Estudio envía la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: KYO_SETUP_KEY y ANTHROPIC_API_KEY (la clave de la Consola de Claude). Tablas: sql/09_ia.sql y sql/10_viewers.sql.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { borrarViewer, guardarAjustes, guardarPersonalidad, listarViewers, probarIA, probarSaludo, resumenIA } from "../_shared/aleta/ia.ts";
import { PERSONALIDAD_BASE } from "../_shared/aleta/prompt.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // el navegador recuerda el permiso CORS y no repite el OPTIONS (cada uno cuenta como invocación)
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- Código de acceso con límite de intentos (igual que en spotify-auth y anuncios) ----------
// Compara las huellas SHA-256 en tiempo constante (no da pistas de cuántas letras acertaste)
async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function comprobarClave(db: any, req: Request, clave: unknown) {
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  if (!setupKey) return { ok: false, error: "falta_KYO_SETUP_KEY" };
  const ip = "ip:" + (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
  const { data: r, error } = await db.rpc("kyo_intento", { p_ip: ip });
  if (error || !r) return { ok: false, error: "falta_intentos" };
  if (r.bloqueado) return { ok: false, error: "bloqueado", espera: r.espera };
  if (!(await igual(String(clave ?? ""), setupKey))) {
    return r.espera > 0 ? { ok: false, error: "bloqueado", espera: r.espera } : { ok: false, error: "clave", quedan: r.quedan };
  }
  await db.rpc("kyo_intento_ok", { p_ip: ip });
  return { ok: true };
}
const estadoError = (e: string) => e === "clave" ? 401 : e === "bloqueado" ? 429 : 500;
// -------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

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

  return json({ ok: false, error: "accion" }, 400);
});
