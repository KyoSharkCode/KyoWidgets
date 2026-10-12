// Kyo Estudio · Kit de animación "dibujada"
// Técnicas de animación tradicional para las plantillas canvas: resortes, squash & stretch, anticipación,
// animar "en dos", líneas que tiemblan, trazos que se dibujan solos, sombras duras con trama,
// textura de papel, estelas (smear) y fotogramas de impacto.
// Todo depende solo del tiempo t (nada de Math.random), así que la vista previa y la exportación salen iguales.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;

// ---------- tiempo ----------
// Animar "en dos": congela el tiempo en pasos de 1/fps (12 dibujos por segundo = ritmo de anime)
export const enDos = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
// Número del dibujo actual; sirve de semilla para que el temblor cambie fps veces por segundo
export const dibujo = (t, fps = 12) => Math.floor(t * fps + 1e-6);

// ---------- azar determinista ----------
export function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n ^= n >>> 16;
  return (n >>> 0) / 4294967295;
}
// Valor entre -1 y 1 para (semilla, i)
export const ruido = (sem, i) => hash((Math.imul(sem, 7919) + Math.imul(i, 104729)) | 0) * 2 - 1;
// Ruido suave sobre un contorno cerrado (x de 0 a 1): interpola unos pocos nodos aleatorios
function ruidoSuave(sem, x, nodos) {
  const f = x * nodos, i = Math.floor(f), p = f - i, s = p * p * (3 - 2 * p);
  return lerp(ruido(sem, i % nodos), ruido(sem, (i + 1) % nodos), s);
}

// ---------- movimiento ----------
// Resorte amortiguado: 0 antes de t0 y llega a 1 pasándose y rebotando. frec = rebotes por segundo, amort = freno
export function resorte(t, t0, { frec = 2.2, amort = 6 } = {}) {
  const x = t - t0; if (x <= 0) return 0;
  return 1 - Math.exp(-amort * x) * Math.cos(2 * Math.PI * frec * x);
}
// Impulso: empieza en 0, da un empujón y vuelve a 0 vibrando (para latidos y sacudidas)
export function impulso(t, t0, { frec = 2.2, amort = 6 } = {}) {
  const x = t - t0; if (x <= 0) return 0;
  return Math.exp(-amort * x) * Math.sin(2 * Math.PI * frec * x);
}
// Velocidad de cualquier función del tiempo (derivada numérica)
export const velocidad = (fn, t, dt = 1 / 120) => (fn(t + dt / 2) - fn(t - dt / 2)) / dt;
// Squash & stretch: estira en la dirección del movimiento y adelgaza en la otra, conservando el volumen
export function estirar(vel, { fuerza = .08, max = .35 } = {}) {
  const e = clamp(Math.abs(vel) * fuerza, 0, max);
  return { largo: 1 + e, ancho: 1 / (1 + e) };
}
// Aplastón al chocar: se ensancha y se agacha, y tiembla como gelatina hasta quedarse quieto
export function aplaston(t, t0, { fuerza = .22, frec = 3.2, amort = 9 } = {}) {
  const x = t - t0; if (x < 0) return { sx: 1, sy: 1 };
  const e = fuerza * Math.exp(-amort * x) * Math.cos(2 * Math.PI * frec * x);
  return { sx: 1 + e, sy: 1 / (1 + e) };
}
// Anticipación: se encoge un poco justo antes de una acción, como quien coge impulso
export function anticipa(t, tAccion, { largo = .16, fuerza = .1 } = {}) {
  const x = (t - (tAccion - largo)) / largo; if (x <= 0 || x >= 1) return { sx: 1, sy: 1 };
  const e = fuerza * Math.sin(x * Math.PI / 2);
  return { sx: 1 + e * .6, sy: 1 - e };
}
// Escala alrededor de un punto; con 'giro' la deformación sigue esa dirección (p. ej. la del movimiento)
export function deformar(ctx, cx, cy, sx, sy, giro = 0) {
  ctx.translate(cx, cy); if (giro) ctx.rotate(giro); ctx.scale(sx, sy); if (giro) ctx.rotate(-giro); ctx.translate(-cx, -cy);
}

// ---------- líneas dibujadas ----------
// Une los puntos con curvas suaves (pasando por los puntos medios) y cierra el contorno
function caminoSuave(pts) {
  const c = new Path2D(), n = pts.length, m = i => [(pts[i][0] + pts[(i + 1) % n][0]) / 2, (pts[i][1] + pts[(i + 1) % n][1]) / 2];
  const ini = m(n - 1); c.moveTo(ini[0], ini[1]);
  for (let i = 0; i < n; i++) { const q = m(i); c.quadraticCurveTo(pts[i][0], pts[i][1], q[0], q[1]); }
  c.closePath(); return c;
}
// Rectángulo redondeado que "respira" como una línea dibujada a mano.
// sem = identidad de la forma, dib = número de dibujo (cambia el temblor), amp = cuánto tiembla en px.
// Devuelve { camino: Path2D, largo } — el largo sirve para trazar().
export function rrDibujado(x, y, w, h, r, { sem = 1, dib = 0, amp = 2, nodos = 9 } = {}) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const base = [], paso = 22;
  const lado = (x0, y0, x1, y1, nx, ny) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / paso)); for (let i = 0; i < n; i++) base.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n), nx, ny]); };
  const arco = (cx, cy, a0) => { const n = Math.max(3, Math.round(r / 8)); for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI / 2; base.push([cx + r * Math.cos(a), cy + r * Math.sin(a), Math.cos(a), Math.sin(a)]); } };
  lado(x + r, y, x + w - r, y, 0, -1); arco(x + w - r, y + r, -Math.PI / 2);
  lado(x + w, y + r, x + w, y + h - r, 1, 0); arco(x + w - r, y + h - r, 0);
  lado(x + w - r, y + h, x + r, y + h, 0, 1); arco(x + r, y + h - r, Math.PI / 2);
  lado(x, y + h - r, x, y + r, -1, 0); arco(x + r, y + r, Math.PI);
  const n = base.length, s0 = Math.imul(sem, 131) + dib, pts = base.map(([px, py, nx, ny], i) => {
    const d = amp ? amp * (ruidoSuave(s0, i / n, nodos) + .3 * ruido(s0, i)) : 0;
    return [px + nx * d, py + ny * d];
  });
  let largo = 0; for (let i = 0; i < n; i++) largo += Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
  return { camino: caminoSuave(pts), largo };
}
// Pequeño temblor para textos, iconos y piezas sueltas: desplaza y gira un poquito, distinto en cada dibujo
export function tiembla(ctx, cx, cy, sem, dib, amp = 1.5, giroGrados = .5) {
  const s = Math.imul(sem, 17) + dib, dx = ruido(s, 1) * amp, dy = ruido(s, 2) * amp, g = ruido(s, 3) * giroGrados * Math.PI / 180;
  ctx.translate(cx + dx, cy + dy); ctx.rotate(g); ctx.translate(-cx, -cy);
}
// Trazo que se dibuja solo (como "Trim Paths" de After Effects). p de 0 a 1
export function trazar(ctx, camino, largo, p) {
  if (p <= 0) return;
  ctx.save(); if (p < 1) ctx.setLineDash([largo * p, largo * 1.05]); ctx.stroke(camino); ctx.restore();
}

// ---------- sombras y texturas ----------
const _tramas = new Map();
// Patrón de puntos (trama de cómic) del color dado
export function trama(ctx, color, paso = 8, radio = .3) {
  const k = color + '|' + paso + '|' + radio;
  let c = _tramas.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = paso;
    const g = c.getContext('2d'); g.fillStyle = color; g.beginPath(); g.arc(paso / 2, paso / 2, paso * radio, 0, Math.PI * 2); g.fill();
    _tramas.set(k, c);
  }
  return ctx.createPattern(c, 'repeat');
}
// Sombra de cómic: la misma forma desplazada y rellena con trama, en vez del difuminado digital
export function sombraDura(ctx, camino, dx, dy, color, { paso = 8, alfa = .6 } = {}) {
  ctx.save(); ctx.globalAlpha *= alfa; ctx.translate(dx, dy); ctx.fillStyle = trama(ctx, color, paso); ctx.fill(camino); ctx.restore();
}
let _grano = null;
function granoTile() {
  if (_grano) return _grano;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  // manchas grandes y suaves (fibras del papel)
  const m = document.createElement('canvas'); m.width = m.height = 32;
  const gm = m.getContext('2d'), dm = gm.createImageData(32, 32);
  for (let i = 0; i < 32 * 32; i++) { const v = hash(i + 991) > .5 ? 255 : 0; dm.data[i * 4] = dm.data[i * 4 + 1] = dm.data[i * 4 + 2] = v; dm.data[i * 4 + 3] = 40 * hash(i + 4441); }
  gm.putImageData(dm, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(m, 0, 0, N, N);
  // grano fino
  const d = g.getImageData(0, 0, N, N);
  for (let i = 0; i < N * N; i++) {
    const v = hash(i * 3 + 7); if (v > .08 && v < .92) continue;
    const claro = v > .5; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = claro ? 255 : 0; d.data[i * 4 + 3] = claro ? 150 : 190;
  }
  g.putImageData(d, 0, 0);
  return (_grano = c);
}
// Textura de papel: grano solo encima de lo ya dibujado (respeta la transparencia del .mov). Se mueve con cada dibujo.
export function papel(ctx, dib, { fuerza = .22 } = {}) {
  const tile = granoTile(), pat = ctx.createPattern(tile, 'repeat');
  pat.setTransform(new DOMMatrix().translate(Math.floor(hash(dib * 3 + 1) * 256), Math.floor(hash(dib * 3 + 2) * 256)));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = fuerza; ctx.fillStyle = pat;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
}

// ---------- golpes ----------
// Estela (smear): repite el dibujo en instantes anteriores, cada vez más transparente
export function estela(ctx, t, dibujar, { copias = 3, paso = 1 / 40, alfa = .3 } = {}) {
  for (let k = copias; k >= 1; k--) { ctx.save(); ctx.globalAlpha *= alfa * (1 - (k - 1) / copias); dibujar(t - k * paso); ctx.restore(); }
}
// Líneas de impacto alrededor de un punto, estilo manga. p de 0 a 1 = vida de la ráfaga
export function rafaga(ctx, cx, cy, p, { r0 = 80, r1 = 300, n = 14, color = '#fff', grosor = 12, sem = 3 } = {}) {
  if (p <= 0 || p >= 1) return;
  const sale = 1 - Math.pow(1 - p, 3);
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ruido(sem, i) * .18, largo = (r1 - r0) * (.55 + .45 * hash(sem * 31 + i));
    const ini = r0 + (r1 - r0) * .5 * sale, fin = ini + largo * (1 - p), g = grosor * (1 - p * .6) * (.6 + .4 * hash(sem * 7 + i));
    const ca = Math.cos(a), sa = Math.sin(a);
    ctx.beginPath(); ctx.moveTo(cx + ca * ini - sa * g / 2, cy + sa * ini + ca * g / 2); ctx.lineTo(cx + ca * ini + sa * g / 2, cy + sa * ini - ca * g / 2);
    ctx.lineTo(cx + ca * fin, cy + sa * fin); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// Fotograma de impacto: durante n dibujos tras el golpe, todo se vuelve silueta plana del color dado
export const esImpacto = (t, t0, n = 2, fps = 24) => t >= t0 && t < t0 + n / fps;
export function silueta(ctx, color) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
}
// Fotograma de impacto con colores invertidos (el clásico destello del anime); respeta la transparencia
let _inv = null;
export function invertir(ctx) {
  const c = ctx.canvas, w = c.width, h = c.height;
  if (!_inv) _inv = document.createElement('canvas');
  if (_inv.width !== w || _inv.height !== h) { _inv.width = w; _inv.height = h; }
  const g = _inv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(_inv, 0, 0); ctx.restore();
}
// Smear estirado: en los fotogramas más rápidos la pieza se alarga como un chicle en la dirección del movimiento.
// vx, vy en px/s. Devuelve { largo, ancho, giro } para usar con deformar(ctx, cx, cy, largo, ancho, giro)
export function smear(vx, vy, { umbral = 900, fuerza = .0008, max = 1.2 } = {}) {
  const v = Math.hypot(vx, vy); if (v < umbral) return { largo: 1, ancho: 1, giro: 0 };
  const e = Math.min(max, (v - umbral) * fuerza);
  return { largo: 1 + e, ancho: 1 / Math.sqrt(1 + e), giro: Math.atan2(vy, vx) };
}

// ---------- morphing ----------
let _svg = null;
// Reparte n puntos a lo largo de un trazado SVG (el texto del atributo d)
export function puntosDe(d, n = 120) {
  if (!_svg) { _svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); _svg.setAttribute('aria-hidden', 'true'); _svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; document.body.appendChild(_svg); }
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); _svg.appendChild(p);
  const L = p.getTotalLength(), pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength(L * i / n); pts.push([q.x, q.y]); }
  p.remove(); return pts;
}
const area = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
// Prepara dos formas (mismo número de puntos) para transformarse una en otra sin retorcerse:
// mismo sentido de giro y el punto de inicio que menos se desplaza
export function emparejar(a, b) {
  if (Math.sign(area(a)) !== Math.sign(area(b))) b = b.slice().reverse();
  const n = a.length; let mejor = 0, min = Infinity;
  for (let k = 0; k < n; k++) {
    let s = 0; for (let i = 0; i < n; i += 4) { const q = b[(i + k) % n]; s += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; }
    if (s < min) { min = s; mejor = k; }
  }
  return [a, b.map((_, i) => b[(i + mejor) % n])];
}
// Forma intermedia entre a y b (p de 0 a 1), lista para rellenar o trazar
export const morfear = (a, b, p) => caminoSuave(a.map((q, i) => [lerp(q[0], b[i][0], p), lerp(q[1], b[i][1], p)]));
