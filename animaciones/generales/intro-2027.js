// Kyo Estudio · Plantilla: Intro 2027 "Aleta al acecho" (estilo Coral Stream)
// Va entre el hook y el vídeo: el agua sube tapando el hook, una aleta cruza la superficie
// nadando hacia la izquierda (el borde curvo es el frente; la punta mira atrás, como en el logo),
// se sumerge y sale disparada convertida en la aleta del logo; KYO SUMI rebota letra a letra
// y el agua se retira dejando el fondo transparente para enlazar con el vídeo (.mov / .webm).
// Se dibuja en un espacio de 1920×1080 y se escala al tamaño real.
import { clamp, azar } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { LOGO } from '../../2027/marca/logo-piezas.js';

const W = 1920, H = 1080, BASE = 7.5, SALIDA = 6.4;
const C = { abisal: '#0A1030', indigo: '#2B2F7A', aleta: '#3A7BD5', bioluz: '#6FE3F0', espuma: '#C9E6F2', coral: '#FF6F61', coralP: '#FFB4A8', menta: '#5EF2B8' };
const pr = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const E = {
  out: x => 1 - Math.pow(1 - x, 3),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  in: x => x * x * x,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
};

// ---------- logo en piezas ----------
const prep = capas => capas.map(c => Object.assign({ p: new Path2D(c.d) }, c));
const FIN = prep(LOGO.fin);
const LETRAS = LOGO.letras.map(l => ({ n: l.n, bb: l.bb, capas: prep(l.capas) }));
const ADORNOS = LOGO.adornos.map(a => ({ bb: a.bb, capas: prep(a.capas) }));
const ORDEN = { K: 0, Y: 1, O: 2, S: 3, U: 4, M: 5, I: 6 };
const LOGO_C = [496, 362], LOGO_S = 1.12;
const degradados = new WeakMap(); // los degradados se crean por lienzo (vista previa y exportación son lienzos distintos)
function pintar(ctx, c) {
  if (c.g) {
    let m = degradados.get(ctx); if (!m) degradados.set(ctx, m = new Map());
    let g = m.get(c.g); if (!g) { g = ctx.createLinearGradient(...c.g.c); c.g.s.forEach(([o, col]) => g.addColorStop(o, col)); m.set(c.g, g); }
    ctx.fillStyle = g; ctx.fill(c.p);
  } else if (c.f) { ctx.fillStyle = c.f === 'white' ? '#fff' : c.f; ctx.fill(c.p); }
  if (c.s) { ctx.lineJoin = 'round'; ctx.lineWidth = c.w; ctx.strokeStyle = c.s === 'white' ? '#fff' : c.s; ctx.stroke(c.p); }
}
function enPieza(ctx, bb, tr, fn) {
  if (!tr || tr.s <= 0.001 || tr.a === 0) return;
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  ctx.save(); if (tr.a != null) ctx.globalAlpha *= tr.a;
  ctx.translate(cx + (tr.dx || 0), cy + (tr.dy || 0)); ctx.rotate(tr.r || 0); ctx.scale(tr.s, tr.s); ctx.translate(-cx, -cy);
  fn(); ctx.restore();
}

// ---------- agua ----------
function caminoOla(t, nivel) {
  const y0 = H * (1 - nivel), p = new Path2D(); p.moveTo(-20, H + 20); p.lineTo(-20, y0);
  for (let x = -20; x <= W + 20; x += 24) p.lineTo(x, y0 + Math.sin(x * .006 + t * 5) * H * .028 + Math.sin(x * .017 - t * 3) * H * .01);
  p.lineTo(W + 20, H + 20); p.closePath(); return p;
}
const nivelAgua = tm => tm < .95 ? E.io(pr(tm, 0, .95)) * 1.12 : tm < SALIDA ? 1.12 : 1.12 * (1 - E.io(pr(tm, SALIDA, BASE - .05)));

function fondoMar(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16246a'); g.addColorStop(.55, '#0d1748'); g.addColorStop(1, C.abisal);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let r = ctx.createRadialGradient(W * .88, -H * .1, 0, W * .88, -H * .1, W * .6); r.addColorStop(0, 'rgba(255,111,97,.2)'); r.addColorStop(1, 'rgba(255,111,97,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  r = ctx.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .42, W * .5); r.addColorStop(0, 'rgba(58,123,213,.35)'); r.addColorStop(1, 'rgba(58,123,213,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = C.espuma;
  for (const [a, b] of [[.18, .25], [.36, .42], [.56, .6], [.72, .78]]) { const o = Math.sin(t * .8 + a * 9) * W * .01; ctx.beginPath(); ctx.moveTo(W * a + o, 0); ctx.lineTo(W * b + o, 0); ctx.lineTo(W * (b + .1), H); ctx.lineTo(W * (a + .04), H); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([40, 30]); ctx.lineWidth = 5;
  [[.3, 'rgba(111,227,240,.28)', 1], [.66, 'rgba(111,227,240,.3)', -1], [.74, 'rgba(255,111,97,.26)', 1]].forEach(([y, col, d]) => {
    const yy = H * y; ctx.strokeStyle = col; ctx.lineDashOffset = -t * 160 * d; ctx.beginPath(); ctx.moveTo(-20, yy);
    ctx.bezierCurveTo(W * .3, yy - H * .05, W * .6, yy + H * .06, W + 20, yy - H * .01); ctx.stroke();
  });
  ctx.restore();
}
function burbujas(ctx, t) {
  const rnd = azar(3); ctx.save(); ctx.strokeStyle = 'rgba(201,230,242,.8)'; ctx.lineWidth = 4;
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W, r = 8 + rnd() * 22, v = 70 * (.5 + rnd()), fase = rnd() * H * 1.4;
    const y = H + 60 - ((t * v + fase) % (H + 160)), xx = x + Math.sin(t * 2 + i) * 12;
    ctx.beginPath(); ctx.arc(xx, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(xx - r * .35, y - r * .35, r * .22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function coralesPixel(ctx, tm) {
  const rnd = azar(7), P = 18, cols = [C.coral, C.coralP, C.indigo, C.aleta, C.menta];
  ctx.fillStyle = C.abisal; for (let x = 0; x < W; x += P) { const h = P * (3 + Math.floor(rnd() * 3)); ctx.fillRect(x, H - h, P, h); }
  let i = 0;
  for (let x = P * 2; x < W; x += P * (5 + Math.floor(rnd() * 6))) {
    const col = cols[Math.floor(rnd() * cols.length)], len = 4 + Math.floor(rnd() * 7), x0 = x - x % P;
    const crec = E.back(pr(tm, 3.55 + i * .025, 4 + i * .025)); i++;
    const n = Math.round(len * clamp(crec, 0, 1.3)); ctx.fillStyle = col;
    for (let k = 0; k < n; k++) { ctx.fillRect(x0, H - 4 * P - k * P, P, P); if (rnd() < .3) { const d = rnd() < .5 ? -1 : 1; for (let j = 1; j <= 2; j++) ctx.fillRect(x0 + d * j * P, H - 4 * P - k * P - j * P, P, P); } }
  }
}
function chip(ctx, txt, x, y, a, dy) {
  if (a <= 0 || !txt) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + dy);
  ctx.font = '700 46px Fredoka, sans-serif'; ctx.letterSpacing = '0px';
  const w = ctx.measureText(txt).width + 70, h = 78;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.lineWidth = 22; ctx.strokeStyle = C.abisal; ctx.stroke(); ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = C.bioluz; ctx.fill();
  ctx.fillStyle = C.abisal; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 3); ctx.restore();
}

// ---------- la escena bajo el agua ----------
function escena(ctx, t, tm, o) {
  fondoMar(ctx, t); burbujas(ctx, t);
  const sup = 1 - E.in(pr(tm, 2.5, 3.1)), ySup = H * .5 + (1 - sup) * H * .6;
  if (tm < 3.2) {
    // aleta que nada hacia la izquierda con la base dentro del agua
    const olaEn = x => ySup + Math.sin(x * .012 + t * 4) * 12;
    const fx = W + 260 - E.io(pr(tm, .95, 2.55)) * W * .95, hund = E.in(pr(tm, 2.35, 2.75));
    const fy = olaEn(fx) - 70 + hund * 300 + Math.sin(t * 9) * 4;
    ctx.save(); const cl = new Path2D(); cl.rect(0, 0, W, olaEn(fx) + 6); ctx.clip(cl);
    ctx.translate(fx, fy); ctx.rotate(.03 - hund * .35); ctx.scale(.75, .75); ctx.translate(-492, -200);
    FIN.forEach(c => pintar(ctx, c)); ctx.restore();
    // estela detrás (a la derecha) y espuma en la base
    ctx.save(); ctx.strokeStyle = 'rgba(111,227,240,.85)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (let k = 1; k <= 4; k++) { const ex = fx + 70 + k * 80; ctx.globalAlpha = clamp(1 - k * .2, 0, 1) * (1 - hund); ctx.beginPath(); ctx.arc(ex, olaEn(ex) - 2, 22 + k * 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    ctx.globalAlpha = (1 - hund) * .9; ctx.fillStyle = '#fff';
    for (let k = 0; k < 5; k++) { const bx = fx - 60 + k * 34 + Math.sin(t * 12 + k) * 4; ctx.beginPath(); ctx.arc(bx, olaEn(bx) - 4, 7 + (k % 2) * 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // superficie interior con borde pegatina (baja y desaparece cuando sale el logo)
    ctx.save(); ctx.globalAlpha = sup; const p = new Path2D(); p.moveTo(-20, H + 40); p.lineTo(-20, ySup);
    for (let x = -20; x <= W + 20; x += 24) p.lineTo(x, ySup + Math.sin(x * .012 + t * 4) * 12);
    p.lineTo(W + 20, H + 40); p.closePath();
    const g = ctx.createLinearGradient(0, ySup, 0, H); g.addColorStop(0, C.bioluz); g.addColorStop(1, C.aleta);
    ctx.lineJoin = 'round'; ctx.lineWidth = 30; ctx.strokeStyle = C.abisal; ctx.stroke(p); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke(p);
    ctx.globalAlpha = sup * .92; ctx.fillStyle = g; ctx.fill(p); ctx.restore();
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
  enPieza(ctx, LOGO.finBB, tm < 2.85 ? null : { s: 1, dy: (1 - E.back(kF)) * 700, a: clamp(kF * 3, 0, 1) }, () => FIN.forEach(c => pintar(ctx, c)));
  const trLetra = l => {
    const i = ORDEN[l.n], a0 = 3.3 + i * .1, k = pr(tm, a0, a0 + .42); if (k <= 0) return null;
    const meneo = (l.n === 'Y' || l.n === 'S') && tm > 4.3 ? Math.sin((tm - 4.3) * 7) * .06 * Math.max(.25, 1 - (tm - 4.3) / 2.2) : 0;
    return { s: E.back(k), dy: (1 - E.out(k)) * -60, r: meneo };
  };
  const trs = LETRAS.map(trLetra);
  for (let j = 0; j < 7; j++) LETRAS.forEach((l, i) => enPieza(ctx, l.bb, trs[i], () => pintar(ctx, l.capas[j])));
  ADORNOS.forEach((a, i) => { const k = pr(tm, 4.35 + i * .06, 4.75 + i * .06); enPieza(ctx, a.bb, k > 0 ? { s: E.back(k) * (1 + Math.sin(t * 5 + i) * .06) } : null, () => a.capas.forEach(c => pintar(ctx, c))); });
  ctx.restore();
  const kc = pr(tm, 4.8, 5.25); chip(ctx, o.usuario, W / 2, H * .44 + flot + LOGO_S * 330, kc, (1 - E.back(kc)) * 40);
}

// Campanita de los destellos (dos senos agudos que se apagan)
function campanita(ac, dest, t0, vol) {
  [1568, 2349].forEach((f, i) => {
    const os = ac.createOscillator(); os.type = 'sine'; os.frequency.value = f;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0 + i * .06); g.gain.exponentialRampToValueAtTime(vol, t0 + i * .06 + .01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * .06 + .5);
    os.connect(g).connect(dest); os.start(t0 + i * .06); os.stop(t0 + i * .06 + .55);
  });
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
    ctx.lineJoin = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = C.abisal; ctx.stroke(ola); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke(ola);
    ctx.restore();
  }
};
