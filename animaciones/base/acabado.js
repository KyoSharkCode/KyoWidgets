// Kyo Estudio · Acabado "dibujado" (opcional): estado del fotograma, resortes, golpes y morphing
import * as K from '../kit-dibujado.js';
import { paleta, clamp, lerp } from './utilidades.js';

// ---------- acabado "dibujado" (opcional) ----------
// Con o.acabado === 'dibujado' las plantillas envueltas con conAcabado() usan el kit de animación dibujada
// (o.kit permite activar o apagar cada técnica). Sin ese campo todo se dibuja exactamente igual que siempre.
const KIT_DEF = { muelle: true, enDos: false, temblor: false, trazos: true, sombras: true, papel: false, impacto: true, smear: 'estirado', golpe: 'silueta' };
const CAMPO_ACABADO = { k: 'acabado', label: 'Acabado', tipo: 'chips', def: 'limpio', opciones: [['limpio', '✨ Limpio'], ['dibujado', '✏️ Dibujado']] };
export let AC = null; // estado del acabado durante el fotograma que se está dibujando (null = limpio)
export function conAcabado(pl) {
  // el campo "Acabado" va justo después de "Estilo" (o al final si la plantilla no tiene estilo)
  if (!pl.campos.some(c => c.k === 'acabado')) { const i = pl.campos.findIndex(c => c.k === 'tema'); pl.campos.splice(i < 0 ? pl.campos.length : i + 1, 0, CAMPO_ACABADO); }
  if (pl.dibujar._acabado) return pl; // ya envuelta (copias con Object.assign)
  const base = pl.dibujar;
  pl.dibujar = function (ctx, t, o, fmt, W, H) {
    if (o.acabado !== 'dibujado') return base.call(this, ctx, t, o, fmt, W, H);
    const k = Object.assign({}, KIT_DEF, o.kit);
    AC = { k, P: paleta(o), dib: k.temblor ? K.dibujo(t) : 0, amp: k.temblor ? 1 : 0, golpe: null, tReal: t };
    let d;
    try { base.call(this, ctx, k.enDos ? K.enDos(t) : t, o, fmt, W, H); } finally { d = AC; AC = null; }
    if (k.impacto && d.golpe != null && K.esImpacto(t, d.golpe, 2)) { if (k.golpe === 'invertido') K.invertir(ctx); else if (d.silGlobal) K.silueta(ctx, d.P.p); }
    if (k.papel) K.papel(ctx, K.dibujo(t), { fuerza: .12 });
  };
  pl.dibujar._acabado = true;
  return pl;
}
// ¿Toca fotograma de impacto en silueta? (solo con acabado dibujado)
export const siluetaEn = tG => !!AC && AC.k.impacto && AC.k.golpe === 'silueta' && K.esImpacto(AC.tReal, tG, 2);
// Pegatina dibujada: contornos que pueden temblar, sombra con trama y borde blanco que se traza solo (trazo < 1)
export function pegatinaDibujada(ctx, x, y, w, h, r, { fill, p, o, ring = 7, out = 6, drop = 14, suave = true, trazo = 1 }) {
  const e = ring + out, sem = (Math.round(w) * 7 + Math.round(h) * 13) | 0, A = AC.amp * 2.2 * ring / 7;
  const forma = (xx, yy, ww, hh, r2, n) => K.rrDibujado(xx, yy, ww, hh, r2, { sem: sem + n, dib: AC.dib, amp: A });
  const caida = forma(x - e, y - e + drop, w + 2 * e, h + 2 * e, r + e, 1), borde = forma(x - e, y - e, w + 2 * e, h + 2 * e, r + e, 2);
  if (suave) {
    if (AC.k.sombras) K.sombraDura(ctx, caida.camino, drop * .9, drop * 1.6, '#000', { paso: Math.max(5, ring * 1.4), alfa: .5 });
    else { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; ctx.fillStyle = o; ctx.fill(caida.camino); ctx.restore(); }
  }
  ctx.fillStyle = o; ctx.fill(caida.camino); ctx.fill(borde.camino);
  if (AC.k.trazos && trazo < 1) {
    const m = forma(x - ring / 2, y - ring / 2, w + ring, h + ring, r + ring / 2, 3);
    ctx.save(); ctx.strokeStyle = p; ctx.lineWidth = ring * 1.15; ctx.lineCap = 'round'; K.trazar(ctx, m.camino, m.largo, trazo); ctx.restore();
  } else { ctx.fillStyle = p; ctx.fill(forma(x - ring, y - ring, w + 2 * ring, h + 2 * ring, r + ring, 4).camino); }
  const cara = forma(x, y, w, h, r, 5).camino;
  ctx.fillStyle = fill; ctx.fill(cara);
  return cara;
}
// ---------- morphing (solo con acabado dibujado) ----------
const _morfs = {};
// Pareja de formas cerradas (texto d de SVG, en el espacio 24×24 de los iconos) lista para morfear
export const parMorph = (clave, dA, dB) => _morfs[clave] || (_morfs[clave] = K.emparejar(K.puntosDe(dA, 96), K.puntosDe(dB, 96)));
const D_PLAY = 'M8 5.5v13l11-6.5Z', D_PUNTO = 'M12 5.5A6.5 6.5 0 1 1 11.99 5.5Z';
export const D_REGALO_SIL = 'M3.5 8.5H8.2C6.4 8 5.9 6.9 6.8 6.1 8 5 10.6 6.6 12 8.3 13.4 6.6 16 5 17.2 6.1 18.1 6.9 17.6 8 15.8 8.5H20.5V13H19V20.5H5V13H3.5Z';
export const D_CAMISETA = 'M8.5 3.5 3 6.5l2.2 5 2.8-1.3V20.5h8V10.2l2.8 1.3 2.2-5-5.5-3a3.5 3.5 0 0 1-7 0Z';
export const D_ESTRELLA = 'M12 2.2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.3l-6 3.3 1.3-6.7-5-4.7 6.8-.8Z';
export const D_CORAZON = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z';
// Iconos de línea como polilíneas: "+", "✓" y un círculo que se desenrolla en "✓"
export const L_MAS = [[[12, 5], [12, 19]], [[5, 12], [19, 12]]], L_CHECK2 = [[[4, 12.5], [9, 17.5]], [[9, 17.5], [20, 6.5]]];
export const L_CHECK = [[[4, 12.5], [9, 17.5], [20, 6.5]]];
export const L_CIRCULO = [Array.from({ length: 33 }, (_, i) => { const a = Math.PI - i / 32 * Math.PI * 2; return [12 + 8 * Math.cos(a), 12 + 8 * Math.sin(a)]; })];
export const morphResorte = (tm, t0) => tm <= t0 ? 0 : K.resorte(tm, t0, { frec: 1.8, amort: 6.5 });
// Punto "en directo" que nace como ▶ y se transforma en círculo
export function puntoVivo(ctx, cx, cy, r, tm, t0) {
  const p = morphResorte(tm, t0), sc = r / 6.5 * (1 + .6 * (1 - clamp(p, 0, 1)));
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-12, -12);
  ctx.fillStyle = '#fff'; ctx.fill(p > 0 ? K.morfear(...parMorph('vivo', D_PLAY, D_PUNTO), p) : new Path2D(D_PLAY)); ctx.restore();
  return p;
}
// Pieza que aparece con resorte y se aplasta al asentarse (acabado dibujado)
export function popResorte(tm, t0, { s0 = .2, r0 = 0, y0 = 0 } = {}) {
  if (tm <= t0) return { s: s0, r: r0, y: y0, a: 0, sx: 1, sy: 1 };
  const p = K.resorte(tm, t0, { frec: 2, amort: 6.5 }), ap = K.aplaston(tm, t0 + .12, { fuerza: .2, frec: 3, amort: 9 });
  return { s: lerp(s0, 1, p), r: lerp(r0, 0, p), y: lerp(y0, 0, p), a: clamp((tm - t0) / .08, 0, 1), sx: ap.sx, sy: ap.sy };
}
// Pieza que cae de golpe (de grande a su tamaño), se estira en los últimos fotogramas y se aplasta al chocar
export function caidaGolpe(tm, t0, t1, s0, r0, r1) {
  if (tm < t1) {
    const p = clamp((tm - t0) / (t1 - t0), 0, 1), q = Math.pow(p, 1.5), e = AC.k.impacto && AC.k.smear === 'estirado' ? 1 + 1.1 * clamp((p - .45) / .55, 0, 1) : 1;
    return { s: lerp(s0, 1, q), r: lerp(r0, r1, q), a: clamp(p * 4, 0, 1), sx: 1 / Math.sqrt(e), sy: e };
  }
  const ap = K.aplaston(tm, t1, { fuerza: .26, frec: 3, amort: 8 });
  return { s: 1, r: r1 - 4 * K.impulso(tm, t1, { frec: 3, amort: 8 }), a: 1, sx: ap.sx, sy: ap.sy };
}
// Golpe (acabado dibujado): líneas de impacto alrededor de un punto y fotograma de impacto en tG.
// global = la plantilla es transparente y el fotograma en silueta puede cubrir todo lo dibujado
export function golpeEn(ctx, cx, cy, rx, ry, tm, tG, color, { global = false, n = 16, grosor = 20, sem = 7 } = {}) {
  if (!AC || !AC.k.impacto) return;
  AC.golpe = tG; if (global) AC.silGlobal = true;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); K.rafaga(ctx, 0, 0, (tm - tG) / .45, { r0: rx * .62, r1: rx * 1.1, n, color, grosor, sem }); ctx.restore();
}
// Entrada de una letra que salta: con resortes se estira al subir y rebota como gelatina
export function movLetra(tm, ti, y0) {
  const R = { frec: 2, amort: 6 }, x = tm - ti;
  if (x <= 0) return { y: y0, s: .3, r: -18, a: 0, sx: 1, sy: 1 };
  const p = K.resorte(tm, ti, R), e = K.estirar(K.velocidad(q => K.resorte(q, ti, R), tm), { fuerza: .05, max: .3 });
  return { y: lerp(y0, 0, p), s: lerp(.3, 1, p), r: lerp(-18, 0, p), a: clamp(x / .08, 0, 1), sx: e.ancho, sy: e.largo };
}
