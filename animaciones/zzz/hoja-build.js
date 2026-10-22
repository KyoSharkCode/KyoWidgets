// Kyo Estudio · ZZZ: Hoja de build (imagen para redes con los datos de las plantillas ZZZ)
import * as ZZZ from '../zzz.js';
import { rr, fuente, fuenteQueCabe, imagenEn, paleta } from '../base/utilidades.js';
import { ESTRELLA, icono } from '../base/iconos.js';
import { pegatina } from '../base/piezas.js';
import { CHEVRON } from './comun.js';
import { iconoAtributo, badgeIcono, badgeSet, listasGuia } from './guia-discos.js';
import { huecosEquipo } from './equipo.js';
import { badgeHabilidad, listaHabilidades } from './habilidades.js';
import { seccionesAmplis } from './amplificadores.js';

// Hoja de build (imagen para redes): layout propio con los mismos datos de las plantillas ZZZ
// Cada sección mide y dibuja dentro de un ancho dado con una unidad u; hojaBuild elige la u más grande que quepa.
const PANEL_CAB = 58, PANEL_PAD = 22;
function panelHoja(ctx, x, y, w, h, tit, u, P) {
  pegatina(ctx, x, y, w, h, 24 * u, { fill: P.c, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 9 * u });
  fuente(ctx, `700 ${19 * u}px "Chakra Petch"`, 3 * u); const t = tit.toUpperCase(), cw = ctx.measureText(t).width + 30 * u;
  rr(ctx, x + PANEL_PAD * u, y + 16 * u, cw, 32 * u, 16 * u); ctx.fillStyle = P.a; ctx.fill();
  ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(t, x + PANEL_PAD * u + 15 * u, y + 33 * u);
}
const textoAjustado = (ctx, t, x, y, maxW, peso, tam, color, fam = 'Fredoka') => { fuenteQueCabe(ctx, t, peso, tam, fam, maxW); ctx.fillStyle = color; ctx.fillText(t, x, y); };
// --- secciones (devuelven el alto usado; con dib = false solo miden) ---
function hojaDiscos(ctx, x, y, w, u, o, P, dib) {
  const L = listasGuia(o), ic = typeof o.iconos === 'function' ? o.iconos : () => null; let yy = y;
  L.sets.forEach(s => {
    const D = 66 * u, cy = yy + 40 * u;
    if (dib) {
      badgeSet(ctx, x + D / 2 + 8 * u, cy, D, P, ic('set', s.nombre), u * .8);
      const nx = x + 8 * u + D * .88, ny = cy + D * .34, R = 15 * u;
      ctx.beginPath(); ctx.arc(nx, ny, R + 3 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill(); ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2); ctx.fillStyle = '#F4C542'; ctx.fill();
      fuente(ctx, `700 ${17 * u}px "Fredoka"`); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(s.piezas, nx, ny + 1 * u); ctx.textAlign = 'left';
      const tx = x + D + 34 * u; textoAjustado(ctx, s.nombre, tx, cy - (s.sub ? 13 : 0) * u, w - (tx - x), 700, 28 * u, P.t);
      if (s.sub) textoAjustado(ctx, s.sub, tx, cy + 18 * u, w - (tx - x), 600, 20 * u, P.s);
    }
    yy += 84 * u;
  });
  if (L.sets.length && L.filas.length) { if (dib) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, yy + 4 * u, w, 2 * u); } yy += 16 * u; }
  L.filas.forEach(f => {
    const cy = yy + 26 * u, nd = 40 * u, icD = 38 * u, tx = x + nd + icD + 26 * u, tw = w - (tx - x);
    if (dib) {
      ctx.beginPath(); ctx.arc(x + nd / 2, cy, nd / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, `700 ${22 * u}px "Fredoka"`); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(f.n, x + nd / 2, cy + 1.5 * u); ctx.textAlign = 'left';
      badgeIcono(ctx, x + nd + 10 * u + icD / 2, cy, icD, P, ic('atributo', f.main), iconoAtributo(f.main));
      textoAjustado(ctx, f.main, tx, cy + 1.5 * u, tw, 700, 25 * u, P.t);
      if (f.alt) { const cy2 = cy + 42 * u; fuente(ctx, `700 ${24 * u}px "Fredoka"`); ctx.fillStyle = P.a; ctx.fillText('/', x + nd + 2 * u, cy2);
        badgeIcono(ctx, x + nd + 10 * u + icD / 2, cy2, icD * .9, P, ic('atributo', f.alt), iconoAtributo(f.alt)); textoAjustado(ctx, f.alt, tx, cy2 + 1.5 * u, tw, 700, 23 * u, P.s); }
    }
    yy += (f.alt ? 96 : 56) * u;
  });
  return yy - y;
}
function hojaAtributos(ctx, x, y, w, u, o, P, dib) {
  const L = listasGuia(o), ic = typeof o.iconos === 'function' ? o.iconos : () => null; let yy = y;
  const rotulo = t => { if (dib) { fuente(ctx, `700 ${16 * u}px "Chakra Petch"`, 2.5 * u); ctx.fillStyle = P.a; ctx.textAlign = 'left'; ctx.fillText(t, x, yy + 10 * u); } yy += 28 * u; };
  if (L.subs.length) {
    rotulo('SUBSTATS · POR PRIORIDAD');
    const ph = 48 * u, chev = 26 * u, icP = 34 * u; let px = 0, py = 0; fuente(ctx, `700 ${22 * u}px "Fredoka"`);
    L.subs.forEach((s, i) => {
      const pw = Math.min(w, 10 * u + icP + 10 * u + ctx.measureText(s).width + 18 * u);
      if (i) { if (px + chev + pw > w) { px = 0; py += ph + 10 * u; } else { if (dib) { const sx = x + px + chev / 2, sy = yy + py + ph / 2; ctx.save(); ctx.translate(sx - 9 * u, sy - 9 * u); ctx.scale(18 * u / 24, 18 * u / 24); ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.a; ctx.stroke(CHEVRON); ctx.restore(); } px += chev; } }
      if (dib) { const bx = x + px, by = yy + py; rr(ctx, bx, by, pw, ph, ph / 2); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); if (!i) { ctx.lineWidth = 2.5 * u; ctx.strokeStyle = P.a; ctx.stroke(); }
        badgeIcono(ctx, bx + 10 * u + icP / 2, by + ph / 2, icP, P, ic('atributo', s), iconoAtributo(s)); fuente(ctx, `700 ${22 * u}px "Fredoka"`); ctx.fillStyle = P.t; ctx.fillText(s, bx + 20 * u + icP, by + ph / 2 + 1.5 * u); fuente(ctx, `700 ${22 * u}px "Fredoka"`); }
      px += pw;
    });
    yy += py + ph + 14 * u;
  }
  if (L.objs.length) {
    rotulo('OBJETIVOS');
    const signo = o.signo ? o.signo + ' ' : '';
    L.objs.forEach(ob => {
      const cy = yy + 24 * u, icD = 36 * u, val = ob.valor ? signo + ob.valor : '';
      if (dib) {
        rr(ctx, x, yy, w, 48 * u, 16 * u); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
        badgeIcono(ctx, x + 10 * u + icD / 2, cy, icD, P, ic('atributo', ob.nombre), iconoAtributo(ob.nombre));
        fuente(ctx, `700 ${22 * u}px "Fredoka"`); const vw = val ? ctx.measureText(val).width + 28 * u : 0;
        textoAjustado(ctx, ob.nombre, x + 22 * u + icD, cy + 1.5 * u, w - icD - 40 * u - vw, 700, 22 * u, P.t);
        if (val) { const vx = x + w - vw - 8 * u; rr(ctx, vx, cy - 17 * u, vw, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill(); fuente(ctx, `700 ${22 * u}px "Fredoka"`); ctx.fillStyle = P.o; ctx.fillText(val, vx + 14 * u, cy + 1.5 * u); }
      }
      yy += 56 * u;
    });
  }
  return yy - y;
}
function hojaAmplis(ctx, x, y, w, u, o, P, dib) {
  let yy = y; const ORO = '#F4C542';
  seccionesAmplis(o).forEach((sec, si) => {
    const acento = sec.oro ? ORO : P.a, rD = 36 * u, cy = yy + 22 * u;
    if (si && dib) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x, yy - 8 * u, w, 2 * u); }
    if (dib) {
      if (sec.rango) { ctx.beginPath(); ctx.arc(x + rD / 2, cy, rD / 2, 0, Math.PI * 2); ctx.fillStyle = acento; ctx.fill();
        if (sec.rango === '★') icono(ctx, ESTRELLA, x + rD * .18, cy - rD * .32, rD * .64, P.o); else { fuente(ctx, `700 ${21 * u}px "Fredoka"`); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(sec.rango, x + rD / 2, cy + 1.5 * u); ctx.textAlign = 'left'; } }
      const tx = x + (sec.rango ? rD + 12 * u : 0); fuente(ctx, `700 ${25 * u}px "Fredoka"`); ctx.fillStyle = sec.oro ? ORO : P.t; ctx.fillText(sec.tit, tx, cy + 1.5 * u);
      if (sec.sub) { const tw = ctx.measureText(sec.tit).width; textoAjustado(ctx, '· ' + sec.sub, tx + tw + 10 * u, cy + 2 * u, w - (tx - x) - tw - 10 * u, 600, 18 * u, P.s); }
    }
    yy += 50 * u;
    if (sec.items.length) {
      const gap = 14 * u, tw = Math.min(160 * u, (w - 2 * gap) / 3), th = tw + 46 * u, fx = x + (w - (sec.items.length * tw + (sec.items.length - 1) * gap)) / 2;
      sec.items.forEach((wp, i) => {
        if (!dib) return; const tx = fx + i * (tw + gap), R = 16 * u;
        ctx.save(); rr(ctx, tx, yy, tw, th, R); ctx.fillStyle = P.o; ctx.fill(); ctx.lineWidth = 3.5 * u; ctx.strokeStyle = acento; ctx.stroke(); ctx.clip();
        const g = ctx.createRadialGradient(tx + tw / 2, yy + tw * .5, 6 * u, tx + tw / 2, yy + tw * .5, tw * .7); g.addColorStop(0, sec.oro ? 'rgba(244,197,66,.5)' : P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(tx, yy, tw, tw);
        const img = wp.img || ZZZ.imagen('amplificador', wp.slug); if (img) imagenEn(ctx, img, tx + 8 * u, yy + 6 * u, tw - 16 * u, tw - 12 * u, 'contener');
        ctx.restore();
        ctx.textAlign = 'center'; textoAjustado(ctx, wp.nom, tx + tw / 2, yy + tw + 23 * u, tw - 12 * u, 700, 19 * u, P.t); ctx.textAlign = 'left';
      });
      yy += th + 22 * u;
    } else yy += 8 * u;
  });
  return yy - y;
}
function hojaHabilidades(ctx, x, y, w, u, o, P, dib) {
  const hs = listaHabilidades(o), ic = typeof o.iconos === 'function' ? o.iconos : () => null, D = 64 * u, iw = 84 * u, chev = 26 * u, fh = D + 34 * u;
  // reparto en filas (con su ancho) para centrar cada una
  const pos = []; const anchos = [0]; { let px = 0, fila = 0;
    hs.forEach((hb, i) => { let ch = null; if (i) { if (px + chev + iw > w) { px = 0; fila++; anchos[fila] = 0; } else { ch = px; px += chev; } }
      pos.push({ px, fila, ch }); px += iw; anchos[fila] = px; }); }
  hs.forEach((hb, i) => {
    const { fila, ch } = pos[i], ox = x + (w - anchos[fila]) / 2, py = fila * (fh + 12 * u), px = pos[i].px;
    if (ch != null && dib) { const sx = ox + ch + chev / 2, sy = y + py + 6 * u + D / 2; ctx.save(); ctx.translate(sx - 9 * u, sy - 9 * u); ctx.scale(18 * u / 24, 18 * u / 24); ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.a; ctx.stroke(CHEVRON); ctx.restore(); }
    if (dib) {
      const cx = ox + px + iw / 2, cy = y + py + 6 * u + D / 2;
      if (!i) { ctx.beginPath(); ctx.arc(cx, cy, D / 2 + D * .18, 0, Math.PI * 2); ctx.lineWidth = 3 * u; ctx.strokeStyle = P.a; ctx.stroke(); }
      badgeHabilidad(ctx, cx, cy, D, P, hb.tipo, ic('habilidad', hb.tipo));
      if (hb.nivel) { fuente(ctx, `700 ${19 * u}px "Fredoka"`); const nw = Math.max(38 * u, ctx.measureText(hb.nivel).width + 18 * u), nh = 26 * u, ny = cy + D / 2 + 2 * u;
        rr(ctx, cx - nw / 2, ny - nh / 2, nw, nh, nh / 2); ctx.fillStyle = P.o; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = P.p; ctx.stroke(); ctx.fillStyle = P.t; ctx.textAlign = 'center'; ctx.fillText(hb.nivel, cx, ny + 1.5 * u); ctx.textAlign = 'left'; }
    }
  });
  return hs.length ? (anchos.length - 1) * (fh + 12 * u) + fh : 0;
}
function hojaEquipo(ctx, x, y, w, u, o, P, dib) {
  const { ag, bb } = huecosEquipo(o), todos = [...ag.map(h => [h, false]), ...(bb ? [[bb, true]] : [])]; if (!todos.length) return 0;
  const gap = 14 * u, n = todos.length, tw = Math.min(150 * u, (w - (n - 1) * gap) / n), th = tw * 1.22 + 48 * u, x0 = x + (w - (n * tw + (n - 1) * gap)) / 2;
  if (dib) todos.forEach(([hu, esBB], i) => {
    const tx = x0 + i * (tw + gap), R = 16 * u, acento = esBB ? '#F4C542' : P.a, ih = tw * 1.22;
    ctx.save(); rr(ctx, tx, y, tw, th, R); ctx.fillStyle = P.o; ctx.fill(); ctx.lineWidth = 3.5 * u; ctx.strokeStyle = acento; ctx.stroke(); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + ih); g.addColorStop(0, P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(tx, y, tw, ih);
    const img = hu.img || ZZZ.imagen(hu.tipo, hu.slug); if (img) imagenEn(ctx, img, tx + (esBB ? 10 * u : 0), y + (esBB ? 10 * u : 4 * u), tw - (esBB ? 20 * u : 0), ih - (esBB ? 14 * u : 4 * u), esBB ? 'contener' : 'cubrir');
    ctx.fillStyle = acento; ctx.fillRect(tx, y + ih, tw, 3 * u); ctx.restore();
    ctx.textAlign = 'center'; textoAjustado(ctx, hu.nom, tx + tw / 2, y + ih + 18 * u, tw - 10 * u, 700, 19 * u, P.t);
    if (hu.rol) textoAjustado(ctx, hu.rol, tx + tw / 2, y + ih + 38 * u, tw - 10 * u, 600, 15 * u, P.s); ctx.textAlign = 'left';
  });
  return th;
}
const SECCIONES_HOJA = {
  discos: ['Discos', 'discos', hojaDiscos], atributos: ['Atributos', 'discos', hojaAtributos], amplis: ['Amplificadores', 'amplis', hojaAmplis],
  habilidades: ['Habilidades', 'hab', hojaHabilidades], equipo: ['Equipo', 'equipo', hojaEquipo]
};
// Dibuja columnas de paneles en una caja. columnas: [[clave, …], …]; datos: { discos, amplis, hab, equipo } (opciones de cada plantilla)
export function hojaBuild(ctx, caja, datos, columnas, { uMax = 1.5, gapCol = 22, gapPanel = 22 } = {}) {
  const P = paleta(datos.discos || {}), nC = columnas.length, cw = (caja.w - gapCol * (nC - 1)) / nC;
  ctx.save(); ctx.textBaseline = 'middle';
  columnas.forEach((col, ci) => {
    const pans = col.map(k => SECCIONES_HOJA[k]).filter(s => datos[s[1]]);
    const alto = u => pans.map(([, d, fn]) => { const h = fn(ctx, 0, 0, cw - 2 * PANEL_PAD * u, u, datos[d], P, false); return h ? PANEL_CAB * u + h + PANEL_PAD * u : 0; });
    let u = uMax; for (let i = 0; i < 40; i++) { const hs = alto(u), tot = hs.reduce((a, b) => a + b, 0) + gapPanel * (hs.filter(Boolean).length - 1); if (tot <= caja.h || u < .3) break; u *= .95; }
    const hs = alto(u), visibles = hs.filter(Boolean).length, tot = hs.reduce((a, b) => a + b, 0) + gapPanel * (visibles - 1), extra = Math.max(0, caja.h - tot) / Math.max(1, visibles);
    let y = caja.y; const x = caja.x + ci * (cw + gapCol);
    pans.forEach(([tit, d, fn], i) => {
      if (!hs[i]) return; const h = hs[i] + extra;
      panelHoja(ctx, x, y, cw, h, tit, u, P);
      fn(ctx, x + PANEL_PAD * u, y + PANEL_CAB * u + extra / 2, cw - 2 * PANEL_PAD * u, u, datos[d], P, true);
      y += h + gapPanel;
    });
  });
  ctx.restore();
}
