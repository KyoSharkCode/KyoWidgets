// Kyo Estudio · Plantilla: Transición "Marea"
import * as K from '../kit-dibujado.js';
import { rad, lerp, clamp, EASE, kf, fuente, paleta, azar, COLORES } from '../base/utilidades.js';
import { AC, popResorte, golpeEn } from '../base/acabado.js';
import { ALETA } from '../base/iconos.js';
import { avatar } from '../base/piezas.js';
import { whoosh, blup, renderSonido } from '../base/sonido.js';

// Onda con borde "pegatina" (contorno oscuro + blanco) en un espacio virtual donde la ola avanza hacia +x
function bordeOla(y, e, A, Hv, fase, t) { return e + A * Math.sin(y / Hv * Math.PI * 2 * 1.3 + fase + t * 3) + A * .45 * Math.sin(y / Hv * Math.PI * 2 * 3.1 + fase * 2 - t * 4); }
function caminoOla(Hv, frente, atras, A, fase, t) {
  const p = new Path2D(), paso = Hv / 48;
  p.moveTo(atras === null ? -9999 : bordeOla(-20, atras, A, Hv, fase + 1.7, t), -20);
  for (let y = -20; y <= Hv + 20; y += paso) p.lineTo(bordeOla(y, frente, A, Hv, fase, t), y);
  if (atras === null) { p.lineTo(-9999, Hv + 20); }
  else for (let y = Hv + 20; y >= -20; y -= paso) p.lineTo(bordeOla(y, atras, A, Hv, fase + 1.7, t), y);
  p.closePath(); return p;
}
function lineaOla(Hv, e, A, fase, t) {
  const p = new Path2D(), paso = Hv / 48;
  for (let y = -20; y <= Hv + 20; y += paso) y === -20 ? p.moveTo(bordeOla(y, e, A, Hv, fase, t), y) : p.lineTo(bordeOla(y, e, A, Hv, fase, t), y);
  return p;
}
// 7 · Transición "Marea" (con sonido)
export const transicion = {
  id: 'transicion',
  fotoMomento: 50, // % de la duración para la imagen PNG por defecto
  nombre: 'Transición Marea (con sonido)',
  desc: 'Olas que tapan toda la pantalla y se retiran. Ponla encima del corte en Premiere: a mitad de la transición la pantalla queda cubierta.',
  fps: 30,
  campos: [
    { k: 'dir', label: 'Dirección', tipo: 'chips', def: 'izq', opciones: [['izq', '➡ Izquierda a derecha'], ['der', '⬅ Derecha a izquierda'], ['abajo', '⬆ De abajo arriba'], ['arriba', '⬇ De arriba abajo']] },
    { k: 'texto', label: 'Texto en el momento tapado (opcional)', tipo: 'texto', def: '', max: 22 },
    { k: 'imagen', label: 'Tu logo o avatar (opcional)', tipo: 'imagen' },
    { k: 'burbujas', label: 'Burbujas', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    ...COLORES,
    { k: 'sonido', label: 'Sonido', tipo: 'chips', def: 'ambas', opciones: [['ambas', '🌊🫧 Ola + burbujas'], ['ola', '🌊 Solo ola'], ['burbujas', '🫧 Solo burbujas'], ['ninguno', '🔇 Sin sonido']] },
    { k: 'vol', label: 'Volumen del sonido (%)', tipo: 'numero', def: 60, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 1.6, min: 1.5, max: 5, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 1.6, 1.5, 5),
  // momentos clave (en segundos) para dibujo y sonido
  _t(L) { const E = .55, D = .09, sal = L - .75; return { E, D, cubre: 2 * D + E, sal }; },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), { E, D, sal } = this._t(L);
    const vertDir = o.dir === 'abajo' || o.dir === 'arriba';
    const Wv = vertDir ? H : W, Hv = vertDir ? W : H, A = Hv * .03, ext = 3.2 * A;
    const u = Math.min(W, H) / 1080;
    const T0 = ctx.getTransform();
    ctx.save();
    if (o.dir === 'der') { ctx.translate(W, 0); ctx.scale(-1, 1); }
    else if (o.dir === 'abajo') { ctx.translate(0, H); ctx.rotate(-Math.PI / 2); }
    else if (o.dir === 'arriba') { ctx.rotate(Math.PI / 2); ctx.translate(0, -W); }
    const capas = [P.a, P.a2, P.c];
    let clipOscura = null;
    capas.forEach((col, i) => {
      const pe = EASE.io(clamp((t - i * D) / E, 0, 1));
      if (pe <= 0) return;
      const ps = EASE.io(clamp((t - (sal + (2 - i) * D)) / E, 0, 1));
      if (ps >= 1) return;
      const frente = lerp(-ext, Wv + ext, pe), atras = ps > 0 ? lerp(-ext, Wv + ext, ps) : null, fase = i * 2.1;
      const cam = caminoOla(Hv, frente, atras, A, fase, t);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [[P.o, 34 * u], [P.p, 18 * u]].forEach(([c, lw]) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw;
        if (pe < 1) ctx.stroke(lineaOla(Hv, frente, A, fase, t));
        if (atras !== null) ctx.stroke(lineaOla(Hv, atras, A, fase + 1.7, t));
      });
      ctx.fillStyle = col; ctx.fill(cam);
      if (i === 2) clipOscura = cam;
    });
    // Contenido que viaja dentro de la ola oscura (burbujas, texto, logo)
    if (clipOscura) {
      ctx.save(); ctx.clip(clipOscura); ctx.setTransform(T0);
      if (o.burbujas !== 'no') {
        const r = azar(11);
        for (let b = 0; b < 26; b++) {
          const bx = r() * W, vel = .25 + r() * .35, rad0 = (8 + r() * 22) * u, y0 = r();
          const by = H * (1.05 - ((y0 + t * vel) % 1.15)) ;
          ctx.beginPath(); ctx.arc(bx + Math.sin(t * 4 + b) * 10 * u, by, rad0, 0, Math.PI * 2);
          ctx.lineWidth = 3.5 * u; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
          ctx.beginPath(); ctx.arc(bx + Math.sin(t * 4 + b) * 10 * u - rad0 * .35, by - rad0 * .35, rad0 * .22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
        }
      }
      const cx = W / 2, cy = H / 2, pop = AC && AC.k.muelle ? popResorte(t, .25, { s0: .6 }) : kf(t, [[.25, { s: .6 }], [.62, { s: 1.08 }], [.78, { s: 1 }]], EASE.back);
      const vaiven = Math.sin(t * 5) * 2;
      if (AC && (o.imagen || o.texto)) golpeEn(ctx, cx, cy, 520 * u, 360 * u, t, .37, P.a, { grosor: 26 * u, n: 18 });
      ctx.translate(cx, cy); ctx.rotate(rad(vaiven)); ctx.scale(pop.s * (pop.sx ?? 1), pop.s * (pop.sy ?? 1)); ctx.translate(-cx, -cy);
      const D2 = 240 * u, fT = `400 ${150 * u}px "Cherry Bomb One"`;
      const hayImg = !!o.imagen, hayTxt = !!o.texto;
      const tot = (hayImg ? D2 + 22 * u : 0) + (hayTxt ? 150 * u : 0);
      let y = cy - tot / 2;
      if (hayImg) { avatar(ctx, cx, y + D2 / 2 + 11 * u, D2, P, o.imagen, ALETA, u); y += D2 + 22 * u; }
      if (hayTxt) {
        fuente(ctx, fT); let s = 1; const tw = ctx.measureText(o.texto).width; if (tw > W - 160 * u) s = (W - 160 * u) / tw;
        ctx.save(); ctx.translate(cx, y + 75 * u); ctx.scale(s, s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        if (AC && AC.k.sombras) { ctx.save(); ctx.globalAlpha *= .55; ctx.fillStyle = ctx.strokeStyle = K.trama(ctx, '#000', 9); ctx.lineWidth = 26 * u; ctx.strokeText(o.texto, 14 * u, 30 * u); ctx.fillText(o.texto, 14 * u, 30 * u); ctx.restore(); }
        ctx.lineWidth = 26 * u; ctx.strokeStyle = P.o; ctx.strokeText(o.texto, 0, 6 * u);
        ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.strokeText(o.texto, 0, 0);
        ctx.fillStyle = P.a; ctx.fillText(o.texto, 0, 0); ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  },
  sonido(o) {
    if (o.sonido === 'ninguno') return Promise.resolve(null);
    const L = this.duracion(o), { E, D, sal, cubre } = this._t(L), v = clamp(Number(o.vol) || 60, 5, 100) / 100;
    const [pa, pb] = o.dir === 'izq' ? [-.9, .9] : o.dir === 'der' ? [.9, -.9] : [0, 0];
    return renderSonido(L, (ac, out) => {
      if (o.sonido !== 'burbujas') {
        whoosh(ac, out, 0, cubre + .05, 1.4 * v, pa, pb * .3, 3);
        whoosh(ac, out, sal, Math.min(L - sal, E + 2 * D), 1.1 * v, pa * .3, pb, 5);
      }
      if (o.sonido !== 'ola') {
        const r = azar(21), ini = cubre * .55, fin = Math.min(L - .2, sal + .35), n = 7;
        for (let i = 0; i < n; i++) blup(ac, out, ini + (fin - ini) * (i + r() * .6) / n, 260 + r() * 380, (.4 + r() * .25) * v, (r() * 2 - 1) * .6);
      }
    });
  }
};
