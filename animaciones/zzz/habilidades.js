// Kyo Estudio · Plantilla ZZZ: Habilidades
import * as ZZZ from '../zzz.js';
import { imagenEn, TEMAS, rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef } from '../base/utilidades.js';
import { AC, popResorte } from '../base/acabado.js';
import { ESTRELLA } from '../base/iconos.js';
import { pegatina, destello, avatar, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { HABILIDADES, limpio, CHEVRON } from './comun.js';

const OPC_HABILIDADES = [['nucleo', 'Habilidad central'], ['basico', 'Ataque básico'], ['evasion', 'Evasión'], ['asistencia', 'Asistencia'], ['especial', 'Técnica especial'], ['cadena', 'Cadena / Definitiva']];
// Moneda de la habilidad: imagen propia de la galería o disco de color con el icono dibujado
export function badgeHabilidad(ctx, cx, cy, D, P, tipo, img) {
  const h = HABILIDADES[tipo] || HABILIDADES.nucleo;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy + D * .06, D / 2 + D * .09, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + D * .09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + D * .04, 0, Math.PI * 2); ctx.fillStyle = P.p; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2);
  if (img) { ctx.fillStyle = P.o; ctx.fill(); ctx.save(); ctx.clip(); imagenEn(ctx, img, cx - D / 2, cy - D / 2, D, D, 'cubrir'); ctx.restore(); }
  else {
    const col = h.col === 'oro' ? '#F4C542' : P[h.col], tinta = h.col === 'a2' ? P.t : P.o;
    const g = ctx.createLinearGradient(0, cy - D / 2, 0, cy + D / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(.18, col); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
    const k = D * .56; ctx.translate(cx - k / 2, cy - k / 2); ctx.scale(k / 24, k / 24);
    if (h.trazo) { ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = tinta; ctx.stroke(h.p); }
    else { ctx.fillStyle = tinta; ctx.fill(h.p); }
  }
  ctx.restore();
}
export function pintarHabilidadGaleria(ctx, grupo, tipo, img, S) { ctx.clearRect(0, 0, S, S); badgeHabilidad(ctx, S / 2, S / 2 - S * .03, S * .7, TEMAS.marea, tipo, img); }
export const listaHabilidades = o => ['1', '2', '3', '4', '5', '6'].map(n => ({ tipo: limpio(o['h' + n]), nivel: limpio(o['h' + n + 'n']) })).filter(h => HABILIDADES[h.tipo]);
function tiemposHabilidades(o) {
  const ts = listaHabilidades(o).map((_, i) => .75 + i * .3), intro = (ts.length ? ts[ts.length - 1] : .5) + .9, fin = intro + 1.2 + .7;
  return { ts, intro, fin, minimo: o.salida === 'no' ? intro + .3 : fin };
}
// 15 · Habilidades (ZZZ): orden de subida de habilidades con su nivel
export const habilidadesZZZ = {
  id: 'habilidades-zzz',
  grupo: 'zzz',
  nombre: 'Habilidades (ZZZ)',
  desc: 'Orden en el que subir las habilidades, con su nivel: cada una salta en su turno unida con ›. Iconos dibujados con los colores del estilo elegido, o los tuyos desde la galería.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 70,
  galeria: { grupos: [{ id: 'habilidad', label: 'Habilidades', campos: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], etiqueta: v => (OPC_HABILIDADES.find(x => x[0] === v) || [, v])[1] }], pintar: pintarHabilidadGaleria },
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: 'Habilidades recomendadas', max: 30 },
    { k: 'personaje', label: 'Personaje (opcional)', tipo: 'texto', def: 'Personaje', max: 28 },
    { k: 'agente', label: 'Retrato (del repo de assets ZZZdle)', tipo: 'lista', def: '', vacio: 'Sin retrato', cargar: () => ZZZ.lista('retrato') },
    { k: 'imagen', label: '…o sube tu imagen (tiene prioridad sobre la del repo)', tipo: 'imagen' },
    ...[['nucleo', '07'], ['especial', '12'], ['cadena', '12'], ['asistencia', '11'], ['basico', '01'], ['evasion', '01']].flatMap(([t, n], i) => [
      { k: 'h' + (i + 1), label: 'Habilidad ' + (i + 1) + (i ? '' : ' (la primera que subir)'), tipo: 'lista', def: t, vacio: 'Ninguna', opciones: OPC_HABILIDADES },
      { k: 'h' + (i + 1) + 'n', label: 'Nivel', tipo: 'texto', def: n, max: 4 }
    ]),
    { k: 'nombres', label: 'Nombre bajo cada habilidad', tipo: 'chips', def: 'no', opciones: [['no', 'Sin nombre'], ['si', 'Con nombre']] },
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    ...conDef(COMUNES, { posv: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1 }
  ],
  preparar: o => ZZZ.cargar('retrato', limpio(o.agente)),
  duracion: o => Math.max(tiemposHabilidades(o).minimo, clamp(Number(o.dur) || 6, 3, 30)),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), T = tiemposHabilidades(o), quieto = o.salida === 'no';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    const hs = listaHabilidades(o), ic = typeof o.iconos === 'function' ? o.iconos : () => null, conNom = o.nombres === 'si';
    const avImg = o.imagen || ZZZ.imagen('retrato', limpio(o.agente)), conAv = !!o.imagen || !!limpio(o.agente);
    let u = (fmt === 'vertical' ? 1.3 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3 * uu, pj: `700 ${32 * uu}px "Fredoka"`, niv: `700 ${24 * uu}px "Fredoka"`, nom: `700 ${18 * uu}px "Fredoka"` };
      const tit = limpio(o.titulo).toUpperCase(), pj = limpio(o.personaje), pad = 34 * uu;
      const chipW = tit ? ancho(ctx, tit, f.chip, f.chipE) + 32 * uu : 0, avS = 30 * uu;
      const headW = chipW + ((pj || conAv) ? (chipW ? 16 * uu : 0) + (conAv ? avS + 22 * uu : 0) + (pj ? ancho(ctx, pj, f.pj) : 0) : 0);
      const headH = (tit || pj || conAv) ? 52 * uu : 0, D = 88 * uu, chev = 32 * uu, filaH = D + 26 * uu + (conNom ? 30 * uu : 0), gapF = 22 * uu;
      const limite = Math.min(W - 120 - 2 * pad, 900 * uu);
      let px = 0, py = 0, maxX = 0; const its = [];
      hs.forEach((hb, i) => {
        const iw = Math.max(104 * uu, conNom ? ancho(ctx, HABILIDADES[hb.tipo].nombre, f.nom) + 12 * uu : 0);
        let cv = null;
        if (i) { if (px + chev + iw > limite) { px = 0; py += filaH + gapF; } cv = px; px += chev; }
        its.push(Object.assign({}, hb, { x: px, y: py, w: iw, chev: cv })); px += iw; maxX = Math.max(maxX, px);
      });
      const cuerpoH = its.length ? py + filaH : 0;
      return { f, tit, pj, pad, chipW, avS, headH, D, chev, filaH, its, w: Math.max(headW, maxX, 420 * uu) + 2 * pad, h: pad + headH + (headH && cuerpoH ? 18 * uu : 0) + cuerpoH + pad };
    };
    let m = medir(u); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medir(u); }
    const { f, pad, w, h, D } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + w / 2, pos.y + h / 2, u, .6);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad, cwid = w - 2 * pad;
    let y = pos.y + pad;
    // --- cabecera: título, retrato y personaje ---
    if (m.headH) {
      if (m.tit) {
        const a = kf(tm, [[.3, { y: 14, a: 0 }], [.6, { y: 0, a: 1 }]]);
        ctx.save(); ctx.globalAlpha *= a.a; rr(ctx, x0, y + a.y * u, m.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
        fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.tit, x0 + 16 * u, y + 18 * u + a.y * u); ctx.restore();
      }
      let x = x0 + (m.chipW ? m.chipW + 16 * u : 0);
      if (conAv) {
        const cx = x + m.avS / 2 + 8 * u, cy = y + 18 * u, a = kf(tm, [[.4, { s: 0, r: -30 }], [.7, { s: 1.15, r: 8 }], [.9, { s: 1, r: 0 }]], EASE.back);
        if (a.s > .01) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(a.r)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy); avatar(ctx, cx, cy, m.avS, P, avImg, ESTRELLA, u * .5); ctx.restore(); }
        x += m.avS + 22 * u;
      }
      if (m.pj) {
        const a = kf(tm, [[.45, { x: -16, a: 0 }], [.8, { x: 0, a: 1 }]], EASE.back);
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.pj); ctx.fillStyle = P.s; ctx.fillText(m.pj, x + a.x * u, y + 18 * u); ctx.restore();
      }
      y += m.headH + (m.its.length ? 18 * u : 0);
    }
    // --- habilidades en orden de prioridad, unidas con › ---
    m.its.forEach((hb, i) => {
      const ti = T.ts[i], cx = x0 + hb.x + hb.w / 2, cy = y + hb.y + 8 * u + D / 2;
      if (hb.chev != null) {
        const ch = kf(tm, [[ti - .12, { a: 0, x: -10 }], [ti + .12, { a: 1, x: 0 }]]);
        if (ch.a > .001) {
          const s = 26 * u; ctx.save(); ctx.globalAlpha *= ch.a; ctx.translate(x0 + hb.chev + (m.chev - s) / 2 + ch.x * u, cy - s / 2); ctx.scale(s / 24, s / 24);
          ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.a; ctx.stroke(CHEVRON); ctx.restore();
        }
      }
      const k = AC && AC.k.muelle ? popResorte(tm, ti, { s0: 0, r0: -40 }) : kf(tm, [[ti, { s: 0, r: -40, a: 0 }], [ti + .28, { s: 1.15, r: 6, a: 1 }], [ti + .45, { s: 1, r: 0, a: 1 }]], EASE.back);
      if ((k.a ?? 1) <= .001 || k.s <= .01) return;
      ctx.save(); ctx.globalAlpha *= clamp(k.a ?? 1, 0, 1); ctx.translate(cx, cy); ctx.rotate(rad(k.r)); ctx.scale(k.s * (k.sx ?? 1), k.s * (k.sy ?? 1)); ctx.translate(-cx, -cy);
      if (i === 0) { // la primera habilidad lleva un aro de acento que late
        const lat = 1 + .06 * Math.sin(Math.max(0, tm - ti) * 4);
        ctx.beginPath(); ctx.arc(cx, cy, (D / 2 + D * .2) * lat, 0, Math.PI * 2); ctx.lineWidth = 4 * u; ctx.strokeStyle = P.a; ctx.stroke();
      }
      badgeHabilidad(ctx, cx, cy, D, P, hb.tipo, ic('habilidad', hb.tipo));
      // nivel: pastilla oscura debajo de la moneda
      if (hb.nivel) {
        fuente(ctx, f.niv); const nw = Math.max(46 * u, ctx.measureText(hb.nivel).width + 24 * u), nh = 32 * u, ny = cy + D / 2 + 2 * u;
        rr(ctx, cx - nw / 2 - 3 * u, ny - nh / 2 - 3 * u, nw + 6 * u, nh + 6 * u, nh / 2 + 3 * u); ctx.fillStyle = P.p; ctx.fill();
        rr(ctx, cx - nw / 2, ny - nh / 2, nw, nh, nh / 2); ctx.fillStyle = P.o; ctx.fill();
        ctx.fillStyle = P.t; ctx.textAlign = 'center'; ctx.fillText(hb.nivel, cx, ny + 1.5 * u); ctx.textAlign = 'left';
      }
      if (conNom) { fuente(ctx, f.nom); ctx.fillStyle = P.s; ctx.textAlign = 'center'; ctx.fillText(HABILIDADES[hb.tipo].nombre, cx, cy + D / 2 + 42 * u); ctx.textAlign = 'left'; }
      ctx.restore();
      const d = kf(tm, [[ti + .2, { s: 0, r: 0, a: 0 }], [ti + .38, { s: 1.2, r: 60, a: 1 }], [ti + .85, { s: 0, r: 140, a: 0 }]]);
      destello(ctx, cx + D * .42, cy - D * .42, 34 * u, i ? '#ffffff' : '#F4C542', d.s, d.r, d.a);
    });
    destellosCaja(ctx, pos, w, h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
