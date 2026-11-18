// KyoWidgets · AletaBot IA · fase 3: juegos con el chat
// Trivia, adivinanzas e historia colectiva. El código lleva TODO el estado (turnos, puntos, tiempos);
// la IA solo escribe contenido: las preguntas del banco (antes de jugar, desde el Estudio) y los trozos
// de la historia. Una partida de trivia o adivinanzas no llama a Claude ni una vez.
//
// Cómo se llevan los tiempos sin un servidor siempre encendido:
//   - El aviso de Twitch que lanza una pregunta se queda esperando (sin gastar CPU) y, cuando toca,
//     da la pista o cierra la pregunta. No puede esperar más de PRESUPUESTO segundos en total.
//   - Si esa espera no llega (porque se agotó o Supabase la cortó), el siguiente mensaje del chat que
//     llegue pasado el tiempo hace de despertador.
//   - Cada paso (acierto, pista, fin del tiempo) se reclama con la función SQL kyo_juego_paso: solo el
//     primero se lo lleva, aunque lleguen varios mensajes a la vez.
//
// Límites de Supabase: los juegos no añaden invocaciones. Mientras hay un juego, el estado se relee
// cada 2 s; un mensaje que no acierta no consulta nada más.
//
// Tablas y funciones SQL: sql/11_juegos.sql. Estado en kyo_ajustes (fila "juego").

import { limpiarEntrada, limpiarNombre, limpiarSalida, rolDe, trozosSecretos, type AjustesIA } from "./texto.ts";
import {
  acierta, APORTES_PARA_SEGUIR, ATASCO, JUEGO_VACIO, juegoActivo, leerOrdenJuego, limpiarCategoria, limpiarPregunta, PAUSA,
  pistaDe, PREPARACION, PRESUPUESTO, RONDAS_HISTORIA, TIEMPO_HISTORIA, TXT_JUEGO, type Juego, type Pregunta,
} from "./juegos-texto.ts";
import { HISTORIA_SISTEMA, mensajeHistoria } from "./prompt.ts";
import { escribirHistoria, generarPreguntas, hayClave } from "./claude.ts";
import { ahoraISO, apuntar, directoActual, gastoMes, guardarJuego, leerEstado, leerJuego, type Contexto, type Estado } from "./estado.ts";

const iso = (ms: number) => new Date(ms).toISOString();
const dormir = (ctx: Contexto, seg: number) => (ctx.dormir ? ctx.dormir(seg * 1000) : new Promise<void>((r) => setTimeout(r, seg * 1000)));
// ¿Le queda margen a este aviso de Twitch para esperar "seg" segundos más?
const queda = (t0: number, seg: number) => Date.now() - t0 + seg * 1000 <= PRESUPUESTO * 1000;
const segundosDe = (aj: AjustesIA, tipo: string) => (tipo === "adivinanza" ? Math.round(aj.tiempoPregunta * 1.5) : aj.tiempoPregunta);

type Paso = { ok: boolean; puntos?: number; total?: number; n?: number };
async function paso(db: any, ronda: number, p: string, user = "", nombre = "", valor = ""): Promise<Paso> {
  const { data } = await db.rpc("kyo_juego_paso", { p_ronda: ronda, p_paso: p, p_user: user, p_nombre: nombre, p_valor: valor });
  return data || { ok: false };
}
async function turno(db: any, clave: string, seg: number): Promise<boolean> {
  const { data, error } = await db.rpc("kyo_juego_turno", { p_clave: clave, p_seg: seg });
  return !error && data === true;
}

// ---------- Trivia y adivinanzas ----------
// Lanza la siguiente pregunta de la partida (o la termina si no quedan). Solo sigue si la partida
// está exactamente donde la dejó quien llama: así dos avisos no lanzan dos preguntas.
async function siguientePregunta(db: any, ctx: Contexto, aj: AjustesIA, partida: number, ronda: number, t0: number) {
  const j = await leerJuego(db);
  if (!juegoActivo(j) || j.tipo === "historia" || j.partida !== partida || j.ronda !== ronda || !j.resuelta) return;
  if (!j.cola.length) {
    await guardarJuego(db, { ...j, estado: "inactivo" });
    await ctx.decir(TXT_JUEGO.fin(j));
    return;
  }
  const [p, ...cola] = j.cola;
  const seg = segundosDe(aj, j.tipo), ahora = Date.now();
  const s: Juego = {
    ...j, ronda: j.ronda + 1, n: j.n + 1, pregunta: p.pregunta, respuestas: p.respuestas, pista: p.pista, cola,
    resuelta: false, resueltaEn: "", rescatada: false, pistaDada: false, abierta: iso(ahora), cierra: iso(ahora + seg * 1000),
  };
  await guardarJuego(db, s);
  await ctx.decir(TXT_JUEGO.pregunta(s, seg));

  // Espera para dar la pista a mitad de tiempo y para cerrar la pregunta (si a este aviso le queda margen)
  const mitad = Math.round(seg / 2);
  if (!queda(t0, mitad)) return;
  await dormir(ctx, mitad);
  if ((await paso(db, s.ronda, "pista")).ok) await ctx.decir(TXT_JUEGO.pista(pistaDe(s.pista, s.respuestas)));
  if (!queda(t0, seg - mitad)) return;
  await dormir(ctx, seg - mitad);
  if ((await paso(db, s.ronda, "tiempo")).ok) {
    await ctx.decir(TXT_JUEGO.tiempo(s.respuestas[0]));
    await avanzar(db, ctx, aj, s, t0);
  }
}

// Tras cerrarse una pregunta: una pausa corta para leer el resultado y la siguiente
async function avanzar(db: any, ctx: Contexto, aj: AjustesIA, j: Juego, t0: number) {
  if (queda(t0, PAUSA)) await dormir(ctx, PAUSA);
  await siguientePregunta(db, ctx, aj, j.partida, j.ronda, t0);
}

// ---------- Historia colectiva ----------
async function narrar(db: any, ctx: Contexto, est: Estado, j: Pick<Juego, "tema" | "texto" | "aportes">, tarea: "empezar" | "continuar" | "terminar"): Promise<string> {
  if (!hayClave() || await gastoMes(db) >= est.ajustes.topeMes) return "";
  const r = await escribirHistoria(mensajeHistoria(j.tema, j.texto, j.aportes, tarea));
  await apuntar(db, (await directoActual(db, est.directo, ctx)).id, "historia", r);
  return r.ok ? limpiarSalida(r.valor, trozosSecretos(HISTORIA_SISTEMA), 300) : "";
}

async function cerrarHistoria(db: any, j: Juego, texto: string[], autores: string[]) {
  await guardarJuego(db, { ...j, estado: "inactivo", texto, autores, aportes: [] });
  if (texto.length > 1) await db.from("kyo_historia").insert({ tema: j.tema, texto: texto.join(" "), autores });
}

// Se acabó el tramo (por tiempo o porque ya hay bastantes aportes): AletaBot continúa la historia o la termina
async function continuarHistoria(db: any, ctx: Contexto, partida: number, ronda: number, terminar: boolean, t0: number) {
  const j = await leerJuego(db);
  if (!juegoActivo(j) || j.tipo !== "historia" || j.partida !== partida || j.ronda !== ronda) return;
  const est = await leerEstado(db);
  const autores = [...new Set([...j.autores, ...j.aportes.map((a) => a.n)])];
  if (!j.aportes.length && !terminar) {
    await cerrarHistoria(db, j, j.texto, autores);
    await ctx.decir(TXT_JUEGO.historiaSola());
    return;
  }
  const ultimo = terminar || j.n + 1 >= j.total;
  const trozo = await narrar(db, ctx, est, j, ultimo ? "terminar" : "continuar");
  if (!trozo || ultimo) {
    const fin = trozo || "Y colorín colorado, este cuento se ha acabado.";
    await cerrarHistoria(db, j, [...j.texto, fin], autores);
    await ctx.decir(TXT_JUEGO.historiaFin(fin, autores));
    return;
  }
  const ahora = Date.now();
  const s: Juego = {
    ...j, ronda: j.ronda + 1, n: j.n + 1, texto: [...j.texto, trozo], aportes: [], autores,
    resuelta: false, resueltaEn: "", rescatada: false, abierta: iso(ahora), cierra: iso(ahora + TIEMPO_HISTORIA * 1000),
  };
  await guardarJuego(db, s);
  await ctx.decir(TXT_JUEGO.historiaSigue(s, trozo));
  await vigilarHistoria(db, ctx, s, t0);
}

async function vigilarHistoria(db: any, ctx: Contexto, s: Juego, t0: number) {
  if (!queda(t0, TIEMPO_HISTORIA)) return;
  await dormir(ctx, TIEMPO_HISTORIA);
  if ((await paso(db, s.ronda, "tiempo")).ok) await continuarHistoria(db, ctx, s.partida, s.ronda, false, t0);
}

// ---------- Mensajes normales del chat mientras hay un juego ----------
// Lo llama atenderIA. Devuelve true si el mensaje era una respuesta acertada (y ya está atendido).
export async function atenderJuego(db: any, ev: any, ctx: Contexto, est: Estado, t0: number): Promise<boolean> {
  const j = est.juego, aj = est.ajustes, ahora = Date.now();
  if (!juegoActivo(j)) return false;
  const cierra = Date.parse(j.cierra);

  if (j.tipo !== "historia" && !j.resuelta && ahora <= cierra + 3000 && acierta(String(ev?.message?.text || ""), j.respuestas)) {
    const userId = String(ev.chatter_user_id || ""), nombre = limpiarNombre(ev.chatter_user_name || ev.chatter_user_login);
    const p = await paso(db, j.ronda, "acierto", userId, nombre);
    if (p.ok) {
      await ctx.decir(TXT_JUEGO.acierto(nombre, j.respuestas[0], p.puntos || 1));
      await avanzar(db, ctx, aj, j, t0);
    }
    return true; // acertó (aunque otra persona se adelantara por milésimas): no es un mensaje para la IA
  }

  // Despertador: si la espera de quien lanzó la ronda no llegó, este mensaje hace su trabajo
  if (!j.resuelta) {
    if (ahora > cierra + 3000) {
      if ((await paso(db, j.ronda, "tiempo")).ok) {
        if (j.tipo === "historia") await continuarHistoria(db, ctx, j.partida, j.ronda, false, t0);
        else { await ctx.decir(TXT_JUEGO.tiempo(j.respuestas[0])); await avanzar(db, ctx, aj, j, t0); }
      }
    } else if (j.tipo !== "historia" && !j.pistaDada && ahora > (Date.parse(j.abierta) + cierra) / 2 + 3000) {
      if ((await paso(db, j.ronda, "pista")).ok) await ctx.decir(TXT_JUEGO.pista(pistaDe(j.pista, j.respuestas)));
    }
  } else if (!j.rescatada && j.resueltaEn && ahora - Date.parse(j.resueltaEn) > ATASCO * 1000) {
    // la ronda se cerró hace rato y nadie lanzó la siguiente: se rescata
    if ((await paso(db, j.ronda, "rescate", "", "", String(ATASCO))).ok) {
      if (j.tipo === "historia") await continuarHistoria(db, ctx, j.partida, j.ronda, false, t0);
      else await siguientePregunta(db, ctx, aj, j.partida, j.ronda, t0);
    }
  }
  return false;
}

// ---------- Comandos: !trivia, !adivinanza, !historia, !juego parar (Kyo y mods) · !puntos, !top (cualquiera) ----------
// Devuelve true si el mensaje era un comando de juego y ya está atendido.
export async function comandoJuego(db: any, ev: any, texto: string, badges: string[], ctx: Contexto, t0 = Date.now()): Promise<boolean> {
  const o = leerOrdenJuego(texto);
  if (!o) return false;
  const est = await leerEstado(db);
  const aj = est.ajustes;
  if (!aj.juegos && (o.orden === "puntos" || o.orden === "top")) return false;
  const rol = rolDe(badges), staff = rol === "streamer" || rol === "mod";
  const userId = String(ev.chatter_user_id || ""), nombre = limpiarNombre(ev.chatter_user_name || ev.chatter_user_login);

  if (o.orden === "top") {
    if (!await turno(db, "top", 20)) return true;
    const { data } = await db.from("kyo_puntos").select("nombre, puntos").order("puntos", { ascending: false }).limit(5);
    await ctx.decir(TXT_JUEGO.top((data || []).filter((x: any) => x.puntos > 0)));
    return true;
  }
  if (o.orden === "puntos") {
    if (!await turno(db, "puntos:" + userId, 30)) return true;
    const { data } = await db.rpc("kyo_puntos_de", { p_user: userId });
    await ctx.decir(TXT_JUEGO.puntos(nombre, Number(data?.puntos) || 0, Number(data?.puesto) || 1), ev.message_id);
    return true;
  }

  // A partir de aquí, todo necesita la IA activa y los juegos encendidos
  if (aj.estado !== "activa" || !aj.juegos) {
    if (staff) await ctx.decir(TXT_JUEGO.apagados());
    return staff;
  }
  const j = await leerJuego(db);
  const activo = juegoActivo(j);

  if (o.orden === "parar") {
    if (!staff) return true;
    if (!activo) { await ctx.decir(TXT_JUEGO.nada()); return true; }
    if (j.tipo === "historia") await cerrarHistoria(db, j, j.texto, j.autores);
    else await guardarJuego(db, { ...j, estado: "inactivo" });
    await ctx.decir(TXT_JUEGO.parado(j));
    return true;
  }

  if (o.orden === "empezar") {
    if (!staff) return true;
    if (activo) { await ctx.decir(TXT_JUEGO.ocupado(j)); return true; }
    if (!await turno(db, "empezar", 8)) return true;
    const { data } = await db.rpc("kyo_banco_tomar", { p_tipo: o.tipo, p_categoria: o.categoria, p_n: o.n });
    const cola = (Array.isArray(data) ? data : []).map(limpiarPregunta).filter(Boolean) as Pregunta[];
    if (!cola.length) { await ctx.decir(TXT_JUEGO.sinPreguntas(o.tipo, o.categoria)); return true; }
    // La partida se anuncia y la primera pregunta sale unos segundos después: así todo el bot se entera
    // de que hay juego antes de que alguien conteste.
    const nuevo: Juego = {
      ...JUEGO_VACIO, estado: "activo", tipo: o.tipo, partida: Date.now(), ronda: (Number(j.ronda) || 0) + 1,
      resuelta: true, resueltaEn: ahoraISO(), total: cola.length, cola,
    };
    await guardarJuego(db, nuevo);
    await ctx.decir(TXT_JUEGO.empieza(o.tipo, cola.length, segundosDe(aj, o.tipo)));
    await dormir(ctx, PREPARACION);
    await siguientePregunta(db, ctx, aj, nuevo.partida, nuevo.ronda, t0);
    return true;
  }

  // !historia …
  if (o.orden === "fin") {
    if (staff && activo && j.tipo === "historia" && (await paso(db, j.ronda, "tiempo")).ok) await continuarHistoria(db, ctx, j.partida, j.ronda, true, t0);
    return true;
  }
  if (activo && j.tipo === "historia") {
    // un aporte del chat (uno por persona y tramo). Con bastantes aportes, AletaBot sigue sin esperar al reloj
    if (!o.texto || j.resuelta) return true;
    const p = await paso(db, j.ronda, "aporte", userId, nombre, o.texto);
    if (p.ok && (p.n || 0) >= APORTES_PARA_SEGUIR && (await paso(db, j.ronda, "tiempo")).ok) await continuarHistoria(db, ctx, j.partida, j.ronda, false, t0);
    return true;
  }
  if (!staff) return true;
  if (activo) { await ctx.decir(TXT_JUEGO.ocupado(j)); return true; }
  if (!o.texto) { await ctx.decir(TXT_JUEGO.historiaAyuda()); return true; }
  if (!await turno(db, "empezar", 8)) return true;
  const tema = limpiarEntrada(o.texto, 100);
  const inicio = await narrar(db, ctx, est, { tema, texto: [], aportes: [] }, "empezar");
  if (!inicio) { await ctx.decir("🫧 Ahora mismo no me sale ninguna historia. Prueba otra vez en un rato."); return true; }
  const ahora = Date.now();
  const s: Juego = {
    ...JUEGO_VACIO, estado: "activo", tipo: "historia", partida: ahora, ronda: (Number(j.ronda) || 0) + 1, resuelta: false, pistaDada: true,
    n: 1, total: RONDAS_HISTORIA, tema, texto: [inicio], abierta: iso(ahora), cierra: iso(ahora + TIEMPO_HISTORIA * 1000),
  };
  await guardarJuego(db, s);
  await ctx.decir(TXT_JUEGO.historiaEmpieza(inicio));
  await vigilarHistoria(db, ctx, s, t0);
  return true;
}

// ---------- Para el Estudio (función aleta-ia) ----------
const TIPOS = ["trivia", "adivinanza"];
const tipoDe = (t: unknown): "trivia" | "adivinanza" => (t === "adivinanza" ? "adivinanza" : "trivia");
const claveDe = (pregunta: string) => pregunta.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");

export async function listarBanco(db: any) {
  const { data, error } = await db.from("kyo_banco").select("id, tipo, categoria, pregunta, respuestas, pista, estado, usos")
    .order("estado", { ascending: false }).order("id", { ascending: false }).limit(300);
  const l = data || [];
  const cuenta = (tipo: string, estado: string) => l.filter((p: any) => p.tipo === tipo && p.estado === estado).length;
  return {
    sql: !error, preguntas: l,
    totales: Object.fromEntries(TIPOS.map((t) => [t, { activas: cuenta(t, "activa"), pendientes: cuenta(t, "pendiente") }])),
  };
}

// Pide a Haiku una tanda de preguntas y las deja en el banco como "pendientes" (Kyo las aprueba antes de usarlas)
export async function generarBanco(db: any, o: { tipo: unknown; tema: unknown; n: unknown }) {
  if (!hayClave()) return { ok: false, error: "sin_clave" };
  const est = await leerEstado(db, true);
  if (await gastoMes(db, true) >= est.ajustes.topeMes) return { ok: false, error: "tope_mes" };
  const tipo = tipoDe(o.tipo), tema = limpiarEntrada(o.tema, 80), n = Math.max(3, Math.min(20, Math.round(Number(o.n)) || 10));
  const r = await generarPreguntas(tipo, tema, n);
  await apuntar(db, "banco", "banco", r);
  if (!r.ok) return { ok: false, error: r.error };
  const { data: ya } = await db.from("kyo_banco").select("pregunta").eq("tipo", tipo).limit(1000);
  const vistas = new Set((ya || []).map((p: any) => claveDe(p.pregunta)));
  const nuevas = r.valor.map(limpiarPregunta).filter((p): p is Pregunta => !!p && !vistas.has(claveDe(p.pregunta)) && !!vistas.add(claveDe(p.pregunta)));
  if (nuevas.length) {
    const { error } = await db.from("kyo_banco").insert(nuevas.map((p) => ({ tipo, categoria: limpiarCategoria(tema), pregunta: p.pregunta, respuestas: p.respuestas, pista: p.pista, estado: "pendiente" })));
    if (error) return { ok: false, error: "sql" };
  }
  return { ok: true, nuevas: nuevas.length, coste: r.coste };
}

// Añade o corrige una pregunta a mano (queda aprobada)
export async function guardarPregunta(db: any, o: any) {
  const p = limpiarPregunta(o);
  if (!p) return { ok: false, error: "pregunta" };
  const fila = { tipo: tipoDe(o?.tipo), categoria: limpiarCategoria(o?.categoria), pregunta: p.pregunta, respuestas: p.respuestas, pista: p.pista, estado: "activa" };
  const id = Number(o?.id) || 0;
  const { error } = id ? await db.from("kyo_banco").update(fila).eq("id", id) : await db.from("kyo_banco").insert(fila);
  return error ? { ok: false, error: "sql" } : { ok: true };
}

// Aprueba preguntas pendientes: las de la lista "ids" o, con todas=true, todas las pendientes
export async function aprobarBanco(db: any, o: { ids?: unknown; todas?: unknown }) {
  let q = db.from("kyo_banco").update({ estado: "activa" }).eq("estado", "pendiente");
  if (o.todas !== true) {
    const ids = (Array.isArray(o.ids) ? o.ids : []).map(Number).filter((n) => n > 0).slice(0, 300);
    if (!ids.length) return { ok: false, error: "ids" };
    q = q.in("id", ids);
  }
  const { error } = await q;
  return error ? { ok: false, error: "sql" } : { ok: true };
}

// Borra una pregunta, o (pendientes=true) todas las que están sin aprobar
export async function borrarBanco(db: any, o: { id?: unknown; pendientes?: unknown }) {
  const id = Number(o.id) || 0;
  if (!id && o.pendientes !== true) return { ok: false, error: "id" };
  const q = db.from("kyo_banco").delete();
  const { error } = await (id ? q.eq("id", id) : q.eq("estado", "pendiente"));
  return error ? { ok: false, error: "sql" } : { ok: true };
}

export async function resumenJuegos(db: any) {
  const [banco, top, historias, juego] = await Promise.all([
    listarBanco(db),
    db.from("kyo_puntos").select("nombre, puntos").order("puntos", { ascending: false }).limit(20),
    db.from("kyo_historia").select("ts, tema, texto, autores").order("id", { ascending: false }).limit(5),
    leerJuego(db),
  ]);
  return {
    ...banco, ranking: (top.data || []).filter((x: any) => x.puntos > 0), historias: historias.data || [],
    juego: juegoActivo(juego) ? { tipo: juego.tipo, n: juego.n, total: juego.total } : null,
  };
}

export async function reiniciarPuntos(db: any) {
  const { error } = await db.from("kyo_puntos").delete().gte("puntos", 0);
  return error ? { ok: false, error: "sql" } : { ok: true };
}
