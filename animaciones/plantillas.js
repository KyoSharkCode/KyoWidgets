// Kyo Estudio · Plantillas de animación (se dibujan en un <canvas>, fotograma a fotograma)
// Cada plantilla: { id, nombre, desc, fps, campos:[…], duracion(o), dibujar(ctx, t, o, fmt, W, H) }
// Para añadir una animación nueva basta con añadir otra plantilla a la lista del final.

// ---------- utilidades ----------
const rad = d => d * Math.PI / 180;
const lerp = (a, b, p) => a + (b - a) * p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const EASE = {
  lin: p => p,
  out: p => 1 - Math.pow(1 - p, 3),
  io: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  back: p => { const c1 = 1.70158 * 1.35, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
};
// Fotogramas clave: [[t, {prop:valor}], …] → valores interpolados en t
function kf(t, frames, ease = EASE.out) {
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
function tiempo(t, L, finIntro, baseSalida, baseFin, largoSalida) {
  const iniSalida = L - largoSalida;
  if (t <= finIntro) return t;
  if (t >= iniSalida) return baseSalida + (t - iniSalida);
  return finIntro + (t - finIntro) * (baseSalida - finIntro) / Math.max(.01, iniSalida - finIntro);
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2))); };
// Pegatina: borde blanco + contorno oscuro + sombra desplazada hacia abajo
function pegatina(ctx, x, y, w, h, r, { fill, p, o, ring = 7, out = 6, drop = 14, suave = true }) {
  const e = ring + out;
  if (suave) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20; rr(ctx, x - e, y - e + drop, w + 2 * e, h + 2 * e, r + e); ctx.fillStyle = o; ctx.fill(); ctx.restore(); }
  rr(ctx, x - e, y - e + drop, w + 2 * e, h + 2 * e, r + e); ctx.fillStyle = o; ctx.fill();
  rr(ctx, x - e, y - e, w + 2 * e, h + 2 * e, r + e); ctx.fill();
  rr(ctx, x - ring, y - ring, w + 2 * ring, h + 2 * ring, r + ring); ctx.fillStyle = p; ctx.fill();
  rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
}
function fuente(ctx, f, esp = 0) { ctx.font = f; ctx.letterSpacing = esp + 'px'; }
function ancho(ctx, txt, f, esp = 0) { fuente(ctx, f, esp); return ctx.measureText(txt).width; }
const SPK = new Path2D('M50 0C53 38 62 47 100 50 62 53 53 62 50 100 47 62 38 53 0 50 38 47 47 38 50 0Z');
function destello(ctx, cx, cy, tam, color, s, rot, a) {
  if (s <= 0 || a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.rotate(rad(rot)); ctx.scale(s * tam / 100, s * tam / 100); ctx.translate(-50, -50);
  ctx.shadowColor = 'rgba(255,255,255,.7)'; ctx.shadowBlur = 12; ctx.fillStyle = color; ctx.fill(SPK); ctx.restore();
}
const BOLSA = new Path2D('M5 8h14l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3Z');
const ASA = new Path2D('M9 10V6.5a3 3 0 0 1 6 0V10');
const CORAZON = new Path2D('M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z');
const CHECK = new Path2D('M4 12.5l5 5L20 6.5');
const FLECHA = new Path2D('M6 3 L6 31 L13 24.5 L18 36 L23 34 L18 22.8 L27.5 22.8 Z');
const ALETA = new Path2D('M6 78 C 30 70 46 40 78 6 C 80 36 92 60 116 78 Z');

// ---------- temas ----------
const TEMAS = {
  marea: { a: '#6FE3F0', a2: '#3A7BD5', c: '#0f1a4a', t: '#F5F3FB', s: '#C9E6F2', o: '#0A1030', p: '#ffffff', ok: '#7BE38F' },
  octubre: { a: '#FF8A2B', a2: '#9B6BFF', c: '#1a1240', t: '#F5F3FB', s: '#e3d9ff', o: '#0a0720', p: '#ffffff', ok: '#7BE38F' },
  navidad: { a: '#FF5A6E', a2: '#F4C542', c: '#0e1a48', t: '#F5F3FB', s: '#f3e7c4', o: '#060b22', p: '#ffffff', ok: '#5BD99A' }
};
function paleta(o) {
  const P = Object.assign({}, TEMAS[o.tema] || TEMAS.marea);
  if (o.propios === 'si') { if (o.acento) P.a = o.acento; if (o.caja) P.c = o.caja; if (o.borde) P.p = o.borde; }
  return P;
}
// Campos comunes a todas las plantillas
const COMUNES = [
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
function colocar(fmt, o, W, H, w, h, arriba) {
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

// =====================================================================
// 1 · Pegatina "Usa el código"
// =====================================================================
const pegatinaCodigo = {
  id: 'pegatina-codigo',
  nombre: 'Pegatina del código',
  desc: 'Entra rebotando, el código cae de golpe con destellos, late a mitad y sale girando.',
  fps: 30,
  campos: [
    { k: 'chip', label: 'Etiqueta de arriba', tipo: 'texto', def: '★ Código de creadora', max: 32 },
    { k: 'l1', label: 'Primera línea', tipo: 'texto', def: 'Usa el código', max: 36 },
    { k: 'codigo', label: 'Texto grande', tipo: 'texto', def: 'KYOSUMI', max: 16 },
    { k: 'l2', label: 'Última línea', tipo: 'texto', def: 'en la tienda de', max: 36 },
    { k: 'dest', label: 'Palabra destacada (al final)', tipo: 'texto', def: 'Fortnite', max: 20 },
    { k: 'icono', label: 'Icono de la última línea', tipo: 'chips', def: 'bolsa', opciones: [['bolsa', '🛍 Bolsa'], ['corazon', '💙 Corazón'], ['ninguno', 'Ninguno']] },
    { k: 'aleta', label: 'Aleta de tiburón', tipo: 'chips', def: 'si', opciones: [['si', 'Sí'], ['no', 'No']] },
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6.6, min: 3.5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6.6, 3.5, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o);
    const tm = tiempo(t, L, 1.75, 5.88, 6.6, .72);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.36 : 1) * (Number(o.tam) || 1);
    // --- medidas ---
    const F = uu => ({
      chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3.2 * uu,
      l1: `700 ${46 * uu}px "Fredoka"`, code: `400 ${94 * uu}px "Cherry Bomb One"`, codeE: 1.9 * uu, l2: `700 ${40 * uu}px "Fredoka"`
    });
    const medir = uu => {
      const f = F(uu), padX = 38 * uu;
      const chipW = o.chip ? ancho(ctx, o.chip.toUpperCase(), f.chip, f.chipE) + 32 * uu : 0;
      const l1W = o.l1 ? ancho(ctx, o.l1, f.l1) : 0;
      const codeW = ancho(ctx, o.codigo || ' ', f.code, f.codeE) + 68 * uu;
      const ico = o.icono === 'ninguno' ? 0 : 56 * uu;
      const l2txt = (o.l2 || '') + (o.l2 && o.dest ? ' ' : '');
      const l2W = (o.l2 || o.dest) ? ico + ancho(ctx, l2txt + (o.dest || ''), f.l2) : 0;
      const w = Math.max((vert ? 647 : 640) * uu, Math.max(chipW, l1W, codeW + 20 * uu, l2W) + 2 * padX);
      let h = 22 * uu;
      if (o.chip) h += 40 * uu;
      if (o.l1) h += 57 * uu;
      h += 10 * uu + 112 * uu + 14 * uu;
      if (o.l2 || o.dest) h += 48 * uu;
      h += 28 * uu;
      return { f, padX, chipW, l1W, codeW, ico, l2txt, l2W, w, h };
    };
    let m = medir(u);
    const maxW = W - 150;
    if (m.w > maxW) { u *= maxW / m.w; m = medir(u); }
    const { f, padX, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 80 * u);
    const al = vert ? 'center' : 'left';
    // --- animación general ---
    const pr = kf(tm, [[0, { s: .2, r: -14, a: 0 }], [.42, { s: 1.07, r: 2, a: 1 }], [.7, { s: 1, r: 0, a: 1 }], [5.88, { s: 1, r: 0, a: 1 }], [6.16, { s: 1.07, r: -2, a: 1 }], [6.58, { s: .15, r: 10, a: 0 }]], EASE.back);
    if (pr.a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = clamp(pr.a, 0, 1);
    ctx.translate(pos.ox, pos.oy); ctx.rotate(rad(pr.r)); ctx.scale(pr.s, pr.s); ctx.translate(-pos.ox, -pos.oy);
    // balanceo suave
    const wb = (1 - Math.cos(2 * Math.PI * t / 3.2)) / 2, cx = pos.x + w / 2, cy = pos.y + h / 2;
    ctx.translate(cx, cy - 6 * u * wb); ctx.rotate(rad(1.2 * wb)); ctx.translate(-cx, -cy);
    // aleta (detrás de la tarjeta)
    if (o.aleta !== 'no') {
      const fa = kf(tm, [[.98, { y: 70, a: 0 }], [1.4, { y: -6, a: 1 }], [1.68, { y: 0, a: 1 }]], EASE.back);
      if (fa.a > 0) {
        ctx.save(); ctx.globalAlpha *= clamp(fa.a, 0, 1);
        ctx.translate(pos.x + w - 46 * u - 120 * u, pos.y - 78 * u + fa.y * u); ctx.scale(u, u);
        ctx.fillStyle = P.c; ctx.fill(ALETA); ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = P.p; ctx.stroke(ALETA);
        ctx.restore();
      }
    }
    // tarjeta (inclinada -2°)
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-2)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle';
    let y = pos.y + 22 * u;
    const xAl = ww => al === 'left' ? pos.x + padX : pos.x + (w - ww) / 2;
    if (o.chip) {
      const a = kf(tm, [[.28, { y: 16, a: 0 }], [.63, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; const x = xAl(m.chipW);
      rr(ctx, x, y + a.y * u, m.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(o.chip.toUpperCase(), x + 16 * u, y + 17 * u + a.y * u + 1);
      ctx.restore(); y += 40 * u;
    }
    if (o.l1) {
      const a = kf(tm, [[.49, { x: -40, a: 0 }], [.84, { x: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.l1); ctx.fillStyle = P.t; ctx.textAlign = 'left';
      ctx.fillText(o.l1, xAl(m.l1W) + a.x * u, y + 26 * u); ctx.restore(); y += 57 * u;
    }
    // código
    y += 10 * u;
    {
      const c = kf(tm, [[.63, { s: 2.4, r: -12, a: 0 }], [.91, { s: .92, r: 5, a: 1 }], [1.12, { s: 1.06, r: 2, a: 1 }], [1.33, { s: 1, r: 3, a: 1 }], [3.22, { s: 1, r: 3, a: 1 }], [3.43, { s: 1.12, r: -2, a: 1 }], [3.71, { s: 1, r: 3, a: 1 }]], EASE.back);
      const cw = m.codeW, ch = 112 * u, x = al === 'left' ? pos.x + padX - 6 * u : pos.x + (w - cw) / 2;
      const ccx = x + cw / 2, ccy = y + ch / 2;
      if (c.a > 0.01) {
        ctx.save(); ctx.globalAlpha *= clamp(c.a, 0, 1);
        ctx.translate(ccx, ccy); ctx.rotate(rad(c.r)); ctx.scale(c.s, c.s); ctx.translate(-ccx, -ccy);
        pegatina(ctx, x, y, cw, ch, 24 * u, { fill: P.a, p: P.p, o: P.o, ring: 7 * u, out: 5 * u, drop: 10 * u, suave: false });
        fuente(ctx, f.code, f.codeE); ctx.fillStyle = P.o; ctx.textAlign = 'center';
        ctx.fillText(o.codigo || '', ccx, ccy + 4 * u);
        // brillo
        const sh = tm < 3 ? kf(tm, [[1.4, { x: -.6 }], [2.1, { x: 1.4 }]], EASE.io) : kf(tm, [[4.06, { x: -.6 }], [4.62, { x: 1.4 }]], EASE.io);
        if (sh.x > -.6 && sh.x < 1.4) {
          ctx.save(); rr(ctx, x, y, cw, ch, 24 * u); ctx.clip();
          const bx = x + sh.x * cw, bw = .32 * cw;
          ctx.translate(bx + bw / 2, ccy); ctx.transform(1, 0, Math.tan(rad(-20)), 1, 0, 0);
          const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(-bw / 2, -ch * .7, bw, ch * 1.4); ctx.restore();
        }
        ctx.restore();
      }
      y += ch + 14 * u;
    }
    if (o.l2 || o.dest) {
      const a = kf(tm, [[1.19, { y: 24, a: 0 }], [1.61, { y: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
      let x = xAl(m.l2W); const yy = y + 24 * u + a.y * u;
      if (o.icono !== 'ninguno') {
        ctx.save(); ctx.translate(x, yy - 22 * u); ctx.scale(44 * u / 24, 44 * u / 24);
        ctx.fillStyle = P.a; ctx.strokeStyle = P.a;
        if (o.icono === 'corazon') ctx.fill(CORAZON); else { ctx.fill(BOLSA); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(ASA); }
        ctx.restore(); x += 56 * u;
      }
      fuente(ctx, f.l2); ctx.textAlign = 'left';
      ctx.fillStyle = P.t; ctx.fillText(m.l2txt, x, yy); x += ctx.measureText(m.l2txt).width;
      ctx.fillStyle = P.a; ctx.fillText(o.dest || '', x, yy);
      ctx.restore();
    }
    ctx.restore(); // tarjeta
    // destellos
    const sp = [[-26, 120, '#ffffff', .05, 'l'], [10, 160, '#F4C542', .12, 'r'], [-30, -40, P.a, 0, 'rb'], [.4, -40, '#ffffff', .18, 'pb'], [.3, -30, '#F4C542', .09, 'pt']];
    const S = 56 * u;
    sp.forEach(([a, b, col, dl, modo]) => {
      let x, yy;
      if (modo === 'l') { x = pos.x + a * u; yy = pos.y + b * u; }
      else if (modo === 'r') { x = pos.x + w - b * 0 - 10 * u - S; yy = pos.y + 160 * u; }
      else if (modo === 'rb') { x = pos.x + w + 30 * u - S; yy = pos.y + h - 40 * u - S; }
      else if (modo === 'pb') { x = pos.x + w * a; yy = pos.y + h + 40 * u - S; }
      else { x = pos.x + w * a; yy = pos.y - 30 * u; }
      const k = kf(tm - dl, [[.98, { s: 0, r: 0, a: 0 }], [1.26, { s: 1.25, r: 40, a: 1 }], [1.96, { s: .8, r: 90, a: .9 }], [3.08, { s: .7, r: 120, a: .6 }], [3.5, { s: 1.15, r: 160, a: 1 }], [4.34, { s: .7, r: 200, a: .7 }], [5.88, { s: .7, r: 260, a: .7 }], [6.3, { s: 0, r: 280, a: 0 }]]);
      destello(ctx, x + S / 2, yy + S / 2, S, col, k.s, k.r, k.a);
    });
    ctx.restore();
  }
};

// =====================================================================
// 2 · Barra del código (se escribe y se pulsa Guardar)
// =====================================================================
const barraCodigo = {
  id: 'barra-codigo',
  nombre: 'Barra del código',
  desc: 'Se escribe el código letra a letra, el cursor pulsa el botón y cambia a "¡Guardado!".',
  fps: 30,
  campos: [
    { k: 'etiqueta', label: 'Título de la barra', tipo: 'texto', def: 'Código de creadora', max: 32 },
    { k: 'chip', label: 'Etiqueta de la derecha', tipo: 'texto', def: '★ Tienda de Fortnite', max: 28 },
    { k: 'ph', label: 'Texto de ejemplo en la barra', tipo: 'texto', def: 'Escribe el código…', max: 30 },
    { k: 'codigo', label: 'Lo que se escribe', tipo: 'texto', def: 'KYOSUMI', max: 16 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Guardar', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Guardado!', max: 14 },
    { k: 'gracias', label: 'Mensaje final', tipo: 'texto', def: '¡Gracias por apoyarme!', max: 44 },
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7.8, min: 5.5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7.8, 5.5, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o);
    const tm = tiempo(t, L, 4.8, 7.04, 7.8, .76);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.12 : 1) * (Number(o.tam) || 1);
    const codigo = o.codigo || '';
    const medir = uu => {
      const f = { lbl: `700 ${34 * uu}px "Fredoka"`, chip: `700 ${18 * uu}px "Chakra Petch"`, chipE: 2.9 * uu, ph: `600 ${36 * uu}px "Fredoka"`, typed: `400 ${74 * uu}px "Cherry Bomb One"`, typedE: 2.2 * uu, btn: `700 ${40 * uu}px "Fredoka"`, ok: `700 ${34 * uu}px "Fredoka"`, thx: `700 ${30 * uu}px "Fredoka"` };
      const lblW = o.etiqueta ? ancho(ctx, o.etiqueta, f.lbl) : 0;
      const chipW = o.chip ? ancho(ctx, o.chip.toUpperCase(), f.chip, f.chipE) + 28 * uu : 0;
      const typW = ancho(ctx, codigo, f.typed, f.typedE);
      const phW = o.ph ? ancho(ctx, o.ph, f.ph) : 0;
      const btnW = Math.max(250 * uu, ancho(ctx, o.boton || '', f.btn) + 64 * uu, ancho(ctx, o.hecho || '', f.ok) + 40 * uu + 56 * uu);
      const fieldW = Math.max(typW + 26 * uu + 40 * uu, phW + 56 * uu, 420 * uu);
      const thxW = o.gracias ? ancho(ctx, o.gracias, f.thx) + 44 * uu : 0;
      const padX = 30 * uu;
      const w = Math.max((vert ? 822 : 860) * uu, fieldW + 16 * uu + btnW + 2 * padX, lblW + chipW + 30 * uu + 2 * padX, thxW + 2 * padX);
      const h = 22 * uu + 40 * uu + 14 * uu + 112 * uu + (o.gracias ? 14 * uu + 38 * uu : 0) + 26 * uu;
      return { f, lblW, chipW, typW, btnW, fieldW: w - 2 * padX - 16 * uu - btnW, thxW, padX, w, h };
    };
    let m = medir(u);
    const maxW = W - 150;
    if (m.w > maxW) { u *= maxW / m.w; m = medir(u); }
    const { f, padX, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    const pr = kf(tm, [[0, { s: .2, r: -12, a: 0 }], [.48, { s: 1.06, r: 2, a: 1 }], [.72, { s: 1, r: 0, a: 1 }], [7.04, { s: 1, r: 0, a: 1 }], [7.36, { s: 1.06, r: -2, a: 1 }], [7.76, { s: .15, r: 10, a: 0 }]], EASE.back);
    if (pr.a <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = clamp(pr.a, 0, 1);
    ctx.translate(pos.ox, pos.oy); ctx.rotate(rad(pr.r)); ctx.scale(pr.s, pr.s); ctx.translate(-pos.ox, -pos.oy);
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    // caja (inclinada -1.5°)
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 32 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle';
    let y = pos.y + 22 * u;
    if (o.etiqueta) { fuente(ctx, f.lbl); ctx.fillStyle = P.t; ctx.textAlign = 'left'; ctx.fillText(o.etiqueta, pos.x + padX, y + 20 * u); }
    if (o.chip) {
      const x = pos.x + w - padX - m.chipW; rr(ctx, x, y + 5 * u, m.chipW, 30 * u, 15 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(o.chip.toUpperCase(), x + 14 * u, y + 20 * u + 1);
    }
    y += 40 * u + 14 * u;
    // campo de texto
    const fx = pos.x + padX, fw = m.fieldW, fh = 112 * u;
    rr(ctx, fx, y, fw, fh, 22 * u); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.save(); rr(ctx, fx, y, fw, fh, 22 * u); ctx.clip();
    ctx.fillStyle = 'rgba(10,16,48,.12)'; ctx.fillRect(fx, y, fw, 6 * u);
    ctx.lineWidth = 8 * u; ctx.strokeStyle = P.o; rr(ctx, fx, y, fw, fh, 22 * u); ctx.stroke(); ctx.restore();
    const n = codigo.length, paso = n ? Math.min(.2, 1.4 / n) : .2, t0 = 1.05;
    if (o.ph && tm < 1.0) { fuente(ctx, f.ph); ctx.fillStyle = '#9aa3c7'; ctx.textAlign = 'left'; ctx.fillText(o.ph, fx + 28 * u, y + fh / 2); }
    fuente(ctx, f.typed, f.typedE); ctx.textAlign = 'left'; ctx.fillStyle = P.o;
    let tx = fx + 26 * u, caretX = tx;
    for (let i = 0; i < n; i++) {
      const ti = t0 + i * paso, ch = codigo[i], cw = ctx.measureText(ch).width + f.typedE;
      if (tm < ti) break;
      const k = kf(tm, [[ti, { s: .6, y: 20, a: 0 }], [ti + .13, { s: 1.15, y: -6, a: 1 }], [ti + .22, { s: 1, y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= clamp(k.a, 0, 1); ctx.translate(tx + cw / 2, y + fh / 2 + 6 * u + k.y * u); ctx.scale(k.s, k.s);
      ctx.textAlign = 'center'; ctx.fillText(ch, 0, 0); ctx.restore();
      tx += cw; caretX = tx;
    }
    if (tm < 3.6 && (tm % 1) < .5) { ctx.fillStyle = P.a2; rr(ctx, caretX + 4 * u, y + (fh - 74 * u) / 2, 6 * u, 74 * u, 3 * u); ctx.fill(); }
    // botón
    const bx = fx + fw + 16 * u, bw = m.btnW, bcx = bx + bw / 2, bcy = y + fh / 2;
    const pb = kf(tm, [[3.2, { s: 1 }], [3.36, { s: .9 }], [3.68, { s: 1.08 }], [4.0, { s: 1 }]]);
    ctx.save(); ctx.translate(bcx, bcy); ctx.scale(pb.s, pb.s); ctx.translate(-bcx, -bcy);
    pegatina(ctx, bx, y, bw, fh, 22 * u, { fill: P.a, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 8 * u, suave: false });
    const bg = kf(tm, [[3.44, { a: 0 }], [3.76, { a: 1 }]]);
    ctx.save(); rr(ctx, bx, y, bw, fh, 22 * u); ctx.clip();
    if (bg.a > 0) { ctx.globalAlpha *= bg.a; ctx.fillStyle = P.ok; ctx.fillRect(bx, y, bw, fh); ctx.globalAlpha /= bg.a || 1; }
    const go = kf(tm, [[3.44, { y: 0, a: 1 }], [3.68, { y: -30, a: 0 }]]);
    if (go.a > 0) { ctx.save(); ctx.globalAlpha *= go.a; fuente(ctx, f.btn); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(o.boton || '', bcx, bcy + go.y * u + 2 * u); ctx.restore(); }
    const ok = kf(tm, [[3.52, { s: .4, a: 0 }], [3.92, { s: 1.15, a: 1 }], [4.24, { s: 1, a: 1 }]], EASE.back);
    if (ok.a > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(ok.a, 0, 1); ctx.translate(bcx, bcy); ctx.scale(ok.s, ok.s);
      fuente(ctx, f.ok); const tw = ctx.measureText(o.hecho || '').width, total = tw + 40 * u, x0 = -total / 2;
      ctx.save(); ctx.translate(x0, -17 * u); ctx.scale(34 * u / 24, 34 * u / 24); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.stroke(CHECK); ctx.restore();
      ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(o.hecho || '', x0 + 40 * u, 2 * u); ctx.restore();
    }
    const rp = kf(tm, [[3.28, { s: 0, a: 0 }], [3.36, { s: 1, a: .8 }], [4.16, { s: 9, a: 0 }]]);
    if (rp.a > 0) { ctx.beginPath(); ctx.arc(bcx, bcy, 20 * u * rp.s, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${rp.a})`; ctx.fill(); }
    ctx.restore(); ctx.restore(); // botón
    y += fh;
    // gracias
    if (o.gracias) {
      const a = kf(tm, [[4.0, { y: 20, a: 0 }], [4.48, { y: 0, a: 1 }]], EASE.back);
      if (a.a > 0) {
        y += 14 * u; ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
        const tot = m.thxW, x0 = vert ? pos.x + (w - tot) / 2 : pos.x + padX, yy = y + 19 * u + a.y * u;
        ctx.save(); ctx.translate(x0, yy - 17 * u); ctx.scale(34 * u / 24, 34 * u / 24); ctx.fillStyle = P.a; ctx.fill(CORAZON); ctx.restore();
        fuente(ctx, f.thx); ctx.fillStyle = P.s; ctx.textAlign = 'left'; ctx.fillText(o.gracias, x0 + 44 * u, yy); ctx.restore();
      }
    }
    ctx.restore(); // caja
    // destellos
    const S = 52 * u;
    [[w - 120 * u - S, 40 * u, '#F4C542', 0], [w + 24 * u - S, 110 * u, '#ffffff', .08], [w - 60 * u - S, h - 40 * u - S, P.a, .15], [260 * u, -26 * u, '#ffffff', .05]].forEach(([x, yy, col, dl]) => {
      const k = kf(tm - dl, [[3.44, { s: 0, r: 0, a: 0 }], [3.76, { s: 1.25, r: 50, a: 1 }], [4.64, { s: .8, r: 110, a: .9 }], [6.88, { s: .7, r: 200, a: .7 }], [7.36, { s: 0, r: 220, a: 0 }]]);
      destello(ctx, pos.x + x + S / 2, pos.y + yy + S / 2, S, col, k.s, k.r, k.a);
    });
    // cursor del ratón
    const btnC = { x: bcx - pos.x + 10 * u, y: bcy - pos.y + 12 * u };
    const pt = kf(tm, [[2.08, { x: w + 200 * u, y: h + 30 * u, a: 0, s: 1 }], [2.4, { x: w + 140 * u, y: h - 10 * u, a: 1, s: 1 }], [3.12, { x: btnC.x, y: btnC.y, a: 1, s: 1 }], [3.28, { x: btnC.x, y: btnC.y, a: 1, s: .8 }], [3.44, { x: btnC.x, y: btnC.y, a: 1, s: 1 }], [4.16, { x: btnC.x, y: btnC.y, a: 1, s: 1 }], [4.64, { x: w + 200 * u, y: h + 50 * u, a: 0, s: 1 }]], EASE.io);
    if (pt.a > 0.01 && tm > 2.08 && tm < 4.64) {
      ctx.save(); ctx.globalAlpha *= clamp(pt.a, 0, 1);
      ctx.translate(pos.x + pt.x, pos.y + pt.y); ctx.scale(pt.s * 74 * u / 40, pt.s * 74 * u / 40); ctx.translate(-6, -3);
      ctx.save(); ctx.translate(0, 3.2); ctx.fillStyle = 'rgba(10,16,48,.6)'; ctx.fill(FLECHA); ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.fill(FLECHA); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0A1030'; ctx.stroke(FLECHA);
      ctx.restore();
    }
    ctx.restore();
  }
};

export const PLANTILLAS = [pegatinaCodigo, barraCodigo];
export const FORMATOS = { horizontal: { w: 1920, h: 1080 }, vertical: { w: 1080, h: 1920 } };
