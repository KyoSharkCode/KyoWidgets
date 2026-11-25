// Kyo Estudio · Plantilla: Transición 2027 (stinger de OBS, estilo Coral Stream)
// La misma ola de la intro sube y tapa la pantalla, el isotipo (aleta + mar) aparece en el centro con un
// rebote y, cuando el agua baja, ya se ve la otra escena. Fondo transparente: .mov (ProRes 4444) o .webm.
// En OBS: transición «Stinger» con el archivo y el punto de transición en PUNTO_MS (la pantalla está tapada).
// Se dibuja al tamaño real (horizontal 1920×1080 o vertical 1080×1920).
import { clamp, azar } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { C, pr, E, ISOTIPO, ISOTIPO_C, pintar, campanita } from './coral-2027.js';

const L = 1.7, SUBE = .55, BAJA = 1.05;
export const PUNTO_MS = 600; // a partir de aquí la pantalla está tapada del todo: OBS cambia de escena

// nivel del agua: sube hasta tapar (1,15 deja las crestas fuera), se queda y baja
const nivel = t => t < SUBE ? E.io(pr(t, 0, SUBE)) * 1.15 : t < BAJA ? 1.15 : 1.15 * (1 - E.io(pr(t, BAJA, L)));
function ola(t, n, W, H) {
  const y0 = H * (1 - n), p = new Path2D(); p.moveTo(-20, H + 20); p.lineTo(-20, y0);
  for (let x = -20; x <= W + 20; x += 24) p.lineTo(x, y0 + Math.sin(x * .006 + t * 5) * H * .028 + Math.sin(x * .017 - t * 3) * H * .01);
  p.lineTo(W + 20, H + 20); p.closePath(); return p;
}
const degr = new WeakMap();
function relleno(ctx, H) {
  let g = degr.get(ctx); if (g && g.H === H) return g.g;
  const lg = ctx.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, C.bioluz); lg.addColorStop(.35, C.aleta); lg.addColorStop(1, '#152264');
  degr.set(ctx, { H, g: lg }); return lg;
}

export const transicion2027 = {
  id: 'transicion-2027',
  nombre: 'Transición 2027 · Stinger de OBS',
  desc: 'La ola de la intro sube, aparece tu aleta y al bajar ya estás en la otra escena. Fondo transparente: descárgala en .mov o en .webm. En OBS: transición «Stinger», punto de transición ' + PUNTO_MS + ' ms.',
  fps: 30,
  formatos: ['horizontal', 'vertical'],
  fotoMomento: 45,
  campos: [
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🌊 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 }
  ],
  duracion: () => L,
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, SUBE + .05, .85 * v, -.4, .4, 3);           // sube el agua
      const r = azar(17);
      for (let k = 0; k < 8; k++) blup(ac, out, .2 + r() * .45, 300 + r() * 500, .14 * v, r() * 1.4 - .7); // burbujas
      blup(ac, out, .45, 520, .4 * v, 0);                            // aparece la aleta
      campanita(ac, out, .55, .08 * v);
      whoosh(ac, out, BAJA - .05, L - BAJA + .05, .8 * v, .4, -.4, 7); // baja el agua
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const n = nivel(t);
    if (n <= 0) return; // transparente: se ve la escena de antes (al empezar) o la nueva (al terminar)
    const p = ola(t, n, W, H);
    ctx.save();
    ctx.fillStyle = relleno(ctx, H); ctx.fill(p);
    // burbujas que suben dentro del agua
    ctx.save(); ctx.clip(p); ctx.strokeStyle = 'rgba(201,230,242,.85)'; ctx.lineWidth = 4;
    const r = azar(5), k = Math.max(W, H) / 1920;
    for (let i = 0; i < 22; i++) { const bx = r() * W, sp = .6 + r(), off = r() * H, br = (8 + r() * 20) * k; const by = H - ((t * 260 * sp * k + off) % (H + 80)); ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    // borde pegatina de la ola
    ctx.lineJoin = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = C.abisal; ctx.stroke(p); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke(p);
    // el isotipo aparece con rebote mientras todo está tapado y se va antes de que baje el agua
    const ki = pr(t, .4, .8), ko = pr(t, 1.0, 1.25);
    if (ki > 0 && ko < 1) {
      const s = E.back(ki) * (1 - ko * .4) * (fmt === 'vertical' ? 1.25 : 1.02);
      ctx.save(); ctx.globalAlpha = 1 - ko;
      ctx.translate(W / 2, H / 2 - 20 * k); ctx.rotate((1 - ki) * -.12); ctx.scale(s, s); ctx.translate(-ISOTIPO_C[0], -ISOTIPO_C[1]);
      ISOTIPO.forEach(c => pintar(ctx, c));
      ctx.restore();
    }
    ctx.restore();
  }
};
