// KyoWidgets · prensa
// Los datos del Kit de prensa (ES / EN) que muestra prensa.html.
//
//   GET                  → {ok, datos}  (público: la página del kit es para enviarla a marcas)
//   POST {clave, datos}  → los guarda (solo con tu código de acceso del Estudio)
//
// "Verify JWT" puede quedarse ACTIVADO (la página y el Estudio envían la anon key).
// Con 3 fallos seguidos del código se bloquea un rato (tabla kyo_intentos, sql/03_intentos.sql).
// Secretos: KYO_SETUP_KEY. Tabla: kyo_ajustes (fila "prensa"), no hace falta SQL nuevo.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// Limpia lo que llega del Estudio: solo campos conocidos y con tamaño limitado
const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const bi = (o: any, max: number) => ({ es: txt(o?.es, max), en: txt(o?.en, max) });
const lista = (a: unknown, n: number, f: (x: any) => unknown) => (Array.isArray(a) ? a.slice(0, n) : []).map(f);
const imagen = (v: unknown) => { const s = String(v ?? ""); return s === "kyo" || s === "kyo3d" || s === "" ? s : (/^https:\/\//.test(s) ? s.slice(0, 300) : ""); };
const enlace = (v: unknown) => (/^https:\/\//.test(String(v ?? "")) ? txt(v, 200) : "");
const ICONOS = ["directo", "nota", "play", "chat", "grupo", "web", "aleta"];
function limpiar(d: any) {
  const email = txt(d?.contacto?.email, 80);
  return {
    v: 1,
    nombre: txt(d?.nombre, 30) || "KyoSumiVT",
    imagen: imagen(d?.imagen), imagen2: imagen(d?.imagen2),
    rol: bi(d?.rol, 60), lema: bi(d?.lema, 140), bio: bi(d?.bio, 700),
    datos: lista(d?.datos, 4, (x) => ({ valor: txt(x?.valor, 12), es: txt(x?.es, 30), en: txt(x?.en, 30) })),
    redes: lista(d?.redes, 9, (x) => ({ red: txt(x?.red, 20), icono: ICONOS.includes(x?.icono) ? x.icono : "aleta", usuario: txt(x?.usuario, 40), url: enlace(x?.url), seguidores: txt(x?.seguidores, 12) })),
    contenido: lista(d?.contenido, 12, (x) => bi(x, 30)),
    audiencia: lista(d?.audiencia, 4, (x) => ({ es: txt(x?.es, 30), en: txt(x?.en, 30), valor: txt(x?.valor, 40), texto: bi(x?.texto, 40) })),
    destacados: lista(d?.destacados, 5, (x) => bi(x, 120)),
    servicios: lista(d?.servicios, 8, (x) => bi(x, 50)),
    marcas: lista(d?.marcas, 8, (x) => ({ nombre: txt(x?.nombre, 30), es: txt(x?.es, 50), en: txt(x?.en, 50) })),
    contacto: { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "", web: txt(d?.contacto?.web, 60), extra: bi(d?.contacto?.extra, 60) },
    actualizado: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const { data, error } = await db.from("kyo_ajustes").select("datos").eq("id", "prensa").maybeSingle();
    if (error) return json({ ok: false, error: "tabla" }, 500);
    return json({ ok: true, datos: data?.datos ?? null });
  }
  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);

  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const c = await comprobarClave(db, req, body?.clave);
  if (!c.ok) return json(c, estadoError(c.error!));

  const datos = limpiar(body.datos);
  const { error } = await db.from("kyo_ajustes").upsert({ id: "prensa", datos, updated_at: datos.actualizado });
  if (error) return json({ ok: false, error: "tabla" }, 500);
  return json({ ok: true, datos });
});
