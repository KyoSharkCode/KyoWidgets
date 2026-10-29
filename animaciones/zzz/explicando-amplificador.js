// Kyo Estudio · Plantilla ZZZ: Explicando amplificador
import * as ZZZ from '../zzz.js';
import { rad, lerp, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, envolver, imagenEn, azar } from '../base/utilidades.js';
import { ESTRELLA, CHAT, icono } from '../base/iconos.js';
import { pegatina, destello, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { ICONOS_ATR, limpio, contando } from './comun.js';
import { iconoAtributo, badgeIcono, pintarIconoGaleria } from './guia-discos.js';

// Explica un amplificador en 4 clips: 1) presentación, 2) atributos, 3) efecto (pantalla completa), 4) pregunta final.
// Todas las piezas llevan la imagen del amplificador (del repo de assets o propia).
const clipDe = o => ['1', '2', '3', '4'].includes(String(o.clip)) ? String(o.clip) : '1';
const imgAmp = o => o.ampimg || ZZZ.imagen('amplificador', limpio(o.amp));
const nombreAmp = o => limpio(o.nombre) || (limpio(o.amp) ? ZZZ.nombreDe(limpio(o.amp)) : '');
const COL_RANGO = { S: '#F4C542', A: '#B98CFF', B: '#6FB8F0' };
const ATRS = ['Ataque Base', 'Tasa de Anomalía', 'Maestría de Anomalía', 'Probabilidad de Crítico', 'Daño Crítico', 'Porcentaje de Ataque', 'Tasa de Perforación', 'Recuperación de Energía', 'Impacto', 'Porcentaje de PV', 'Porcentaje de Defensa'];

// Texto con marcas: *palabra* → color clave, [90] → color de número. Devuelve palabras formadas por trozos de color.
export function palabrasRicas(txt) {
  const trozos = [], re = /\*([^*]+)\*|\[([^\]]+)\]/g; let i = 0, m;
  txt = String(txt || '');
  while ((m = re.exec(txt))) {
    if (m.index > i) trozos.push({ t: txt.slice(i, m.index), k: 'n' });
    trozos.push({ t: m[1] ?? m[2], k: m[1] != null ? 'c' : 'v' }); i = re.lastIndex;
  }
  if (i < txt.length) trozos.push({ t: txt.slice(i), k: 'n' });
  const pal = []; let cur = null;
  trozos.forEach(tr => tr.t.split(/(\s+)/).forEach(p => {
    if (!p) return;
    if (/^\s+$/.test(p)) { cur = null; return; }
    if (!cur) { cur = { runs: [] }; pal.push(cur); }
    cur.runs.push({ t: p, k: tr.k });
  }));
  pal.forEach(w => { w.marca = w.runs.some(r => r.k !== 'n') ? (w.runs.some(r => r.k === 'v') ? 'v' : 'c') : ''; });
  return pal;
}
// Coloca las palabras en líneas que quepan en maxW; la palabra con icono deja hueco delante para él
function maquetar(ctx, pal, f, maxW, lh, icoW = 0) {
  fuente(ctx, f); const esp = ctx.measureText(' ').width, lineas = []; let lin = [], x = 0;
  pal.forEach(w => {
    w.runs.forEach(r => { r.w = ctx.measureText(r.t).width; });
    w.w = w.runs.reduce((a, r) => a + r.w, 0) + (w.icono ? icoW : 0);
    if (lin.length && x + esp + w.w > maxW) { lineas.push({ pal: lin, w: x }); lin = []; x = 0; }
    w.x = lin.length ? x + esp : 0; x = w.x + w.w;
    // dos palabras resaltadas seguidas en la misma línea comparten caja ("daño ígneo", "40 %")
    const ant = lin[lin.length - 1], k0 = w.runs[0].k;
    w.uneIzq = ant && k0 !== 'n' && ant.runs[ant.runs.length - 1].k === k0 && !w.icono ? esp : 0; if (w.uneIzq) ant.uneDer = true;
    lin.push(w);
  });
  if (lin.length) lineas.push({ pal: lin, w: x });
  return { lineas, h: lineas.length * lh, w: Math.max(0, ...lineas.map(l => l.w)) };
}
// Carta del amplificador: pegatina cuadrada con brillo del color del rango, la imagen y la insignia de rango
function cartaAmp(ctx, cx, cy, S, P, img, rango, u, brillo = -1) {
  const x = cx - S / 2, y = cy - S / 2, R = S * .14, col = COL_RANGO[rango] || P.a;
  pegatina(ctx, x, y, S, S, R, { fill: P.o, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 10 * u, suave: false });
  ctx.save(); rr(ctx, x, y, S, S, R); ctx.clip();
  const g = ctx.createRadialGradient(cx, cy, S * .05, cx, cy, S * .72);
  g.addColorStop(0, col); g.addColorStop(.55, P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(x, y, S, S);
  if (img) imagenEn(ctx, img, x + S * .07, y + S * .07, S * .86, S * .86, 'contener');
  else icono(ctx, ESTRELLA, cx - S * .22, cy - S * .22, S * .44, 'rgba(255,255,255,.3)');
  // brillo que cruza la carta (brillo de 0 a 1; fuera de ese rango no se dibuja)
  if (brillo > 0 && brillo < 1) {
    const bx = x + lerp(-.4, 1.4, brillo) * S, bw = .4 * S;
    ctx.save(); ctx.translate(bx, cy); ctx.transform(1, 0, Math.tan(rad(-20)), 1, 0, 0);
    const gb = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(.5, 'rgba(255,255,255,.5)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gb; ctx.fillRect(-bw / 2, -S, bw, S * 2); ctx.restore();
  }
  ctx.restore();
  if (rango) {
    const D = S * .27, bx = x + S - D * .3, by = y + S - D * .3;
    ctx.beginPath(); ctx.arc(bx, by + 3 * u, D / 2 + 4 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, D / 2 + 4 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, D / 2, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    fuente(ctx, `700 ${D * .62}px "Fredoka"`); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(rango, bx, by + D * .04); ctx.textAlign = 'left';
  }
}
// Texto grande con contorno (títulos)
function tituloBorde(ctx, txt, x, y, f, relleno, P, grosor) {
  fuente(ctx, f); ctx.lineJoin = 'round'; ctx.lineWidth = grosor; ctx.strokeStyle = P.o;
  ctx.strokeText(txt, x, y + grosor * .45); ctx.strokeText(txt, x, y); ctx.fillStyle = relleno; ctx.fillText(txt, x, y);
}
// Momentos de cada clip: fin de la entrada (intro), fin de la animación y duración mínima
function tiemposExp(o) {
  const c = clipDe(o), T = { c };
  if (c === '1') T.intro = 1.8;
  else if (c === '2') T.intro = (limpio(o.atr2) ? 1.75 : 1.25) + .9;
  else if (c === '4') T.intro = 1.7;
  else {
    const nC = palabrasRicas(o.condicion).length, nD = palabrasRicas(o.descripcion).length, esc = clamp(Number(o.escribir) || 8, 1, 60);
    T.tCond = 2.15; T.pasoC = .045; T.tDesc = T.tCond + nC * T.pasoC + .35; T.pasoD = esc / Math.max(1, nD);
    T.intro = T.tDesc + esc + .4;
  }
  T.fin = T.intro + 1.2 + .7; T.minimo = o.salida === 'no' ? T.intro + .3 : T.fin;
  return T;
}
const campoClip = (k, label, def, max, clip, extra) => Object.assign({ k, label, tipo: 'texto', def, max, si: 'clip=' + clip }, extra);

export const explicaAmpli = {
  id: 'explicando-amplificador',
  grupo: 'zzz',
  nombre: 'Explicando amplificador (ZZZ)',
  desc: 'Explica un amplificador en 4 clips: 1) presentación, 2) tarjeta de atributos, 3) su efecto a pantalla completa (se abre desde el centro y la descripción se escribe palabra a palabra) y 4) pregunta final. Todas llevan la imagen del amplificador.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 80,
  variantes: { k: 'clip', todos: '⬇ Los 4 clips', valores: [['1', 'clip1-presentacion'], ['2', 'clip2-atributos'], ['3', 'clip3-efecto'], ['4', 'clip4-pregunta']] },
  galeria: { grupos: [{ id: 'atributo', label: 'Atributos', campos: ['atr1', 'atr2'] }], pintar: pintarIconoGaleria },
  campos: [
    { k: 'clip', label: 'Clip', tipo: 'chips', def: '1', opciones: [['1', '1 · Presentación'], ['2', '2 · Atributos'], ['3', '3 · Efecto (pantalla completa)'], ['4', '4 · Pregunta final']] },
    { k: 'amp', label: 'Amplificador (del repo de assets ZZZdle)', tipo: 'lista', def: '', vacio: 'Ninguno', cargar: () => ZZZ.lista('amplificador') },
    { k: 'ampimg', label: '…o sube su imagen (tiene prioridad sobre la del repo)', tipo: 'imagen' },
    { k: 'nombre', label: 'Nombre del amplificador (vacío = el del repo)', tipo: 'texto', def: 'Pluma del renacimiento', max: 40 },
    { k: 'rango', label: 'Rango', tipo: 'chips', def: 'S', opciones: [['S', 'S'], ['A', 'A'], ['B', 'B'], ['', 'Sin insignia']] },
    campoClip('titulo1', 'Etiqueta', 'Explicando amplificadores', 32, '1'),
    campoClip('sub1', 'Debajo del nombre (opcional)', 'El amplificador de Phoenix', 40, '1'),
    { k: 'atr1', label: 'Atributo principal', tipo: 'elegir', opciones: ATRS, def: 'Ataque Base', max: 30, si: 'clip=2' },
    campoClip('val1', 'Valor del atributo principal', '713', 12, '2'),
    { k: 'atr2', label: 'Atributo avanzado (opcional)', tipo: 'elegir', opciones: ATRS, def: 'Tasa de Anomalía', max: 30, si: 'clip=2' },
    campoClip('val2', 'Valor del atributo avanzado', '30 %', 12, '2'),
    { k: 'contar', label: 'Números', tipo: 'chips', def: 'si', si: 'clip=2', opciones: [['si', '🔢 Suben contando'], ['no', 'Aparecen fijos']] },
    campoClip('chip3', 'Etiqueta', 'Efecto de amplificador', 32, '3'),
    campoClip('efecto', 'Nombre del efecto', 'Día de eclosión', 40, '3'),
    { k: 'especialidad', label: 'Icono de la condición (del repo; va delante de la primera *palabra*)', tipo: 'lista', def: 'anomaly', vacio: 'Ninguno', cargar: () => ZZZ.lista('especialidad'), si: 'clip=3' },
    campoClip('condicion', 'Condición (*palabra* = color clave)', 'Si el portador es un agente *Anómalo*, se activará el siguiente efecto:', 160, '3'),
    campoClip('descripcion', 'Descripción (*palabra* = color clave · [90] = número)', 'La Maestría de Anomalía del portador aumenta en [90] ptos. Cuando el daño de Anomalía de Atributo que cualquier personaje del equipo inflige a un enemigo provoca un golpe crítico, el *daño ígneo* que inflige el portador aumenta en un [40 %] durante 20 s. La duración se reinicia con cada activación.', 700, '3'),
    { k: 'escribir', label: 'Segundos que tarda en escribirse la descripción', tipo: 'numero', def: 9, min: 1, max: 60, paso: 0.5, si: 'clip=3' },
    { k: 'colClave', label: 'Color clave (*palabra*)', tipo: 'color', def: '#FF9A3C', si: 'clip=3' },
    { k: 'colNum', label: 'Color de los números ([90])', tipo: 'color', def: '#7BE38F', si: 'clip=3' },
    campoClip('pregunta', 'Pregunta', '¿Qué otro amplificador quieres conocer?', 60, '4'),
    campoClip('sub4', 'Debajo de la pregunta (opcional)', '¡Déjamelo en los comentarios!', 40, '4'),
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    // el clip 3 ocupa toda la pantalla: posición y tamaño solo cuentan en los demás
    ...conDef(COMUNES, { posv: 'centro', posh: 'centro' }).map(c => ['posh', 'posv', 'tam'].includes(c.k) ? Object.assign({}, c, { si: 'clip=1|2|4' }) : c),
    { k: 'dur1', label: 'Duración del clip 1 (segundos)', tipo: 'numero', def: 5, min: 3, max: 30, paso: 0.1, si: 'clip=1' },
    { k: 'dur2', label: 'Duración del clip 2 (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1, si: 'clip=2' },
    { k: 'dur3', label: 'Duración del clip 3 (segundos)', tipo: 'numero', def: 17, min: 4, max: 90, paso: 0.1, si: 'clip=3' },
    { k: 'dur4', label: 'Duración del clip 4 (segundos)', tipo: 'numero', def: 5, min: 3, max: 30, paso: 0.1, si: 'clip=4' }
  ],
  preparar: o => Promise.all([o.ampimg ? null : ZZZ.cargar('amplificador', limpio(o.amp)), ZZZ.cargar('especialidad', limpio(o.especialidad))]),
  duracion: o => { const c = clipDe(o); return Math.max(tiemposExp(o).minimo, clamp(Number(o['dur' + c]) || 6, 3, c === '3' ? 90 : 30)); },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), T = tiemposExp(o), quieto = o.salida === 'no';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    if (T.c === '3') return efectoPantalla(ctx, t, tm, FIN, o, P, T, fmt, W, H);
    const img = imgAmp(o), nom = nombreAmp(o), rango = o.rango || '';
    let u = (fmt === 'vertical' ? 1.3 : 1) * (Number(o.tam) || 1);
    const medir = T.c === '1' ? medir1 : T.c === '2' ? medir2 : medir4;
    let m = medir(ctx, o, u, nom, fmt); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medir(ctx, o, u, nom, fmt); }
    const pos = colocar(fmt, o, W, H, m.w, m.h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + m.w / 2, pos.y + m.h / 2, u, .5);
    pegatina(ctx, pos.x, pos.y, m.w, m.h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const pop = (t0, cx, cy, fn, r0 = -14) => {
      const k = kf(tm, [[t0, { s: 0, r: r0 }], [t0 + .3, { s: 1.12, r: 3 }], [t0 + .48, { s: 1, r: 0 }]], EASE.back); if (k.s <= .01) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(k.r)); ctx.scale(k.s, k.s); ctx.translate(-cx, -cy); fn(); ctx.restore();
    };
    const desliza = (t0, fn, dx = -24) => {
      const k = kf(tm, [[t0, { x: dx, a: 0 }], [t0 + .35, { x: 0, a: 1 }]], EASE.back); if (k.a <= .001) return;
      ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(k.x * u, 0); fn(); ctx.restore();
    };
    const brilloCarta = t0 => clamp((tm - t0) / .7, -1, 2);
    const chip = (txt, x, y, t0, centrado) => {
      if (!txt) return;
      const f = `700 ${20 * u}px "Chakra Petch"`, cw = ancho(ctx, txt, f, 3 * u) + 32 * u, x0 = centrado ? x - cw / 2 : x;
      desliza(t0, () => { rr(ctx, x0, y, cw, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill(); fuente(ctx, f, 3 * u); ctx.fillStyle = P.o; ctx.fillText(txt, x0 + 16 * u, y + 18 * u); }, 0);
    };
    if (T.c === '1') {
      const cx = pos.x + m.w / 2; let y = pos.y + m.pad;
      chip(m.tit, cx, y, .3, true); if (m.tit) y += 34 * u + 26 * u;
      pop(.45, cx, y + m.S / 2, () => cartaAmp(ctx, cx, y + m.S / 2, m.S, P, img, rango, u, brilloCarta(.95)), -18);
      const d = kf(tm, [[.75, { s: 0, r: 0, a: 0 }], [.95, { s: 1.2, r: 60, a: 1 }], [1.5, { s: 0, r: 140, a: 0 }]]);
      destello(ctx, cx + m.S / 2 - 4 * u, y + 6 * u, 50 * u, '#F4C542', d.s, d.r, d.a);
      y += m.S + 30 * u;
      ctx.textAlign = 'center';
      m.lineas.forEach((l, i) => { pop(.8 + i * .12, cx, y + m.lhN / 2, () => tituloBorde(ctx, l, cx, y + m.lhN / 2, m.fN, P.t, P, 10 * u), -6); y += m.lhN; });
      if (m.sub) { y += 6 * u; desliza(1.1, () => { fuente(ctx, m.fS); ctx.fillStyle = P.s; ctx.fillText(m.sub, cx, y + 17 * u); }, 0); }
      ctx.textAlign = 'left';
    } else if (T.c === '2') {
      const x0 = pos.x + m.pad, alto = Math.max(m.S, m.colH), cy = pos.y + m.pad + alto / 2;
      pop(.3, x0 + m.S / 2, cy, () => cartaAmp(ctx, x0 + m.S / 2, cy, m.S, P, img, rango, u, brilloCarta(.8)), -18);
      const cx0 = x0 + m.S + m.gapC; let y = pos.y + m.pad + (alto - m.colH) / 2;
      if (nom) { desliza(.45, () => tituloBorde(ctx, nom, cx0, y + m.lhN / 2, m.fN, P.t, P, 9 * u)); y += m.lhN + 12 * u; }
      m.filas.forEach((fl, i) => {
        const t0 = .75 + i * .5;
        desliza(t0, () => { fuente(ctx, m.fL, 2.5 * u); ctx.fillStyle = P.s; ctx.fillText(fl.lab, cx0, y + 12 * u); });
        y += 24 * u + 8 * u;
        const rcy = y + m.rowH / 2, rx = cx0;
        desliza(t0 + .1, () => {
          rr(ctx, rx, y, m.colW, m.rowH, m.rowH / 2); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
          const fl2 = kf(tm, [[t0 + .2, { a: 0 }], [t0 + .38, { a: .3 }], [t0 + 1, { a: 0 }]]);
          if (fl2.a > .001) { ctx.save(); ctx.globalAlpha *= fl2.a; rr(ctx, rx, y, m.colW, m.rowH, m.rowH / 2); ctx.fillStyle = P.a; ctx.fill(); ctx.restore(); }
          const ic = typeof o.iconos === 'function' ? o.iconos('atributo', fl.nombre) : null;
          badgeIcono(ctx, rx + 10 * u + m.icD / 2, rcy, m.icD, P, ic, iconoAtributo(fl.nombre));
          fuente(ctx, m.fA); ctx.fillStyle = P.t; ctx.fillText(fl.nombre, rx + 10 * u + m.icD + 12 * u, rcy + 1.5 * u);
        });
        if (fl.val) {
          const tv = t0 + .3, vx = rx + m.colW - 8 * u - fl.vw, vcx = vx + fl.vw / 2, vh = m.rowH - 16 * u;
          pop(tv, vcx, rcy, () => {
            rr(ctx, vx, rcy - vh / 2, fl.vw, vh, vh / 2); ctx.fillStyle = P.o; ctx.fill();
            rr(ctx, vx + 3 * u, rcy - vh / 2 + 3 * u, fl.vw - 6 * u, vh - 6 * u, vh / 2); ctx.fillStyle = P.a; ctx.fill();
            fuente(ctx, m.fV); ctx.fillStyle = P.o; ctx.textAlign = 'center';
            ctx.fillText(o.contar === 'no' ? fl.val : contando(fl.val, clamp((tm - tv) / .75, 0, 1)), vcx, rcy + 1.5 * u); ctx.textAlign = 'left';
          }, -8);
          const d = kf(tm, [[tv + .35, { s: 0, r: 0, a: 0 }], [tv + .5, { s: 1.2, r: 60, a: 1 }], [tv + 1, { s: 0, r: 140, a: 0 }]]);
          destello(ctx, vx + fl.vw - 4 * u, rcy - vh / 2, 32 * u, '#F4C542', d.s, d.r, d.a);
        }
        y += m.rowH + 14 * u;
      });
    } else {
      const x0 = pos.x + m.pad, cy = pos.y + m.h / 2;
      pop(.3, x0 + m.S / 2, cy, () => { ctx.save(); ctx.translate(x0 + m.S / 2, cy); ctx.rotate(rad(-6)); ctx.translate(-x0 - m.S / 2, -cy); cartaAmp(ctx, x0 + m.S / 2, cy, m.S, P, img, rango, u, brilloCarta(.7)); ctx.restore(); }, -30);
      // signos de interrogación que flotan alrededor de la carta
      [[-.08, -.12, -16, 0], [1.02, .05, 12, .12], [.12, 1.02, 8, .22]].forEach(([fx, fy, r0, dl], i) => {
        const qx = x0 + fx * m.S, qy = cy - m.S / 2 + fy * m.S + Math.sin(t * 2.6 + i * 2) * 5 * u, D = 46 * u;
        pop(1.1 + dl, qx, qy, () => {
          ctx.save(); ctx.translate(qx, qy); ctx.rotate(rad(r0));
          ctx.beginPath(); ctx.arc(0, 3 * u, D / 2 + 4 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, D / 2 + 4 * u, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, D / 2, 0, Math.PI * 2); ctx.fillStyle = i === 1 ? '#F4C542' : P.a; ctx.fill();
          fuente(ctx, `400 ${D * .7}px "Cherry Bomb One"`); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText('?', 0, D * .06); ctx.restore();
        });
      });
      const tx = x0 + m.S + m.gapC; let y = cy - m.colH / 2;
      m.lineas.forEach((l, i) => { desliza(.5 + i * .14, () => tituloBorde(ctx, l, tx, y + m.lhN / 2, m.fN, i % 2 ? P.a : P.t, P, 10 * u)); y += m.lhN; });
      if (m.sub) {
        y += 10 * u;
        desliza(.95, () => { icono(ctx, CHAT, tx, y + 18 * u - 16 * u, 32 * u, P.a); fuente(ctx, m.fS); ctx.fillStyle = P.s; ctx.fillText(m.sub, tx + 42 * u, y + 19 * u); });
      }
    }
    destellosCaja(ctx, pos, m.w, m.h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
// --- medidas de los clips en pegatina ---
function medir1(ctx, o, u, nom) {
  const pad = 40 * u, S = 300 * u, tit = limpio(o.titulo1).toUpperCase(), sub = limpio(o.sub1);
  const fN = `400 ${62 * u}px "Cherry Bomb One"`, fS = `600 ${30 * u}px "Fredoka"`, lhN = 74 * u, maxN = 760 * u;
  const lineas = nom ? envolver(ctx, nom, fN, maxN, 2) : [];
  const anchoN = Math.max(0, ...lineas.map(l => ancho(ctx, l, fN))), titW = tit ? ancho(ctx, tit, `700 ${20 * u}px "Chakra Petch"`, 3 * u) + 32 * u : 0;
  const w = Math.max(S + 60 * u, anchoN * 1.12 + 20 * u, titW, sub ? ancho(ctx, sub, fS) : 0, 420 * u) + 2 * pad;
  const h = pad + (tit ? 60 * u : 0) + S + 30 * u + lineas.length * lhN + (sub ? 40 * u : 0) + pad;
  return { pad, S, tit, sub, fN, fS, lhN, lineas, w, h };
}
function medir2(ctx, o, u, nom) {
  const pad = 34 * u, S = 210 * u, gapC = 30 * u, icD = 48 * u, rowH = 70 * u;
  const fN = `400 ${42 * u}px "Cherry Bomb One"`, fL = `700 ${18 * u}px "Chakra Petch"`, fA = `700 ${30 * u}px "Fredoka"`, fV = `700 ${30 * u}px "Fredoka"`, lhN = 50 * u;
  const filas = [['ATRIBUTO PRINCIPAL', o.atr1, o.val1], ['ATRIBUTO AVANZADO', o.atr2, o.val2]].filter(f => limpio(f[1]))
    .map(([lab, n, v]) => { const nombre = limpio(n), val = limpio(v); return { lab, nombre, val, vw: val ? ancho(ctx, val, fV) + 40 * u : 0 }; });
  const colW = Math.max(380 * u, ...filas.map(f => 10 * u + icD + 12 * u + ancho(ctx, f.nombre, fA) + (f.vw ? 30 * u + f.vw + 8 * u : 20 * u)), ...filas.map(f => ancho(ctx, f.lab, fL, 2.5 * u)));
  const anchoN = nom ? ancho(ctx, nom, fN) : 0, colH = (nom ? lhN + 12 * u : 0) + filas.length * (32 * u + rowH) + Math.max(0, filas.length - 1) * 14 * u;
  const w = pad + S + gapC + Math.max(colW, anchoN) + pad, h = pad + Math.max(S, colH) + pad;
  return { pad, S, gapC, icD, rowH, fN, fL, fA, fV, lhN, filas, colW: Math.max(colW, anchoN), colH, w, h };
}
function medir4(ctx, o, u, nom, fmt) {
  const pad = 44 * u, S = 190 * u, gapC = 44 * u, fN = `400 ${50 * u}px "Cherry Bomb One"`, fS = `600 ${28 * u}px "Fredoka"`, lhN = 62 * u;
  const lineas = envolver(ctx, limpio(o.pregunta), fN, (fmt === 'vertical' ? 420 : 620) * u, 3), sub = limpio(o.sub4);
  const colW = Math.max(0, ...lineas.map(l => ancho(ctx, l, fN)), sub ? 42 * u + ancho(ctx, sub, fS) : 0);
  const colH = lineas.length * lhN + (sub ? 48 * u : 0);
  return { pad, S, gapC, fN, fS, lhN, lineas, sub, colH, w: pad + S + gapC + colW + pad, h: pad + Math.max(S + 30 * u, colH) + pad };
}
// --- clip 3: el efecto a pantalla completa ---
// Se abre desde el centro hasta cubrir todo, la carta sale grande y se va a la esquina, y la descripción se escribe palabra a palabra.
function efectoPantalla(ctx, t, tm, FIN, o, P, T, fmt, W, H) {
  const u = Math.min(W, H) / 1080, vert = fmt === 'vertical';
  // apertura (0 → .6 s) y cierre (últimos .7 s): rectángulo redondeado que crece desde el centro
  const abre = EASE.io(clamp(tm / .6, 0, 1)), cierra = 1 - EASE.io(clamp((tm - (FIN - .55)) / .5, 0, 1)), p = Math.min(abre, cierra);
  if (p <= .001) return;
  const pw = lerp(90 * u, W + 160 * u, p), ph = lerp(90 * u, H + 160 * u, p), px = (W - pw) / 2, py = (H - ph) / 2, R = lerp(45 * u, 0, p);
  ctx.save();
  pegatina(ctx, px, py, pw, ph, R, { fill: P.c, p: P.p, o: P.o, ring: 10 * u, out: 8 * u, drop: 0, suave: false });
  rr(ctx, px, py, pw, ph, R); ctx.clip();
  const vis = clamp((tm - .35) / .3, 0, 1) * (1 - clamp((tm - (FIN - .75)) / .25, 0, 1)); // el contenido aparece y se va antes que el panel
  // fondo: degradado, estrellas que titilan y un marco fino por dentro
  const fondo = ctx.createLinearGradient(0, 0, 0, H); fondo.addColorStop(0, P.c); fondo.addColorStop(1, P.o); ctx.fillStyle = fondo; ctx.fillRect(px, py, pw, ph);
  ctx.save(); ctx.globalAlpha *= vis;
  const rnd = azar(9);
  for (let i = 0; i < 46; i++) {
    const sx = rnd() * W, sy = rnd() * H, sr = (1.2 + rnd() * 2.6) * u, tw = .25 + .55 * (.5 + .5 * Math.sin(t * (1 + rnd() * 2) + i));
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${tw * .5})`; ctx.fill();
  }
  const M = (vert ? 60 : 80) * u, mk = kf(tm, [[.6, { a: 0 }], [1, { a: 1 }]]);
  if (mk.a > .001) { ctx.save(); ctx.globalAlpha *= mk.a * .5; rr(ctx, M * .45, M * .45, W - M * .9, H - M * .9, 28 * u); ctx.lineWidth = 3 * u; ctx.strokeStyle = P.a; ctx.stroke(); ctx.restore(); }
  // --- carta: grande en el centro y luego a la esquina superior izquierda ---
  const top = vert ? 170 * u : 90 * u, Sf = vert ? 250 * u : 230 * u, S0 = vert ? 470 * u : 420 * u;
  const cxF = M + Sf / 2, cyF = top + Sf / 2, cx0 = W / 2, cy0 = H * (vert ? .42 : .47);
  const mv = EASE.io(clamp((tm - 1.3) / .65, 0, 1)), entra = kf(tm, [[.45, { s: 0, r: -25 }], [.8, { s: 1.12, r: 5 }], [1.02, { s: 1, r: 0 }]], EASE.back);
  const ccx = lerp(cx0, cxF, mv), ccy = lerp(cy0, cyF, mv) - Math.sin(Math.PI * mv) * 60 * u, S = lerp(S0, Sf, mv);
  // halo de luz detrás de la carta
  const halo = ctx.createRadialGradient(ccx, ccy, S * .2, ccx, ccy, S * 1.3); halo.addColorStop(0, (COL_RANGO[o.rango] || P.a) + '66'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(ccx - S * 1.4, ccy - S * 1.4, S * 2.8, S * 2.8);
  if (entra.s > .01) {
    const flota = Math.sin(t * 2.2) * 4 * u * mv;
    ctx.save(); ctx.translate(ccx, ccy + flota); ctx.rotate(rad(entra.r + lerp(0, -4, mv))); ctx.scale(entra.s, entra.s); ctx.translate(-ccx, -ccy - flota);
    cartaAmp(ctx, ccx, ccy + flota, S, P, imgAmp(o), o.rango || '', u * lerp(1.6, 1, mv), clamp((tm - .85) / .7, -1, 2)); ctx.restore();
  }
  const dc = kf(tm, [[.75, { s: 0, r: 0, a: 0 }], [.95, { s: 1.3, r: 60, a: 1 }], [1.5, { s: 0, r: 140, a: 0 }]]);
  destello(ctx, cx0 + S0 * .45, cy0 - S0 * .45, 70 * u, '#F4C542', dc.s, dc.r, dc.a);
  // --- cabecera a la derecha de la carta: etiqueta, nombre del amplificador y nombre del efecto ---
  const hx = M + Sf + 40 * u, hw = W - hx - M, chipTxt = limpio(o.chip3).toUpperCase(), nom = nombreAmp(o);
  const fChip = `700 ${(vert ? 24 : 24) * u}px "Chakra Petch"`, fNom = `600 ${(vert ? 32 : 32) * u}px "Fredoka"`;
  let fEf = (vert ? 72 : 76) * u; const efecto = limpio(o.efecto);
  let linEf = envolver(ctx, efecto, `400 ${fEf}px "Cherry Bomb One"`, hw, 2);
  while (fEf > 30 * u && Math.max(0, ...linEf.map(l => ancho(ctx, l, `400 ${fEf}px "Cherry Bomb One"`))) > hw) { fEf -= 2 * u; linEf = envolver(ctx, efecto, `400 ${fEf}px "Cherry Bomb One"`, hw, 2); }
  const lhEf = fEf * 1.15, cabH = (chipTxt ? 40 * u + 14 * u : 0) + (nom ? 40 * u : 0) + linEf.length * lhEf;
  let y = top + Math.max(0, (Sf - cabH) / 2);
  const entraTxt = (t0, fn, dx = -30) => { const k = kf(tm, [[t0, { x: dx, a: 0 }], [t0 + .4, { x: 0, a: 1 }]], EASE.back); if (k.a <= .001) return; ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(k.x * u, 0); fn(); ctx.restore(); };
  if (chipTxt) {
    const cw = ancho(ctx, chipTxt, fChip, 4 * u) + 36 * u, yy = y;
    entraTxt(1.75, () => { rr(ctx, hx, yy, cw, 40 * u, 20 * u); ctx.fillStyle = P.a; ctx.fill(); fuente(ctx, fChip, 4 * u); ctx.fillStyle = P.o; ctx.fillText(chipTxt, hx + 18 * u, yy + 21 * u); });
    y += 40 * u + 14 * u;
  }
  if (nom) { const yy = y; entraTxt(1.85, () => { fuente(ctx, fNom); ctx.fillStyle = P.s; ctx.fillText(nom, hx, yy + 18 * u); }); y += 40 * u; }
  linEf.forEach((l, i) => {
    const yy = y + lhEf / 2, t0 = 1.95 + i * .12;
    const k = kf(tm, [[t0, { s: .5, a: 0 }], [t0 + .3, { s: 1.08, a: 1 }], [t0 + .45, { s: 1, a: 1 }]], EASE.back);
    if (k.a > .001) {
      ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(hx, yy); ctx.scale(k.s, k.s); ctx.translate(-hx, -yy);
      const g = ctx.createLinearGradient(0, yy - fEf / 2, 0, yy + fEf / 2); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, COL_RANGO[o.rango] || P.a);
      tituloBorde(ctx, l, hx, yy, `400 ${fEf}px "Cherry Bomb One"`, g, P, 12 * u); ctx.restore();
    }
    y += lhEf;
  });
  // --- condición y descripción con palabras de color que aparecen una a una ---
  const cols = { n: P.t, c: o.colClave || '#FF9A3C', v: o.colNum || '#7BE38F' };
  // en vertical se intenta dejar libre la zona de subtítulos (78 %); si la descripción es tan larga que la letra
  // quedaría pequeña, se usa la pantalla hasta abajo antes de encogerla más
  const xT = M, wT = W - 2 * M, fondos = vert ? [H * .78, H - M - 20 * u] : [H - M];
  let yT = top + Sf + (vert ? 60 : 44) * u;
  const espImg = ZZZ.imagen('especialidad', limpio(o.especialidad)), conIco = !!limpio(o.especialidad);
  const cond = palabrasRicas(o.condicion), desc = palabrasRicas(o.descripcion);
  const iCond = cond.findIndex(w => w.marca); if (conIco && iCond >= 0) cond[iCond].icono = true;
  // tamaños: la condición algo menor que la descripción; la descripción se encoge hasta caber
  const fsC = (vert ? 40 : 38) * u, fC = `600 ${fsC}px "Fredoka"`, lhC = fsC * 1.3, icoC = fsC * 1.15;
  const mc = maquetar(ctx, cond, fC, wT, lhC, icoC + 8 * u);
  const ySep = yT + mc.h + 26 * u, yD = ySep + 34 * u;
  let fsD, md;
  for (const [i, fondoTxt] of fondos.entries()) {
    const minimo = (i < fondos.length - 1 ? 54 : 18) * u; fsD = (vert ? 64 : 58) * u;
    do { md = maquetar(ctx, desc, `700 ${fsD}px "Fredoka"`, wT, fsD * 1.36); if (md.h <= fondoTxt - yD) break; fsD -= 1.5 * u; } while (fsD > minimo);
    if (md.h <= fondoTxt - yD) break;
  }
  const fD = `700 ${fsD}px "Fredoka"`, lhD = fsD * 1.36;
  const pintar = (lay, f, lh, y0, t0, paso, icoW) => {
    let idx = 0;
    lay.lineas.forEach((lin, li) => lin.pal.forEach(w => {
      const ti = t0 + (idx++) * paso, k = kf(tm, [[ti, { y: 14, a: 0, s: w.marca ? 1.35 : 1 }], [ti + .28, { y: 0, a: 1, s: 1 }]], w.marca ? EASE.back : EASE.out);
      if (k.a <= .001) return;
      const x = xT + w.x, yy = y0 + li * lh + lh / 2 + k.y * u;
      ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1);
      if (k.s !== 1) { const mx = x + w.w / 2; ctx.translate(mx, yy); ctx.scale(k.s, k.s); ctx.translate(-mx, -yy); }
      let xx = x;
      if (w.icono) { badgeIcono(ctx, xx + icoW / 2 - 4 * u, yy, icoW - 8 * u, P, espImg, ICONOS_ATR.competencia); xx += icoW; }
      fuente(ctx, f);
      w.runs.forEach((r, ri) => {
        // las palabras marcadas llevan una caja suave de su color (unida a la de la palabra de al lado si también lo está)
        if (r.k !== 'n') {
          const izq = ri === 0 && w.uneIzq ? w.uneIzq : 4 * u, der = ri === w.runs.length - 1 && w.uneDer ? 0 : 4 * u;
          ctx.save(); ctx.globalAlpha *= .22; ctx.beginPath(); ctx.roundRect(xx - izq, yy - lh * .36, r.w + izq + der, lh * .72, [izq > 4 * u ? 0 : 10 * u, der ? 10 * u : 0, der ? 10 * u : 0, izq > 4 * u ? 0 : 10 * u]);
          ctx.fillStyle = cols[r.k]; ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = cols[r.k]; ctx.fillText(r.t, xx, yy + 1.5 * u); xx += r.w;
      });
      ctx.restore();
      if (w.marca === 'v') { const d = kf(tm, [[ti + .1, { s: 0, r: 0, a: 0 }], [ti + .3, { s: 1.1, r: 60, a: 1 }], [ti + .8, { s: 0, r: 140, a: 0 }]]); destello(ctx, x + w.w + 2 * u, yy - lh * .32, 30 * u, '#F4C542', d.s, d.r, d.a); }
    }));
  };
  pintar(mc, fC, lhC, yT, T.tCond, T.pasoC, icoC + 8 * u);
  // separador ondulado que se dibuja de izquierda a derecha
  const ps = EASE.out(clamp((tm - (T.tDesc - .3)) / .6, 0, 1));
  if (ps > 0) {
    ctx.save(); ctx.beginPath();
    for (let xx = 0; xx <= wT * ps; xx += 6 * u) { const yy = ySep + 5 * u * Math.sin(xx / (26 * u) + t * 3); xx ? ctx.lineTo(xT + xx, yy) : ctx.moveTo(xT + xx, yy); }
    ctx.lineWidth = 4 * u; ctx.lineCap = 'round'; ctx.strokeStyle = P.a; ctx.globalAlpha *= .55; ctx.stroke(); ctx.restore();
  }
  pintar(md, fD, lhD, yD, T.tDesc, T.pasoD, 0);
  ctx.restore();
  ctx.restore();
}
