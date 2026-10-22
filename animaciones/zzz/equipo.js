// Kyo Estudio · Plantilla ZZZ: Equipo
import * as K from '../kit-dibujado.js';
import * as ZZZ from '../zzz.js';
import { rad, lerp, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, imagenEn, fuenteQueCabe } from '../base/utilidades.js';
import { AC } from '../base/acabado.js';
import { CORAZON, ESTRELLA, icono } from '../base/iconos.js';
import { pegatina, destello, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { limpio } from './comun.js';

// 14 · Equipo (ZZZ): 3 agentes + 1 bangboo, desde el repo de assets o con imágenes propias
const ROLES_ZZZ = ['DPS principal', 'Sub-DPS', 'Aturdimiento', 'Apoyo', 'Anomalía', 'Defensa', 'Ruptura'];
// Huecos del equipo: imagen propia (prioridad) o la del repo; nombre propio o el del repo
export function huecosEquipo(o) {
  const ag = ['1', '2', '3'].map(n => ({ slug: limpio(o['a' + n]), img: o['a' + n + 'img'], nom: limpio(o['a' + n + 'nom']), rol: limpio(o['a' + n + 'rol']), tipo: 'retrato' }))
    .filter(h => h.slug || h.img || h.nom).map(h => Object.assign(h, { nom: h.nom || (h.slug ? ZZZ.nombreDe(h.slug) : '') }));
  const b = { slug: limpio(o.bb), img: o.bbimg, nom: limpio(o.bbnom), rol: 'Bangboo', tipo: 'bangboo' };
  if (!b.nom && b.slug) b.nom = ZZZ.nombreDe(b.slug);
  return { ag, bb: (b.slug || b.img || b.nom) ? b : null };
}
const imgHueco = h => h.img || ZZZ.imagen(h.tipo, h.slug);
function tiemposEquipo(o) {
  const { ag, bb } = huecosEquipo(o), ts = ag.map((_, i) => .75 + i * .28), tb = (ts.length ? ts[ts.length - 1] : .5) + .4;
  const intro = (bb ? tb : (ts.length ? ts[ts.length - 1] : .5)) + .9, fin = intro + 1.2 + .7;
  return { ts, tb, intro, fin, minimo: o.salida === 'no' ? intro + .3 : fin };
}
export const equipoZZZ = {
  id: 'equipo-zzz',
  grupo: 'zzz',
  nombre: 'Equipo (ZZZ)',
  desc: 'Tres agentes y un bangboo en tarjetas que caen una a una. Elige cada uno del repo de assets o sube tu imagen; el rol y el nombre los escribes tú.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 70,
  campos: [
    { k: 'titulo', label: 'Etiqueta', tipo: 'texto', def: 'Equipo recomendado', max: 30 },
    { k: 'equipo', label: 'Nombre del equipo (opcional)', tipo: 'texto', def: 'Equipo de Hielo', max: 28 },
    ...['1', '2', '3'].flatMap((n, i) => [
      { k: 'a' + n, label: 'Agente ' + n + ' (del repo)', tipo: 'lista', def: ['ellen', 'lycaon', 'soukaku'][i], vacio: 'Ninguno', cargar: () => ZZZ.lista('retrato') },
      { k: 'a' + n + 'img', label: '…o su imagen (tiene prioridad)', tipo: 'imagen' },
      { k: 'a' + n + 'nom', label: 'Nombre (vacío = el del repo)', tipo: 'texto', def: '', max: 20 },
      { k: 'a' + n + 'rol', label: 'Rol (opcional)', tipo: 'elegir', def: ['DPS principal', 'Aturdimiento', 'Apoyo'][i], max: 18, opciones: ROLES_ZZZ }
    ]),
    { k: 'bb', label: 'Bangboo (del repo)', tipo: 'lista', def: 'sharkboo', vacio: 'Sin bangboo', cargar: () => ZZZ.lista('bangboo') },
    { k: 'bbimg', label: '…o su imagen (tiene prioridad)', tipo: 'imagen' },
    { k: 'bbnom', label: 'Nombre del bangboo (vacío = el del repo)', tipo: 'texto', def: '', max: 20 },
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    ...conDef(COMUNES, { posv: 'centro', posh: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1 }
  ],
  preparar: o => { const { ag, bb } = huecosEquipo(o); return Promise.all([...ag, ...(bb ? [bb] : [])].filter(h => !h.img).map(h => ZZZ.cargar(h.tipo, h.slug))); },
  duracion: o => Math.max(tiemposEquipo(o).minimo, clamp(Number(o.dur) || 6, 3, 30)),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), T = tiemposEquipo(o), quieto = o.salida === 'no', vert = fmt === 'vertical';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    const { ag, bb } = huecosEquipo(o), bbEnFila = !!bb && !vert; // en vertical el bangboo va en una franja debajo
    let u = (vert ? 1.3 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3 * uu, eq: `400 ${54 * uu}px "Cherry Bomb One"` };
      const tit = limpio(o.titulo).toUpperCase(), eq = limpio(o.equipo);
      const chipW = tit ? ancho(ctx, tit, f.chip, f.chipE) + 32 * uu : 0, eqW = eq ? ancho(ctx, eq, f.eq) + 10 * uu : 0;
      const cw = 210 * uu, ch = 280 * uu, gap = 24 * uu, n = ag.length + (bbEnFila ? 1 : 0);
      const filaW = n ? n * cw + (n - 1) * gap : 0, bbH = bb && !bbEnFila ? 130 * uu : 0;
      const pad = 34 * uu, headH = (tit ? 46 * uu : 0) + (eq ? 70 * uu : 0);
      const w = Math.max(chipW, eqW, filaW, 420 * uu) + 2 * pad;
      const h = pad + headH + (headH ? 26 * uu : 0) + (n ? ch + 14 * uu : 0) + (bbH ? bbH + (n ? 18 * uu : 0) : 0) + pad;
      return { f, tit, eq, chipW, cw, ch, gap, n, filaW, bbH, pad, headH, w, h };
    };
    let m = medir(u); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medir(u); }
    const { f, pad, w, h, cw, ch } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + w / 2, pos.y + h / 2, u, .6);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad, cwid = w - 2 * pad;
    let y = pos.y + pad;
    // --- cabecera ---
    if (m.tit) {
      const a = kf(tm, [[.3, { y: 14, a: 0 }], [.6, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; const x = x0 + (cwid - m.chipW) / 2;
      rr(ctx, x, y + a.y * u, m.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.tit, x + 16 * u, y + 18 * u + a.y * u); ctx.restore();
      y += 46 * u;
    }
    if (m.eq) {
      const a = kf(tm, [[.45, { s: .6, a: 0 }], [.8, { s: 1.08, a: 1 }], [.95, { s: 1, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(x0 + cwid / 2, y + 34 * u); ctx.scale(a.s, a.s); fuente(ctx, f.eq); ctx.textAlign = 'center';
      ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.strokeText(m.eq, 0, 0); ctx.fillText(m.eq, 0, 0); ctx.restore();
      y += 70 * u;
    }
    if (m.headH) y += 26 * u;
    // --- tarjeta de cada miembro: cae, rebota y queda un poco inclinada ---
    const tarjetaMiembro = (hu, x, yy, ti, i, esBB) => {
      const r0 = [-2.5, 1.8, -1.6, 2.2][i % 4];
      const k = AC && AC.k.muelle && tm < FIN - .75
        ? (p => ({ y: lerp(-90, 0, p), r: lerp(r0 * 5, r0, p), s: lerp(.6, 1, p), a: clamp((tm - ti) / .1, 0, 1) }))(tm <= ti ? 0 : K.resorte(tm, ti, { frec: 2, amort: 6.5 }))
        : kf(tm, [[ti, { y: -90, r: r0 * 5, s: .6, a: 0 }], [ti + .32, { y: 6, r: -r0, s: 1.04, a: 1 }], [ti + .5, { y: 0, r: r0, s: 1, a: 1 }]], EASE.back);
      if (k.a <= .001) return;
      const cx = x + cw / 2, cy = yy + ch / 2, R = 24 * u, acento = esBB ? '#F4C542' : P.a;
      ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1);
      ctx.translate(cx, cy + k.y * u); ctx.rotate(rad(k.r)); ctx.scale(k.s, k.s); ctx.translate(-cx, -cy);
      pegatina(ctx, x, yy, cw, ch, R, { fill: P.o, p: acento, o: P.o, ring: 6 * u, out: 5 * u, drop: 10 * u, suave: false });
      ctx.save(); rr(ctx, x, yy, cw, ch, R); ctx.clip();
      const g = ctx.createLinearGradient(0, yy, 0, yy + ch); g.addColorStop(0, P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(x, yy, cw, ch);
      const img = imgHueco(hu), bandaH = 62 * u;
      if (img) { if (esBB) imagenEn(ctx, img, x + 14 * u, yy + 30 * u, cw - 28 * u, ch - bandaH - 36 * u, 'contener'); else imagenEn(ctx, img, x, yy + 8 * u, cw, ch - bandaH + 4 * u, 'cubrir'); }
      else icono(ctx, esBB ? CORAZON : ESTRELLA, cx - 40 * u, yy + (ch - bandaH) / 2 - 40 * u, 80 * u, 'rgba(255,255,255,.25)');
      // brillo que cruza la tarjeta al aterrizar
      const sh = kf(tm, [[ti + .45, { x: -.6 }], [ti + 1.05, { x: 1.5 }]], EASE.io);
      if (sh.x > -.6 && sh.x < 1.5) {
        const bx = x + sh.x * cw, bw = .4 * cw; ctx.save(); ctx.translate(bx, cy); ctx.transform(1, 0, Math.tan(rad(-20)), 1, 0, 0);
        const gb = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(.5, 'rgba(255,255,255,.45)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gb; ctx.fillRect(-bw / 2, -ch, bw, ch * 2); ctx.restore();
      }
      // banda con el nombre
      ctx.fillStyle = P.o; ctx.fillRect(x, yy + ch - bandaH, cw, bandaH);
      ctx.fillStyle = acento; ctx.fillRect(x, yy + ch - bandaH, cw, 4 * u);
      if (hu.nom) { fuenteQueCabe(ctx, hu.nom, 700, 30 * u, 'Fredoka', cw - 24 * u); ctx.fillStyle = P.t; ctx.textAlign = 'center'; ctx.fillText(hu.nom, cx, yy + ch - bandaH / 2 + 2 * u); ctx.textAlign = 'left'; }
      ctx.restore();
      // rol: chip encima del borde superior
      if (hu.rol) {
        const tam = fuenteQueCabe(ctx, hu.rol.toUpperCase(), 700, 17 * u, 'Chakra Petch', cw - 40 * u), rw = ctx.measureText(hu.rol.toUpperCase()).width + 26 * u, rh = 32 * u;
        const rx = cx - rw / 2, ry = yy - rh / 2 - 2 * u;
        rr(ctx, rx - 4 * u, ry - 4 * u, rw + 8 * u, rh + 8 * u, rh / 2 + 4 * u); ctx.fillStyle = P.o; ctx.fill();
        rr(ctx, rx, ry, rw, rh, rh / 2); ctx.fillStyle = acento; ctx.fill();
        ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(hu.rol.toUpperCase(), cx, ry + rh / 2 + 1 * u); ctx.textAlign = 'left';
        void tam;
      }
      ctx.restore();
      const d = kf(tm, [[ti + .25, { s: 0, r: 0, a: 0 }], [ti + .45, { s: 1.2, r: 60, a: 1 }], [ti + .95, { s: 0, r: 140, a: 0 }]]);
      destello(ctx, x + cw - 6 * u, yy + 10 * u, 46 * u, esBB ? '#ffffff' : '#F4C542', d.s, d.r, d.a);
    };
    if (m.n) {
      const fx = x0 + (cwid - m.filaW) / 2, fy = y + 14 * u;
      ag.forEach((hu, i) => tarjetaMiembro(hu, fx + i * (cw + m.gap), fy, T.ts[i], i, false));
      if (bbEnFila) tarjetaMiembro(bb, fx + ag.length * (cw + m.gap), fy, T.tb, ag.length, true);
      y = fy + ch + (m.bbH ? 18 * u : 0);
    }
    // --- vertical: franja del bangboo debajo de los agentes ---
    if (m.bbH) {
      const ti = T.tb, k = kf(tm, [[ti, { x: -40, a: 0, s: .85 }], [ti + .38, { x: 0, a: 1, s: 1 }]], EASE.back);
      if (k.a > .001) {
        const bh = m.bbH, cyb = y + bh / 2, D = bh - 16 * u, salto = Math.abs(Math.sin(clamp((tm - ti - .3) / .7, 0, 1) * Math.PI * 2)) * 14 * u * (1 - clamp((tm - ti - .3) / .7, 0, 1));
        ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(x0 + k.x * u, cyb); ctx.scale(k.s, k.s); ctx.translate(-x0, -cyb);
        rr(ctx, x0, y, cwid, bh, 26 * u); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = '#F4C542'; ctx.stroke();
        const img = imgHueco(bb);
        if (img) imagenEn(ctx, img, x0 + 18 * u, y + 8 * u - salto, D, D, 'contener'); else icono(ctx, CORAZON, x0 + 18 * u + D * .2, y + 8 * u + D * .2, D * .6, 'rgba(255,255,255,.25)');
        const tx = x0 + 18 * u + D + 22 * u, cb = 'BANGBOO'; fuente(ctx, `700 ${17 * u}px "Chakra Petch"`, 3 * u); const bw = ctx.measureText(cb).width + 26 * u;
        rr(ctx, tx, cyb - 40 * u, bw, 30 * u, 15 * u); ctx.fillStyle = '#F4C542'; ctx.fill(); ctx.fillStyle = P.o; ctx.fillText(cb, tx + 13 * u, cyb - 24 * u);
        if (bb.nom) { fuenteQueCabe(ctx, bb.nom, 700, 38 * u, 'Fredoka', cwid - (tx - x0) - 20 * u); ctx.fillStyle = P.t; ctx.fillText(bb.nom, tx, cyb + 20 * u); }
        ctx.restore();
      }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
