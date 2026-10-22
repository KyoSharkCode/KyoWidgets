// Kyo Estudio · Plantilla: Mi nota
import * as K from '../kit-dibujado.js';
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, IMG_OPC } from '../base/utilidades.js';
import { AC, parMorph, D_ESTRELLA, D_CORAZON, morphResorte } from '../base/acabado.js';
import { ESTRELLA } from '../base/iconos.js';
import { pegatina, destello, avatar, inicio, balanceo, destellosCaja, textoPegatina } from '../base/piezas.js';

// 8 · Mi nota (estrellas o número)
function estrella(ctx, cx, cy, S, P, relleno, u, fig = ESTRELLA, oro = '#F4C542') {
  ctx.save(); ctx.translate(cx - S / 2, cy - S / 2); ctx.scale(S / 24, S / 24);
  const k = 24 / S; ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(0, 1.6); ctx.lineWidth = 7 * u * k; ctx.strokeStyle = P.o; ctx.stroke(fig); ctx.fillStyle = P.o; ctx.fill(fig); ctx.restore();
  ctx.lineWidth = 7 * u * k; ctx.strokeStyle = P.o; ctx.stroke(fig);
  ctx.lineWidth = 3.6 * u * k; ctx.strokeStyle = relleno > 0 ? P.p : 'rgba(255,255,255,.35)'; ctx.stroke(fig);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill(fig);
  if (relleno > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-2, -2, 2 + 24 * relleno + (relleno >= 1 ? 4 : 0), 30); ctx.clip(); ctx.fillStyle = oro; ctx.fill(fig);
    ctx.beginPath(); ctx.ellipse(9, 9, 3, 1.6, rad(-30), 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.restore(); }
  ctx.restore();
}
export const nota = {
  id: 'nota',
  nombre: 'Mi nota / valoración',
  desc: 'Tarjeta con tu valoración: las estrellas se llenan una a una (medias incluidas) o cae un sello gigante tipo "8/10".',
  fps: 30,
  campos: [
    { k: 'titulo', label: 'Etiqueta', tipo: 'texto', def: 'Mi nota', max: 20 },
    { k: 'que', label: 'Qué valoras', tipo: 'texto', def: 'Hollow Knight', max: 26 },
    { k: 'modo', label: 'Tipo de nota', tipo: 'chips', def: 'estrellas', opciones: [['estrellas', '⭐ Estrellas'], ['numero', '🔢 Número']] },
    { k: 'estrellas', label: 'Estrellas (0 a 5, admite medias: 3.5)', tipo: 'numero', def: 4.5, min: 0, max: 5, paso: 0.5, si: 'modo=estrellas' },
    { k: 'numero', label: 'Nota', tipo: 'numero', def: 8, min: 0, max: 1000, paso: 0.5, si: 'modo=numero' },
    { k: 'maximo', label: 'Sobre', tipo: 'numero', def: 10, min: 1, max: 1000, paso: 1, si: 'modo=numero' },
    { k: 'comentario', label: 'Comentario (opcional)', tipo: 'texto', def: '¡Obra maestra!', max: 34 },
    IMG_OPC,
    ...conDef(COMUNES, { posh: 'centro', posv: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 4, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6, 4, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 6;
    const tm = tiempo(t, L, 3.0, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical', est = o.modo !== 'numero';
    const nEst = clamp(Math.round((Number(o.estrellas) || 0) * 2) / 2, 0, 5);
    const num = String(Number(o.numero) || 0), max = '/' + String(Number(o.maximo) || 10);
    let u = (vert ? 1.3 : 1.2) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3.2 * uu, que: `400 ${60 * uu}px "Cherry Bomb One"`, com: `700 ${30 * uu}px "Fredoka"`, num: `700 ${160 * uu}px "Fredoka"`, max: `700 ${66 * uu}px "Fredoka"` };
      const chipTxt = (o.titulo || '').toUpperCase(), chipW = chipTxt ? ancho(ctx, chipTxt, f.chip, f.chipE) + 34 * uu : 0;
      const queW = o.que ? ancho(ctx, o.que, f.que) : 0, comW = o.comentario ? ancho(ctx, o.comentario, f.com) : 0;
      const S = 80 * uu, gap = 16 * uu, filaW = est ? 5 * S + 4 * gap : ancho(ctx, num, f.num) + 12 * uu + ancho(ctx, max, f.max) + 30 * uu;
      const filaH = est ? S + 12 * uu : 160 * uu;
      const pad = 36 * uu;
      const w = Math.max(540 * uu, chipW, queW, filaW, comW) + 2 * pad;
      const h = pad + (chipTxt ? 46 * uu : 0) + (o.que ? 72 * uu : 0) + 16 * uu + filaH + (o.comentario ? 50 * uu : 0) + pad;
      return { f, chipTxt, chipW, queW, comW, S, gap, filaW, filaH, pad, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, pad, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    balanceo(ctx, t, cx, cy, u);
    // sacudida al caer el sello
    if (!est) { const sh = tm > 1.2 && tm < 1.55 ? (1 - (tm - 1.2) / .35) * 9 * u : 0; ctx.translate(Math.sin(tm * 90) * sh, Math.cos(tm * 70) * sh * .6); }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let y = pos.y + pad;
    if (m.chipTxt) { const a = kf(tm, [[.3, { y: 14, a: 0 }], [.6, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; const x = cx - m.chipW / 2;
      rr(ctx, x, y + a.y * u, m.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.chipTxt, x + 17 * u, y + 18 * u + a.y * u); ctx.restore(); y += 46 * u; }
    if (o.que) { const a = kf(tm, [[.4, { s: .6, a: 0 }], [.75, { s: 1.08, a: 1 }], [.9, { s: 1, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, y + 36 * u); ctx.scale(a.s, a.s); fuente(ctx, f.que); ctx.textAlign = 'center';
      ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.strokeText(o.que, 0, 0); ctx.fillText(o.que, 0, 0); ctx.restore(); y += 72 * u; }
    y += 16 * u;
    const fy = y + m.filaH / 2;
    let tCom;
    if (est) {
      const x0 = cx - m.filaW / 2 + m.S / 2;
      const aparece = kf(tm, [[.7, { a: 0, y: 20 }], [1.0, { a: 1, y: 0 }]], EASE.back);
      for (let i = 0; i < 5; i++) {
        const sx = x0 + i * (m.S + m.gap), rel = clamp(nEst - i, 0, 1), ti = 1.05 + i * .24;
        const on = rel > 0 && tm >= ti ? rel : 0;
        const pk = rel > 0 ? kf(tm, [[ti - .01, { s: 1 }], [ti + .1, { s: 1.35 }], [ti + .3, { s: 1 }]], EASE.out).s : 1;
        ctx.save(); ctx.globalAlpha *= clamp(aparece.a, 0, 1); ctx.translate(sx, fy + aparece.y * u); ctx.rotate(rad(rel > 0 && tm >= ti ? Math.sin((tm - ti) * 3 + i) * 4 : 0)); ctx.scale(pk, pk);
        if (AC && nEst === 5) { // nota máxima con acabado dibujado: cada estrella se transforma en corazón
          const tM = 2.45 + i * .09, pm = morphResorte(tm, tM), ap = K.aplaston(tm, tM + .12, { fuerza: .25, frec: 3, amort: 9 }); ctx.scale(ap.sx, ap.sy);
          estrella(ctx, 0, 0, m.S, P, on, u, pm > 0 ? K.morfear(...parMorph('corazon', D_ESTRELLA, D_CORAZON), pm) : ESTRELLA, pm > .5 ? '#FF6B9A' : '#F4C542');
        } else estrella(ctx, 0, 0, m.S, P, on, u);
        ctx.restore();
        if (rel > 0) { const k = kf(tm, [[ti, { s: 0, r: 0, a: 0 }], [ti + .15, { s: 1.2, r: 60, a: 1 }], [ti + .5, { s: 0, r: 140, a: 0 }]]); destello(ctx, sx + m.S * .42, fy - m.S * .42, 34 * u, '#ffffff', k.s, k.r, k.a); }
      }
      tCom = 1.05 + Math.max(1, Math.ceil(nEst)) * .24 + .1;
    } else {
      const st = kf(tm, [[1.0, { s: 2.8, a: 0, r: -24 }], [1.2, { s: .9, a: 1, r: -8 }], [1.32, { s: 1.05, a: 1, r: -5 }], [1.45, { s: 1, a: 1, r: -6 }]], EASE.out);
      if (st.a > 0) {
        fuente(ctx, f.num); const nw = ctx.measureText(num).width; fuente(ctx, f.max); const mw = ctx.measureText(max).width;
        const tot = nw + 12 * u + mw;
        ctx.save(); ctx.globalAlpha *= clamp(st.a, 0, 1); ctx.translate(cx, fy); ctx.rotate(rad(st.r)); ctx.scale(st.s, st.s);
        ctx.textAlign = 'left'; fuente(ctx, f.num); textoPegatina(ctx, num, -tot / 2, 0, u, '#F4C542', P, .62);
        fuente(ctx, f.max); textoPegatina(ctx, max, -tot / 2 + nw + 12 * u, 38 * u, u, P.t, P, .45);
        ctx.restore();
        const an = kf(tm, [[1.2, { r: 0, a: 0 }], [1.22, { r: .5, a: .9 }], [1.8, { r: 1.6, a: 0 }]]);
        if (an.a > 0) { ctx.save(); ctx.globalAlpha *= an.a; ctx.beginPath(); ctx.ellipse(cx, fy, tot * .6 * an.r, 90 * u * an.r, 0, 0, Math.PI * 2); ctx.lineWidth = 8 * u; ctx.strokeStyle = P.a; ctx.stroke(); ctx.restore(); }
      }
      tCom = 1.6;
    }
    if (o.comentario) { const a = kf(tm, [[tCom, { y: 18, a: 0 }], [tCom + .35, { y: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.com); ctx.textAlign = 'center'; ctx.fillStyle = P.s; ctx.fillText(o.comentario, cx, pos.y + h - pad - 18 * u + a.y * u); ctx.restore(); }
    ctx.restore(); // tarjeta
    if (o.imagen) {
      const D = 120 * u, ax = pos.x + w - D / 2 - 4 * u, ay = pos.y + 6 * u;
      const av = kf(tm, [[.5, { s: 0 }], [.85, { s: 1.15 }], [1.0, { s: 1 }]], EASE.back);
      if (av.s > 0) { ctx.save(); ctx.translate(ax, ay); ctx.scale(av.s, av.s); ctx.rotate(rad(6)); ctx.translate(-ax, -ay); avatar(ctx, ax, ay, D, P, o.imagen, ESTRELLA, u); ctx.restore(); }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, tCom, FIN);
    ctx.restore();
  }
};
