// KyoWidgets · pruebas del acceso al Estudio (sesión de Google o código)
//   npm run acceso        (o: node pruebas/acceso/probar.mjs)
// No habla con Google ni con Supabase: fabrica sus propias claves y sesiones de mentira y comprueba
// que supabase/functions/_shared/acceso.ts solo deja pasar a quien debe. Necesita Node 22.18 o más nuevo.

const env = { SUPABASE_URL: "https://proyecto.supabase.co", KYO_SETUP_KEY: "codigo-secreto-de-prueba", KYO_ADMIN_EMAILS: "kyo@example.com", KYO_SOLO_GOOGLE: "" };
globalThis.Deno = { env: { get: (k) => env[k] } };
const pedidas = [];
globalThis.fetch = async (u) => { pedidas.push(String(u)); return { json: async () => ({ keys: [] }) }; };

const A = await import("../../supabase/functions/_shared/acceso.ts");

let ok = 0, mal = 0;
const igual = (nombre, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { mal++; console.log("  ❌ " + nombre + "  →  " + JSON.stringify(a)); } };

// ---------- Claves y sesiones de mentira ----------
const b64url = (b) => Buffer.from(b).toString("base64url");
const par = () => crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const buena = await par(), ajena = await par();
const jwk = { ...(await crypto.subtle.exportKey("jwk", buena.publicKey)), kid: "clave-1", alg: "ES256", use: "sig" };
A.usarClavesPublicas([jwk]);

const ahora = () => Math.floor(Date.now() / 1000);
const datosDe = (cambios = {}) => ({
  iss: env.SUPABASE_URL + "/auth/v1", aud: "authenticated", role: "authenticated", exp: ahora() + 3600, iat: ahora(),
  sub: "11111111-2222-3333-4444-555555555555", email: "kyo@example.com", is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] }, amr: [{ method: "oauth", timestamp: ahora() }],
  ...cambios,
});
async function sesion(datos, { clave = buena.privateKey, cabecera = { alg: "ES256", typ: "JWT", kid: "clave-1" } } = {}) {
  const firmado = b64url(JSON.stringify(cabecera)) + "." + b64url(JSON.stringify(datos));
  const firma = clave ? new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, new TextEncoder().encode(firmado))) : new Uint8Array();
  return firmado + "." + b64url(firma);
}
const ANON = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" })) + "." + b64url(JSON.stringify({ iss: "supabase", role: "anon", exp: ahora() + 99999 })) + ".firma";

// Base de datos de mentira: solo el contador de intentos del código
function base() {
  const db = { intentos: 0, aciertos: 0, rpc: (n) => { if (n === "kyo_intento") db.intentos++; if (n === "kyo_intento_ok") db.aciertos++; return Promise.resolve({ data: { bloqueado: false, espera: 0, quedan: 2 }, error: null }); } };
  return db;
}
const peticion = (token) => new Request("https://x/", { method: "POST", headers: token === null ? {} : { authorization: "Bearer " + token } });
async function entra(token, clave = "", db = base()) { const r = await A.comprobarClave(db, peticion(token), clave); return [r.ok, r.via || r.error, db.intentos]; }

console.log("1) Sesión de Google");
igual("sesión buena de un correo permitido", await entra(await sesion(datosDe())), [true, "google", 0]);
igual("el correo no distingue mayúsculas", await entra(await sesion(datosDe({ email: "Kyo@Example.com" }))), [true, "google", 0]);
igual("otra cuenta de Google: no entra", await entra(await sesion(datosDe({ email: "otra@example.com" }))), [false, "no_permitido", 0]);
igual("un correo parecido no cuela", await entra(await sesion(datosDe({ email: "kyo@example.com.evil.org" }))), [false, "no_permitido", 0]);
igual("sesión caducada", await entra(await sesion(datosDe({ exp: ahora() - 10 }))), [false, "sesion", 0]);
igual("sesión de otro proyecto de Supabase", await entra(await sesion(datosDe({ iss: "https://otro.supabase.co/auth/v1" }))), [false, "sesion", 0]);
igual("cuenta de correo y contraseña (no de Google)", await entra(await sesion(datosDe({ app_metadata: { provider: "email", providers: ["email"] } }))), [false, "sesion", 0]);
igual("usuario anónimo", await entra(await sesion(datosDe({ is_anonymous: true }))), [false, "sesion", 0]);
igual("sin correo", await entra(await sesion(datosDe({ email: "" }))), [false, "sesion", 0]);

console.log("2) Sesiones falsificadas");
const t = await sesion(datosDe({ email: "otra@example.com" }));
const [c, , f] = t.split(".");
igual("cambiar el correo sin volver a firmar", await entra(c + "." + b64url(JSON.stringify(datosDe())) + "." + f), [false, "sesion", 0]);
igual("firmada con otra clave", await entra(await sesion(datosDe(), { clave: ajena.privateKey })), [false, "sesion", 0]);
igual("sin firma (alg none)", await entra(await sesion(datosDe(), { clave: null, cabecera: { alg: "none", typ: "JWT", kid: "clave-1" } })), [false, "sesion", 0]);
{
  // "firmada" con HS256 usando la clave pública como contraseña (truco clásico)
  const firmado = b64url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: "clave-1" })) + "." + b64url(JSON.stringify(datosDe()));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(JSON.stringify(jwk)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(firmado)));
  igual("HS256 con la clave pública", await entra(firmado + "." + b64url(firma)), [false, "sesion", 0]);
}
igual("clave desconocida (vuelve a pedir las claves y sigue sin valer)", [await entra(await sesion(datosDe(), { cabecera: { alg: "ES256", typ: "JWT", kid: "otra" } })), pedidas.length > 0], [[false, "sesion", 0], true]);
A.usarClavesPublicas([jwk]);
igual("basura con pinta de sesión", await entra("aaa.bbb.ccc"), [false, "clave", 1]);
igual("una sesión mala no se salva con el código correcto", await entra(await sesion(datosDe({ exp: ahora() - 10 })), env.KYO_SETUP_KEY), [false, "sesion", 0]);

console.log("3) Código de acceso (mientras dure el cambio)");
igual("código correcto", await entra(ANON, env.KYO_SETUP_KEY), [true, "codigo", 1]);
igual("código incorrecto (cuenta como intento)", await entra(ANON, "otro"), [false, "clave", 1]);
igual("sin cabecera y con código correcto", await entra(null, env.KYO_SETUP_KEY), [true, "codigo", 1]);
igual("código vacío", await entra(ANON, ""), [false, "clave", 1]);

console.log("4) Solo Google");
env.KYO_SOLO_GOOGLE = "si";
igual("el código correcto ya no entra (y no gasta intentos)", await entra(ANON, env.KYO_SETUP_KEY), [false, "google", 0]);
igual("la sesión de Google sigue entrando", await entra(await sesion(datosDe())), [true, "google", 0]);
igual("lo que ve la puerta", A.infoAcceso(), { soloGoogle: true, googleListo: true });
env.KYO_SOLO_GOOGLE = "";

console.log("5) Sin lista de correos");
env.KYO_ADMIN_EMAILS = "";
igual("nadie entra con Google si no hay correos permitidos", await entra(await sesion(datosDe())), [false, "no_permitido", 0]);
igual("la puerta no ofrece Google", A.infoAcceso(), { soloGoogle: false, googleListo: false });
env.KYO_ADMIN_EMAILS = "mod@example.com, kyo@example.com";
igual("varios correos separados por comas", await entra(await sesion(datosDe())), [true, "google", 0]);

igual("códigos HTTP", ["clave", "sesion", "google", "no_permitido", "bloqueado", "otro"].map(A.estadoAcceso), [401, 401, 401, 403, 429, 500]);

console.log(mal ? `\n❌ ${mal} pruebas fallaron (${ok} bien)` : `\n✅ Las ${ok} pruebas pasan`);
process.exit(mal ? 1 : 0);
