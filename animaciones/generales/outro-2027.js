// Kyo Estudio · Plantilla: Outro 2027 (estilo Coral Stream) · pantalla final de YouTube
// Pareja de la intro 2027: la misma ola sube tapando el final del vídeo, el agua baja a una franja
// abajo donde una aleta nada de lado a lado, y aparecen el logo KYO SUMI, el mensaje, la píldora con
// las redes y los huecos para los elementos de la pantalla final (1 vídeo + suscribirse).
// Empieza transparente (.mov / .webm) y termina con la pantalla final puesta. Con música y efectos propios.
import { clamp } from '../base/utilidades.js';
import { renderSonido, whoosh, blup, musicaFondo } from '../base/sonido.js';
import { W, H, C, pr, E, FIN, FIN_BB, LETRAS, ADORNOS, ORDEN, LOGO_C, pintar, enPieza, pintarLetras, caminoOla, bordeOla, fondoMar, burbujas, superficie, aletaNadando, chip, campanita } from './coral-2027.js';

// Huecos de la pantalla final (en el espacio 1920×1080): el vídeo es 16:9 y suscribirse, un círculo
export const HUECOS_2027 = { video: { x: 980, y: 130, w: 860, h: 484 }, sub: { x: 1150, y: 790, r: 110 } };
const LOGO_P = [480, 290], LOGO_S = .6, AGUA = H * .9, PASADA = 7;
const nivelAgua = t => t < .95 ? E.io(pr(t, 0, .95)) * 1.12 : 1.12;

// Texto con contorno Abisal (estilo pegatina), encogido si no cabe en el ancho
function titulo(ctx, txt, x, y, tam, maxW, s) {
  if (!txt || s <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  let f = tam; ctx.font = '400 ' + f + 'px "Cherry Bomb One", sans-serif'; ctx.letterSpacing = '0px';
  const w = ctx.measureText(txt).width; if (w > maxW) { f = tam * maxW / w; ctx.font = '400 ' + f + 'px "Cherry Bomb One", sans-serif'; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = f * .2; ctx.strokeStyle = C.abisal; ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = C.perla; ctx.fillText(txt, 0, 0); ctx.restore();
}
// Marco pegatina de un hueco (lo de dentro lo tapa el elemento de YouTube)
function marco(ctx, camino, s, cx, cy) {
  if (s <= 0.001) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  ctx.fillStyle = 'rgba(10,16,48,.85)'; ctx.fill(camino);
  ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = C.abisal; ctx.stroke(camino); ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.stroke(camino);
  ctx.restore();
}

function escena(ctx, t, o) {
  fondoMar(ctx, t); burbujas(ctx, t);
  const { video: V, sub: S } = HUECOS_2027;

  // logo: la aleta sube, las letras rebotan y, de vez en cuando, las colas de la Y y la S se menean
  const flot = Math.sin(t * 2.2) * 8;
  ctx.save(); ctx.translate(LOGO_P[0], LOGO_P[1] + flot); ctx.scale(LOGO_S, LOGO_S); ctx.translate(-LOGO_C[0], -LOGO_C[1]);
  const kF = pr(t, 1.3, 1.85);
  enPieza(ctx, FIN_BB, t < 1.3 ? null : { s: 1, dy: (1 - E.back(kF)) * 700, a: clamp(kF * 3, 0, 1) }, () => FIN.forEach(c => pintar(ctx, c)));
  const w = (t - 2.6) % 4;
  pintarLetras(ctx, LETRAS.map(l => {
    const a0 = 1.65 + ORDEN[l.n] * .08, k = pr(t, a0, a0 + .42); if (k <= 0) return null;
    const meneo = (l.n === 'Y' || l.n === 'S') && t > 2.6 ? Math.sin(w * 7) * .06 * Math.max(0, 1 - w / 1.6) : 0;
    return { s: E.back(k), dy: (1 - E.out(k)) * -60, r: meneo };
  }));
  ADORNOS.forEach((a, i) => { const k = pr(t, 2.3 + i * .06, 2.7 + i * .06); enPieza(ctx, a.bb, k > 0 ? { s: E.back(k) * (1 + Math.sin(t * 5 + i) * .06) } : null, () => a.capas.forEach(c => pintar(ctx, c))); });
  ctx.restore();

  // mensaje, píldora y redes
  titulo(ctx, o.titulo, LOGO_P[0], 612 + flot * .5, 92, 820, E.back(pr(t, 2.0, 2.45)));
  const kc = pr(t, 2.5, 2.95); chip(ctx, o.usuario, LOGO_P[0], 716, kc, (1 - E.back(kc)) * 40, C.bioluz, 42);
  const kr = pr(t, 2.75, 3.2);
  if (o.redes && kr > 0) {
    ctx.save(); ctx.globalAlpha *= kr; ctx.font = '700 28px "Chakra Petch", sans-serif'; ctx.letterSpacing = '5px';
    const txt = o.redes.toUpperCase(), mw = ctx.measureText(txt).width; if (mw > 820) ctx.font = '700 ' + (28 * 820 / mw) + 'px "Chakra Petch", sans-serif';
    ctx.fillStyle = C.espuma; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, LOGO_P[0], 800 + (1 - E.out(kr)) * 20); ctx.restore();
  }

  // huecos: vídeo (16:9) y suscribirse (círculo), con su etiqueta
  const pv = new Path2D(); pv.roundRect(V.x, V.y, V.w, V.h, 26);
  marco(ctx, pv, E.back(pr(t, 1.8, 2.3)), V.x + V.w / 2, V.y + V.h / 2);
  const ps = new Path2D(); ps.arc(S.x, S.y, S.r, 0, Math.PI * 2);
  marco(ctx, ps, E.back(pr(t, 2.0, 2.5)), S.x, S.y);
  // pulso para llamar la atención sobre suscribirse
  if (t > 3) { const q = ((t - 3) % 2.4) / 1.2; if (q < 1) { ctx.save(); ctx.globalAlpha = (1 - q) * .8; ctx.lineWidth = 6; ctx.strokeStyle = C.bioluz; ctx.beginPath(); ctx.arc(S.x, S.y, S.r + 16 + E.out(q) * 50, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
  const bob = Math.sin(t * 2.6) * 5;
  const k1 = pr(t, 2.15, 2.6); chip(ctx, o.e1, V.x + V.w / 2, V.y, k1, (1 - E.back(k1)) * 40 + bob, C.bioluz, 42);
  const k2 = pr(t, 2.35, 2.8);
  if (o.es && k2 > 0) {
    ctx.save(); ctx.font = '700 44px Fredoka, sans-serif'; ctx.letterSpacing = '0px'; const cw = ctx.measureText(o.es).width + 70 * 44 / 46; ctx.restore();
    chip(ctx, o.es, S.x + S.r + 46 + cw / 2, S.y, k2, (1 - E.back(k2)) * 40 - bob, C.coral, 44);
  }

  // agua abajo: baja de media pantalla a su franja y una aleta nada de lado a lado
  const ySup = H * .5 + E.io(pr(t, .95, 1.7)) * (AGUA - H * .5);
  const olaEn = superficie(ctx, t, ySup, 0);
  if (t > 1) {
    const tf = t - 1, vuelta = Math.floor(tf / PASADA), u = (tf % PASADA) / PASADA, dir = vuelta % 2 ? 1 : -1;
    const fx = dir < 0 ? W + 260 - u * (W + 520) : -260 + u * (W + 520);
    aletaNadando(ctx, t, olaEn, fx, dir, .5);
  }
  superficie(ctx, t, ySup, 1);
}

export const outro2027 = {
  id: 'outro-2027',
  nombre: 'Outro 2027 · Pantalla final',
  desc: 'Pantalla final de YouTube con el estilo nuevo, pareja de la intro 2027: la ola tapa el final del vídeo y aparecen el logo, tu mensaje, la píldora con tus redes y los huecos para 1 vídeo + suscribirse, con una aleta nadando abajo. Empieza transparente. Con música y efectos propios.',
  fps: 30,
  formatos: ['horizontal'],
  fotoMomento: 55,
  campos: [
    { k: 'titulo', label: 'Mensaje', tipo: 'texto', def: '¡Gracias por ver!', max: 22 },
    { k: 'usuario', label: 'Texto de la píldora (vacío para quitarla)', tipo: 'texto', def: '@KyoSumiVT', max: 24 },
    { k: 'redes', label: 'Redes (debajo de la píldora, vacío para quitarlas)', tipo: 'texto', def: 'Twitch · Kick · YouTube · TikTok', max: 48 },
    { k: 'e1', label: 'Etiqueta del vídeo', tipo: 'texto', def: '¡Mira este!', max: 22 },
    { k: 'es', label: 'Etiqueta de suscribirse', tipo: 'texto', def: '¡Suscríbete!', max: 18 },
    { k: 'musica', label: 'Música', tipo: 'chips', def: 'burbuja', opciones: [['burbuja', '🫧 Burbuja'], ['alegre', '🎶 Pop'], ['chill', '🌙 Chill'], ['ninguna', '🔇 Sin música']] },
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🌊 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos · YouTube admite de 5 a 20)', tipo: 'numero', def: 12, min: 6, max: 20, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 12, 6, 20),
  sonido(o) {
    const musica = o.musica || 'burbuja', efectos = o.efectos !== 'no';
    if (musica === 'ninguna' && !efectos) return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => {
      if (musica !== 'ninguna') musicaFondo(ac, out, L, musica, 1.5 * v);
      if (!efectos) return;
      whoosh(ac, out, 0, .95, .8 * v, -.4, .4, 3);                                   // sube el agua
      for (let k = 0; k < 4; k++) blup(ac, out, 1.0 + k * .2, 220 + k * 20, .1 * v, .7 - k * .2); // la aleta entra chapoteando
      whoosh(ac, out, 1.3, .55, .5 * v, 0, 0, 9);                                     // la aleta del logo sale disparada
      for (let i = 0; i < 7; i++) blup(ac, out, 1.65 + i * .08, 520 + i * 60, .32 * v, (i - 3) * .15 - .3); // pop de cada letra
      blup(ac, out, 1.85, 300, .28 * v, .4);                                          // hueco del vídeo
      blup(ac, out, 2.0, 420, .22 * v, -.2);                                          // mensaje
      blup(ac, out, 2.05, 360, .26 * v, .3);                                          // hueco de suscribirse
      campanita(ac, out, 2.3, .09 * v);                                               // destellos
      blup(ac, out, 2.55, 640, .22 * v, -.3);                                         // píldora
      blup(ac, out, 2.2, 700, .16 * v, .4); blup(ac, out, 2.4, 760, .16 * v, .3);     // etiquetas
      for (let n = 1; 1 + n * PASADA < L - .5; n++) { const d = n % 2 ? 1 : -1; whoosh(ac, out, 1 + n * PASADA + 1, 3.5, .14 * v, -.7 * d, .7 * d, 20 + n); } // la aleta vuelve a cruzar
    });
  },
  dibujar(ctx, t, o, fmt, Wr, Hr) {
    const n = nivelAgua(t);
    if (n <= 0) return; // transparente: aquí se ve el final del vídeo
    ctx.save(); ctx.scale(Wr / W, Hr / H);
    const ola = caminoOla(t, n);
    ctx.save(); ctx.clip(ola); escena(ctx, t, o); ctx.restore();
    if (n < 1.12) bordeOla(ctx, ola);
    ctx.restore();
  }
};
