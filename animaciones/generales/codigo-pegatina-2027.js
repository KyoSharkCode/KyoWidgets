// Kyo Estudio · Plantilla: Pegatina del código 2027 (estilo Coral Stream)
// La pegatina cae al agua con salpicadura y burbujas; el código va con el degradado y el contorno del logo
// KYO SUMI. La aleta asoma por detrás (unida a la pegatina), late a mitad y se hunde girando.
// Con transparencia (.mov / .webm).
import { clamp, tiempo, colocar, COMUNES } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { campanita } from './coral-2027.js';
import { C, C2, pr, E, BOMB, FRE, rad, caja, pega, hud, texto, ancho, fuente, etiqueta, etiquetaAncho, icono, estallido, destello, aleta } from './tarjetas-2027.js';

const FIN = 6.6, CAE = .45, SAL = .72; // animación base de 6,6 s: cae en CAE y sale en los últimos SAL

export const pegatinaCodigo2027 = {
  id: 'pegatina-codigo-2027',
  nombre: 'Pegatina del código 2027',
  desc: 'Cae al agua con salpicadura y burbujas; el código va con el degradado y el contorno de tu logo. La aleta asoma por detrás, late a mitad y se hunde girando.',
  fps: 30,
  campos: [
    { k: 'chip', label: 'Etiqueta de arriba (vacío para quitarla)', tipo: 'texto', def: 'Código de creadora', max: 32 },
    { k: 'l1', label: 'Primera línea (opcional)', tipo: 'texto', def: 'Usa el código', max: 36 },
    { k: 'codigo', label: 'Texto grande', tipo: 'texto', def: 'KYOSUMI', max: 16 },
    { k: 'l2', label: 'Última línea (opcional)', tipo: 'texto', def: 'en la tienda de', max: 36 },
    { k: 'dest', label: 'Palabra destacada (al final)', tipo: 'texto', def: 'Fortnite', max: 20 },
    { k: 'icono', label: 'Icono de la última línea', tipo: 'chips', def: 'bolsa', opciones: [['bolsa', '🛍 Bolsa'], ['corazon', '💙 Corazón'], ['ninguno', 'Ninguno']] },
    { k: 'aleta', label: 'Aleta asomando por detrás', tipo: 'chips', def: 'si', opciones: [['si', 'Sí'], ['no', 'No']] },
    ...COMUNES.slice(5),
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5, si: 'efectos=si' },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6.6, min: 3.5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6.6, 3.5, 20),
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100, late = L / 2;
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, CAE + .05, .3 * v, -.3, 0, 11);              // cae
      whoosh(ac, out, CAE, .5, .45 * v, -.5, .5, 12);                 // salpicadura
      for (let i = 0; i < 7; i++) blup(ac, out, CAE + .04 + i * .06, 300 + i * 60, .16 * v, (i - 3) * .2); // burbujas
      if (o.aleta !== 'no') blup(ac, out, .95, 240, .2 * v, .4);      // asoma la aleta
      campanita(ac, out, .6, .09 * v);                                // destellos
      blup(ac, out, late, 520, .14 * v, 0);                           // late
      whoosh(ac, out, L - SAL, SAL, .32 * v, .3, -.3, 13);            // se hunde girando
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const L = this.duracion(o), tm = tiempo(t, L, 1.75, FIN - SAL, FIN, SAL);
    let u = (fmt === 'vertical' ? 1.36 : 1) * (Number(o.tam) || 1);
    const chip = (o.chip || '').toUpperCase(), cod = o.codigo || '', l1 = o.l1 || '', l2 = o.l2 || '', dest = o.dest || '', ic = o.icono === 'ninguno' ? '' : (o.icono || 'bolsa');
    const medir = u => {
      const f = { l1: `600 ${30 * u}px ${FRE}`, cod: `400 ${104 * u}px ${BOMB}`, l2: `600 ${26 * u}px ${FRE}`, dest: `700 ${26 * u}px ${FRE}` };
      const finW = (l2 ? ancho(ctx, l2 + ' ', f.l2) : 0) + (dest ? ancho(ctx, dest, f.dest) : 0) + (ic && (l2 || dest) ? 36 * u : 0);
      const w = Math.max(560 * u, ancho(ctx, cod, f.cod, 4 * u) + 130 * u, l1 ? ancho(ctx, l1, f.l1) + 100 * u : 0, finW + 100 * u, chip ? etiquetaAncho(ctx, chip, { tam: 17 * u }) + 100 * u : 0);
      const h = 30 * u + (chip ? 46 * u : 0) + (l1 ? 46 * u : 0) + 104 * u + (l2 || dest ? 48 * u : 0) + 28 * u;
      return { f, finW, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, finW, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 60 * u), x = pos.x, y = pos.y, cx = x + w / 2, cy = y + h / 2;
    // caída, rebote al tocar el agua, latido a mitad y salida girando
    const cae = E.in(pr(tm, 0, CAE)), reb = pr(tm, CAE, CAE + .5), sal = E.in(pr(tm, FIN - SAL, FIN));
    if (tm <= 0 || sal >= 1) return;
    const dy = (1 - cae) * -(y + h + 80 * u) + sal * 180 * u;
    const sq = tm > CAE ? 1 - .14 * Math.sin(Math.PI * reb) * (1 - reb) : 1;
    const late = 1 + .05 * Math.sin(Math.PI * pr(tm, (1.75 + FIN - SAL) / 2 - .25, (1.75 + FIN - SAL) / 2 + .25));
    // salpicadura (onda en el agua y burbujas) debajo de la pegatina
    if (tm > CAE && sal <= 0) {
      const d = tm - CAE; ctx.save(); ctx.globalAlpha = clamp(1 - d * 1.3, 0, 1); ctx.strokeStyle = C.bioluz; ctx.lineWidth = 6 * u;
      ctx.beginPath(); ctx.ellipse(cx, y + h + 10 * u, w * .31 + d * 360 * u, (26 + d * 40) * u, 0, 0, 7); ctx.stroke(); ctx.restore();
      estallido(ctx, cx, y + h, tm, CAE, 16, 330 * u, 9, u);
    }
    ctx.save(); ctx.globalAlpha = 1 - sal;
    ctx.translate(cx, cy + dy + h / 2); ctx.rotate(rad(-3) + sal * 1.2); ctx.scale((2 - sq) * late * (1 - sal * .6), sq * late * (1 - sal * .6)); ctx.translate(-cx, -(cy + h / 2));
    // la aleta asoma por detrás: su base siempre queda escondida tras la pegatina
    if (o.aleta !== 'no') { const asoma = E.back(pr(tm, .9, 1.4)); if (asoma > 0) aleta(ctx, x + w - 130 * u, y + 150 * u - asoma * 110 * u, 130 * u, 1, .1); }
    pega(ctx, caja(x, y, w, h, 40 * u), { ring: 8 * u, out: 7 * u, drop: 14 * u });
    hud(ctx, x, y, w, h, 34 * u, 5 * u, 14 * u);
    let yy = y + 30 * u;
    if (chip) { etiqueta(ctx, chip, cx, yy + 22 * u, { al: 'center', tam: 17 * u }); yy += 46 * u; }
    if (l1) { texto(ctx, l1, cx, yy + 22 * u, f.l1, { al: 'center', col: C.espuma }); yy += 46 * u; }
    // el código con el degradado, el borde blanco y el contorno abisal del logo
    { const ky = yy + 52 * u; ctx.save(); fuente(ctx, f.cod, 4 * u); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const g = ctx.createLinearGradient(0, ky - 50 * u, 0, ky + 46 * u); g.addColorStop(0, '#2F6FD0'); g.addColorStop(.3, C.aleta); g.addColorStop(1, C2.azul);
      ctx.lineWidth = 30 * u; ctx.strokeStyle = C.abisal; ctx.strokeText(cod, cx, ky); ctx.lineWidth = 14 * u; ctx.strokeStyle = '#fff'; ctx.strokeText(cod, cx, ky);
      ctx.fillStyle = g; ctx.fillText(cod, cx, ky); ctx.restore(); yy += 104 * u; }
    // última línea: icono + texto + palabra destacada
    if (l2 || dest) {
      const ly = yy + 24 * u; let lx = cx - finW / 2;
      if (ic) { icono(ctx, ic, lx, ly - 12 * u, 24 * u, ic === 'corazon' ? C.coralP : C.bioluz, 2.2); lx += 36 * u; }
      if (l2) { texto(ctx, l2 + ' ', lx, ly + u, f.l2, { col: C.perla }); lx += ancho(ctx, l2 + ' ', f.l2); }
      if (dest) texto(ctx, dest, lx, ly + u, f.dest, { col: C.bioluz });
    }
    ctx.restore();
    // destellos alrededor
    [[-.56, -.41, 34, C.perla, .5], [.53, -.52, 24, C.bioluz, .7], [.59, .31, 20, C.perla, 1.1], [-.52, .41, 18, C.bioluz, 1.4]].forEach(([fx, fy, s, col, ph]) =>
      destello(ctx, cx + fx * w, cy + dy + fy * h, s * u, col, (1 - sal) * pr(tm, .5, .9) * (.5 + .5 * Math.sin(t * 4 + ph * 5)), t + ph));
  }
};
