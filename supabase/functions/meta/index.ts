// KyoWidgets · meta
// Meta de donaciones para OBS y el Estudio. Lee los tips de StreamElements y guarda el total en Supabase,
// así el total no se reinicia aunque recargues OBS o el widget.
//
//   GET                                    → estado público de la meta (lo lee el widget de OBS)
//                                            y, si hace falta, consulta StreamElements (máx. 1 vez cada 15 s)
//   POST {clave, accion:"leer"}            → ajustes + total + estado de la conexión con StreamElements (Estudio)
//   POST {clave, accion:"guardar", ...}    → titulo, mensaje, meta, moneda, desde
//   POST {clave, accion:"sumar", monto}    → suma o resta a mano (p. ej. una donación fuera de StreamElements)
//   POST {clave, accion:"fijar", total}    → pone el total exacto
//   POST {clave, accion:"reiniciar"}       → empieza una meta nueva (cuenta desde ahora, ajuste a 0)
//   POST {clave, accion:"sincronizar"}     → fuerza la consulta a StreamElements
//
// Total = ajuste manual + suma de los tips de StreamElements (de la moneda elegida) desde la fecha de inicio.
// Cada tip se guarda una sola vez por su id, así que no se cuenta doble.
// Cada cambio se emite al momento por Supabase Realtime (canal "kyo-meta").
// Secretos: KYO_SETUP_KEY y STREAMELEMENTS_JWT (opcional: sin él solo funciona el modo manual).
// SQL: 02_anuncios.sql, 03_intentos.sql y 08_meta.sql.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

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

// ---------- Ajustes ----------
const CANAL_RT = "kyo-meta";
const SE = "https://api.streamelements.com/kappa/v2";
const ESPERA_SYNC_MS = 15000;

type Cfg = { titulo: string; mensaje: string; meta: number; moneda: string; desde: string; base: number };
const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : def;
};
function limpiarCfg(x: any, previo?: Cfg): Cfg {
  const desde = new Date(x?.desde ?? previo?.desde ?? Date.now());
  return {
    titulo: String(x?.titulo ?? previo?.titulo ?? "Meta de donaciones").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40) || "Meta de donaciones",
    mensaje: String(x?.mensaje ?? previo?.mensaje ?? "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, 80),
    meta: num(x?.meta ?? previo?.meta, 1, 99999999, previo?.meta ?? 100),
    moneda: (String(x?.moneda ?? previo?.moneda ?? "EUR").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)) || "EUR",
    desde: (isNaN(desde.getTime()) ? new Date() : desde).toISOString(),
    base: num(x?.base ?? previo?.base, -99999999, 99999999, previo?.base ?? 0),
  };
}
async function leerFila(db: any, id: string) {
  const { data, error } = await db.from("kyo_ajustes").select("datos").eq("id", id).maybeSingle();
  if (error) throw new Error("tabla");
  return data?.datos ?? null;
}
async function guardarFila(db: any, id: string, datos: unknown) {
  const { error } = await db.from("kyo_ajustes").upsert({ id, datos, updated_at: new Date().toISOString() });
  if (error) throw new Error("tabla");
}
async function leerCfg(db: any): Promise<Cfg> {
  const d = await leerFila(db, "meta");
  if (d) return limpiarCfg(d);
  const nueva = limpiarCfg({ desde: new Date().toISOString() });
  await guardarFila(db, "meta", nueva);
  return nueva;
}
async function sumaTotal(db: any, cfg: Cfg) {
  const { data, error } = await db.rpc("kyo_meta_total", { p_desde: cfg.desde, p_moneda: cfg.moneda });
  if (error) throw new Error("falta_sql");
  return Math.max(0, Math.round(((Number(data) || 0) + cfg.base) * 100) / 100);
}

// ---------- StreamElements ----------
type Sync = { ultimo: number; ok: boolean; error: string; canal?: string; nuevos?: number; ultimoTip?: { donante: string; monto: number; moneda: string; fecha: string } | null };
async function se(ruta: string, jwt: string) {
  const r = await fetch(SE + ruta, { headers: { Authorization: "Bearer " + jwt, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (r.status === 401 || r.status === 403) throw new Error("token_invalido");
  if (!r.ok) throw new Error("se_" + r.status);
  return r.json();
}
// Consulta los tips nuevos y los guarda. Devuelve cuántos eran nuevos.
async function sincronizar(db: any, cfg: Cfg, forzar: boolean, completo = false): Promise<{ sync: Sync; nuevos: number }> {
  const previo: Sync = (await leerFila(db, "meta_sync").catch(() => null)) ?? { ultimo: 0, ok: false, error: "" };
  if (!forzar && Date.now() - (previo.ultimo || 0) < ESPERA_SYNC_MS) return { sync: previo, nuevos: 0 };
  const jwt = Deno.env.get("STREAMELEMENTS_JWT") ?? "";
  // Reservamos el turno antes de consultar, para que varios widgets abiertos no consulten a la vez
  const sync: Sync = { ...previo, ultimo: Date.now(), nuevos: 0 };
  if (!jwt) { sync.ok = false; sync.error = "sin_token"; await guardarFila(db, "meta_sync", sync); return { sync, nuevos: 0 }; }
  await guardarFila(db, "meta_sync", sync);
  let nuevos = 0;
  try {
    if (!sync.canal) sync.canal = String((await se("/channels/me", jwt))?._id ?? "");
    if (!sync.canal) throw new Error("sin_canal");
    // Solo pedimos desde un día antes del último tip que ya tenemos (o desde el inicio de la meta)
    const { data: ult } = await db.from("kyo_meta_tips").select("fecha").gte("fecha", cfg.desde).order("fecha", { ascending: false }).limit(1);
    const desdeMs = completo ? new Date(cfg.desde).getTime() : Math.max(new Date(cfg.desde).getTime(), ult?.[0] ? new Date(ult[0].fecha).getTime() - 86400000 : 0);
    for (let off = 0; off < 500; off += 100) {
      const d = await se(`/tips/${sync.canal}?limit=100&offset=${off}&sort=-createdAt&after=${desdeMs}`, jwt);
      const docs: any[] = Array.isArray(d?.docs) ? d.docs : [];
      const filas = docs.filter((t) => t?._id && t?.donation && (!t.status || t.status === "success") && !["denied", "rejected"].includes(String(t.approved ?? "").toLowerCase()))
        .map((t) => ({
          id: String(t._id),
          monto: Number(t.donation.amount) || 0,
          moneda: String(t.donation.currency || "EUR").toUpperCase().slice(0, 3),
          donante: String(t.donation.user?.username ?? t.donation.name ?? "").replace(/[\u0000-\u001f<>]/g, "").slice(0, 40) || null,
          mensaje: String(t.donation.message ?? "").slice(0, 300) || null,
          fecha: new Date(t.createdAt || Date.now()).toISOString(),
        })).filter((f) => f.monto > 0);
      if (filas.length) {
        const { data: ins, error } = await db.from("kyo_meta_tips").upsert(filas, { onConflict: "id", ignoreDuplicates: true }).select("id, monto, moneda, donante, fecha");
        if (error) throw new Error("falta_sql");
        nuevos += ins?.length ?? 0;
        const u = (ins ?? []).sort((a: any, b: any) => +new Date(b.fecha) - +new Date(a.fecha))[0];
        if (u && (!sync.ultimoTip || +new Date(u.fecha) >= +new Date(sync.ultimoTip.fecha))) sync.ultimoTip = { donante: u.donante || "Anónimo", monto: Number(u.monto), moneda: u.moneda, fecha: u.fecha };
      }
      if (docs.length < 100) break;
    }
    sync.ok = true; sync.error = "";
  } catch (e) {
    sync.ok = false; sync.error = (e as Error).message === "falta_sql" ? "falta_sql" : (e as Error).message || "error";
    if (sync.error === "token_invalido") sync.canal = "";
  }
  sync.nuevos = nuevos;
  await guardarFila(db, "meta_sync", sync);
  return { sync, nuevos };
}

// ---------- Estado público ----------
async function estado(db: any, cfg: Cfg, sync: Sync) {
  return {
    titulo: cfg.titulo, mensaje: cfg.mensaje, meta: cfg.meta, moneda: cfg.moneda, total: await sumaTotal(db, cfg),
    ultimo: sync.ultimoTip && +new Date(sync.ultimoTip.fecha) >= +new Date(cfg.desde) ? sync.ultimoTip : null,
  };
}
async function emitir(payload: unknown) {
  const url = Deno.env.get("SUPABASE_URL")!, key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    await fetch(url + "/realtime/v1/api/broadcast", {
      method: "POST",
      headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: CANAL_RT, event: "cambio", payload, private: false }] }),
      signal: AbortSignal.timeout(2500),
    });
  } catch { /* si falla, el widget lo verá en su siguiente consulta */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "GET") {
    try {
      const cfg = await leerCfg(db);
      const { sync, nuevos } = await sincronizar(db, cfg, false);
      const e = await estado(db, cfg, sync);
      if (nuevos > 0) await emitir({ ...e, nuevos });
      return json({ ok: true, ...e });
    } catch (e) { return json({ ok: false, error: (e as Error).message === "falta_sql" ? "falta_sql" : "tabla" }, 500); }
  }

  if (req.method !== "POST") return json({ ok: false, error: "metodo" }, 405);
  let body: any = null;
  try { body = await req.json(); } catch { return json({ ok: false, error: "json" }, 400); }
  const ck = await comprobarClave(db, req, body?.clave);
  if (!ck.ok) return json(ck, estadoError(ck.error!));

  try {
    let cfg = await leerCfg(db);
    let sync: Sync | null = null, nuevos = 0;
    switch (body.accion) {
      case "leer":
      case "sincronizar":
        ({ sync, nuevos } = await sincronizar(db, cfg, body.accion === "sincronizar", body.accion === "sincronizar"));
        break;
      case "guardar": {
        const antes = cfg;
        cfg = limpiarCfg(body, cfg);
        // Si cambia la fecha de inicio o la moneda, el total de los tips cambia: lo recalculamos solo
        await guardarFila(db, "meta", cfg);
        if (antes.desde !== cfg.desde) ({ sync, nuevos } = await sincronizar(db, cfg, true, true));
        break;
      }
      case "sumar": {
        const m = num(body.monto, -99999999, 99999999, 0);
        if (!m) return json({ ok: false, error: "monto" }, 400);
        cfg = { ...cfg, base: num(cfg.base + m, -99999999, 99999999, cfg.base) };
        await guardarFila(db, "meta", cfg);
        break;
      }
      case "fijar": {
        const objetivo = num(body.total, 0, 99999999, 0);
        const { data, error } = await db.rpc("kyo_meta_total", { p_desde: cfg.desde, p_moneda: cfg.moneda });
        if (error) throw new Error("falta_sql");
        cfg = { ...cfg, base: num(objetivo - (Number(data) || 0), -99999999, 99999999, 0) };
        await guardarFila(db, "meta", cfg);
        break;
      }
      case "reiniciar":
        cfg = { ...cfg, desde: new Date().toISOString(), base: 0 };
        await guardarFila(db, "meta", cfg);
        break;
      default:
        return json({ ok: false, error: "accion" }, 400);
    }
    if (!sync) sync = (await leerFila(db, "meta_sync").catch(() => null)) ?? { ultimo: 0, ok: false, error: "" };
    const e = await estado(db, cfg, sync);
    if (body.accion !== "leer") await emitir({ ...e, nuevos, reinicio: body.accion === "reiniciar" || body.accion === "fijar" });
    return json({
      ok: true, ...e, cfg: { titulo: cfg.titulo, mensaje: cfg.mensaje, meta: cfg.meta, moneda: cfg.moneda, desde: cfg.desde, base: cfg.base },
      conexion: { hayToken: !!Deno.env.get("STREAMELEMENTS_JWT"), ok: sync.ok, error: sync.error, ultimo: sync.ultimo, nuevos },
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message === "falta_sql" ? "falta_sql" : "tabla" }, 500);
  }
});
