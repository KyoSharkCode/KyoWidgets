// Kyo Estudio · Utilidades generales: tiempos, easing, fotogramas clave, texto, paletas, campos comunes y colocación

// ---------- utilidades ----------
export const rad = d => d * Math.PI / 180;
export const lerp = (a, b, p) => a + (b - a) * p;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const EASE = {
  lin: p => p,
  out: p => 1 - Math.pow(1 - p, 3),
  io: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  back: p => { const c1 = 1.70158 * 1.35, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
};
// Fotogramas clave: [[t, {prop:valor}], …] → valores interpolados en t
export function kf(t, frames, ease = EASE.out) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [t0, a] = frames[i - 1], [t1, b] = frames[i], p = ease((t - t0) / (t1 - t0 || 1)), o = {};
      for (const k in b) o[k] = lerp(a[k] ?? b[k], b[k], p);
      return o;
    }
  }
  return frames[frames.length - 1][1];
}
// Estira la parte central de la animación para cumplir la duración elegida
export function tiempo(t, L, finIntro, baseSalida, baseFin, largoSalida) {
  const iniSalida = L - largoSalida;
  if (t <= finIntro) return t;
  if (t >= iniSalida) return baseSalida + (t - iniSalida);
  return finIntro + (t - finIntro) * (baseSalida - finIntro) / Math.max(.01, iniSalida - finIntro);
}
export const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2))); };
export function fuente(ctx, f, esp = 0) { ctx.font = f; ctx.letterSpacing = esp + 'px'; }
export function ancho(ctx, txt, f, esp = 0) { fuente(ctx, f, esp); return ctx.measureText(txt).width; }
// ---------- temas ----------
export const TEMAS = {
  marea: { a: '#6FE3F0', a2: '#3A7BD5', c: '#0f1a4a', t: '#F5F3FB', s: '#C9E6F2', o: '#0A1030', p: '#ffffff', ok: '#7BE38F' },
  octubre: { a: '#FF8A2B', a2: '#9B6BFF', c: '#1a1240', t: '#F5F3FB', s: '#e3d9ff', o: '#0a0720', p: '#ffffff', ok: '#7BE38F' },
  navidad: { a: '#FF5A6E', a2: '#F4C542', c: '#0e1a48', t: '#F5F3FB', s: '#f3e7c4', o: '#060b22', p: '#ffffff', ok: '#5BD99A' }
};
export function paleta(o) {
  const P = Object.assign({}, TEMAS[o.tema] || TEMAS.marea);
  if (o.propios === 'si') { if (o.acento) P.a = o.acento; if (o.caja) P.c = o.caja; if (o.borde) P.p = o.borde; }
  return P;
}
// Campos comunes a todas las plantillas
export const COMUNES = [
  { k: 'tema', label: 'Estilo', tipo: 'chips', def: 'marea', opciones: [['marea', '🌊 Normal'], ['octubre', '🎃 Halloween'], ['navidad', '🎄 Navidad']] },
  { k: 'propios', label: 'Colores', tipo: 'chips', def: 'no', opciones: [['no', 'Los del estilo'], ['si', 'Mis colores']] },
  { k: 'acento', label: 'Acento', tipo: 'color', def: '#6FE3F0', si: 'propios=si' },
  { k: 'caja', label: 'Caja', tipo: 'color', def: '#0f1a4a', si: 'propios=si' },
  { k: 'borde', label: 'Borde pegatina', tipo: 'color', def: '#ffffff', si: 'propios=si' },
  { k: 'posh', label: 'Posición en horizontal', tipo: 'chips', def: 'abajo-izq', opciones: [['abajo-izq', '↙ Abajo izq.'], ['abajo-der', '↘ Abajo der.'], ['arriba-izq', '↖ Arriba izq.'], ['arriba-der', '↗ Arriba der.'], ['centro', '⊙ Centro']] },
  { k: 'posv', label: 'Posición en vertical', tipo: 'chips', def: 'abajo', opciones: [['arriba', '⬆ Arriba'], ['centro', '⊙ Centro'], ['abajo', '⬇ Abajo (zona segura)']] },
  { k: 'tam', label: 'Tamaño', tipo: 'chips', def: '1', opciones: [['0.75', 'Pequeño'], ['1', 'Normal'], ['1.25', 'Grande'], ['1.5', 'Muy grande']] }
];
// Coloca una caja de w×h en el lienzo según la posición elegida; devuelve también el punto de origen de la animación
export function colocar(fmt, o, W, H, w, h, arriba) {
  if (fmt === 'vertical') {
    const x = (W - w) / 2, y = o.posv === 'arriba' ? 300 : o.posv === 'centro' ? (H - h) / 2 : 1060;
    return { x, y, ox: x + w / 2, oy: y + h / 2 };
  }
  const m = 90, pos = o.posh;
  let x = pos.endsWith('der') ? W - m - w : m, y = pos.startsWith('arriba') ? m + arriba : H - 100 - h;
  if (pos === 'centro') { x = (W - w) / 2; y = (H - h) / 2; }
  const ox = pos === 'centro' ? x + w / 2 : pos.endsWith('der') ? x + w : x;
  const oy = pos === 'centro' ? y + h / 2 : pos.startsWith('arriba') ? y : y + h;
  return { x, y, ox, oy };
}
export const conDef = (lista, cambios) => lista.map(c => cambios[c.k] !== undefined ? Object.assign({}, c, { def: cambios[c.k] }) : c);
// Parte un texto en líneas que quepan en maxW (máx. n líneas)
export function envolver(ctx, txt, f, maxW, n = 2) {
  fuente(ctx, f); const pal = String(txt || '').split(/\s+/).filter(Boolean), lin = [];
  let cur = '';
  pal.forEach(p => { const prueba = cur ? cur + ' ' + p : p; if (ctx.measureText(prueba).width <= maxW || !cur) cur = prueba; else { lin.push(cur); cur = p; } });
  if (cur) lin.push(cur);
  if (lin.length > n) { const resto = lin.slice(n - 1).join(' '); lin.length = n - 1; lin.push(resto); }
  return lin;
}
// Imagen dentro de un rectángulo: 'cubrir' (recorta) o 'contener' (entera)
export function imagenEn(ctx, img, x, y, w, h, modo = 'cubrir') {
  const iw = img.width, ih = img.height, k = modo === 'cubrir' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * k, dh = ih * k; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
export const IMG_OPC = { k: 'imagen', label: 'Tu imagen (avatar o logo, opcional)', tipo: 'imagen' };
// Números pseudoaleatorios con semilla: la misma semilla da siempre la misma serie
export function azar(semilla) { let s = semilla >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
export const COLORES = COMUNES.slice(0, 5);
// Texto que se encoge hasta caber en maxW
export function fuenteQueCabe(ctx, txt, peso, tam, fam, maxW) {
  let t = tam; fuente(ctx, `${peso} ${t}px "${fam}"`);
  while (t > 8 && ctx.measureText(txt).width > maxW) { t -= 1; fuente(ctx, `${peso} ${t}px "${fam}"`); }
  return t;
}
export const FORMATOS = { horizontal: { w: 1920, h: 1080 }, vertical: { w: 1080, h: 1920 }, retrato: { w: 1080, h: 1350 }, cuadrado: { w: 1080, h: 1080 } };
