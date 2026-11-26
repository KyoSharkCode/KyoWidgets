// Kyo Estudio · piezas de las tarjetas 2027 (estilo Coral Stream): las comparten ¡Sígueme!, ¡Suscríbete! en barra,
// la barra y la pegatina del código, ¡Nueva merch! y los anuncios 2027.
// Pegatina con borde de ola, esquinas HUD, etiqueta en Chakra, botón que cambia al pulsarlo, cursor de píxel,
// burbujas, destellos y la aleta del isotipo nadando por el borde de ola.
import { clamp } from '../base/utilidades.js';
import { C, pr, E, ISOTIPO, pintar } from './coral-2027.js';

export { C, pr, E };
export const BOMB = '"Cherry Bomb One", "Fredoka", sans-serif', FRE = '"Fredoka", sans-serif', HUD = '"Chakra Petch", monospace';
export const C2 = { abisal2: '#111a47', azul: '#A9D3F0', oro: '#F4C542' };
export const lerp = (a, b, k) => a + (b - a) * k;
export const rad = g => g * Math.PI / 180;
export function semilla(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// ---------- isotipo y aleta ----------
// isotipo completo centrado en (x, y) con ancho w
export function isotipo(ctx, x, y, w) { const k = w / 420; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-256, -184); ISOTIPO.forEach(c => pintar(ctx, c)); ctx.restore(); }
// la aleta del isotipo con la base en (x, y) y alto h; sin girar mira a la izquierda (borde curvo delante)
export function aleta(ctx, x, y, h, dir = 1, giro = 0) { const k = h / 230; ctx.save(); ctx.translate(x, y); ctx.rotate(giro); ctx.scale(k * dir, k); ctx.translate(-206, -266); for (let i = 0; i < 4; i++) pintar(ctx, ISOTIPO[i]); ctx.restore(); }

// ---------- formas ----------
export function caja(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); return p; }
const ondas = w => Math.max(3, Math.round(w / 120));
// tarjeta con el borde inferior en ola: es el agua por la que nada la aleta
export function conOla(x, y, w, h, r, t, amp = 7) {
  const p = new Path2D(), yb = y + h - amp, n = ondas(w);
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r); p.lineTo(x + w, yb);
  for (let xx = x + w; xx >= x; xx -= 6) p.lineTo(xx, yb + Math.sin((xx - x) / w * Math.PI * 2 * n + t * 3) * amp);
  p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath(); return p;
}
export const olaY = (x, y, w, h, t, xx, amp = 7) => y + h - amp + Math.sin((xx - x) / w * Math.PI * 2 * ondas(w) + t * 3) * amp;
// pegatina 2027: sombra sólida + contorno abisal + borde perla + relleno (u = escala)
export function pega(ctx, p, o = {}) {
  const ring = o.ring ?? 7, out = o.out ?? 6, drop = o.drop ?? 12;
  ctx.save(); ctx.lineJoin = 'round';
  if (drop) { ctx.save(); ctx.translate(0, drop); ctx.fillStyle = C.abisal; ctx.fill(p); ctx.lineWidth = 2 * (ring + out); ctx.strokeStyle = C.abisal; ctx.stroke(p); ctx.restore(); }
  ctx.lineWidth = 2 * (ring + out); ctx.strokeStyle = C.abisal; ctx.stroke(p);
  ctx.lineWidth = 2 * ring; ctx.strokeStyle = o.borde || C.perla; ctx.stroke(p);
  ctx.fillStyle = o.fill || C2.abisal2; ctx.fill(p);
  ctx.restore();
}
// esquinas HUD (arriba-izquierda y abajo-derecha)
export function hud(ctx, x, y, w, h, L = 34, lw = 5, ins = 14, col = C.bioluz) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const q = Math.min(6, L / 4);
  ctx.beginPath(); ctx.moveTo(x + ins, y + ins + L); ctx.lineTo(x + ins, y + ins + q); ctx.quadraticCurveTo(x + ins, y + ins, x + ins + q, y + ins); ctx.lineTo(x + ins + L, y + ins); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w - ins, y + h - ins - L); ctx.lineTo(x + w - ins, y + h - ins - q); ctx.quadraticCurveTo(x + w - ins, y + h - ins, x + w - ins - q, y + h - ins); ctx.lineTo(x + w - ins - L, y + h - ins); ctx.stroke();
  ctx.restore();
}

// ---------- texto ----------
export function fuente(ctx, f, esp = 0) { ctx.font = f; ctx.letterSpacing = esp + 'px'; }
export function ancho(ctx, txt, f, esp = 0) { fuente(ctx, f, esp); return ctx.measureText(txt).width; }
// texto en una línea; o.trazo = contorno abisal; o.al = alineación
export function texto(ctx, txt, x, y, f, o = {}) {
  fuente(ctx, f, o.esp || 0); ctx.textAlign = o.al || 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (o.trazo) { ctx.lineWidth = o.trazo; ctx.strokeStyle = o.colTrazo || C.abisal; ctx.strokeText(txt, x, y); }
  ctx.fillStyle = o.col || C.perla; ctx.fillText(txt, x, y);
}
// etiqueta HUD: mayúsculas en Chakra sobre píldora (devuelve su ancho). o.punto = punto coral que late
export function etiqueta(ctx, txt, x, y, o = {}) {
  const tam = o.tam || 18, f = `700 ${tam}px ${HUD}`, esp = tam * .16, w = etiquetaAncho(ctx, txt, o), h = tam * 1.75;
  const x0 = o.al === 'center' ? x - w / 2 : o.al === 'right' ? x - w : x;
  ctx.save(); ctx.fillStyle = o.bg || C.bioluz; ctx.fill(caja(x0, y - h / 2, w, h, h / 2));
  let tx = x0 + tam * .7;
  if (o.punto) {
    const ph = o.fase || 0; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(tx + tam * .3, y, tam * .3, 0, 7); ctx.fill();
    ctx.globalAlpha *= .7 * (1 - ph); ctx.lineWidth = tam * .11; ctx.strokeStyle = C.coral; ctx.beginPath(); ctx.arc(tx + tam * .3, y, tam * (.3 + ph * .5), 0, 7); ctx.stroke();
    ctx.restore(); ctx.save(); tx += tam * 1.1;
  }
  texto(ctx, txt, tx, y + tam * .05, f, { esp, col: o.fg || C.abisal }); ctx.restore(); return w;
}
export function etiquetaAncho(ctx, txt, o = {}) { const tam = o.tam || 18; return ancho(ctx, txt, `700 ${tam}px ${HUD}`, tam * .16) + tam * 1.4 + (o.punto ? tam * 1.1 : 0); }

// ---------- iconos (24×24) ----------
const IC = {
  mas: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5',
  campana: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.8 2H4.2zM10 21h4',
  play: 'M8 5.5v13l10.5-6.5z', bolsa: 'M5 8h14l-1.2 12H6.2zM9 8V6.5a3 3 0 0 1 6 0V8',
  mundo: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',
  chat: 'M4 5h16v11H10l-4.5 3.5V16H4z', regalo: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 12 7 12 7c0 0 5 0 5-1.2C17 3.5 13.5 4 12 7',
  camiseta: 'M8 3l-5 3l2 4l2.5-1V21h9V9l2.5 1l2-4l-5-3c-.5 1.6-2 2.6-4 2.6S8.5 4.6 8 3z',
  corazon: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3A4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
  estrella: 'M12 3.5l2.6 5.4l5.9.8l-4.3 4.1l1 5.8L12 16.8l-5.2 2.8l1-5.8L3.5 9.7l5.9-.8z'
};
let ICP = null; // los Path2D se crean al primer uso
const LLENO = { play: 1, camiseta: 1, corazon: 1, estrella: 1 };
export function icono(ctx, n, x, y, s, col, lw = 2.4) {
  if (!ICP) ICP = Object.fromEntries(Object.entries(IC).map(([k, d]) => [k, new Path2D(d)]));
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (LLENO[n]) { ctx.fillStyle = col; ctx.fill(ICP[n]); } else { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(ICP[n]); }
  ctx.restore();
}

// ---------- piezas interactivas ----------
// cursor de píxel (perla con contorno abisal); s = tamaño del píxel, pulsa 0–1 lo encoge
const CUR = ['X...........', 'XX..........', 'XPX.........', 'XPPX........', 'XPPPX.......', 'XPPPPX......', 'XPPPPPX.....', 'XPPPPPPX....', 'XPPPPPPPX...', 'XPPPPPPPPX..', 'XPPPPPPPPPX.', 'XPPPPPPXXXXX', 'XPPPXPPX....', 'XPPX.XPPX...', 'XPX..XPPX...', 'XX....XPPX..', 'X.....XPPX..', '.......XX...'];
export function cursor(ctx, x, y, s = 4, pulsa = 0) {
  ctx.save(); ctx.translate(x, y); const k = 1 - pulsa * .15; ctx.scale(k, k);
  ctx.fillStyle = 'rgba(10,16,48,.35)'; CUR.forEach((f, j) => [...f].forEach((c, i) => { if (c !== '.') ctx.fillRect(i * s + s, j * s + s, s, s); }));
  CUR.forEach((f, j) => [...f].forEach((c, i) => { if (c !== '.') { ctx.fillStyle = c === 'X' ? C.abisal : C.perla; ctx.fillRect(i * s, j * s, s + .5, s + .5); } }));
  ctx.restore();
}
// botón píldora: antes (coral, texto perla) → después (perla, texto abisal con check). Devuelve su ancho
export function botonAncho(ctx, h, txt, txt2, min = 0) { const f = `700 ${h * .42}px ${FRE}`, ic = h * .44; return Math.max(min, ancho(ctx, txt, f) + ic + h * .9, ancho(ctx, txt2, f) + ic + h * .9); }
export function boton(ctx, cx, cy, h, txt, txt2, hecho, o = {}) {
  const f = `700 ${h * .42}px ${FRE}`, ic = h * .44, w = o.w || botonAncho(ctx, h, txt, txt2, o.min);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(o.sq || 1, o.sq || 1);
  pega(ctx, caja(-w / 2, -h / 2, w, h, h / 2), { ring: h * .07, out: h * .07, drop: h * .1, fill: hecho ? C.perla : C.coral, borde: hecho ? C.bioluz : C.perla });
  const col = hecho ? C.abisal : C.perla, tx = hecho ? txt2 : txt, tw = ancho(ctx, tx, f), x0 = -(tw + ic + h * .18) / 2;
  icono(ctx, hecho ? 'check' : (o.icono || 'mas'), x0, -ic / 2, ic, col, 3);
  texto(ctx, tx, x0 + ic + h * .18, h * .03, f, { col });
  ctx.restore(); return w;
}
// burbujas que salen de un punto en t0 (R = alcance)
export function estallido(ctx, x, y, t, t0, n = 12, R = 120, sem = 7, u = 1) {
  const d = t - t0; if (d < 0 || d > 1.3) return; const r = semilla(sem);
  ctx.save(); ctx.lineWidth = 3 * u;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, v = R * (.5 + r() * .7), rd = (5 + r() * 9) * u, k = E.out(clamp(d / 1.1, 0, 1));
    const bx = x + Math.cos(a) * v * k, by = y + Math.sin(a) * v * k * .75 - d * 50 * u;
    ctx.globalAlpha = clamp(1.25 - d, 0, 1); ctx.strokeStyle = i % 4 === 0 ? C.bioluz : C.espuma;
    ctx.beginPath(); ctx.arc(bx, by, rd * (1 + d * .3), 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(bx - rd * .35, by - rd * .35, rd * .22, 0, 7); ctx.fill();
  }
  ctx.restore();
}
export function destello(ctx, x, y, s, col, a = 1, giro = 0) {
  if (a <= 0 || s <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(giro); ctx.fillStyle = col;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; ctx.lineTo(Math.cos(an) * s, Math.sin(an) * s); ctx.lineTo(Math.cos(an + Math.PI / 4) * s * .28, Math.sin(an + Math.PI / 4) * s * .28); } ctx.closePath(); ctx.fill(); ctx.restore();
}
// la aleta nada hacia la izquierda por el borde de ola de una tarjeta, recortada por el agua; se desvanece en los extremos
export function aletaEnOla(ctx, x, y, w, h, t, vel = 90, alto = 46, amp = 7) {
  const recorrido = w - 80, fx = x + w - 40 - ((t * vel) % recorrido), base = olaY(x, y, w, h, t, fx, amp);
  const vis = clamp(Math.min(fx - (x + 40), x + w - 40 - fx) / 70, 0, 1); if (vis <= 0) return;
  ctx.save(); ctx.globalAlpha *= vis; const cl = new Path2D(); cl.rect(x - 200, y - 400, w + 400, base - (y - 400) + 2); ctx.clip(cl);
  aleta(ctx, fx, base + alto * .18 + Math.sin(t * 8) * alto * .04, alto, 1, -.04); ctx.restore();
  ctx.save(); ctx.globalAlpha *= .9 * vis; ctx.fillStyle = '#fff'; const b = alto / 46;
  for (let k = 0; k < 3; k++) { const bx = fx + alto * .35 + k * 12 * b; ctx.beginPath(); ctx.arc(bx, olaY(x, y, w, h, t, bx, amp) - b, (3.2 + (k % 2) * 2) * b, 0, 7); ctx.fill(); }
  ctx.restore();
}
// avatar redondo con borde pegatina: la imagen de Kyo o, si no hay, el isotipo
export function avatar2027(ctx, cx, cy, R, img) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
  ctx.lineWidth = R * .33; ctx.strokeStyle = C.abisal; ctx.stroke(); ctx.lineWidth = R * .15; ctx.strokeStyle = C.perla; ctx.stroke();
  const g = ctx.createLinearGradient(0, cy - R, 0, cy + R); g.addColorStop(0, C.indigo); g.addColorStop(1, '#1b2466'); ctx.fillStyle = g; ctx.fill(); ctx.clip();
  if (img) { const k = Math.max(2 * R / img.width, 2 * R / img.height), dw = img.width * k, dh = img.height * k; ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh); }
  else isotipo(ctx, cx + R * .06, cy + R * .09, R * 1.8);
  ctx.restore();
}
// entrada (sube del agua con rebote) y salida (se hunde); sal = duración de la salida
export function vida(t, L, ent = .6, sal = .7) {
  const a = E.back(pr(t, 0, ent)), b = E.in(pr(t, L - sal, L));
  return { y: (1 - a) * 90 + b * 120, a: clamp(pr(t, 0, ent * .6) - b, 0, 1), giro: b * .06 };
}
export const pop = (t, t0, d = .35) => E.back(pr(t, t0, t0 + d));
// dibuja fn escalado desde (cx, cy) con el avance k (0 = nada)
export function aparece(ctx, k, cx, cy, fn) { if (k <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(k, 0, 1); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
// "clic" corto (para el cursor)
export function clic(ac, dest, t0, vol) {
  const os = ac.createOscillator(); os.type = 'square'; os.frequency.setValueAtTime(1800, t0); os.frequency.exponentialRampToValueAtTime(900, t0 + .03);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + .05);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
  os.connect(lp).connect(g).connect(dest); os.start(t0); os.stop(t0 + .06);
}
