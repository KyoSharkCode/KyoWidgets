// KyoWidgets · combo
// Guarda y entrega el overlay combinado: las versiones (una por escena de OBS), el estilo de cada widget
// y lo que OBS tiene que pintar en cada versión. Así el enlace de OBS no cambia nunca: guardas en el Estudio
// y el overlay se actualiza solo, y el Estudio se ve igual en cualquier navegador.
//
//   GET                         → {ok:true, datos:{editor, estilos, salida}, actualizado}   (lo lee el Estudio)
//   GET ?v=<versión>            → {ok:true, salida:{v, h}, actualizado}                     (lo lee OBS cada 20 s)
//   POST {clave, datos}         → guarda (solo con el código de acceso del Estudio = KYO_SETUP_KEY)
//
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
//
// "Verify JWT" puede quedarse ACTIVADO (el Estudio y el overlay envían la anon key).
// Secretos: KYO_SETUP_KEY (el mismo que ya tienes). Tablas: kyo_ajustes (sql/02_anuncios.sql) y kyo_intentos (sql/03_intentos.sql).

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- Código de acceso con límite de intentos ----------
// Compara las huellas SHA-256 en tiempo constante (no da pistas de cuántas letras acertaste)
async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function comprobarClave(db: SupabaseClient, req: Request, clave: unknown) {
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
// -------------------------------------------------------------

const WIDGETS = ["spotify", "fortnite", "cuenta", "contador", "meta", "chat", "sorteo", "prediccion", "anuncios"];
const ESTILOS = WIDGETS.filter((w) => w !== "anuncios");
const ESCALAS = ["0.5", "0.6", "0.75", "0.8", "0.9", "1", "1.25", "1.5"];
const txt = (v: unknown, max: number) => String(v ?? "").slice(0, max);
const num = (v: unknown, min: number, max: number) => Math.round(Math.max(min, Math.min(max, Number(v) || 0)));
const uno = (v: unknown, ok: string[], def: string) => (ok.includes(String(v)) ? String(v) : def);
const ident = (v: unknown) => txt(v, 20).replace(/[^a-z0-9_-]/gi, "");

// Limpia lo que llega del Estudio: solo campos conocidos y con tamaño limitado
function limpiarVersion(v: any) {
  const lado = (m: any) => Object.fromEntries(WIDGETS.map((id) => {
    const it = m?.[id] ?? {};
    return [id, { on: it.on === true, x: num(it.x, 0, 1920), y: num(it.y, 0, 1920), esc: uno(it.esc, ESCALAS, "1") }];
  }));
  return {
    id: ident(v?.id), nombre: txt(v?.nombre, 40) || "Sin nombre",
    fmt: uno(v?.fmt, ["v", "h"], "v"), fondo: txt(v?.fondo, 20), tema: uno(v?.tema, ["marea", "octubre", "navidad"], "marea"),
    cada: txt(v?.cada, 3), contador: txt(v?.contador, 30), anuncioDis: uno(v?.anuncioDis, ["tarjeta", "cinta"], "tarjeta"),
    v: lado(v?.v), h: lado(v?.h),
  };
}
// Estilo de cada pestaña: textos cortos, números, sí/no y listas cortas de textos
function limpiarEstilo(o: any) {
  const r: Record<string, unknown> = {};
  Object.keys(o ?? {}).slice(0, 40).forEach((k) => {
    const v = o[k], kk = txt(k, 30);
    if (typeof v === "boolean" || typeof v === "number") r[kk] = v;
    else if (typeof v === "string") r[kk] = txt(v, 400);
    else if (Array.isArray(v)) r[kk] = v.slice(0, 12).map((x) => txt(x, 40));
  });
  return r;
}
function limpiarSalida(s: any) {
  const lado = (m: any) => {
    const w = (Array.isArray(m?.w) ? m.w : []).filter((id: string, i: number, a: string[]) => WIDGETS.includes(id) && a.indexOf(id) === i);
    return {
      w,
      g: Object.fromEntries(w.map((id: string) => [id, (Array.isArray(m?.g?.[id]) ? m.g[id] : []).slice(0, 4).map((n: unknown) => num(n, 0, 4000))])),
      p: Object.fromEntries(w.map((id: string) => [id, txt(m?.p?.[id], 3000)])),
    };
  };
  return { v: lado(s?.v), h: lado(s?.h) };
}
function limpiar(d: any) {
  const versiones = (Array.isArray(d?.editor?.versiones) ? d.editor.versiones : []).slice(0, 20).map(limpiarVersion).filter((v: any) => v.id);
  const ids = versiones.map((v: any) => v.id);
  return {
    v: 1,
    editor: { versiones },
    estilos: Object.fromEntries(ESTILOS.filter((id) => d?.estilos?.[id]).map((id) => [id, limpiarEstilo(d.estilos[id])])),
    salida: Object.fromEntries(ids.filter((id: string) => d?.salida?.[id]).map((id: string) => [id, limpiarSalida(d.salida[id])])),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const { data, error } = await db.from("kyo_ajustes").select("datos, updated_at").eq("id", "combo").maybeSingle();
    if (error) return json({ ok: false, error: "tabla" });
    const datos = data?.datos ?? null, actualizado = data?.updated_at ?? null;
    const v = new URL(req.url).searchParams.get("v");
    if (v !== null) {
      const salida = datos?.salida?.[ident(v)];
      return salida ? json({ ok: true, salida, actualizado }) : json({ ok: false, error: "no_existe" });
    }
    return json({ ok: true, datos, actualizado });
  }

  if (req.method === "POST") {
    let body: any = null;
    try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
    const c = await comprobarClave(db, req, body?.clave);
    if (!c.ok) return json(c, c.error === "clave" ? 401 : c.error === "bloqueado" ? 429 : 500);
    const datos = limpiar(body.datos);
    if (!datos.editor.versiones.length) return json({ ok: false, error: "vacio" }, 400);
    const ahora = new Date().toISOString();
    const { error } = await db.from("kyo_ajustes").upsert({ id: "combo", datos, updated_at: ahora });
    if (error) return json({ ok: false, error: "tabla" }, 500);
    return json({ ok: true, actualizado: ahora });
  }

  return json({ ok: false, error: "metodo" }, 405);
});
