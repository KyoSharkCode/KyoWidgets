// KyoWidgets · anuncios
// Guarda y entrega los anuncios rotativos de las escenas "Ya regreso" y "Terminando".
//
//   GET                         → {ok:true, datos:{anuncios:[...]}, actualizado}   (lo leen las escenas de OBS cada 30 s)
//   POST {clave, datos}         → guarda los anuncios (solo con el código de acceso del Estudio = KYO_SETUP_KEY)
//
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
//
// "Verify JWT": mejor DESACTIVADO. Así los overlays consultan sin cabeceras y cada consulta cuenta como
// 1 invocación en vez de 2 (con cabeceras el navegador manda antes un OPTIONS). Activado también funciona.
// Lo que cambia algo sigue pidiendo tu código de acceso; la anon key es pública de todas formas.
// Secretos: KYO_SETUP_KEY (el mismo que ya tienes). Tablas: kyo_ajustes (sql/02_anuncios.sql) y kyo_intentos (sql/03_intentos.sql).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { comprobarClave, estadoAcceso } from "../_shared/acceso.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400", // el navegador recuerda el permiso CORS y no repite el OPTIONS (cada uno cuenta como invocación)
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// El acceso (sesión de Google o código) se comprueba en ../_shared/acceso.ts

const TIPOS = ["merch", "cuenta", "codigo", "libre"];
const txt = (v: unknown, max: number) => String(v ?? "").slice(0, max);

// Limpia lo que llega del Estudio: solo campos conocidos y con tamaño limitado
function limpiar(d: any) {
  const lista = Array.isArray(d?.anuncios) ? d.anuncios.slice(0, 30) : [];
  return {
    v: 1,
    anuncios: lista.map((a: any) => ({
      id: txt(a?.id, 40),
      tipo: TIPOS.includes(a?.tipo) ? a.tipo : "libre",
      activo: a?.activo !== false,
      donde: ["ambos", "ya-regreso", "terminando"].includes(a?.donde) ? a.donde : "ambos",
      seg: Math.max(4, Math.min(120, Number(a?.seg) || 10)),
      icono: txt(a?.icono, 20),
      etiqueta: txt(a?.etiqueta, 40),
      texto: txt(a?.texto, 40),
      enlace: txt(a?.enlace, 50),
      modo: a?.modo === "fecha" ? "fecha" : "cuenta",
      fecha: txt(a?.fecha, 10),
      hora: txt(a?.hora, 5),
      objetivo: txt(a?.objetivo, 40),
      textoFin: txt(a?.textoFin, 40),
      imagen: /^https:\/\//.test(String(a?.imagen ?? "")) ? txt(a.imagen, 400) : "",
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const { data, error } = await db.from("kyo_ajustes").select("datos, updated_at").eq("id", "anuncios").maybeSingle();
    if (error) return json({ ok: false, error: "tabla" });
    return json({ ok: true, datos: data?.datos ?? { anuncios: [] }, actualizado: data?.updated_at ?? null });
  }

  if (req.method === "POST") {
    let body: any = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
    const c = await comprobarClave(db, req, body?.clave);
    if (!c.ok) return json(c, estadoAcceso(c.error!));
    const datos = limpiar(body.datos);
    const ahora = new Date().toISOString();
    const { error } = await db.from("kyo_ajustes").upsert({ id: "anuncios", datos, updated_at: ahora });
    if (error) return json({ ok: false, error: "tabla" }, 500);
    return json({ ok: true, actualizado: ahora });
  }

  return json({ ok: false, error: "metodo" }, 405);
});
