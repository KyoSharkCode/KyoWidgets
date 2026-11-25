// Kyo Estudio · Plantilla: Intro 2027 "Aleta al acecho" (estilo Coral Stream)
// Va entre el hook y el vídeo: el agua sube tapando el hook, una aleta cruza la superficie
// nadando hacia la izquierda (el borde curvo es el frente; la punta mira atrás, como en el logo),
// se sumerge y sale disparada convertida en la aleta del logo; KYO SUMI rebota letra a letra
// y el agua se retira dejando el fondo transparente para enlazar con el vídeo (.mov / .webm).
// Se dibuja en un espacio de 1920×1080 y se escala al tamaño real. Las piezas comunes con el outro
// (logo, agua, fondo, píldora, campanita) están en coral-2027.js.
import { clamp, azar } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { W, H, C, pr, E, FIN, FIN_BB, LETRAS, ADORNOS, ORDEN, LOGO_C, pintar, enPieza, pintarLetras, caminoOla, bordeOla, fondoMar, burbujas, superficie, aletaNadando, chip, campanita } from './coral-2027.js';

const BASE = 7.5, SALIDA = 6.4, LOGO_S = 1.12;
const nivelAgua = tm => tm < .95 ? E.io(pr(tm, 0, .95)) * 1.12 : tm < SALIDA ? 1.12 : 1.12 * (1 - E.io(pr(tm, SALIDA, BASE - .05)));

function coralesPixel(ctx, tm) {
  const rnd = azar(7), P = 18, cols = [C.coral, C.coralP, C.indigo, C.aleta, C.menta];
  ctx.fillStyle = C.abisal; for (let x = 0; x < W; x += P) { const h = P * (3 + Math.floor(rnd() * 3)); ctx.fillRect(x, H - h, P, h); }
  let i = 0;
  for (let x = P * 2; x < W; x += P * (5 + Math.floor(rnd() * 6))) {
    const col = cols[Math.floor(rnd() * cols.length)], len = 4 + Math.floor(rnd() * 7), x0 = x - x % P;
    const crec = E.back(pr(tm, 3.55 + i * .025, 4 + i * .025)); i++;
    const n = Math.round(len * clamp(crec, 0, 1.3)); ctx.fillStyle = col;
    // cada coral nace en el borde inferior
    for (let k = 0; k < n; k++) { ctx.fillRect(x0, H - P - k * P, P, P); if (rnd() < .3) { const d = rnd() < .5 ? -1 : 1; for (let j = 1; j <= 2; j++) ctx.fillRect(x0 + d * j * P, H - P - k * P - j * P, P, P); } }
  }
}

// ---------- la escena bajo el agua ----------
function escena(ctx, t, tm, o) {
  fondoMar(ctx, t); burbujas(ctx, t);
  const sup = 1 - E.in(pr(tm, 2.5, 3.1)), ySup = H * .5 + (1 - sup) * H * .6;
  if (tm < 3.2) {
    // aleta que nada hacia la izquierda con la base dentro del agua; luego la superficie interior
    // con borde pegatina (baja y desaparece cuando sale el logo)
    const olaEn = superficie(ctx, t, ySup, 0);
    const fx = W + 260 - E.io(pr(tm, .95, 2.55)) * W * .95, hund = E.in(pr(tm, 2.35, 2.75));
    aletaNadando(ctx, t, olaEn, fx, -1, .75, hund);
    superficie(ctx, t, ySup, sup);
  }
  // estallido de burbujas cuando sale la aleta del logo
  if (tm > 2.75 && tm < 4) {
    const k = pr(tm, 2.75, 3.8), rnd = azar(11); ctx.save(); ctx.strokeStyle = 'rgba(201,230,242,.9)'; ctx.lineWidth = 5; ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 26; i++) { const ang = rnd() * Math.PI * 2, d = (80 + rnd() * 420) * E.out(k), r = 10 + rnd() * 24; ctx.beginPath(); ctx.arc(W / 2 + Math.cos(ang) * d, H * .5 + Math.sin(ang) * d * .6 - k * 120, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  coralesPixel(ctx, tm);
  // logo: la aleta sube, las letras rebotan, las colas de la Y y la S se menean
  const flot = Math.sin(t * 2.2) * 8;
  ctx.save(); ctx.translate(W / 2, H * .44 + flot); ctx.scale(LOGO_S, LOGO_S); ctx.translate(-LOGO_C[0], -LOGO_C[1]);
  const kF = pr(tm, 2.85, 3.45);
  enPieza(ctx, FIN_BB, tm < 2.85 ? null : { s: 1, dy: (1 - E.back(kF)) * 700, a: clamp(kF * 3, 0, 1) }, () => FIN.forEach(c => pintar(ctx, c)));
  const trLetra = l => {
    const i = ORDEN[l.n], a0 = 3.3 + i * .1, k = pr(tm, a0, a0 + .42); if (k <= 0) return null;
    const meneo = (l.n === 'Y' || l.n === 'S') && tm > 4.3 ? Math.sin((tm - 4.3) * 7) * .06 * Math.max(.25, 1 - (tm - 4.3) / 2.2) : 0;
    return { s: E.back(k), dy: (1 - E.out(k)) * -60, r: meneo };
  };
  const trs = LETRAS.map(trLetra);
  pintarLetras(ctx, trs);
  ADORNOS.forEach((a, i) => { const k = pr(tm, 4.35 + i * .06, 4.75 + i * .06); enPieza(ctx, a.bb, k > 0 ? { s: E.back(k) * (1 + Math.sin(t * 5 + i) * .06) } : null, () => a.capas.forEach(c => pintar(ctx, c))); });
  ctx.restore();
  const kc = pr(tm, 4.8, 5.25); chip(ctx, o.usuario, W / 2, H * .44 + flot + LOGO_S * 330, kc, (1 - E.back(kc)) * 40);
}

export const intro2027 = {
  id: 'intro-2027',
  nombre: 'Intro 2027 · Aleta al acecho',
  desc: 'Intro de YouTube con el estilo nuevo, para poner entre el hook y el vídeo: el agua tapa el hook, una aleta cruza y se convierte en el logo KYO SUMI, y el agua se retira dejando el fondo transparente para enlazar con el vídeo. Con efectos de sonido propios.',
  fps: 30,
  formatos: ['horizontal'],
  fotoMomento: 72,
  campos: [
    { k: 'usuario', label: 'Texto de la píldora (vacío para quitarla)', tipo: 'texto', def: '@KyoSumiVT', max: 24 },
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🌊 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 80, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7.5, min: 6.5, max: 10, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || BASE, 6.5, 10),
  // tiempo de la animación base (7,5 s): el logo quieto se alarga o se acorta según la duración
  _tm(t, L) { if (t <= 5.3) return t; const ini = L - (BASE - SALIDA); if (t >= ini) return SALIDA + (t - ini); return 5.3 + (t - 5.3) * (SALIDA - 5.3) / Math.max(.01, ini - 5.3); },
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 80, 5, 100) / 100, salida = L - (BASE - SALIDA);
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, .95, .9 * v, -.4, .4, 3);                     // sube el agua
      whoosh(ac, out, 1.0, 1.5, .35 * v, .8, -.8, 5);                   // la aleta cruza (de derecha a izquierda)
      for (let k = 0; k < 6; k++) blup(ac, out, 1.1 + k * .24, 220 + k * 18, .12 * v, .7 - k * .28); // chapoteo
      whoosh(ac, out, 2.3, .45, .45 * v, -.6, -.2, 7);                  // se sumerge
      const r = azar(13);
      for (let k = 0; k < 14; k++) blup(ac, out, 2.8 + r() * .5, 380 + r() * 520, .22 * v, r() * 1.4 - .7); // estallido de burbujas
      whoosh(ac, out, 2.85, .6, .7 * v, 0, 0, 9);                        // la aleta sale disparada
      for (let i = 0; i < 7; i++) blup(ac, out, 3.3 + i * .1, 520 + i * 60, .45 * v, (i - 3) * .15); // pop de cada letra
      campanita(ac, out, 4.4, .12 * v);                                  // destellos
      blup(ac, out, 4.85, 640, .35 * v, 0);                              // píldora
      whoosh(ac, out, salida, BASE - SALIDA, .95 * v, .3, -.3, 11);      // el agua se retira
      for (let k = 0; k < 8; k++) blup(ac, out, salida + .1 + k * .09, 260 + k * 40, .15 * v, k % 2 ? .5 : -.5);
    });
  },
  dibujar(ctx, t, o, fmt, Wr, Hr) {
    const L = this.duracion(o), tm = this._tm(t, L), n = nivelAgua(tm);
    if (n <= 0) return; // transparente: aquí se ve el hook (inicio) o el vídeo (final)
    ctx.save(); ctx.scale(Wr / W, Hr / H);
    const ola = caminoOla(t, n);
    ctx.save(); ctx.clip(ola);
    if (tm > SALIDA) ctx.translate(0, (1.12 - n) * H * .5); // todo baja con el agua al retirarse
    escena(ctx, t, tm, o);
    ctx.restore();
    bordeOla(ctx, ola);
    ctx.restore();
  }
};
