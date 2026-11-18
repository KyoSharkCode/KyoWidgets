// KyoWidgets · quién puede usar Kyo Estudio
// Lo usan todas las funciones que el Estudio llama para cambiar cosas (comandos, sorteos, IA, conexiones…).
//
// Dos formas de entrar:
//   1. Sesión de Google (la buena). El Estudio manda en la cabecera Authorization la sesión que da
//      Supabase Auth al entrar con Google. Aquí se comprueba su firma con la clave pública del proyecto
//      (sin consultar nada: no gasta invocaciones ni logs) y que el correo esté en KYO_ADMIN_EMAILS.
//   2. El código de acceso de siempre (KYO_SETUP_KEY), con su límite de intentos. Solo mientras dure
//      el cambio: con el secreto KYO_SOLO_GOOGLE = "si" deja de servir para entrar.
//
// Secretos:
//   KYO_ADMIN_EMAILS  correos de Google que pueden entrar, separados por comas (normalmente uno: el tuyo)
//   KYO_SOLO_GOOGLE   "si" para que el código ya no valga (ponlo cuando hayas entrado con Google)
//   KYO_SETUP_KEY     el código de siempre (sigue haciendo falta: con él se firman los avisos de Twitch)
//
// Devuelve {ok:true, via} o {ok:false, error}:
//   "sesion"        la sesión no vale o caducó (el Estudio la renueva y reintenta)
//   "no_permitido"  la sesión es buena, pero ese correo no está en la lista
//   "google"        hay que entrar con Google (el código ya no vale)
//   "clave" / "bloqueado" / "falta_intentos" / "falta_KYO_SETUP_KEY"   los del código, como siempre

type Resultado = { ok: boolean; via?: "google" | "codigo"; error?: string; espera?: number; quedan?: number; correo?: string };

// Compara las huellas SHA-256 en tiempo constante (no da pistas de cuántas letras acertaste)
export async function igual(a: string, b: string) {
  const h = async (t: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

const entorno = (k: string) => (Deno.env.get(k) ?? "").trim();
export const soloGoogle = () => ["si", "sí", "1", "true"].includes(entorno("KYO_SOLO_GOOGLE").toLowerCase());
const correosPermitidos = () => entorno("KYO_ADMIN_EMAILS").toLowerCase().split(/[,;\s]+/).filter(Boolean);

// ---------- Sesión de Google (JWT de Supabase Auth, firmado con ES256) ----------
const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const leerJSON = (s: string) => { try { return JSON.parse(new TextDecoder().decode(b64url(s))); } catch { return null; } };

// Las claves públicas del proyecto. Se leen una vez y se recuerdan una hora.
let _claves: { ts: number; lista: any[] } | null = null;
async function clavesPublicas(fresco = false): Promise<any[]> {
  if (!fresco && _claves && Date.now() - _claves.ts < 3600_000) return _claves.lista;
  let lista: any[] = [];
  try {
    const r = await fetch(entorno("SUPABASE_URL") + "/auth/v1/.well-known/jwks.json");
    const j = await r.json();
    lista = Array.isArray(j?.keys) ? j.keys : [];
  } catch { /* sin red: se queda lo que hubiera */ }
  if (lista.length || !_claves) _claves = { ts: Date.now(), lista };
  return _claves.lista;
}

// Solo para las pruebas: usar unas claves públicas concretas en vez de pedirlas
export function usarClavesPublicas(lista: any[] | null) { _claves = lista ? { ts: Date.now(), lista } : null; }

// ¿Parece una sesión de usuario? (la "anon key" que manda el Estudio sin sesión también es un JWT, con role "anon")
function partes(token: string): { cabecera: any; datos: any; firmado: string; firma: string } | null {
  const p = token.split(".");
  if (p.length !== 3) return null;
  const cabecera = leerJSON(p[0]), datos = leerJSON(p[1]);
  if (!cabecera || !datos) return null;
  return { cabecera, datos, firmado: p[0] + "." + p[1], firma: p[2] };
}

// Comprueba la sesión. Devuelve el correo si es de Google, está bien firmada, no ha caducado y es de este proyecto.
export async function correoDeSesion(token: string): Promise<{ correo: string } | { error: "sesion" }> {
  const no = { error: "sesion" as const };
  const t = partes(token);
  // Solo se acepta ES256 (clave pública). Así nadie puede colar un token "firmado" con otro algoritmo.
  if (!t || t.cabecera.alg !== "ES256" || typeof t.cabecera.kid !== "string") return no;

  let jwk = (await clavesPublicas()).find((k) => k.kid === t.cabecera.kid);
  if (!jwk) jwk = (await clavesPublicas(true)).find((k) => k.kid === t.cabecera.kid); // por si el proyecto estrenó clave
  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256") return no;
  let valida = false;
  try {
    const clave = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    valida = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, clave, b64url(t.firma), new TextEncoder().encode(t.firmado));
  } catch { return no; }
  if (!valida) return no;

  const d = t.datos, ahora = Date.now() / 1000;
  if (typeof d.exp !== "number" || d.exp <= ahora) return no;                       // caducada
  if (typeof d.nbf === "number" && d.nbf > ahora + 60) return no;
  if (d.iss !== entorno("SUPABASE_URL") + "/auth/v1") return no;                    // de otro proyecto
  if (d.aud !== "authenticated" || d.role !== "authenticated" || d.is_anonymous === true) return no;
  // Tiene que ser una cuenta que entró con Google (no una creada con correo y contraseña)
  const proveedores: unknown[] = Array.isArray(d.app_metadata?.providers) ? d.app_metadata.providers : [];
  if (d.app_metadata?.provider !== "google" && !proveedores.includes("google")) return no;
  const correo = String(d.email || "").toLowerCase();
  if (!correo) return no;
  return { correo };
}

function tokenDe(req: Request): string {
  const a = req.headers.get("authorization") || "";
  return /^bearer\s+/i.test(a) ? a.replace(/^bearer\s+/i, "").trim() : "";
}

// ---------- La comprobación que usan las funciones ----------
// (Se sigue llamando comprobarClave para no tocar cada función más de lo necesario.)
export async function comprobarClave(db: any, req: Request, clave: unknown): Promise<Resultado> {
  // 1) ¿Viene con una sesión de usuario? (si es la anon key del Estudio sin sesión, no cuenta)
  const token = tokenDe(req);
  const pinta = token ? partes(token) : null;
  if (pinta && pinta.datos.role === "authenticated") {
    const s = await correoDeSesion(token);
    if ("error" in s) return { ok: false, error: "sesion" };
    if (!correosPermitidos().includes(s.correo)) return { ok: false, error: "no_permitido" };
    return { ok: true, via: "google", correo: s.correo };
  }

  // 2) El código de acceso (solo mientras no se haya cerrado esa puerta)
  if (soloGoogle()) return { ok: false, error: "google" };
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
  return { ok: true, via: "codigo" };
}

// Qué código HTTP devolver con cada error
export const estadoAcceso = (e: string) => (["clave", "sesion", "google"].includes(e) ? 401 : e === "no_permitido" ? 403 : e === "bloqueado" ? 429 : 500);

// Lo que el Estudio necesita saber para pintar la puerta (no es secreto)
export const infoAcceso = () => ({ soloGoogle: soloGoogle(), googleListo: correosPermitidos().length > 0 });
