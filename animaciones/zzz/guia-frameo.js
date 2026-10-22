// Kyo Estudio · Plantilla ZZZ: Guía de frameo
import * as K from '../kit-dibujado.js';
import * as ZZZ from '../zzz.js';
import { imagenEn, rr, TEMAS, ancho, envolver, rad, lerp, clamp, EASE, kf, tiempo, fuente, paleta, COMUNES, colocar, conDef, fuenteQueCabe } from '../base/utilidades.js';
import { AC } from '../base/acabado.js';
import { ESTRELLA, icono } from '../base/iconos.js';
import { pegatina, destello, avatar, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { ICONOS_ATR, normIcono, HABILIDADES, limpio, contando } from './comun.js';

// 17 · Guía de frameo (ZZZ): materiales para llevar al personaje al máximo, en 4 clips
const CHIP = new Path2D('M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3');
const LIBRO = new Path2D('M5 4.5h9.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3ZM5 16.5a3 3 0 0 1 3-3h9.5');
// Icono dibujado según el nombre del material (si no se subió uno a la galería)
function glifoMaterial(nombre) {
  const n = normIcono(nombre), hay = (...ps) => ps.some(p => n.includes(p));
  if (hay('chip')) return { p: CHIP, trazo: true };
  if (hay('insignia')) return ICONOS_ATR.defensa;
  if (hay('componente')) return { p: HABILIDADES.nucleo.p, trazo: true };
  if (hay('registro', 'libro', 'experiencia')) return { p: LIBRO, trazo: true };
  if (hay('nucleo')) return ICONOS_ATR.critDmg;
  if (hay('datos')) return ICONOS_ATR.etereo;
  if (hay('modulo', 'energ')) return ICONOS_ATR.energia;
  return ICONOS_ATR.otro;
}
// Moneda de deniques dibujada (o el icono subido con el nombre de la moneda)
function moneda(ctx, cx, cy, D, P, img) {
  ctx.save();
  if (img) { imagenEn(ctx, img, cx - D / 2, cy - D / 2, D, D, 'contener'); ctx.restore(); return; }
  ctx.beginPath(); ctx.arc(cx, cy + D * .06, D / 2, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2); ctx.fillStyle = '#F4C542'; ctx.fill();
  ctx.lineWidth = D * .08; ctx.strokeStyle = P.o; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, D * .3, 0, Math.PI * 2); ctx.lineWidth = D * .06; ctx.strokeStyle = 'rgba(10,16,48,.45)'; ctx.stroke();
  ctx.restore();
}
// Ficha cuadrada del material: imagen de la galería o icono dibujado
function fichaMaterial(ctx, cx, cy, S, P, img, nombre, acento) {
  ctx.save();
  rr(ctx, cx - S / 2, cy - S / 2 + S * .06, S, S, S * .24); ctx.fillStyle = P.o; ctx.fill();
  rr(ctx, cx - S / 2, cy - S / 2, S, S, S * .24); ctx.fillStyle = P.o; ctx.fill(); ctx.lineWidth = S * .06; ctx.strokeStyle = acento; ctx.stroke();
  if (img) imagenEn(ctx, img, cx - S * .41, cy - S * .41, S * .82, S * .82, 'contener');
  else {
    const g = glifoMaterial(nombre), k = S * .56; ctx.translate(cx - k / 2, cy - k / 2); ctx.scale(k / 24, k / 24);
    if (g.trazo) { ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = acento; ctx.stroke(g.p); }
    else { ctx.fillStyle = acento; ctx.fill(g.p, g.par || 'nonzero'); }
  }
  ctx.restore();
}
export function pintarFrameoGaleria(ctx, grupo, nombre, img, S) {
  const P = TEMAS.marea; ctx.clearRect(0, 0, S, S);
  if (grupo === 'jefe') { ctx.save(); rr(ctx, S * .08, S * .08, S * .84, S * .84, S * .2); ctx.fillStyle = P.o; ctx.fill(); ctx.clip(); if (img) imagenEn(ctx, img, S * .08, S * .08, S * .84, S * .84, 'cubrir'); else icono(ctx, ESTRELLA, S * .3, S * .3, S * .4, 'rgba(255,255,255,.3)'); ctx.restore(); }
  else if (grupo === 'moneda') moneda(ctx, S / 2, S / 2, S * .7, P, img);
  else fichaMaterial(ctx, S / 2, S / 2, S * .8, P, img, nombre, P.a);
}
// Números con separador de miles con espacio, como en el juego: 1330000 → "1 330 000"
const numJuego = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const leerNum = v => Number(String(v || '').replace(/[^\d]/g, '')) || 0;
const FRAMEO_SECC = { 1: 'a', 2: 'h', 3: 'e' };
function listasFrameo(o) {
  const filas = c => ['1', '2', '3', '4', '5', '6'].map(n => ({ nom: limpio(o[FRAMEO_SECC[c] + n]), cant: limpio(o[FRAMEO_SECC[c] + n + 'c']) })).filter(f => f.nom);
  const jefes = ['1', '2', '3'].map(n => ({ nom: limpio(o['j' + n]), nota: limpio(o['j' + n + 'n']) })).filter(j => j.nom);
  const den = { 1: leerNum(o.d1), 2: leerNum(o.d2), 3: leerNum(o.d3) };
  return { filas, jefes, den, total: den[1] + den[2] + den[3] };
}
const clipFrameo = o => ['1', '2', '3', '4'].includes(String(o.clip)) ? String(o.clip) : '1';
function tiemposFrameo(o) {
  const L = listasFrameo(o), c = clipFrameo(o), n = c === '4' ? L.jefes.length : L.filas(c).length;
  const t0 = c === '4' ? 1.4 : .8, ts = Array.from({ length: n }, (_, i) => t0 + i * (c === '4' ? .35 : .4));
  const intro = (ts.length ? ts[ts.length - 1] + .5 : 1.3) + .7, fin = intro + 1.2 + .7;
  return { ts, intro, fin, minimo: o.salida === 'no' ? intro + .3 : fin };
}
function medirFrameo(ctx, o, u) {
  const f = { chip: `700 ${20 * u}px "Chakra Petch"`, chipE: 3 * u, pj: `700 ${30 * u}px "Fredoka"`, nom: `700 ${28 * u}px "Fredoka"`, cant: `700 ${30 * u}px "Fredoka"`,
    den: `700 ${28 * u}px "Fredoka"`, tot: `400 ${76 * u}px "Cherry Bomb One"`, totL: `600 ${24 * u}px "Fredoka"`, sub: `700 ${20 * u}px "Chakra Petch"`, jn: `700 ${24 * u}px "Fredoka"`, jt: `600 ${19 * u}px "Fredoka"` };
  const L = listasFrameo(o), pad = 34 * u, pj = limpio(o.personaje), conAv = !!o.imagen || !!limpio(o.agente), avS = 30 * u;
  const tit = c => limpio(o['t' + c]).toUpperCase();
  const cab = c => { const cw = tit(c) ? ancho(ctx, tit(c), f.chip, f.chipE) + 32 * u : 0, resto = (conAv ? avS + 22 * u : 0) + (pj ? ancho(ctx, pj, f.pj) : 0);
    return { chipW: cw, w: cw + (resto ? 16 * u + resto : 0), h: 52 * u }; };
  const icS = 56 * u, rowPad = 16 * u, gap = 12 * u, maxNom = 470 * u, lineH = 32 * u;
  const filas = c => L.filas(c).map(r => {
    const lin = envolver(ctx, r.nom, f.nom, maxNom, 2), nw = Math.max(...lin.map(l => ancho(ctx, l, f.nom))), cw = r.cant ? ancho(ctx, r.cant, f.cant) + 36 * u : 0;
    return Object.assign({}, r, { lin, cw, h: Math.max(76 * u, lin.length * lineH + 26 * u), w: rowPad + icS + 16 * u + nw + (cw ? 36 * u + cw : 0) + rowPad });
  });
  const denW = c => L.den[c] ? 46 * u + ancho(ctx, numJuego(L.den[c]), f.den) + 26 * u : 0;
  const secc = {};
  ['1', '2', '3'].forEach(c => { const fl = filas(c), hd = cab(c);
    secc[c] = { hd, fl, w: Math.max(hd.w + (denW(c) ? 24 * u + denW(c) : 0), ...fl.map(r => r.w)), h: hd.h + 14 * u + fl.reduce((a, r) => a + r.h, 0) + Math.max(0, fl.length - 1) * gap }; });
  // resumen: total de deniques + jefes
  const hd4 = cab('4'), jW = 190 * u, jH = 230 * u, jGap = 22 * u, nJ = L.jefes.length;
  const totW = 70 * u + ancho(ctx, numJuego(L.total), f.tot), jefesW = nJ ? nJ * jW + (nJ - 1) * jGap : 0;
  const subJ = limpio(o.tj).toUpperCase(), subW = subJ ? ancho(ctx, subJ, f.sub, 2 * u) : 0;
  secc['4'] = { hd: hd4, w: Math.max(hd4.w, totW, jefesW, subW), h: hd4.h + 14 * u + 96 * u + 30 * u + (nJ ? (subJ ? 40 * u : 0) + jH : 0) };
  const w = Math.max(...['1', '2', '3', '4'].map(c => secc[c].w), 520 * u) + 2 * pad;
  return { f, L, pad, pj, conAv, avS, tit, icS, rowPad, gap, lineH, denW, secc, jW, jH, jGap, subJ, w, h: c => pad + secc[c].h + pad };
}
export const guiaFrameo = {
  id: 'guia-frameo',
  grupo: 'zzz',
  nombre: 'Guía de frameo (ZZZ)',
  desc: 'Todo lo que hay que farmear para llevar al personaje al máximo, en 4 clips: promoción del agente, habilidades, amplificador y resumen con los deniques totales y los jefes a derrotar.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 75,
  variantes: { k: 'clip', todos: '⬇ Los 4 clips', valores: [['1', 'clip1-promocion'], ['2', 'clip2-habilidades'], ['3', 'clip3-amplificador'], ['4', 'clip4-resumen']] },
  // las cantidades se guardan aparte como plantilla reutilizable (los materiales cambian, los totales no)
  plantillasCant: { label: '📦 Plantillas de cantidades', ejemplo: 'Ej. Rango S · nivel 60', campos: ['d1', 'd2', 'd3', ...['a', 'h', 'e'].flatMap(s => ['1', '2', '3', '4', '5', '6'].map(n => s + n + 'c'))] },
  galeria: {
    grupos: [{ id: 'material', label: 'Materiales', campos: [...['a', 'h', 'e'].flatMap(s => ['1', '2', '3', '4', '5', '6'].map(n => s + n))] },
      { id: 'moneda', label: 'Moneda', campos: ['moneda'] }, { id: 'jefe', label: 'Jefes', campos: ['j1', 'j2', 'j3'] }],
    pintar: pintarFrameoGaleria
  },
  campos: [
    { k: 'clip', label: 'Clip', tipo: 'chips', def: '1', opciones: [['1', '1 · Promoción'], ['2', '2 · Habilidades'], ['3', '3 · Amplificador'], ['4', '4 · Resumen']] },
    { k: 'personaje', label: 'Personaje', tipo: 'texto', def: 'Personaje', max: 28 },
    { k: 'agente', label: 'Retrato (del repo de assets ZZZdle)', tipo: 'lista', def: '', vacio: 'Sin retrato', cargar: () => ZZZ.lista('retrato') },
    { k: 'imagen', label: '…o sube tu imagen', tipo: 'imagen' },
    { k: 'moneda', label: 'Nombre de la moneda (para su icono en la galería)', tipo: 'texto', def: 'Deniques', max: 20 },
    ...[['1', 'a', 'Promoción de agente', '800 000', [['Insignia anómala básica', '4'], ['Insignia anómala avanzada', '32'], ['Insignia controladora', '30'], ['Registro del investigador veterano', '300']]],
        ['2', 'h', 'Mejora de habilidades', '1 330 000', [['Chip ígneo básico', '25'], ['Chip ígneo avanzado', '75'], ['Chip ígneo especializado', '76'], ['Descriptor «jaula de hámster»', '1'], ['Núcleo falsificado', '9'], ['Datos de alta dimensionalidad: pluma miasmática ensangrentada', '60']]],
        ['3', 'e', 'Amplificador', '400 000', [['Componente anómalo', '4'], ['Componente anómalo potenciado', '32'], ['Componente anómalo especializado', '30'], ['Módulo de energía', '200']]]].flatMap(([c, s, t, d, ej]) => [
      { k: 't' + c, label: 'Título', tipo: 'texto', def: t, max: 30, si: 'clip=' + c },
      { k: 'd' + c, label: 'Deniques de esta sección', tipo: 'texto', def: d, max: 14, si: 'clip=' + c },
      ...['1', '2', '3', '4', '5', '6'].flatMap((n, i) => [
        { k: s + n, label: 'Material ' + n + (i >= ej.length ? ' (opcional)' : ''), tipo: 'texto', def: (ej[i] || [''])[0], max: 60, si: 'clip=' + c },
        { k: s + n + 'c', label: 'Cantidad', tipo: 'texto', def: (ej[i] || ['', ''])[1], max: 10, si: 'clip=' + c }
      ])
    ]),
    { k: 't4', label: 'Título', tipo: 'texto', def: 'Resumen', max: 30, si: 'clip=4' },
    { k: 'tl', label: 'Texto bajo el total', tipo: 'texto', def: 'Deniques en total', max: 30, si: 'clip=4' },
    { k: 'tj', label: 'Título de los jefes', tipo: 'texto', def: 'Jefes a derrotar', max: 30, si: 'clip=4' },
    ...['1', '2', '3'].flatMap((n, i) => [
      { k: 'j' + n, label: 'Jefe ' + n + (i ? ' (opcional)' : ''), tipo: 'texto', def: i ? '' : 'Nombre del jefe', max: 30, si: 'clip=4' },
      { k: 'j' + n + 'n', label: 'Para qué (opcional)', tipo: 'texto', def: i ? '' : 'Material de habilidad', max: 30, si: 'clip=4' }
    ]),
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    ...conDef(COMUNES, { posv: 'centro' }),
    ...['1', '2', '3', '4'].map(c => ({ k: 'dur' + c, label: 'Duración del clip ' + c + ' (segundos)', tipo: 'numero', def: c === '2' ? 7 : 6, min: 3, max: 30, paso: 0.1, si: 'clip=' + c }))
  ],
  preparar: o => ZZZ.cargar('retrato', limpio(o.agente)),
  duracion: o => Math.max(tiemposFrameo(o).minimo, clamp(Number(o['dur' + clipFrameo(o)]) || 6, 3, 30)),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), c = clipFrameo(o), T = tiemposFrameo(o), quieto = o.salida === 'no', ORO = '#F4C542';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    const ic = typeof o.iconos === 'function' ? o.iconos : () => null, avImg = o.imagen || ZZZ.imagen('retrato', limpio(o.agente));
    let u = (fmt === 'vertical' ? 1.3 : 1) * (Number(o.tam) || 1);
    let m = medirFrameo(ctx, o, u); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medirFrameo(ctx, o, u); }
    if (m.h(c) > H - 120) { u *= (H - 120) / m.h(c); m = medirFrameo(ctx, o, u); }
    const { f, pad, w } = m, h = m.h(c), sc = m.secc[c];
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + w / 2, pos.y + h / 2, u, .5);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad, cw = w - 2 * pad, numMon = v => ic('moneda', limpio(o.moneda));
    let y = pos.y + pad;
    // --- cabecera: título, retrato, personaje y deniques de la sección ---
    const tit = m.tit(c);
    if (tit) { const a = kf(tm, [[.25, { y: 14, a: 0 }], [.55, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; rr(ctx, x0, y + a.y * u, sc.hd.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(tit, x0 + 16 * u, y + 18 * u + a.y * u); ctx.restore(); }
    let x = x0 + (sc.hd.chipW ? sc.hd.chipW + 16 * u : 0);
    if (m.conAv) { const cx = x + m.avS / 2 + 8 * u, cy = y + 18 * u, a = kf(tm, [[.35, { s: 0, r: -30 }], [.65, { s: 1.15, r: 8 }], [.85, { s: 1, r: 0 }]], EASE.back);
      if (a.s > .01) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(a.r)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy); avatar(ctx, cx, cy, m.avS, P, avImg, ESTRELLA, u * .5); ctx.restore(); }
      x += m.avS + 22 * u; }
    if (m.pj) { const a = kf(tm, [[.4, { x: -16, a: 0 }], [.75, { x: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.pj); ctx.fillStyle = P.s; ctx.fillText(m.pj, x + a.x * u, y + 18 * u); ctx.restore(); }
    if (c !== '4' && m.L.den[c]) { // deniques de la sección, arriba a la derecha, contando
      const dw = m.denW(c), dx = x0 + cw - dw, a = kf(tm, [[.5, { s: 0 }], [.8, { s: 1.12 }], [.95, { s: 1 }]], EASE.back);
      if (a.s > .01) { const cx = dx + dw / 2, cy = y + 18 * u; ctx.save(); ctx.translate(cx, cy); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy);
        rr(ctx, dx, y, dw, 36 * u, 18 * u); ctx.fillStyle = P.o; ctx.fill(); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = ORO; ctx.stroke();
        moneda(ctx, dx + 22 * u, cy, 26 * u, P, numMon()); fuente(ctx, f.den); ctx.fillStyle = ORO;
        ctx.fillText(numJuego(m.L.den[c] * EASE.out(clamp((tm - .6) / .9, 0, 1))), dx + 42 * u, cy + 1.5 * u); ctx.restore(); }
    }
    y += sc.hd.h + 14 * u;
    if (c !== '4') {
      // --- filas de materiales ---
      sc.fl.forEach((r, i) => {
        const ti = T.ts[i], ry = y, rcy = ry + r.h / 2;
        const e = AC && AC.k.muelle ? (p => ({ x: lerp(-36, 0, p), a: clamp((tm - ti) / .12, 0, 1) }))(tm <= ti ? 0 : K.resorte(tm, ti, { frec: 2.2, amort: 7 })) : kf(tm, [[ti, { x: -36, a: 0 }], [ti + .38, { x: 0, a: 1 }]], EASE.back);
        if (e.a > .001) {
          ctx.save(); ctx.globalAlpha *= clamp(e.a, 0, 1); ctx.translate(e.x * u, 0);
          rr(ctx, x0, ry, cw, r.h, 22 * u); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
          const fl = kf(tm, [[ti + .1, { a: 0 }], [ti + .28, { a: .3 }], [ti + .9, { a: 0 }]]);
          if (fl.a > .001) { ctx.save(); ctx.globalAlpha *= fl.a; rr(ctx, x0, ry, cw, r.h, 22 * u); ctx.fillStyle = P.a; ctx.fill(); ctx.restore(); }
          const icx = x0 + m.rowPad + m.icS / 2, pk = kf(tm, [[ti + .06, { s: 0 }], [ti + .32, { s: 1.15 }], [ti + .48, { s: 1 }]], EASE.back).s;
          if (pk > .01) { ctx.save(); ctx.translate(icx, rcy); ctx.scale(pk, pk); ctx.translate(-icx, -rcy); fichaMaterial(ctx, icx, rcy, m.icS, P, ic('material', r.nom), r.nom, P.a); ctx.restore(); }
          fuente(ctx, f.nom); ctx.fillStyle = P.t;
          r.lin.forEach((l, j) => ctx.fillText(l, x0 + m.rowPad + m.icS + 16 * u, rcy + (j - (r.lin.length - 1) / 2) * m.lineH + 1.5 * u));
          if (r.cant) { // cantidad en pegatina de acento que sube contando
            const tv = ti + .2, vx = x0 + cw - m.rowPad - r.cw, vh = 46 * u, k = kf(tm, [[tv, { s: 0 }], [tv + .3, { s: 1.12 }], [tv + .45, { s: 1 }]], EASE.back);
            if (k.s > .01) { const vcx = vx + r.cw / 2; ctx.save(); ctx.translate(vcx, rcy); ctx.scale(k.s, k.s); ctx.translate(-vcx, -rcy);
              rr(ctx, vx, rcy - vh / 2, r.cw, vh, vh / 2); ctx.fillStyle = P.o; ctx.fill(); rr(ctx, vx + 3 * u, rcy - vh / 2 + 3 * u, r.cw - 6 * u, vh - 6 * u, vh / 2); ctx.fillStyle = P.a; ctx.fill();
              fuente(ctx, f.cant); ctx.fillStyle = P.o; ctx.textAlign = 'right'; ctx.fillText(contando(r.cant, clamp((tm - tv) / .75, 0, 1)), vx + r.cw - 18 * u, rcy + 1.5 * u); ctx.textAlign = 'left'; ctx.restore(); }
          }
          ctx.restore();
        }
        y += r.h + m.gap;
      });
    } else {
      // --- resumen: total de deniques que sube contando ---
      const a = kf(tm, [[.5, { s: .5, a: 0 }], [.85, { s: 1.08, a: 1 }], [1, { s: 1, a: 1 }]], EASE.back);
      if (a.a > .001) {
        const txt = numJuego(m.L.total * EASE.out(clamp((tm - .55) / 1.2, 0, 1))); fuente(ctx, f.tot); const tw = ctx.measureText(numJuego(m.L.total)).width, bw = 70 * u + tw, bx = x0 + (cw - bw) / 2, cy = y + 40 * u;
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(x0 + cw / 2, cy); ctx.scale(a.s, a.s); ctx.translate(-x0 - cw / 2, -cy);
        moneda(ctx, bx + 26 * u, cy, 52 * u, P, numMon());
        fuente(ctx, f.tot); ctx.lineWidth = 10 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = ORO; ctx.strokeText(txt, bx + 70 * u, cy + 4 * u); ctx.fillText(txt, bx + 70 * u, cy + 4 * u);
        if (limpio(o.tl)) { fuente(ctx, f.totL); ctx.fillStyle = P.s; ctx.textAlign = 'center'; ctx.fillText(limpio(o.tl), x0 + cw / 2, cy + 58 * u); ctx.textAlign = 'left'; }
        ctx.restore();
      }
      y += 96 * u + 30 * u;
      if (m.L.jefes.length) {
        if (m.subJ) { const a2 = kf(tm, [[1.1, { a: 0 }], [1.4, { a: 1 }]]); ctx.save(); ctx.globalAlpha *= a2.a; fuente(ctx, f.sub, 2 * u); ctx.fillStyle = P.a; ctx.textAlign = 'center'; ctx.fillText(m.subJ, x0 + cw / 2, y + 12 * u); ctx.textAlign = 'left'; ctx.restore(); y += 40 * u; }
        const n = m.L.jefes.length, fw = n * m.jW + (n - 1) * m.jGap, fx = x0 + (cw - fw) / 2;
        m.L.jefes.forEach((j, i) => {
          const ti = T.ts[i], jx = fx + i * (m.jW + m.jGap), cx = jx + m.jW / 2, cy = y + m.jH / 2, r0 = [-2, 1.6, -1.4][i];
          const k = kf(tm, [[ti, { s: .3, r: r0 * 6, a: 0 }], [ti + .3, { s: 1.08, r: -r0, a: 1 }], [ti + .48, { s: 1, r: r0, a: 1 }]], EASE.back);
          if (k.a <= .001) return;
          ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(cx, cy); ctx.rotate(rad(k.r)); ctx.scale(k.s, k.s); ctx.translate(-cx, -cy);
          const R = 22 * u, bandaH = j.nota ? 70 * u : 52 * u;
          pegatina(ctx, jx, y, m.jW, m.jH, R, { fill: P.o, p: ORO, o: P.o, ring: 6 * u, out: 5 * u, drop: 10 * u, suave: false });
          ctx.save(); rr(ctx, jx, y, m.jW, m.jH, R); ctx.clip();
          const g = ctx.createLinearGradient(0, y, 0, y + m.jH); g.addColorStop(0, P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(jx, y, m.jW, m.jH);
          const img = ic('jefe', j.nom);
          if (img) imagenEn(ctx, img, jx, y, m.jW, m.jH - bandaH + 4 * u, 'cubrir'); else icono(ctx, ESTRELLA, cx - 34 * u, y + (m.jH - bandaH) / 2 - 34 * u, 68 * u, 'rgba(255,255,255,.25)');
          ctx.fillStyle = P.o; ctx.fillRect(jx, y + m.jH - bandaH, m.jW, bandaH); ctx.fillStyle = ORO; ctx.fillRect(jx, y + m.jH - bandaH, m.jW, 4 * u);
          ctx.textAlign = 'center'; fuenteQueCabe(ctx, j.nom, 700, 24 * u, 'Fredoka', m.jW - 18 * u); ctx.fillStyle = P.t; ctx.fillText(j.nom, cx, y + m.jH - bandaH + (j.nota ? 24 : 28) * u);
          if (j.nota) { fuenteQueCabe(ctx, j.nota, 600, 19 * u, 'Fredoka', m.jW - 18 * u); ctx.fillStyle = P.s; ctx.fillText(j.nota, cx, y + m.jH - bandaH + 50 * u); }
          ctx.textAlign = 'left'; ctx.restore(); ctx.restore();
          const d = kf(tm, [[ti + .2, { s: 0, r: 0, a: 0 }], [ti + .4, { s: 1.2, r: 60, a: 1 }], [ti + .9, { s: 0, r: 140, a: 0 }]]);
          destello(ctx, jx + m.jW - 6 * u, y + 8 * u, 40 * u, ORO, d.s, d.r, d.a);
        });
      }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
