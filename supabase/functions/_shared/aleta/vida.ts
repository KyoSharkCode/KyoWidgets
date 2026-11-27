// KyoWidgets · AletaBot IA · la vida de AletaBot
// Lo que hace que no exista solo dentro del personaje:
//   - Memoria de sí misma: lo que cuenta de ella se guarda (su "canon") y, al acabar cada directo,
//     escribe un diario corto. Las dos cosas vuelven a sus instrucciones en los directos siguientes.
//   - Ánimo del día: uno distinto por directo (lo elige el código; Kyo puede fijarlo desde el Estudio).
//   - Saber dónde está: a qué se juega, el título, cuánto lleva el directo y qué hora es.
//   - Iniciativa: de vez en cuando comenta algo por su cuenta, sin que nadie la nombre.
//
// Límites de Supabase: nada de esto añade invocaciones. Todo se lee junto con los ajustes (una consulta
// recordada 15 s). Solo se escribe al aprender algo nuevo, una vez por directo (ánimo y diario), cada
// 10 minutos como mucho (juego y título) y cuando toca un comentario por iniciativa propia.
//
// Se guarda en kyo_ajustes: filas "aleta_canon", "aleta_diario", "aleta_animo" y "canal".

import { limpiarEntrada, limpiarSalida, trozosSecretos, type AjustesIA } from "./texto.ts";
import {
  animoPara, bloqueDirecto, chatConAmbiente, limpiarZona, memoriaPropia, quitarDeDiario, sumarCanon, sumarDiario,
  CANON_MAX, type Vida,
} from "./vida-texto.ts";
import { instrucciones, mensajeDiario, mensajeIniciativa, type Linea } from "./prompt.ts";
import { avisoForma, conversar, escribirDiario, hayClave } from "./claude.ts";
import { juegoActivo } from "./juegos-texto.ts";
import { ahoraISO, apuntar, gastoMes, guardarVida, leerEstado, leerVidaFresca, type Contexto, type Estado } from "./estado.ts";

const CANAL_VALE = 10 * 60_000; // el juego y el título se vuelven a preguntar a Twitch pasado este tiempo

// ---------- Lo que acompaña a cada respuesta ----------
// Prepara el contexto "vivo" de una respuesta: fija el ánimo del directo si aún no lo tiene, refresca el
// juego y el título si están viejos, y devuelve los dos textos que ve el modelo.
export async function contextoVivo(db: any, est: Estado, ctx: Contexto, directo: { id: string; enVivo: boolean }): Promise<{ memoria: string; directo: string }> {
  let v = est.vida;
  const a = animoPara(v.animo, directo.id, directo.enVivo);
  if (a.cambia) { await guardarVida(db, "animo", a.animo).catch(() => {}); v = { ...v, animo: a.animo }; }
  if (directo.enVivo && ctx.canal && (!v.canal || Date.now() - Date.parse(v.canal.visto) > CANAL_VALE)) {
    const c = await ctx.canal().catch(() => undefined);
    if (c) {
      const canal = { juego: limpiarEntrada(c.juego, 60), titulo: limpiarEntrada(c.titulo, 140), visto: ahoraISO() };
      await guardarVida(db, "canal", canal).catch(() => {});
      v = { ...v, canal };
    }
  }
  const zona = limpiarZona(est.ajustes.zona);
  return {
    memoria: memoriaPropia(v, zona),
    directo: bloqueDirecto({ enVivo: directo.enVivo, inicio: est.directo?.inicio, canal: directo.enVivo ? v.canal : null, zona }),
  };
}

// AletaBot acaba de contar algo nuevo de sí misma: se guarda para siempre (hasta CANON_MAX cosas)
export async function recordarDeSi(db: any, nota: string) {
  if (!nota) return;
  const v = await leerVidaFresca(db);
  const canon = sumarCanon(v.canon, nota);
  if (canon !== v.canon) await guardarVida(db, "canon", canon);
}

// Si la API rechazó la respuesta "con forma" y hubo que repetirla como texto, se deja a la vista del Estudio
export async function apuntarAvisoForma(db: any) {
  const detalle = avisoForma();
  if (detalle) await db.from("kyo_ajustes").upsert({ id: "ia_error", datos: { ts: ahoraISO(), tarea: "forma", error: "peticion", detalle }, updated_at: ahoraISO() });
}

// ---------- Iniciativa ----------
// La llama atenderIA con los mensajes normales (los que no van para ella). Casi siempre vuelve sin hacer
// nada y sin consultar nada: solo cuando ha pasado el tiempo mira si hay ambiente y si tiene algo que decir.
let _proxima = 0; // cuándo vuelve a intentarlo este proceso (ms)
export async function quizaIniciativa(db: any, ctx: Contexto, est: Estado): Promise<void> {
  const aj = est.ajustes, ahora = Date.now();
  if (!aj.iniciativa || ahora < _proxima) return;
  const d = est.directo;
  // solo en directo, con el directo ya empezado (no en los primeros minutos) y sin un juego en marcha
  if (!d?.enVivo || ahora - Date.parse(d.inicio) < 8 * 60_000 || juegoActivo(est.juego)) { _proxima = ahora + 60_000; return; }
  // si acaba de estar hablando con alguien, no hace falta que además comente por su cuenta
  if (Object.values(est.hilos).some((t) => ahora - Number(t) < 150_000)) { _proxima = ahora + 60_000; return; }
  _proxima = ahora + aj.cadaMinutos * 60_000;

  // un solo comentario por intervalo, aunque lleguen varios mensajes a la vez (función SQL de 11_juegos.sql)
  const { data: turno, error } = await db.rpc("kyo_juego_turno", { p_clave: "iniciativa", p_seg: aj.cadaMinutos * 60 - 10 });
  if (error || turno !== true) return;
  if (!hayClave() || await gastoMes(db) >= aj.topeMes) return;

  const { data } = await db.from("kyo_chat").select("usuario, texto, ts").order("id", { ascending: false }).limit(25);
  const chat = (data || []).reverse();
  if (!chatConAmbiente(chat, aj.nombres)) return;

  const vivo = await contextoVivo(db, est, ctx, { id: d.id, enVivo: true });
  const lineas: Linea[] = chat.map((m: any) => ({ usuario: m.usuario, texto: limpiarEntrada(m.texto, 200) })).filter((m: Linea) => m.texto);
  const sistema = instrucciones(est.personalidad);
  const r = await conversar(sistema, vivo.memoria, [{ role: "user", content: mensajeIniciativa(lineas, vivo.directo) }]);
  await apuntar(db, d.id, "iniciativa", r);
  await apuntarAvisoForma(db);
  if (!r.ok) return;
  const mensaje = limpiarSalida(r.valor.mensaje, trozosSecretos(sistema), 380);
  if (!mensaje || !await ctx.decir(mensaje)) return;
  await recordarDeSi(db, r.valor.sobreMi).catch(() => {});
}
// Solo para las pruebas: olvidar cuándo fue el último intento
export function reiniciarIniciativa() { _proxima = 0; }

// ---------- Diario ----------
// Al terminar un directo: unas líneas con lo que vivió, a partir del final del chat (los últimos mensajes guardados).
// Una sola vez por directo, aunque el aviso de Twitch llegue repetido.
// Si el directo se cortó y volvió ("reanudado"), la entrada que escribió al cortarse se rehace para que cubra todo.
export async function escribirDiarioDe(db: any, directoId: string, aj: AjustesIA, reanudado = ""): Promise<void> {
  if (!directoId || directoId === "ninguno" || directoId.startsWith("fuera-")) return;
  if (aj.estado === "apagada" || !hayClave()) return;
  const v = await leerVidaFresca(db);
  const previo = v.diario.find((x) => x.directo === directoId);
  const rehacer = !!(previo && reanudado && previo.fecha < reanudado);
  if (previo && !rehacer) return;
  const { data: turno, error } = await db.rpc("kyo_juego_turno", { p_clave: "diario:" + directoId + (rehacer ? ":" + reanudado : ""), p_seg: 6 * 3600 });
  if (error || turno !== true) return;
  if (await gastoMes(db) >= aj.topeMes) return;

  const { data } = await db.from("kyo_chat").select("usuario, texto").order("id", { ascending: false }).limit(300);
  const chat: Linea[] = (data || []).reverse()
    .filter((m: any) => !String(m.texto).trim().startsWith("!"))
    .map((m: any) => ({ usuario: m.usuario, texto: limpiarEntrada(m.texto, 160) })).filter((m: Linea) => m.texto);
  if (chat.length < 15) return; // casi no hubo chat: no hay nada que contar
  const r = await escribirDiario(mensajeDiario(chat, rehacer ? previo!.texto : ""));
  await apuntar(db, directoId, "diario", r);
  if (!r.ok) return;
  const texto = limpiarSalida(r.valor, [], 400);
  if (!texto) return;
  const ahora = await leerVidaFresca(db);
  await guardarVida(db, "diario", sumarDiario(ahora.diario, { directo: directoId, fecha: ahoraISO(), texto }));
}

// !olvidame: fuera las entradas del diario que nombran a esa persona
export async function olvidarEnDiario(db: any, nombres: string[]) {
  const v = await leerVidaFresca(db);
  const limpio = quitarDeDiario(v.diario, nombres);
  if (limpio !== v.diario) await guardarVida(db, "diario", limpio);
}

// ---------- Para el Estudio (función aleta-ia) ----------
export async function leerVida(db: any) {
  const est = await leerEstado(db, true);
  const v: Vida = est.vida;
  return { canon: v.canon, diario: v.diario, animo: v.animo, canal: v.canal, canonMax: CANON_MAX };
}

// Cambios desde el Estudio: la lista entera de cosas que recuerda de sí misma, el ánimo, o borrar una entrada del diario
export async function cambiarVida(db: any, o: { canon?: unknown; animo?: unknown; borrarDiario?: unknown }) {
  if (o.canon !== undefined) {
    const lista = (Array.isArray(o.canon) ? o.canon : []).reduce((l: string[], x: unknown) => sumarCanon(l, String(x ?? ""), false), [] as string[]);
    const { error } = await guardarVida(db, "canon", lista);
    if (error) return { ok: false, error: "tabla" };
  }
  if (o.animo !== undefined) {
    // un texto = ánimo fijado por Kyo para el próximo directo; vacío = que vuelva a elegir ella
    const texto = limpiarEntrada(o.animo, 200);
    const { error } = await guardarVida(db, "animo", texto ? { texto, manual: true, directo: null } : {});
    if (error) return { ok: false, error: "tabla" };
  }
  if (o.borrarDiario !== undefined) {
    const v = await leerVidaFresca(db);
    const { error } = await guardarVida(db, "diario", v.diario.filter((d) => d.directo !== String(o.borrarDiario)));
    if (error) return { ok: false, error: "tabla" };
  }
  return { ok: true, ...(await leerVida(db)) };
}
