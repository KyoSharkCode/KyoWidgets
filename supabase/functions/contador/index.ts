// KyoWidgets · contador
// Contadores personalizados (muertes, rage quits…) para OBS, el Estudio y el Stream Deck.
//
//   GET [?id=]                                  → valor público de un contador (lo lee el widget de OBS)
//   GET ?t=CLAVE_SD&id=muertes&accion=sumar     → botón del Stream Deck (acción "Sitio web" en segundo plano)
//        accion: sumar | restar      n: cuánto (1–100, por defecto 1)
//   POST {clave, accion:"leer"}                 → lista + valores + clave del Stream Deck (Estudio)
//   POST {clave, accion:"guardar", lista}       → guarda nombres e iconos
//   POST {clave, accion:"cambiar", id, delta}   → suma o resta
//   POST {clave, accion:"fijar", id, valor}     → pone un número exacto (0 = reiniciar)
//   POST {clave, accion:"token"}                → genera una clave nueva del Stream Deck
//
// Cada cambio se emite al momento por Supabase Realtime (canal "kyo-contadores"), así el widget
// no tiene que preguntar cada segundo y no gasta llamadas.
// "Verify JWT" tiene que estar DESACTIVADO: el Stream Deck no puede enviar cabeceras.
// La clave del Stream Deck es aleatoria y SOLO sirve para sumar o restar contadores
// (no es tu código del Estudio). Si se filtra, genera otra desde el Estudio.
// Secretos: KYO_SETUP_KEY. SQL: 02_anuncios.sql, 03_intentos.sql y 07_contadores.sql.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const texto = (t: string, s = 200) =>
  new Response(t, { status: s, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

// ---------- Código de acceso con límite de intentos (igual que en las demás funciones) ----------
async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
const ipDe = (req: Request) => "ip:" + (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
async function comprobarClave(db: any, req: Request, clave: unknown) {
  const setupKey = Deno.env.get("KYO_SETUP_KEY") ?? "";
  if (!setupKey) return { ok: false, error: "falta_KYO_SETUP_KEY" };
  const ip = ipDe(req);
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

// ---------- Contadores ----------
type Contador = { id: string; nombre: string; icono: string };
const ICONOS = ["calavera", "corazon", "estrella", "aleta", "espada", "trofeo", "rayo", "fuego", "risa", "calabaza", "copo", "mando"];
const MAX = 12;
const CANAL_RT = "kyo-contadores";
const fila = (id: string) => "contador:" + id;

const slug = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);

function limpiarLista(x: unknown): Contador[] {
  const out: Contador[] = [], vistos = new Set<string>();
  for (const c of Array.isArray(x) ? x : []) {
    const nombre = String(c?.nombre ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 24);
    let id = slug(c?.id) || slug(nombre);
    if (!id || !nombre) continue;
    let n = 2; const base = id;
    while (vistos.has(id)) id = (base.slice(0, 21) + "-" + n++);
    vistos.add(id);
    out.push({ id, nombre, icono: ICONOS.includes(c?.icono) ? c.icono : "calavera" });
    if (out.length >= MAX) break;
  }
  return out;
}

async function leerLista(db: any): Promise<Contador[]> {
  const { data, error } = await db.from("kyo_ajustes").select("datos").eq("id", "contadores").maybeSingle();
  if (error) throw new Error("tabla");
  return limpiarLista(data?.datos?.lista);
}
async function guardarFila(db: any, id: string, datos: unknown) {
  const { error } = await db.from("kyo_ajustes").upsert({ id, datos, updated_at: new Date().toISOString() });
  if (error) throw new Error("tabla");
}
async function leerValores(db: any, ids: string[]) {
  const m: Record<string, { valor: number; ultimo: string | null }> = {};
  if (!ids.length) return m;
  const { data } = await db.from("kyo_contadores").select("nombre, valor, ultimo").in("nombre", ids.map(fila));
  for (const r of data || []) m[String(r.nombre).slice(9)] = { valor: Number(r.valor) || 0, ultimo: r.ultimo };
  return m;
}
async function conValores(db: any, lista: Contador[]) {
  const v = await leerValores(db, lista.map((c) => c.id));
  return lista.map((c) => ({ ...c, valor: v[c.id]?.valor ?? 0, ultimo: v[c.id]?.ultimo ?? null }));
}
async function aplicar(db: any, id: string, delta: number, fijar: number | null) {
  const { data, error } = await db.rpc("kyo_contador", { p_nombre: fila(id), p_delta: delta, p_fijar: fijar });
  if (error) throw new Error("falta_sql");
  return Number(data) || 0;
}

// Clave del Stream Deck: aleatoria, guardada en la tabla privada
async function leerToken(db: any, crear: boolean): Promise<string> {
  const { data } = await db.from("kyo_ajustes").select("datos").eq("id", "contadores_token").maybeSingle();
  const t = data?.datos?.token;
  if (typeof t === "string" && t.length >= 32) return t;
  return crear ? await nuevoToken(db) : "";
}
async function nuevoToken(db: any) {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const t = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  await guardarFila(db, "contadores_token", { token: t });
  return t;
}

// Avisa al momento a los widgets abiertos (Supabase Realtime, canal público "kyo-contadores")
async function emitir(event: string, payload: unknown) {
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    await fetch(url + "/realtime/v1/api/broadcast", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: CANAL_RT, event, payload, private: false }] }),
      signal: AbortSignal.timeout(2500),
    });
  } catch { /* si falla, el widget lo verá en su siguiente consulta */ }
}

async function cambiar(db: any, c: Contador, delta: number, fijar: number | null, origen: string) {
  const valor = await aplicar(db, c.id, delta, fijar);
  await emitir("cambio", { id: c.id, nombre: c.nombre, icono: c.icono, valor, delta, reinicio: fijar !== null, origen, en: new Date().toISOString() });
  return valor;
}

const entero = (v: unknown, min: number, max: number, def: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    const q = new URL(req.url).searchParams;

    // ----- Botón del Stream Deck -----
    if (q.has("t")) {
      const guardado = await leerToken(db, false).catch(() => "");
      if (!guardado || !(await igual(q.get("t") || "", guardado))) {
        await db.rpc("kyo_intento", { p_ip: ipDe(req) }).catch(() => {}); // cuenta como intento fallido
        return texto("Clave del Stream Deck incorrecta", 401);
      }
      let lista: Contador[];
      try { lista = await leerLista(db); } catch { return texto("Falta ejecutar 02_anuncios.sql", 500); }
      const c = lista.find((x) => x.id === slug(q.get("id")));
      if (!c) return texto("No existe ese contador", 404);
      const acc = (q.get("accion") || "sumar").toLowerCase();
      const n = entero(q.get("n"), 1, 100, 1);
      const delta = acc === "restar" || acc === "menos" ? -n : n;
      try { return texto(c.nombre + ": " + (await cambiar(db, c, delta, null, "streamdeck"))); }
      catch { return texto("Falta ejecutar 07_contadores.sql", 500); }
    }

    // ----- Público: lo lee el widget -----
    try {
      const lista = await conValores(db, await leerLista(db));
      const id = slug(q.get("id"));
      const contador = (id && lista.find((c) => c.id === id)) || (!id ? lista[0] : null) || null;
      return json({ ok: true, contador, lista: lista.map(({ id, nombre, icono }) => ({ id, nombre, icono })) });
    } catch { return json({ ok: false, error: "tabla" }, 500); }
  }

  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);
  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const ck = await comprobarClave(db, req, body?.clave);
  if (!ck.ok) return json(ck, estadoError(ck.error!));

  try {
    switch (body.accion) {
      case "leer": {
        const lista = await conValores(db, await leerLista(db));
        return json({ ok: true, lista, token: await leerToken(db, true) });
      }
      case "guardar": {
        const antes = await leerLista(db);
        const lista = limpiarLista(body.lista);
        await guardarFila(db, "contadores", { lista });
        // Los contadores que ya no están se borran (así no reaparecen con el número viejo)
        const quitados = antes.filter((a) => !lista.some((c) => c.id === a.id)).map((a) => fila(a.id));
        if (quitados.length) await db.from("kyo_contadores").delete().in("nombre", quitados);
        await emitir("lista", { lista });
        return json({ ok: true, lista: await conValores(db, lista) });
      }
      case "cambiar":
      case "fijar": {
        const c = (await leerLista(db)).find((x) => x.id === slug(body.id));
        if (!c) return json({ ok: false, error: "no_existe" }, 404);
        const valor = body.accion === "fijar"
          ? await cambiar(db, c, 0, entero(body.valor, 0, 999999999, 0), "estudio")
          : await cambiar(db, c, entero(body.delta, -1000, 1000, 1), null, "estudio");
        return json({ ok: true, id: c.id, valor });
      }
      case "token":
        return json({ ok: true, token: await nuevoToken(db) });
    }
  } catch (e) {
    return json({ ok: false, error: (e as Error).message === "falta_sql" ? "falta_sql" : "tabla" }, 500);
  }
  return json({ ok: false, error: "accion" }, 400);
});
