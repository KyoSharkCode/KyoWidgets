// Kyo Estudio · Piezas de dibujo compartidas: pegatina, destellos, avatar, cursor, botón, entradas y letras
import * as K from '../kit-dibujado.js';
import { rr, rad, imagenEn, clamp, lerp, EASE, kf, fuente, azar, ancho } from './utilidades.js';
import { AC, pegatinaDibujada, L_MAS, L_CHECK2, L_CHECK, L_CIRCULO, morphResorte, movLetra } from './acabado.js';
import { SPK, icono, FLECHA, CHECK, MAS } from './iconos.js';

// Pegatina: borde blanco + contorno oscuro + sombra desplazada hacia abajo
export function pegatina(ctx, x, y, w, h, r, opc) {
  if (AC) return pegatinaDibujada(ctx, x, y, w, h, r, opc);
  const { fill, p, o, ring = 7, out = 6, drop = 14, suave = true } = opc;
  const e = ring + out;
  if (suave) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; rr(ctx, x - e, y - e + drop, w + 2 * e, h + 2 * e, r + e); ctx.fillStyle = o; ctx.fill(); ctx.restore(); }
  rr(ctx, x - e, y - e + drop, w + 2 * e, h + 2 * e, r + e); ctx.fillStyle = o; ctx.fill();
  rr(ctx, x - e, y - e, w + 2 * e, h + 2 * e, r + e); ctx.fill();
  rr(ctx, x - ring, y - ring, w + 2 * ring, h + 2 * ring, r + ring); ctx.fillStyle = p; ctx.fill();
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
export function destello(ctx, cx, cy, tam, color, s, rot, a) {
  if (s <= 0 || a <= 0) return;
  if (AC && AC.k.sombras) { // destello de cómic: contorno oscuro y sin brillo difuminado
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rad(rot)); ctx.scale(s * tam / 100, s * tam / 100); ctx.translate(-50, -50);
    if (AC.amp) K.tiembla(ctx, 50, 50, Math.round(cx), AC.dib, 2.5, 4);
    ctx.lineJoin = 'round'; ctx.lineWidth = 10; ctx.strokeStyle = AC.P.o; ctx.stroke(SPK); ctx.fillStyle = color; ctx.fill(SPK); ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rad(rot)); ctx.scale(s * tam / 100, s * tam / 100); ctx.translate(-50, -50);
  ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 12; ctx.fillStyle = color; ctx.fill(SPK); ctx.restore();
}
// Avatar redondo con borde de pegatina (imagen propia o icono)
export function avatar(ctx, cx, cy, D, P, img, path, u) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy + 8 * u, D / 2 + 11 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + 11 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + 6 * u, 0, Math.PI * 2); ctx.fillStyle = P.p; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill();
  if (img) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2); ctx.clip(); imagenEn(ctx, img, cx - D / 2, cy - D / 2, D, D, 'cubrir'); ctx.restore(); }
  else icono(ctx, path, cx - D * .3, cy - D * .3, D * .6, P.o);
  ctx.restore();
}
// Cursor del ratón (punta en x, y)
export function cursor(ctx, x, y, s, a, u) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1);
  ctx.translate(x, y); ctx.scale(s * 74 * u / 40, s * 74 * u / 40); ctx.translate(-6, -3);
  ctx.save(); ctx.translate(0, 3.2); ctx.fillStyle = 'rgba(10,16,48,.6)'; ctx.fill(FLECHA); ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.fill(FLECHA); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0A1030'; ctx.stroke(FLECHA);
  ctx.restore();
}
// Botón pegatina que pasa de "texto" a "hecho" (con check) al pulsarlo en tClic
export function boton(ctx, x, y, w, h, u, P, tm, tClic, txt, hecho, fTxt, fOk, iconoPath) {
  const cxb = x + w / 2, cyb = y + h / 2;
  const pb = kf(tm, [[tClic - .1, { s: 1 }], [tClic + .05, { s: .9 }], [tClic + .3, { s: 1.08 }], [tClic + .55, { s: 1 }]]);
  ctx.save(); ctx.translate(cxb, cyb); ctx.scale(pb.s, pb.s); ctx.translate(-cxb, -cyb);
  pegatina(ctx, x, y, w, h, h / 2, { fill: P.a, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 7 * u, suave: false });
  ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.clip();
  const bg = kf(tm, [[tClic + .05, { a: 0 }], [tClic + .3, { a: 1 }]]);
  if (bg.a > 0) { ctx.save(); ctx.globalAlpha *= bg.a; ctx.fillStyle = P.ok; ctx.fillRect(x, y, w, h); ctx.restore(); }
  ctx.textBaseline = 'middle';
  const go = kf(tm, [[tClic + .05, { y: 0, a: 1 }], [tClic + .25, { y: -26, a: 0 }]]);
  const morph = !!AC; // acabado dibujado: el icono no se va, se transforma en el ✓
  let xIcA = 0;
  if (morph) { fuente(ctx, fTxt); xIcA = cxb - (ctx.measureText(txt).width + (iconoPath ? 30 * u : 0)) / 2 - 4 * u; }
  if (go.a > 0) {
    ctx.save(); ctx.globalAlpha *= go.a; fuente(ctx, fTxt); const tw = ctx.measureText(txt).width, ic = iconoPath ? 30 * u : 0, tot = tw + ic, x0 = cxb - tot / 2;
    if (iconoPath && !morph) icono(ctx, iconoPath, x0 - 4 * u, cyb - 15 * u + go.y * u, 30 * u, P.o, { trazo: iconoPath === MAS, grosor: 3.2 });
    ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(txt, x0 + ic, cyb + go.y * u + 2 * u); ctx.restore();
  }
  const ok = kf(tm, [[tClic + .1, { s: .4, a: 0 }], [tClic + .4, { s: 1.15, a: 1 }], [tClic + .65, { s: 1, a: 1 }]], EASE.back);
  if (ok.a > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(ok.a, 0, 1); ctx.translate(cxb, cyb); ctx.scale(ok.s, ok.s);
    fuente(ctx, fOk); const tw = ctx.measureText(hecho).width, tot = tw + 38 * u, x0 = -tot / 2;
    if (!morph) icono(ctx, CHECK, x0, -15 * u, 30 * u, P.o, { trazo: true, grosor: 3.4 });
    ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(hecho, x0 + 38 * u, 2 * u); ctx.restore();
  }
  if (morph && (iconoPath === MAS || tm > tClic)) {
    fuente(ctx, fOk); const xIcB = cxb - (ctx.measureText(hecho).width + 38 * u) / 2, p = morphResorte(tm, tClic + .05);
    const ap = iconoPath === MAS ? 1 : clamp((tm - tClic) / .12, 0, 1), sq = K.aplaston(tm, tClic + .3, { fuerza: .2, frec: 3, amort: 9 });
    ctx.save(); ctx.translate(lerp(xIcA, xIcB, p) + 15 * u, cyb); ctx.scale(30 * u / 24 * ap * sq.sx, 30 * u / 24 * ap * sq.sy); ctx.translate(-12, -12);
    ctx.lineWidth = lerp(3.2, 3.4, p); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o;
    ctx.stroke(iconoPath === MAS ? K.morfearTrazo(L_MAS, L_CHECK2, p) : K.morfearTrazo(L_CIRCULO, L_CHECK, p, 40)); ctx.restore();
  }
  const rp = kf(tm, [[tClic - .02, { s: 0, a: 0 }], [tClic + .05, { s: 1, a: .8 }], [tClic + .8, { s: 9, a: 0 }]]);
  if (rp.a > 0) { ctx.beginPath(); ctx.arc(cxb, cyb, 18 * u * rp.s, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${rp.a})`; ctx.fill(); }
  ctx.restore(); ctx.restore();
}
// Entrada/salida estándar de 7 s (o la base que se indique)
const popKF = (fin) => [[0, { s: .2, r: -12, a: 0 }], [.42, { s: 1.06, r: 2, a: 1 }], [.7, { s: 1, r: 0, a: 1 }], [fin - .7, { s: 1, r: 0, a: 1 }], [fin - .42, { s: 1.06, r: -2, a: 1 }], [fin - .02, { s: .15, r: 10, a: 0 }]];
export function inicio(ctx, pos, tm, fin) {
  if (AC && AC.k.muelle) return inicioResorte(ctx, pos, tm, fin);
  const pr = kf(tm, popKF(fin), EASE.back);
  if (pr.a <= 0.001) return false;
  ctx.save(); ctx.globalAlpha = clamp(pr.a, 0, 1);
  ctx.translate(pos.ox, pos.oy); ctx.rotate(rad(pr.r)); ctx.scale(pr.s, pr.s); ctx.translate(-pos.ox, -pos.oy);
  return true;
}
// La misma entrada con resortes: crece pasándose y rebotando; al final se agacha y sale disparada
function inicioResorte(ctx, pos, tm, fin) {
  const R = { frec: 1.8, amort: 5.2 };
  let s, r, a, sx = 1, sy = 1, y = 0;
  if (tm < fin - .82) {
    const p = K.resorte(tm, 0, R), e = K.estirar(K.velocidad(x => K.resorte(x, 0, R), tm), { fuerza: .045, max: .22 });
    s = lerp(.2, 1, p); r = lerp(-12, 0, p); a = clamp(tm / .1, 0, 1); sx = e.ancho; sy = e.largo;
  } else {
    const an = K.anticipa(tm, fin - .64, { largo: .18, fuerza: .14 }), p = clamp((tm - (fin - .64)) / .46, 0, 1), pe = p * p * p;
    const st = p > 0 ? 1 + (AC.k.impacto && AC.k.smear === 'estirado' ? .75 : .22) * Math.sin(Math.PI * Math.min(1, p * 1.4)) : 1;
    s = lerp(1, .15, pe); r = lerp(0, 16, pe); a = 1 - clamp((p - .55) / .45, 0, 1); y = -160 * pe; sx = an.sx / st; sy = an.sy * st;
  }
  if (a <= 0.001) return false;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
  ctx.translate(pos.ox, pos.oy + y); ctx.rotate(rad(r)); ctx.scale(s * sx, s * sy); ctx.translate(-pos.ox, -pos.oy);
  return true;
}
export function balanceo(ctx, t, cx, cy, u, gr = 1) {
  const wb = (1 - Math.cos(2 * Math.PI * t / 3.2)) / 2;
  ctx.translate(cx, cy - 5 * u * wb); ctx.rotate(rad(gr * wb)); ctx.translate(-cx, -cy);
}
export function destellosCaja(ctx, pos, w, h, u, P, tm, t0, tFin) {
  const S = 52 * u;
  [[w - 120 * u - S, -S * .45, '#F4C542', 0], [w + 20 * u - S, h * .35, '#ffffff', .08], [w * .4, h + 14 * u - S * .5, P.a, .15], [-24 * u, h * .2, '#ffffff', .05]].forEach(([x, yy, col, dl]) => {
    const k = kf(tm - dl, [[t0, { s: 0, r: 0, a: 0 }], [t0 + .32, { s: 1.25, r: 50, a: 1 }], [t0 + 1.2, { s: .8, r: 110, a: .9 }], [tFin - .9, { s: .7, r: 200, a: .7 }], [tFin - .45, { s: 0, r: 220, a: 0 }]]);
    destello(ctx, pos.x + x + S / 2, pos.y + yy + S / 2, S, col, k.s, k.r, k.a);
  });
}
export function textoPegatina(ctx, txt, x, y, u, relleno, P, grueso = 1) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 26 * u * grueso; ctx.strokeStyle = P.o; ctx.strokeText(txt, x, y + 6 * u * grueso); ctx.strokeText(txt, x, y);
  ctx.lineWidth = 15 * u * grueso; ctx.strokeStyle = P.p; ctx.strokeText(txt, x, y);
  ctx.fillStyle = relleno; ctx.fillText(txt, x, y);
}
// Silueta de estallido de cómic (picos irregulares que se mueven)
export function caminoEstallido(rx, ry, picos, t, sem) {
  const r = azar(sem), p = new Path2D(), n = picos * 2;
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2 - Math.PI / 2, k = i % 2 ? .7 + r() * .08 : 1 + r() * .12 + Math.sin(t * 7 + i) * .025;
    const x = Math.cos(ang) * rx * k, y = Math.sin(ang) * ry * k;
    i ? p.lineTo(x, y) : p.moveTo(x, y);
  }
  p.closePath(); return p;
}
// Letras tipo pegatina que saltan una a una (títulos grandes)
export function letrasSaltan(ctx, txt, cx, cy, fs, P, tm, tIni, paso, t, maxW) {
  const letras = [...txt], fT = s => `400 ${s}px "Cherry Bomb One"`, esp = fs * .025;
  let anchos = letras.map(c => ancho(ctx, c, fT(fs))), tot = anchos.reduce((a, b) => a + b, 0) + esp * (letras.length - 1);
  if (tot > maxW) { const k = maxW / tot; fs *= k; anchos = anchos.map(a => a * k); tot = maxW; }
  const uu = fs / 250; let x = cx - tot / 2;
  letras.forEach((c, i) => {
    const ti = tIni + i * paso, w = anchos[i], lx = x + w / 2; x += w + esp;
    if (c === ' ') return;
    const a = AC && AC.k.muelle ? movLetra(tm, ti, 110) : kf(tm, [[ti, { y: 110, s: .3, r: -18, a: 0 }], [ti + .22, { y: -22, s: 1.14, r: 6, a: 1 }], [ti + .42, { y: 0, s: 1, r: 0, a: 1 }]], EASE.out);
    if (a.a <= .01) return;
    const bob = tm > ti + .42 ? Math.sin(t * 3 - i * .6) * 7 * uu : 0, rb = (i % 2 ? 3 : -3) + (tm > ti + .42 ? Math.sin(t * 2.4 - i) * 2 : 0);
    ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(lx, cy + a.y * uu + bob); ctx.rotate(rad(a.r + rb)); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1));
    ctx.font = fT(fs); ctx.letterSpacing = '0px'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (AC && AC.k.sombras) { ctx.save(); ctx.globalAlpha *= .55; ctx.fillStyle = ctx.strokeStyle = K.trama(ctx, '#000', 7); ctx.lineWidth = 34 * uu; ctx.strokeText(c, 12 * uu, 34 * uu); ctx.fillText(c, 12 * uu, 34 * uu); ctx.restore(); }
    ctx.lineWidth = 34 * uu; ctx.strokeStyle = P.o; ctx.strokeText(c, 0, 14 * uu); ctx.fillStyle = P.o; ctx.fillText(c, 0, 14 * uu); ctx.strokeText(c, 0, 0);
    ctx.lineWidth = 20 * uu; ctx.strokeStyle = P.p; ctx.strokeText(c, 0, 0);
    const lg = ctx.createLinearGradient(0, -fs * .4, 0, fs * .4); lg.addColorStop(0, i % 2 ? P.a : P.t); lg.addColorStop(1, i % 2 ? P.a2 : P.a);
    ctx.fillStyle = lg; ctx.fillText(c, 0, 0); ctx.restore();
  });
  return { tot, fs };
}
// Chip pegatina con texto (etiquetas de la outro)
export function chipTexto(ctx, txt, cx, cy, u, P, fondo) {
  const f = `700 ${30 * u}px "Fredoka"`, w = ancho(ctx, txt, f) + 56 * u, h = 58 * u;
  pegatina(ctx, cx - w / 2, cy - h / 2, w, h, h / 2, { fill: fondo || P.a, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 8 * u, suave: false });
  fuente(ctx, f); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.o; ctx.fillText(txt, cx, cy + 2 * u);
}
