// KyoWidgets · AletaBot IA · fase 2: memoria de viewers
// Un perfil pequeño por persona: cómo se llama, cómo prefiere que la llamen, desde cuándo viene,
// en cuántos directos ha estado y dos o tres cosas que ELLA le ha contado a AletaBot.
//
// - Las visitas solo se cuentan en directo, una vez por directo.
// - A los habituales se les saluda una vez por directo. Si llegan varios seguidos, se les saluda
//   juntos en un solo mensaje, y nunca hay dos saludos con menos de medio minuto entre ellos.
// - Los datos solo salen de mensajes dirigidos a AletaBot (los propone el filtro de Haiku, que
//   descarta lo sensible). Lo que se dice en el chat sin hablarle a ella no se guarda.
// - Cualquiera puede ver lo suyo (!misdatos), borrarlo y pedir que no se guarde nada más (!olvidame).
//
// Tabla y funciones SQL: sql/10_viewers.sql.

import {
  aPerfil, detectar, fusionarDatos, leerOrdenMemoria, limpiarApodo, limpiarNombre, limpiarSalida, nombreDe, rolDe,
  saludoDeRepuesto, textoMisDatos, trozosSecretos, TXT_MEMORIA, type Perfil,
} from "./texto.ts";
import { instruccionesSaludo, mensajeSaludo } from "./prompt.ts";
import { escribirSaludo, hayClave, revisarApodo } from "./claude.ts";
import { apuntar, directoActual, gastoMes, leerEstado, type Contexto } from "./estado.ts";

const ESPERA_SALUDO = 30;   // segundos como mínimo entre dos saludos
const SALUDOS_DIRECTO = 60; // saludos como máximo en un directo
const ESPERA_COMANDO = 15;  // segundos entre comandos de memoria de la misma persona

// Lo que se sabe de quien escribe tras registrar su visita. null = no se registró nada ahora.
export type Presencia = { perfil: Perfil | null; nuevo: boolean } | null;

// Quién ya está atendido en este directo (visita contada y saludo resuelto): no hace falta volver a mirar
let _resueltos: { directo: string; ids: Set<string> } = { directo: "", ids: new Set() };

// Lo llama twitch-bot-events con CADA mensaje del chat. Cuenta la visita y, si toca, saluda.
export async function presenciaIA(db: any, ev: any, ctx: Contexto): Promise<Presencia> {
  const userId = String(ev?.chatter_user_id || ""), login = String(ev?.chatter_user_login || "").toLowerCase();
  if (!userId || userId === ctx.idBot) return null;
  if (ev.source_broadcaster_user_id && ev.source_broadcaster_user_id !== ev.broadcaster_user_id) return null;

  const est = await leerEstado(db);
  const aj = est.ajustes;
  if (aj.estado === "apagada" || !aj.memoria || aj.ignorar.includes(login)) return null;
  const directo = await directoActual(db, est.directo, ctx);
  if (!directo.enVivo) return null; // fuera de directo no se cuentan visitas ni se saluda
  if (_resueltos.directo !== directo.id) _resueltos = { directo: directo.id, ids: new Set() };
  if (_resueltos.ids.has(userId)) return null;

  const texto = String(ev?.message?.text || "").trim();
  const badges: string[] = (ev.badges || []).map((b: any) => b.set_id);
  // No se saluda a Kyo, ni si la IA está en pausa, ni si el mensaje ya va para AletaBot
  // (entonces la bienvenida la da ella misma al contestar).
  const leHablan = !texto.startsWith("!") && !!detectar(ev, ctx.idBot, aj.nombres);
  const saludar = aj.saludos && aj.estado === "activa" && hayClave() && rolDe(badges) !== "streamer" && !leHablan
    && await gastoMes(db) < aj.topeMes;

  const { data, error } = await db.rpc("kyo_viewer_visita", {
    p_user: userId, p_login: login, p_nombre: limpiarNombre(ev.chatter_user_name || login), p_directo: directo.id,
    p_saludar: saludar, p_desde: aj.saludarDesde, p_espera: ESPERA_SALUDO, p_tope: SALUDOS_DIRECTO,
  });
  if (error || !data) return null; // p. ej. falta 10_viewers.sql: el resto de la IA sigue funcionando
  if (data.resuelto) _resueltos.ids.add(userId);

  const llegan = (Array.isArray(data.saludar) ? data.saludar : []).map(aPerfil).filter(Boolean) as Perfil[];
  if (llegan.length) await saludar_(db, directo.id, llegan, est.personalidad, ctx);
  return { perfil: aPerfil(data.perfil), nuevo: !!data.nuevo };
}

// Escribe el saludo con Haiku (con la personalidad de AletaBot). Si falla, usa uno de repuesto.
async function saludar_(db: any, directoId: string, llegan: Perfil[], personalidad: string, ctx: Contexto) {
  const sistema = instruccionesSaludo(personalidad);
  const r = await escribirSaludo(sistema, mensajeSaludo(llegan));
  await apuntar(db, directoId, "saludo", r);
  const texto = (r.ok ? limpiarSalida(r.valor, trozosSecretos(sistema), 300) : "") || saludoDeRepuesto(llegan.map(nombreDe));
  await ctx.decir(texto);
}

// El perfil de alguien (null si no hay, o si pidió que no se guardara nada)
export async function leerPerfil(db: any, userId: string): Promise<Perfil | null> {
  const { data } = await db.from("kyo_viewer").select("nombre, login, apodo, directos, primera, datos, no_recordar").eq("user_id", userId).maybeSingle();
  return data && !data.no_recordar ? aPerfil(data) : null;
}

// Guarda lo que el filtro propuso recordar de un mensaje dirigido a AletaBot. No guarda nada de quien pidió !olvidame.
export async function guardarRecuerdo(db: any, ev: any, o: { dato: string; apodo: string }) {
  if (!o.dato && !o.apodo) return;
  const userId = String(ev.chatter_user_id || ""), login = String(ev.chatter_user_login || "").toLowerCase();
  const { data } = await db.from("kyo_viewer").select("datos, no_recordar").eq("user_id", userId).maybeSingle();
  if (data?.no_recordar) return;
  const cambios: Record<string, unknown> = {};
  if (o.dato) cambios.datos = fusionarDatos(Array.isArray(data?.datos) ? data.datos : [], o.dato);
  if (o.apodo) cambios.apodo = o.apodo;
  if (data) await db.from("kyo_viewer").update(cambios).eq("user_id", userId).eq("no_recordar", false);
  else await db.from("kyo_viewer").insert({ user_id: userId, login, nombre: limpiarNombre(ev.chatter_user_name || login), ...cambios });
}

// ---------- Comandos de memoria: !misdatos, !olvidame, !recuerdame, !llamame (cualquiera) ----------
// Devuelve true si el mensaje era uno de estos comandos y ya está atendido.
// !olvidame funciona siempre, aunque la IA o la memoria estén apagadas.
export async function comandoMemoria(db: any, ev: any, texto: string, ctx: Contexto): Promise<boolean> {
  const o = leerOrdenMemoria(texto);
  if (!o) return false;
  const userId = String(ev.chatter_user_id || ""), login = String(ev.chatter_user_login || "").toLowerCase();
  if (!userId) return true;
  const est = await leerEstado(db);
  if (o.orden !== "olvidar" && !est.ajustes.memoria) return false;

  const nombre = limpiarNombre(ev.chatter_user_name || login);
  const pedir = (orden: string, valor = "", espera = ESPERA_COMANDO) =>
    db.rpc("kyo_viewer_orden", { p_user: userId, p_login: login, p_nombre: nombre, p_orden: orden, p_valor: valor, p_espera: espera });
  const responder = (m: string) => ctx.decir(m, ev.message_id);

  if (o.orden === "apodo") {
    // primero se "coge turno" (así nadie hace escribir a AletaBot sin parar) y luego se revisa el apodo con Haiku
    const { data: turno, error } = await pedir("turno");
    if (error || !turno || turno.estado === "espera") return true;
    if (turno.estado === "sin_memoria") { await responder(TXT_MEMORIA.sinMemoria(nombre)); return true; }
    const apodo = limpiarApodo(o.valor);
    if (!apodo) { await responder(TXT_MEMORIA.apodoAyuda()); return true; }
    if (est.ajustes.estado === "apagada" || !hayClave() || await gastoMes(db) >= est.ajustes.topeMes) { await responder(TXT_MEMORIA.apodoAhoraNo()); return true; }
    const directo = await directoActual(db, est.directo, ctx);
    const r = await revisarApodo(apodo);
    await apuntar(db, directo.id, "apodo", r);
    if (!r.ok) { await responder(TXT_MEMORIA.apodoAhoraNo()); return true; }
    if (!r.valor) { await responder(TXT_MEMORIA.apodoNo()); return true; }
    const { data } = await pedir("apodo", apodo, 0);
    if (data?.estado === "ok") await responder(TXT_MEMORIA.apodo(apodo));
    return true;
  }

  const { data, error } = await pedir(o.orden === "olvidar" ? "olvidar" : o.orden === "recordar" ? "recordar" : "ver");
  if (error || !data || data.estado === "espera") return true;
  if (o.orden === "olvidar") { _resueltos.ids.add(userId); await responder(TXT_MEMORIA.olvidado(nombre)); }
  else if (o.orden === "recordar") await responder(TXT_MEMORIA.recordar(nombre));
  else if (data.estado === "sin_memoria") await responder(TXT_MEMORIA.sinMemoria(nombre));
  else await responder(textoMisDatos(nombre, aPerfil(data.perfil)));
  return true;
}

// ---------- Para el Estudio (función aleta-ia) ----------
export async function listarViewers(db: any, buscar: unknown) {
  const b = String(buscar ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 25);
  let q = db.from("kyo_viewer").select("user_id, login, nombre, apodo, primera, ultima, directos, datos", { count: "exact" }).eq("no_recordar", false);
  if (b) q = q.ilike("login", "%" + b + "%");
  const { data, count, error } = await q.order("ultima", { ascending: false }).limit(100);
  return { viewers: data || [], total: count || 0, sql: !error };
}

// Borra del todo el perfil de alguien (sin marcarlo como "no recordar": si vuelve, empieza de cero)
export async function borrarViewer(db: any, userId: unknown) {
  const id = String(userId ?? "").slice(0, 40);
  if (!id) return { ok: false, error: "viewer" };
  const { error } = await db.from("kyo_viewer").delete().eq("user_id", id);
  await db.from("kyo_ia_hilo").delete().eq("user_id", id);
  return error ? { ok: false, error: "sql" } : { ok: true };
}

// Enseña cómo saludaría a una persona de ejemplo, sin escribir en el chat. Gasta tokens de verdad (muy pocos).
export async function probarSaludo(db: any, personalidad: unknown) {
  if (!hayClave()) return { ok: false, error: "sin_clave" };
  const est = await leerEstado(db, true);
  if (await gastoMes(db, true) >= est.ajustes.topeMes) return { ok: false, error: "tope_mes" };
  const sistema = instruccionesSaludo(typeof personalidad === "string" ? personalidad.slice(0, 4000) : est.personalidad);
  const ejemplo: Perfil[] = [{ nombre: "Pepa", apodo: null, directos: 7, primera: "", datos: ["Tiene un gato que se llama Miso"] }];
  const r = await escribirSaludo(sistema, mensajeSaludo(ejemplo));
  await apuntar(db, "pruebas", "prueba", r);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, respuesta: limpiarSalida(r.valor, trozosSecretos(sistema), 300) || saludoDeRepuesto(["Pepa"]), coste: r.coste };
}
