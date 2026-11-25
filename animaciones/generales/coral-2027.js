// Kyo Estudio · piezas comunes de las plantillas 2027 (estilo Coral Stream): intro y outro de YouTube.
// Todo se dibuja en un espacio de 1920×1080; cada plantilla lo escala al tamaño real.
import { clamp, azar } from '../base/utilidades.js';
import { LOGO } from '../../2027/marca/logo-piezas.js';

export const W = 1920, H = 1080;
export const C = { abisal: '#0A1030', indigo: '#2B2F7A', aleta: '#3A7BD5', bioluz: '#6FE3F0', espuma: '#C9E6F2', perla: '#F5F3FB', coral: '#FF6F61', coralP: '#FFB4A8', menta: '#5EF2B8' };
export const pr = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export const E = {
  out: x => 1 - Math.pow(1 - x, 3),
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  in: x => x * x * x,
  back: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
};

// ---------- logo en piezas ----------
const prep = capas => capas.map(c => Object.assign({ p: new Path2D(c.d) }, c));
export const FIN = prep(LOGO.fin);
export const FIN_BB = LOGO.finBB;
export const LETRAS = LOGO.letras.map(l => ({ n: l.n, bb: l.bb, capas: prep(l.capas) }));
export const ADORNOS = LOGO.adornos.map(a => ({ bb: a.bb, capas: prep(a.capas) }));
export const ORDEN = { K: 0, Y: 1, O: 2, S: 3, U: 4, M: 5, I: 6 };
export const LOGO_C = [496, 362]; // centro del logo en su propio espacio
// Isotipo (aleta + mar) en piezas, sacado de 2027/marca/logo/kyosumi-isotipo-color.svg (512×369; dibujo en 46–466 × 46–323)
export const ISOTIPO = prep([
  {"d":"M94.6367 270.683C129.564 152.804 197.235 80.7676 297.651 54.5723C258.358 128.792 264.906 200.83 317.297 270.683H94.6367Z","f":"#0A1030","s":"#0A1030","w":31.4344},
  {"d":"M94.6367 262.301C129.564 144.421 197.235 72.3848 297.651 46.1895C258.358 120.41 264.906 192.447 317.297 262.301H94.6367Z","f":"#0A1030","s":"#0A1030","w":31.4344},
  {"d":"M94.6367 262.301C129.564 144.421 197.235 72.3848 297.651 46.1895C258.358 120.41 264.906 192.447 317.297 262.301H94.6367Z","f":"white","s":"white","w":16.765},
  {"d":"M94.6367 262.301C129.564 144.421 197.235 72.3848 297.651 46.1895C258.358 120.41 264.906 192.447 317.297 262.301H94.6367Z","g":{"c":[205.967,46.1895,205.967,262.301],"s":[[0,"#2B2F7A"],[1,"#3A7BD5"]]}},
  {"d":"M46.4372 259.943C81.3643 232.002 116.292 232.002 151.219 259.943C186.145 287.885 221.073 287.885 256 259.943C290.927 232.002 325.855 232.002 360.781 259.943C395.708 287.885 430.636 287.885 465.563 259.943V301.856C465.563 315.827 458.577 322.812 444.606 322.812H67.3935C53.4227 322.812 46.4372 315.827 46.4372 301.856V259.943Z","f":"#0A1030","s":"#0A1030","w":31.4344},
  {"d":"M46.4372 249.466C81.3643 221.525 116.292 221.525 151.219 249.466C186.145 277.408 221.073 277.408 256 249.466C290.927 221.525 325.855 221.525 360.781 249.466C395.708 277.408 430.636 277.408 465.563 249.466V291.378C465.563 305.35 458.577 312.334 444.606 312.334H67.3935C53.4227 312.334 46.4372 305.35 46.4372 291.378V249.466Z","f":"#0A1030","s":"#0A1030","w":31.4344},
  {"d":"M46.4372 249.466C81.3643 221.525 116.292 221.525 151.219 249.466C186.145 277.408 221.073 277.408 256 249.466C290.927 221.525 325.855 221.525 360.781 249.466C395.708 277.408 430.636 277.408 465.563 249.466V291.378C465.563 305.35 458.577 312.334 444.606 312.334H67.3935C53.4227 312.334 46.4372 305.35 46.4372 291.378V249.466Z","f":"white","s":"white","w":16.765},
  {"d":"M46.4372 249.466C81.3643 221.525 116.292 221.525 151.219 249.466C186.145 277.408 221.073 277.408 256 249.466C290.927 221.525 325.855 221.525 360.781 249.466C395.708 277.408 430.636 277.408 465.563 249.466V291.378C465.563 305.35 458.577 312.334 444.606 312.334H67.3935C53.4227 312.334 46.4372 305.35 46.4372 291.378V249.466Z","g":{"c":[256,228.509,256,312.334],"s":[[0,"#6FE3F0"],[1,"#3A7BD5"]]}},
  {"d":"M81.0151 197.074C88.5381 197.074 94.6367 190.976 94.6367 183.453C94.6367 175.93 88.5381 169.831 81.0151 169.831C73.4921 169.831 67.3935 175.93 67.3935 183.453C67.3935 190.976 73.4921 197.074 81.0151 197.074Z","f":"#0A1030","s":"#0A1030","w":12.5738},
  {"d":"M81.0151 192.883C88.5381 192.883 94.6367 186.784 94.6367 179.261C94.6367 171.738 88.5381 165.64 81.0151 165.64C73.4921 165.64 67.3935 171.738 67.3935 179.261C67.3935 186.784 73.4921 192.883 81.0151 192.883Z","f":"#0A1030","s":"#0A1030","w":12.5738},
  {"d":"M81.0151 192.883C88.5381 192.883 94.6367 186.784 94.6367 179.261C94.6367 171.738 88.5381 165.64 81.0151 165.64C73.4921 165.64 67.3935 171.738 67.3935 179.261C67.3935 186.784 73.4921 192.883 81.0151 192.883Z","f":"white","s":"white","w":6.28688},
  {"d":"M81.0151 192.883C88.5381 192.883 94.6367 186.784 94.6367 179.261C94.6367 171.738 88.5381 165.64 81.0151 165.64C73.4921 165.64 67.3935 171.738 67.3935 179.261C67.3935 186.784 73.4921 192.883 81.0151 192.883Z","f":"#C9E6F2"},
  {"d":"M54.8197 144.683C59.4493 144.683 63.2022 140.93 63.2022 136.3C63.2022 131.671 59.4493 127.918 54.8197 127.918C50.1902 127.918 46.4372 131.671 46.4372 136.3C46.4372 140.93 50.1902 144.683 54.8197 144.683Z","f":"#0A1030","s":"#0A1030","w":12.5738},
  {"d":"M54.8197 140.494C59.4493 140.494 63.2022 136.741 63.2022 132.111C63.2022 127.481 59.4493 123.729 54.8197 123.729C50.1902 123.729 46.4372 127.481 46.4372 132.111C46.4372 136.741 50.1902 140.494 54.8197 140.494Z","f":"#0A1030","s":"#0A1030","w":12.5738},
  {"d":"M54.8197 140.494C59.4493 140.494 63.2022 136.741 63.2022 132.111C63.2022 127.481 59.4493 123.729 54.8197 123.729C50.1902 123.729 46.4372 127.481 46.4372 132.111C46.4372 136.741 50.1902 140.494 54.8197 140.494Z","f":"white","s":"white","w":6.28688},
  {"d":"M54.8197 140.494C59.4493 140.494 63.2022 136.741 63.2022 132.111C63.2022 127.481 59.4493 123.729 54.8197 123.729C50.1902 123.729 46.4372 127.481 46.4372 132.111C46.4372 136.741 50.1902 140.494 54.8197 140.494Z","f":"#C9E6F2"}
]);
export const ISOTIPO_C = [256, 184]; // centro del dibujo
const degradados = new WeakMap(); // los degradados se crean por lienzo (vista previa y exportación son lienzos distintos)
export function pintar(ctx, c) {
  if (c.g) {
    let m = degradados.get(ctx); if (!m) degradados.set(ctx, m = new Map());
    let g = m.get(c.g); if (!g) { g = ctx.createLinearGradient(...c.g.c); c.g.s.forEach(([o, col]) => g.addColorStop(o, col)); m.set(c.g, g); }
    ctx.fillStyle = g; ctx.fill(c.p);
  } else if (c.f) { ctx.fillStyle = c.f === 'white' ? '#fff' : c.f; ctx.fill(c.p); }
  if (c.s) { ctx.lineJoin = 'round'; ctx.lineWidth = c.w; ctx.strokeStyle = c.s === 'white' ? '#fff' : c.s; ctx.stroke(c.p); }
}
// Dibuja una pieza (letra, aleta, adorno) movida/escalada/girada alrededor de su centro
export function enPieza(ctx, bb, tr, fn) {
  if (!tr || tr.s <= 0.001 || tr.a === 0) return;
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  ctx.save(); if (tr.a != null) ctx.globalAlpha *= tr.a;
  ctx.translate(cx + (tr.dx || 0), cy + (tr.dy || 0)); ctx.rotate(tr.r || 0); ctx.scale(tr.s, tr.s); ctx.translate(-cx, -cy);
  fn(); ctx.restore();
}
// Las letras se pintan capa a capa (todas las letras por capa) para que los contornos se fundan
export function pintarLetras(ctx, trs) {
  for (let j = 0; j < 7; j++) LETRAS.forEach((l, i) => enPieza(ctx, l.bb, trs[i], () => pintar(ctx, l.capas[j])));
}

// ---------- agua ----------
// Ola que sube desde abajo: nivel 0 = nada, 1 = cubre la pantalla (1,12 con margen para las crestas)
export function caminoOla(t, nivel) {
  const y0 = H * (1 - nivel), p = new Path2D(); p.moveTo(-20, H + 20); p.lineTo(-20, y0);
  for (let x = -20; x <= W + 20; x += 24) p.lineTo(x, y0 + Math.sin(x * .006 + t * 5) * H * .028 + Math.sin(x * .017 - t * 3) * H * .01);
  p.lineTo(W + 20, H + 20); p.closePath(); return p;
}
// Borde pegatina de la ola (contorno Abisal + borde blanco)
export function bordeOla(ctx, ola) {
  ctx.lineJoin = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = C.abisal; ctx.stroke(ola); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke(ola);
}
export function fondoMar(ctx, t) {
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
export function burbujas(ctx, t) {
  const rnd = azar(3); ctx.save(); ctx.strokeStyle = 'rgba(201,230,242,.8)'; ctx.lineWidth = 4;
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W, r = 8 + rnd() * 22, v = 70 * (.5 + rnd()), fase = rnd() * H * 1.4;
    const y = H + 60 - ((t * v + fase) % (H + 160)), xx = x + Math.sin(t * 2 + i) * 12;
    ctx.beginPath(); ctx.arc(xx, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(xx - r * .35, y - r * .35, r * .22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
// Superficie del agua vista de lado (franja con borde pegatina); devuelve la altura de la ola en x
export function superficie(ctx, t, ySup, a = 1) {
  const olaEn = x => ySup + Math.sin(x * .012 + t * 4) * 12;
  if (a <= 0) return olaEn;
  ctx.save(); ctx.globalAlpha *= a; const p = new Path2D(); p.moveTo(-20, H + 40); p.lineTo(-20, ySup);
  for (let x = -20; x <= W + 20; x += 24) p.lineTo(x, olaEn(x));
  p.lineTo(W + 20, H + 40); p.closePath();
  const g = ctx.createLinearGradient(0, ySup, 0, H); g.addColorStop(0, C.bioluz); g.addColorStop(1, C.aleta);
  ctx.lineJoin = 'round'; ctx.lineWidth = 30; ctx.strokeStyle = C.abisal; ctx.stroke(p); ctx.lineWidth = 14; ctx.strokeStyle = '#fff'; ctx.stroke(p);
  ctx.globalAlpha *= .92; ctx.fillStyle = g; ctx.fill(p); ctx.restore();
  return olaEn;
}
// Aleta nadando en la superficie: dir -1 = hacia la izquierda (el borde curvo va delante), 1 = hacia la derecha.
// hund 0–1 = cuánto se ha sumergido. Incluye la estela (detrás) y la espuma de la base.
export function aletaNadando(ctx, t, olaEn, fx, dir, esc, hund = 0, inclina = .03) {
  const fy = olaEn(fx) - 70 * esc / .75 + hund * 300 + Math.sin(t * 9) * 4 * esc / .75;
  ctx.save(); const cl = new Path2D(); cl.rect(0, 0, W, olaEn(fx) + 6); ctx.clip(cl);
  ctx.translate(fx, fy); ctx.rotate((inclina - hund * .35) * -dir); ctx.scale(-dir * esc, esc); ctx.translate(-492, -200);
  FIN.forEach(c => pintar(ctx, c)); ctx.restore();
  const k0 = esc / .75;
  ctx.save(); ctx.strokeStyle = 'rgba(111,227,240,.85)'; ctx.lineWidth = 7 * k0; ctx.lineCap = 'round';
  for (let k = 1; k <= 4; k++) { const ex = fx - dir * (70 + k * 80) * k0; ctx.globalAlpha = clamp(1 - k * .2, 0, 1) * (1 - hund); ctx.beginPath(); ctx.arc(ex, olaEn(ex) - 2, (22 + k * 10) * k0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  ctx.globalAlpha = (1 - hund) * .9; ctx.fillStyle = '#fff';
  for (let k = 0; k < 5; k++) { const bx = fx + dir * (60 - k * 34) * k0 + Math.sin(t * 12 + k) * 4; ctx.beginPath(); ctx.arc(bx, olaEn(bx) - 4, (7 + (k % 2) * 4) * k0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
// Píldora con borde pegatina (p. ej. @KyoSumiVT)
export function chip(ctx, txt, x, y, a, dy, fondo = C.bioluz, tam = 46) {
  if (a <= 0 || !txt) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + dy);
  ctx.font = '700 ' + tam + 'px Fredoka, sans-serif'; ctx.letterSpacing = '0px';
  const k = tam / 46, w = ctx.measureText(txt).width + 70 * k, h = 78 * k;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.lineWidth = 22 * k; ctx.strokeStyle = C.abisal; ctx.stroke(); ctx.lineWidth = 10 * k; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillStyle = fondo; ctx.fill();
  ctx.fillStyle = C.abisal; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 3 * k); ctx.restore();
}

// ---------- sonido ----------
// Campanita de los destellos (dos senos agudos que se apagan)
export function campanita(ac, dest, t0, vol) {
  [1568, 2349].forEach((f, i) => {
    const os = ac.createOscillator(); os.type = 'sine'; os.frequency.value = f;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0 + i * .06); g.gain.exponentialRampToValueAtTime(vol, t0 + i * .06 + .01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * .06 + .5);
    os.connect(g).connect(dest); os.start(t0 + i * .06); os.stop(t0 + i * .06 + .55);
  });
}
