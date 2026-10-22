// Kyo Estudio · Mar, cielo de noche y burbujas (intro, outro, anuncios, presentación y fondos)
import { azar, clamp, rad } from './utilidades.js';
import { destello } from './piezas.js';

// Superficie del mar: altura en cada x (dos ondas que se mueven), relleno y línea del borde
export function nivelMar(x, nivel, A, W, fase, t) { return nivel + A * Math.sin(x / W * Math.PI * 2 * 1.2 + t * 2.2 + fase) + A * .5 * Math.sin(x / W * Math.PI * 2 * 2.7 - t * 3 + fase * 1.7); }
export function caminoMar(W, H, nivel, A, fase, t) {
  const p = new Path2D(), paso = W / 60;
  p.moveTo(-20, H + 40);
  for (let x = -20; x <= W + 20 + paso; x += paso) p.lineTo(x, nivelMar(x, nivel, A, W, fase, t));
  p.lineTo(W + 20, H + 40); p.closePath(); return p;
}
export function lineaMar(W, nivel, A, fase, t) {
  const p = new Path2D(), paso = W / 60;
  for (let x = -20; x <= W + 20 + paso; x += paso) x === -20 ? p.moveTo(x, nivelMar(x, nivel, A, W, fase, t)) : p.lineTo(x, nivelMar(x, nivel, A, W, fase, t));
  return p;
}
export function burbujasEn(ctx, W, H, t, u, sem, n, vel = 1) {
  const r = azar(sem);
  for (let b = 0; b < n; b++) {
    const bx = r() * W, v = (.12 + r() * .2) * vel, rad0 = (6 + r() * 20) * u, y0 = r();
    const by = H * (1.08 - ((y0 + t * v) % 1.16)), bxx = bx + Math.sin(t * 3 + b) * 12 * u;
    ctx.beginPath(); ctx.arc(bxx, by, rad0, 0, Math.PI * 2); ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(bxx - rad0 * .35, by - rad0 * .35, rad0 * .22, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  }
}
// Cielo de noche (degradado, brillo, estrellas y luna) compartido por la intro y la outro
export function fondoNoche(ctx, P, W, H, t, u, Y0, luna, vert) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.o); g.addColorStop(.7, P.c); g.addColorStop(1, P.c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .6); rg.addColorStop(0, P.a2 + '55'); rg.addColorStop(1, P.a2 + '00');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    if (luna) {
      const r = azar(3);
      for (let i = 0; i < 34; i++) { const sx = r() * W, sy = r() * Y0 * .92, tw = .5 + .5 * Math.sin(t * (2 + r() * 3) + i); destello(ctx, sx, sy, (10 + r() * 22) * u, i % 5 ? '#ffffff' : '#F4C542', .5 + tw * .5, i * 20 + t * 20, .35 + tw * .6); }
      const mx = vert ? W * .78 : W * .85, my = vert ? H * .12 : H * .17, R = 70 * u;
      const gl = ctx.createRadialGradient(mx, my, R * .6, mx, my, R * 2.6); gl.addColorStop(0, 'rgba(247,233,176,.35)'); gl.addColorStop(1, 'rgba(247,233,176,0)');
      ctx.fillStyle = gl; ctx.fillRect(mx - R * 3, my - R * 3, R * 6, R * 6);
      const ix = mx + R * .45, iy = my - R * .3, iR = R * .85;
      const fuera = new Path2D(); fuera.rect(mx - R * 2, my - R * 2, R * 4, R * 4); fuera.arc(ix, iy, iR, 0, Math.PI * 2);
      const dentro = new Path2D(); dentro.arc(mx, my, R, 0, Math.PI * 2);
      ctx.save(); ctx.clip(fuera, 'evenodd');
      ctx.lineWidth = 12 * u; ctx.strokeStyle = P.o; ctx.stroke(dentro); ctx.lineWidth = 7 * u; ctx.strokeStyle = P.p; ctx.stroke(dentro); ctx.fillStyle = '#F7E9B0'; ctx.fill(dentro); ctx.restore();
      ctx.save(); ctx.clip(dentro); ctx.beginPath(); ctx.arc(ix, iy, iR, 0, Math.PI * 2);
      ctx.lineWidth = 12 * u; ctx.strokeStyle = P.o; ctx.stroke(); ctx.lineWidth = 7 * u; ctx.strokeStyle = P.p; ctx.stroke(); ctx.restore();
      ctx.save(); ctx.clip(fuera, 'evenodd'); ctx.clip(dentro); ctx.fillStyle = '#F7E9B0'; ctx.fill(dentro); ctx.restore();
    }
}
// Dos capas de mar sobre fondo transparente (transiciones de entrada/salida de la intro y la outro)
export function dosMares(ctx, P, W, H, t, u, nivel) {
  const A = 44 * u, na = nivel - 46 * u;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, na, A, 1.3, t));
  ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, na, A, 1.3, t));
  ctx.fillStyle = P.a; ctx.fill(caminoMar(W, H, na, A, 1.3, t));
  const marD = caminoMar(W, H, nivel, A, 0, t);
  ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, nivel, A, 0, t));
  ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, nivel, A, 0, t));
  const y0 = clamp(nivel, 0, H - 2), gm = ctx.createLinearGradient(0, y0, 0, H + 1); gm.addColorStop(0, P.a2); gm.addColorStop(1, P.c);
  ctx.fillStyle = gm; ctx.fill(marD);
  ctx.save(); ctx.clip(marD); burbujasEn(ctx, W, H, t, u, 17, 30, 3); ctx.restore();
}
// Fondo de los anuncios: degradado, rayas que se mueven, brillos y mar abajo
export function fondoAnuncio(ctx, P, W, H, t, u, vert, conMar = true) {
    // fondo: degradado + rayas diagonales que se mueven + brillos
    const g = ctx.createLinearGradient(0, 0, W * .3, H); g.addColorStop(0, P.c); g.addColorStop(1, P.o);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = P.a; const paso = 90 * u, desp = (t * 30 * u) % (paso * 2);
    ctx.translate(W / 2, H / 2); ctx.rotate(rad(-25)); for (let x = -W * 1.5 - desp; x < W * 1.5; x += paso * 2) ctx.fillRect(x, -H * 1.5, paso, H * 3); ctx.restore();
    const rg = ctx.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .55); rg.addColorStop(0, P.a2 + '44'); rg.addColorStop(1, P.a2 + '00');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    { const r = azar(8); for (let i = 0; i < 22; i++) { const sx = r() * W, sy = r() * H, tw = .5 + .5 * Math.sin(t * (2 + r() * 2) + i); destello(ctx, sx, sy, (12 + r() * 20) * u, i % 4 ? '#ffffff' : '#F4C542', .5 + tw * .5, i * 30 + t * 25, .25 + tw * .5); } }
    if (!conMar) return;
    // mar abajo
    const Y0 = H * (vert ? .88 : .935), A = 16 * u;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 26 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, Y0 - 34 * u, A, 1.3, t)); ctx.lineWidth = 14 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, Y0 - 34 * u, A, 1.3, t));
    ctx.fillStyle = P.a; ctx.fill(caminoMar(W, H, Y0 - 34 * u, A, 1.3, t));
    ctx.lineWidth = 26 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, Y0, A, 0, t)); ctx.lineWidth = 14 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, Y0, A, 0, t));
    ctx.fillStyle = P.a2; ctx.fill(caminoMar(W, H, Y0, A, 0, t));
}
// Mar quieto de dos capas (como la intro en reposo), con burbujas
export function marQuieto(ctx, P, W, H, t, u, Y0) {
  const A = 20 * u, atras = Y0 - 46 * u;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, atras, A, 1.3, t));
  ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, atras, A, 1.3, t));
  ctx.fillStyle = P.a; ctx.fill(caminoMar(W, H, atras, A, 1.3, t));
  const mar = caminoMar(W, H, Y0, A, 0, t);
  ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, Y0, A, 0, t));
  ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, Y0, A, 0, t));
  const gm = ctx.createLinearGradient(0, Y0, 0, H + 1); gm.addColorStop(0, P.a2); gm.addColorStop(1, P.c);
  ctx.fillStyle = gm; ctx.fill(mar);
  ctx.save(); ctx.clip(mar); burbujasEn(ctx, W, H, t, u, 17, Math.round(10 + 14 * W * H / 2073600)); ctx.restore();
}
