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


// =====================================================================
// Utilidades compartidas por las plantillas nuevas
// =====================================================================
const conDef = (lista, cambios) => lista.map(c => cambios[c.k] !== undefined ? Object.assign({}, c, { def: cambios[c.k] }) : c);
const MAS = new Path2D('M12 5v14M5 12h14');
const CAMPANA = new Path2D('M12 3a6 6 0 0 0-6 6v4.2L4.2 16.4c-.4.7.1 1.6.9 1.6h13.8c.8 0 1.3-.9.9-1.6L18 13.2V9a6 6 0 0 0-6-6Z');
const BADAJO = new Path2D('M9.5 19.5a2.5 2.5 0 0 0 5 0Z');
const PLAY = new Path2D('M8 5.5v13l11-6.5Z');
const CALENDARIO = new Path2D('M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z');
const CAL_LINEAS = new Path2D('M4 10.5h16M8.5 3.5v4M15.5 3.5v4');
const CAMISETA = new Path2D('M8.5 3.5 3 6.5l2.2 5 2.8-1.3V20.5h8V10.2l2.8 1.3 2.2-5-5.5-3a3.5 3.5 0 0 1-7 0Z');
const ESTRELLA = new Path2D('M12 2.2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.3l-6 3.3 1.3-6.7-5-4.7 6.8-.8Z');
function icono(ctx, path, x, y, tam, color, { trazo = false, grosor = 2.4 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(tam / 24, tam / 24);
  if (trazo) { ctx.lineWidth = grosor; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(path); }
  else { ctx.fillStyle = color; ctx.fill(path); }
  ctx.restore();
}
// Parte un texto en líneas que quepan en maxW (máx. n líneas)
function envolver(ctx, txt, f, maxW, n = 2) {
  fuente(ctx, f); const pal = String(txt || '').split(/\s+/).filter(Boolean), lin = [];
  let cur = '';
  pal.forEach(p => { const prueba = cur ? cur + ' ' + p : p; if (ctx.measureText(prueba).width <= maxW || !cur) cur = prueba; else { lin.push(cur); cur = p; } });
  if (cur) lin.push(cur);
  if (lin.length > n) { const resto = lin.slice(n - 1).join(' '); lin.length = n - 1; lin.push(resto); }
  return lin;
}
// Imagen dentro de un rectángulo: 'cubrir' (recorta) o 'contener' (entera)
function imagenEn(ctx, img, x, y, w, h, modo = 'cubrir') {
  const iw = img.width, ih = img.height, k = modo === 'cubrir' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * k, dh = ih * k; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
// Avatar redondo con borde de pegatina (imagen propia o icono)
function avatar(ctx, cx, cy, D, P, img, path, u) {
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
function cursor(ctx, x, y, s, a, u) {
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1);
  ctx.translate(x, y); ctx.scale(s * 74 * u / 40, s * 74 * u / 40); ctx.translate(-6, -3);
  ctx.save(); ctx.translate(0, 3.2); ctx.fillStyle = 'rgba(10,16,48,.6)'; ctx.fill(FLECHA); ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.fill(FLECHA); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0A1030'; ctx.stroke(FLECHA);
  ctx.restore();
}
// Botón pegatina que pasa de "texto" a "hecho" (con check) al pulsarlo en tClic
function boton(ctx, x, y, w, h, u, P, tm, tClic, txt, hecho, fTxt, fOk, iconoPath) {
  const cxb = x + w / 2, cyb = y + h / 2;
  const pb = kf(tm, [[tClic - .1, { s: 1 }], [tClic + .05, { s: .9 }], [tClic + .3, { s: 1.08 }], [tClic + .55, { s: 1 }]]);
  ctx.save(); ctx.translate(cxb, cyb); ctx.scale(pb.s, pb.s); ctx.translate(-cxb, -cyb);
  pegatina(ctx, x, y, w, h, h / 2, { fill: P.a, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 7 * u, suave: false });
  ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.clip();
  const bg = kf(tm, [[tClic + .05, { a: 0 }], [tClic + .3, { a: 1 }]]);
  if (bg.a > 0) { ctx.save(); ctx.globalAlpha *= bg.a; ctx.fillStyle = P.ok; ctx.fillRect(x, y, w, h); ctx.restore(); }
  ctx.textBaseline = 'middle';
  const go = kf(tm, [[tClic + .05, { y: 0, a: 1 }], [tClic + .25, { y: -26, a: 0 }]]);
  if (go.a > 0) {
    ctx.save(); ctx.globalAlpha *= go.a; fuente(ctx, fTxt); const tw = ctx.measureText(txt).width, ic = iconoPath ? 30 * u : 0, tot = tw + ic, x0 = cxb - tot / 2;
    if (iconoPath) icono(ctx, iconoPath, x0 - 4 * u, cyb - 15 * u + go.y * u, 30 * u, P.o, { trazo: iconoPath === MAS, grosor: 3.2 });
    ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(txt, x0 + ic, cyb + go.y * u + 2 * u); ctx.restore();
  }
  const ok = kf(tm, [[tClic + .1, { s: .4, a: 0 }], [tClic + .4, { s: 1.15, a: 1 }], [tClic + .65, { s: 1, a: 1 }]], EASE.back);
  if (ok.a > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(ok.a, 0, 1); ctx.translate(cxb, cyb); ctx.scale(ok.s, ok.s);
    fuente(ctx, fOk); const tw = ctx.measureText(hecho).width, tot = tw + 38 * u, x0 = -tot / 2;
    icono(ctx, CHECK, x0, -15 * u, 30 * u, P.o, { trazo: true, grosor: 3.4 });
    ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(hecho, x0 + 38 * u, 2 * u); ctx.restore();
  }
  const rp = kf(tm, [[tClic - .02, { s: 0, a: 0 }], [tClic + .05, { s: 1, a: .8 }], [tClic + .8, { s: 9, a: 0 }]]);
  if (rp.a > 0) { ctx.beginPath(); ctx.arc(cxb, cyb, 18 * u * rp.s, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${rp.a})`; ctx.fill(); }
  ctx.restore(); ctx.restore();
}
// Entrada/salida estándar de 7 s (o la base que se indique)
const popKF = (fin) => [[0, { s: .2, r: -12, a: 0 }], [.42, { s: 1.06, r: 2, a: 1 }], [.7, { s: 1, r: 0, a: 1 }], [fin - .7, { s: 1, r: 0, a: 1 }], [fin - .42, { s: 1.06, r: -2, a: 1 }], [fin - .02, { s: .15, r: 10, a: 0 }]];
function inicio(ctx, pos, tm, fin) {
  const pr = kf(tm, popKF(fin), EASE.back);
  if (pr.a <= 0.001) return false;
  ctx.save(); ctx.globalAlpha = clamp(pr.a, 0, 1);
  ctx.translate(pos.ox, pos.oy); ctx.rotate(rad(pr.r)); ctx.scale(pr.s, pr.s); ctx.translate(-pos.ox, -pos.oy);
  return true;
}
function balanceo(ctx, t, cx, cy, u, gr = 1) {
  const wb = (1 - Math.cos(2 * Math.PI * t / 3.2)) / 2;
  ctx.translate(cx, cy - 5 * u * wb); ctx.rotate(rad(gr * wb)); ctx.translate(-cx, -cy);
}
function destellosCaja(ctx, pos, w, h, u, P, tm, t0, tFin) {
  const S = 52 * u;
  [[w - 120 * u - S, -S * .45, '#F4C542', 0], [w + 20 * u - S, h * .35, '#ffffff', .08], [w * .4, h + 14 * u - S * .5, P.a, .15], [-24 * u, h * .2, '#ffffff', .05]].forEach(([x, yy, col, dl]) => {
    const k = kf(tm - dl, [[t0, { s: 0, r: 0, a: 0 }], [t0 + .32, { s: 1.25, r: 50, a: 1 }], [t0 + 1.2, { s: .8, r: 110, a: .9 }], [tFin - .9, { s: .7, r: 200, a: .7 }], [tFin - .45, { s: 0, r: 220, a: 0 }]]);
    destello(ctx, pos.x + x + S / 2, pos.y + yy + S / 2, S, col, k.s, k.r, k.a);
  });
}
const IMG_OPC = { k: 'imagen', label: 'Tu imagen (avatar o logo, opcional)', tipo: 'imagen' };

// =====================================================================
// 3 · ¡Sígueme!
// =====================================================================
const sigueme = {
  id: 'sigueme',
  nombre: '¡Sígueme!',
  desc: 'Tarjeta con tu @: el cursor pulsa "Seguir", cambia a "¡Siguiendo!" y salen corazones.',
  fps: 30,
  campos: [
    { k: 'red', label: 'Red social (texto)', tipo: 'texto', def: 'TikTok', max: 20 },
    { k: 'usuario', label: 'Usuario', tipo: 'texto', def: '@KyoSumiVT', max: 24 },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: '¡Sígueme para más contenido!', max: 40 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Seguir', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Siguiendo!', max: 14 },
    { k: 'icono', label: 'Icono (si no hay imagen)', tipo: 'chips', def: 'corazon', opciones: [['corazon', '💙 Corazón'], ['estrella', '⭐ Estrella']] },
    IMG_OPC,
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 4.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6, 4.2, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 6;
    const tm = tiempo(t, L, 3.3, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.25 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${18 * uu}px "Chakra Petch"`, chipE: 2.9 * uu, user: `400 ${56 * uu}px "Cherry Bomb One"`, frase: `700 ${28 * uu}px "Fredoka"`, btn: `700 ${34 * uu}px "Fredoka"`, ok: `700 ${30 * uu}px "Fredoka"` };
      const chipTxt = o.red ? ('EN ' + o.red).toUpperCase() : '';
      const chipW = chipTxt ? ancho(ctx, chipTxt, f.chip, f.chipE) + 28 * uu : 0;
      const userW = ancho(ctx, o.usuario || '', f.user), fraseW = o.frase ? ancho(ctx, o.frase, f.frase) : 0;
      const colW = Math.max(chipW, userW, fraseW);
      const btnW = Math.max(200 * uu, ancho(ctx, o.boton || '', f.btn) + 90 * uu, ancho(ctx, o.hecho || '', f.ok) + 90 * uu), btnH = 76 * uu;
      const pad = 26 * uu, D = (vert ? 150 : 128) * uu, colH = (chipTxt ? 40 * uu : 0) + 62 * uu + (o.frase ? 38 * uu : 0);
      let w, h;
      if (vert) { w = Math.max(600 * uu, colW + 2 * pad + 20 * uu, btnW + 2 * pad); h = pad + 10 * uu + D + 24 * uu + colH + 22 * uu + btnH + pad; }
      else { w = pad + D + 26 * uu + colW + 30 * uu + btnW + pad; h = pad + Math.max(D, colH) + pad; }
      return { f, chipTxt, chipW, userW, fraseW, colW, btnW, btnH, pad, D, colH, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, pad, D, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    balanceo(ctx, t, cx, cy, u);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    // avatar
    const ax = vert ? cx : pos.x + pad + D / 2, ay = vert ? pos.y + pad + 10 * u + D / 2 : cy;
    const av = kf(tm, [[.25, { s: 0 }], [.6, { s: 1.15 }], [.8, { s: 1 }]], EASE.back);
    if (av.s > 0) { ctx.save(); ctx.translate(ax, ay); ctx.scale(av.s, av.s); ctx.translate(-ax, -ay); avatar(ctx, ax, ay, D, P, o.imagen, o.icono === 'estrella' ? ESTRELLA : CORAZON, u); ctx.restore(); }
    // textos
    let x0 = vert ? 0 : pos.x + pad + D + 26 * u, y = vert ? pos.y + pad + 10 * u + D + 24 * u : cy - m.colH / 2;
    const xC = ww => vert ? cx - ww / 2 : x0;
    if (m.chipTxt) {
      const a = kf(tm, [[.35, { y: 16, a: 0 }], [.65, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; const x = xC(m.chipW);
      rr(ctx, x, y + a.y * u, m.chipW, 30 * u, 15 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.chipTxt, x + 14 * u, y + 15 * u + a.y * u + 1); ctx.restore();
      y += 40 * u;
    }
    { const a = kf(tm, [[.45, { x: -30, a: 0 }], [.85, { x: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.user); ctx.fillStyle = P.t;
      ctx.lineWidth = 8 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; const x = xC(m.userW) + a.x * u;
      ctx.strokeText(o.usuario || '', x, y + 32 * u); ctx.fillText(o.usuario || '', x, y + 32 * u); ctx.restore(); y += 62 * u; }
    if (o.frase) { const a = kf(tm, [[.6, { y: 20, a: 0 }], [.95, { y: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.frase); ctx.fillStyle = P.s; ctx.fillText(o.frase, xC(m.fraseW), y + 18 * u + a.y * u); ctx.restore(); y += 38 * u; }
    // botón
    const bx = vert ? cx - m.btnW / 2 : pos.x + w - pad - m.btnW, by = vert ? pos.y + h - pad - m.btnH : cy - m.btnH / 2;
    const bi = kf(tm, [[.75, { s: 0 }], [1.05, { s: 1.1 }], [1.2, { s: 1 }]], EASE.back);
    if (bi.s > 0) {
      const bcx = bx + m.btnW / 2, bcy = by + m.btnH / 2;
      ctx.save(); ctx.translate(bcx, bcy); ctx.scale(bi.s, bi.s); ctx.translate(-bcx, -bcy);
      boton(ctx, bx, by, m.btnW, m.btnH, u, P, tm, 2.05, o.boton || '', o.hecho || '', f.btn, f.ok, MAS);
      ctx.restore();
    }
    ctx.restore(); // tarjeta
    // corazones que suben desde el botón
    const bcx = bx + m.btnW / 2, bcy = by;
    for (let i = 0; i < 6; i++) {
      const t0 = 2.2 + i * .12, p = (tm - t0) / 1.4;
      if (p <= 0 || p >= 1) continue;
      const hx = bcx + Math.sin(i * 2.1 + p * 4) * 40 * u + (i - 2.5) * 22 * u, hy = bcy - p * 190 * u, s = p < .25 ? p / .25 : 1 - (p - .25) * .3, a = p < .7 ? 1 : 1 - (p - .7) / .3;
      ctx.save(); ctx.globalAlpha *= a; icono(ctx, CORAZON, hx - 16 * u * s, hy - 16 * u * s, 32 * u * s, i % 2 ? P.a : '#FF6B8B'); ctx.restore();
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, 2.2, FIN);
    // cursor
    const tx = bx + m.btnW * .55 - pos.x, ty = by + m.btnH * .6 - pos.y;
    const pt = kf(tm, [[1.3, { x: w + 200 * u, y: h + 40 * u, a: 0, s: 1 }], [1.55, { x: w + 120 * u, y: h, a: 1, s: 1 }], [1.95, { x: tx, y: ty, a: 1, s: 1 }], [2.05, { x: tx, y: ty, a: 1, s: .8 }], [2.2, { x: tx, y: ty, a: 1, s: 1 }], [2.6, { x: tx, y: ty, a: 1, s: 1 }], [3.0, { x: w + 200 * u, y: h + 60 * u, a: 0, s: 1 }]], EASE.io);
    if (tm > 1.3 && tm < 3.0) cursor(ctx, pos.x + pt.x, pos.y + pt.y, pt.s, pt.a, u);
    ctx.restore();
  }
};

// =====================================================================
// 4 · ¡Suscríbete! + campanita
// =====================================================================
const suscribete = {
  id: 'suscribete',
  nombre: '¡Suscríbete! + campanita',
  desc: 'El cursor pulsa "Suscribirme", luego la campanita, que suena y activa las notificaciones.',
  fps: 30,
  campos: [
    { k: 'canal', label: 'Nombre del canal', tipo: 'texto', def: 'KyoSumiVT', max: 24 },
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Suscríbete!', max: 22 },
    { k: 'sub', label: 'Frase', tipo: 'texto', def: 'y activa la campanita', max: 36 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Suscribirme', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Suscrito!', max: 14 },
    { k: 'aviso', label: 'Texto al pulsar la campanita', tipo: 'texto', def: '¡Notificaciones activadas!', max: 34 },
    IMG_OPC,
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 5.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 5.2, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 7;
    const tm = tiempo(t, L, 4.4, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.2 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { canal: `700 ${24 * uu}px "Chakra Petch"`, canalE: 3 * uu, tit: `400 ${60 * uu}px "Cherry Bomb One"`, sub: `700 ${28 * uu}px "Fredoka"`, btn: `700 ${32 * uu}px "Fredoka"`, ok: `700 ${30 * uu}px "Fredoka"`, aviso: `700 ${26 * uu}px "Fredoka"` };
      const canalW = o.canal ? ancho(ctx, o.canal.toUpperCase(), f.canal, f.canalE) : 0, titW = ancho(ctx, o.titulo || '', f.tit), subW = o.sub ? ancho(ctx, o.sub, f.sub) : 0;
      const colW = Math.max(canalW, titW, subW), colH = (o.canal ? 32 * uu : 0) + 66 * uu + (o.sub ? 36 * uu : 0);
      const btnW = Math.max(250 * uu, ancho(ctx, o.boton || '', f.btn) + 70 * uu, ancho(ctx, o.hecho || '', f.ok) + 90 * uu), btnH = 76 * uu, bell = 76 * uu;
      const avisoW = o.aviso ? ancho(ctx, o.aviso, f.aviso) + 40 * uu : 0;
      const pad = 26 * uu, D = 112 * uu;
      const filaW = btnW + 22 * uu + bell;
      let w, h;
      if (vert) { w = Math.max(600 * uu, colW + 2 * pad, filaW + 2 * pad, avisoW + 2 * pad); h = pad + D + 20 * uu + colH + 22 * uu + btnH + (o.aviso ? 14 * uu + 34 * uu : 0) + pad; }
      else { w = Math.max(pad + D + 24 * uu + colW + pad, filaW + 2 * pad + 20 * uu, avisoW + 2 * pad); h = pad + Math.max(D, colH) + 22 * uu + btnH + (o.aviso ? 14 * uu + 34 * uu : 0) + pad; }
      return { f, canalW, titW, subW, colW, colH, btnW, btnH, bell, avisoW, pad, D, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, pad, D, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    balanceo(ctx, t, cx, cy, u);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const topH = vert ? D + 20 * u + m.colH : Math.max(D, m.colH);
    const ax = vert ? cx : pos.x + pad + D / 2, ay = vert ? pos.y + pad + D / 2 : pos.y + pad + topH / 2;
    const av = kf(tm, [[.25, { s: 0 }], [.6, { s: 1.15 }], [.8, { s: 1 }]], EASE.back);
    if (av.s > 0) { ctx.save(); ctx.translate(ax, ay); ctx.scale(av.s, av.s); ctx.translate(-ax, -ay); avatar(ctx, ax, ay, D, P, o.imagen, PLAY, u); ctx.restore(); }
    const x0 = pos.x + pad + D + 24 * u; let y = vert ? pos.y + pad + D + 20 * u : pos.y + pad + (topH - m.colH) / 2;
    const xC = ww => vert ? cx - ww / 2 : x0;
    if (o.canal) { const a = kf(tm, [[.35, { y: 14, a: 0 }], [.65, { y: 0, a: 1 }]]); ctx.save(); ctx.globalAlpha *= a.a; fuente(ctx, f.canal, f.canalE); ctx.fillStyle = P.a; ctx.fillText(o.canal.toUpperCase(), xC(m.canalW), y + 14 * u + a.y * u); ctx.restore(); y += 32 * u; }
    { const a = kf(tm, [[.45, { s: .6, a: 0 }], [.8, { s: 1.08, a: 1 }], [.95, { s: 1, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const xx = xC(m.titW), yy = y + 34 * u;
      ctx.translate(xx + m.titW / 2, yy); ctx.scale(a.s, a.s); fuente(ctx, f.tit); ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.textAlign = 'center';
      ctx.strokeText(o.titulo || '', 0, 0); ctx.fillText(o.titulo || '', 0, 0); ctx.restore(); y += 66 * u; }
    if (o.sub) { const a = kf(tm, [[.6, { y: 18, a: 0 }], [.95, { y: 0, a: 1 }]], EASE.back); ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.sub); ctx.fillStyle = P.s; ctx.fillText(o.sub, xC(m.subW), y + 16 * u + a.y * u); ctx.restore(); }
    // fila de botones
    const filaW = m.btnW + 22 * u + m.bell, fx = vert ? cx - filaW / 2 : pos.x + pad, fy = pos.y + pad + topH + 22 * u;
    const bi = kf(tm, [[.75, { s: 0 }], [1.05, { s: 1.1 }], [1.2, { s: 1 }]], EASE.back);
    if (bi.s > 0) {
      const ccx = fx + filaW / 2, ccy = fy + m.btnH / 2;
      ctx.save(); ctx.translate(ccx, ccy); ctx.scale(bi.s, bi.s); ctx.translate(-ccx, -ccy);
      boton(ctx, fx, fy, m.btnW, m.btnH, u, P, tm, 2.05, o.boton || '', o.hecho || '', f.btn, f.ok, null);
      // campanita
      const bx = fx + m.btnW + 22 * u, bcx = bx + m.bell / 2, bcy = fy + m.bell / 2;
      const pc = kf(tm, [[2.95, { s: 1 }], [3.1, { s: .88 }], [3.35, { s: 1.1 }], [3.6, { s: 1 }]]);
      ctx.save(); ctx.translate(bcx, bcy); ctx.scale(pc.s, pc.s); ctx.translate(-bcx, -bcy);
      const on = kf(tm, [[3.1, { a: 0 }], [3.3, { a: 1 }]]);
      pegatina(ctx, bx, fy, m.bell, m.bell, m.bell / 2, { fill: P.c, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 7 * u, suave: false });
      if (on.a > 0) { ctx.save(); ctx.globalAlpha *= on.a; ctx.beginPath(); ctx.arc(bcx, bcy, m.bell / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill(); ctx.restore(); }
      const sw = tm > 3.1 && tm < 4.3 ? Math.sin((tm - 3.1) * 22) * 22 * (1 - (tm - 3.1) / 1.2) : 0;
      ctx.save(); ctx.translate(bcx, fy + 16 * u); ctx.rotate(rad(sw)); ctx.translate(-bcx, -(fy + 16 * u));
      const col = on.a > .5 ? P.o : P.a; icono(ctx, CAMPANA, bcx - 21 * u, bcy - 22 * u, 42 * u, col); icono(ctx, BADAJO, bcx - 21 * u, bcy - 22 * u, 42 * u, col);
      ctx.restore();
      // ondas de sonido
      if (tm > 3.15 && tm < 4.2) for (let s = 0; s < 2; s++) { const p = ((tm - 3.15) * 1.6 + s * .5) % 1; ctx.save(); ctx.globalAlpha *= (1 - p) * .9; ctx.lineWidth = 4 * u; ctx.strokeStyle = P.a; ctx.lineCap = 'round';
        [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(bcx, bcy, m.bell / 2 + 10 * u + p * 26 * u, d > 0 ? -.6 : Math.PI - .6 + 1.2 - 1.2, d > 0 ? .6 : Math.PI + .6); ctx.stroke(); }); ctx.restore(); }
      ctx.restore(); ctx.restore();
    }
    if (o.aviso) { const a = kf(tm, [[3.3, { y: 16, a: 0 }], [3.7, { y: 0, a: 1 }]], EASE.back);
      if (a.a > 0) { ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const yy = fy + m.btnH + 14 * u + 17 * u + a.y * u, xx = vert ? cx - m.avisoW / 2 : pos.x + pad;
        icono(ctx, CAMPANA, xx, yy - 15 * u, 30 * u, P.a); fuente(ctx, f.aviso); ctx.fillStyle = P.s; ctx.textAlign = 'left'; ctx.fillText(o.aviso, xx + 40 * u, yy); ctx.restore(); } }
    ctx.restore(); // tarjeta
    destellosCaja(ctx, pos, w, h, u, P, tm, 3.2, FIN);
    // cursor: botón y luego campanita
    const b1x = fx + m.btnW * .6 - pos.x, b1y = fy + m.btnH * .6 - pos.y, b2x = fx + m.btnW + 22 * u + m.bell * .55 - pos.x, b2y = fy + m.bell * .65 - pos.y;
    const pt = kf(tm, [[1.3, { x: w + 200 * u, y: h + 40 * u, a: 0, s: 1 }], [1.55, { x: w + 120 * u, y: h, a: 1, s: 1 }], [1.95, { x: b1x, y: b1y, a: 1, s: 1 }], [2.05, { x: b1x, y: b1y, a: 1, s: .8 }], [2.2, { x: b1x, y: b1y, a: 1, s: 1 }], [2.5, { x: b1x, y: b1y, a: 1, s: 1 }], [2.95, { x: b2x, y: b2y, a: 1, s: 1 }], [3.1, { x: b2x, y: b2y, a: 1, s: .8 }], [3.25, { x: b2x, y: b2y, a: 1, s: 1 }], [3.6, { x: b2x, y: b2y, a: 1, s: 1 }], [4.0, { x: w + 200 * u, y: h + 60 * u, a: 0, s: 1 }]], EASE.io);
    if (tm > 1.3 && tm < 4.0) cursor(ctx, pos.x + pt.x, pos.y + pt.y, pt.s, pt.a, u);
    ctx.restore();
  }
};

// =====================================================================
// 5 · Directo en Twitch (horario)
// =====================================================================
const directo = {
  id: 'directo',
  nombre: 'Directo en Twitch',
  desc: 'Tarjeta "En directo" con tu horario: los días entran uno a uno y el punto rojo late.',
  fps: 30,
  campos: [
    { k: 'etiqueta', label: 'Etiqueta', tipo: 'texto', def: 'En directo', max: 20 },
    { k: 'titulo', label: 'Título', tipo: 'texto', def: 'Stream en Twitch', max: 26 },
    { k: 'd1', label: 'Día 1', tipo: 'texto', def: 'Martes · 20:00', max: 28 },
    { k: 'd2', label: 'Día 2', tipo: 'texto', def: 'Jueves · 20:00', max: 28 },
    { k: 'd3', label: 'Día 3 (vacío = no sale)', tipo: 'texto', def: 'Sábado · 18:00', max: 28 },
    { k: 'd4', label: 'Día 4 (vacío = no sale)', tipo: 'texto', def: '', max: 28 },
    { k: 'enlace', label: 'Dónde encontrarte', tipo: 'texto', def: 'twitch.tv/KyoSumiVT', max: 30 },
    { k: 'nota', label: 'Nota final', tipo: 'texto', def: '¡Te espero en el chat!', max: 36 },
    IMG_OPC,
    ...conDef(COMUNES, { posh: 'centro', posv: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 4.5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 4.5, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 7;
    const tm = tiempo(t, L, 2.8, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.2 : 1) * (Number(o.tam) || 1);
    const dias = [o.d1, o.d2, o.d3, o.d4].filter(Boolean);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3.2 * uu, tit: `400 ${58 * uu}px "Cherry Bomb One"`, dia: `700 ${30 * uu}px "Fredoka"`, link: `700 ${22 * uu}px "Chakra Petch"`, linkE: 1.5 * uu, nota: `700 ${26 * uu}px "Fredoka"` };
      const chipW = o.etiqueta ? ancho(ctx, o.etiqueta.toUpperCase(), f.chip, f.chipE) + 58 * uu : 0, titW = ancho(ctx, o.titulo || '', f.tit);
      const diaW = Math.max(0, ...dias.map(d => ancho(ctx, d, f.dia))) + 80 * uu;
      const linkW = o.enlace ? ancho(ctx, o.enlace, f.link, f.linkE) + 40 * uu : 0, notaW = o.nota ? ancho(ctx, o.nota, f.nota) : 0;
      const pad = 30 * uu, D = o.imagen ? 110 * uu : 0;
      const w = Math.max(560 * uu, chipW + (D ? D + 20 * uu : 0) + 2 * pad, titW + 2 * pad, diaW + 2 * pad, linkW + 2 * pad, notaW + 2 * pad);
      const h = pad + (o.etiqueta ? 44 * uu : 0) + 66 * uu + 12 * uu + dias.length * 66 * uu + (o.enlace ? 36 * uu : 0) + (o.nota ? 36 * uu : 0) + pad;
      return { f, chipW, titW, diaW, linkW, notaW, pad, D, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, pad, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2, al = vert ? 'center' : 'left';
    const xC = ww => al === 'center' ? cx - ww / 2 : pos.x + pad;
    balanceo(ctx, t, cx, cy, u);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let y = pos.y + pad;
    if (o.etiqueta) {
      const a = kf(tm, [[.3, { y: 14, a: 0 }], [.6, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a; const x = xC(m.chipW);
      rr(ctx, x, y + a.y * u, m.chipW, 36 * u, 18 * u); ctx.fillStyle = '#FF4D6A'; ctx.fill();
      const lat = .75 + .25 * Math.abs(Math.sin(t * 3));
      ctx.beginPath(); ctx.arc(x + 22 * u, y + 18 * u + a.y * u, 7 * u * lat, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x + 22 * u, y + 18 * u + a.y * u, 12 * u * lat, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2 * u; ctx.stroke();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = '#fff'; ctx.fillText(o.etiqueta.toUpperCase(), x + 40 * u, y + 19 * u + a.y * u); ctx.restore();
      y += 44 * u;
    }
    { const a = kf(tm, [[.4, { s: .6, a: 0 }], [.75, { s: 1.08, a: 1 }], [.9, { s: 1, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const xx = xC(m.titW) + m.titW / 2, yy = y + 34 * u;
      ctx.translate(xx, yy); ctx.scale(a.s, a.s); fuente(ctx, f.tit); ctx.textAlign = 'center'; ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t;
      ctx.strokeText(o.titulo || '', 0, 0); ctx.fillText(o.titulo || '', 0, 0); ctx.restore(); y += 66 * u + 12 * u; }
    dias.forEach((d, i) => {
      const t0 = .9 + i * .25, a = kf(tm, [[t0, { x: -50, a: 0 }], [t0 + .35, { x: 0, a: 1 }]], EASE.back);
      if (a.a > 0) {
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const x = xC(m.diaW) + a.x * u;
        rr(ctx, x, y, m.diaW, 54 * u, 16 * u); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.stroke();
        icono(ctx, CALENDARIO, x + 16 * u, y + 11 * u, 32 * u, P.a); icono(ctx, CAL_LINEAS, x + 16 * u, y + 11 * u, 32 * u, P.c, { trazo: true, grosor: 2.2 });
        fuente(ctx, f.dia); ctx.fillStyle = P.t; ctx.fillText(d, x + 62 * u, y + 28 * u); ctx.restore();
      }
      y += 66 * u;
    });
    if (o.enlace) { const a = kf(tm, [[1.7, { y: 14, a: 0 }], [2.05, { y: 0, a: 1 }]]); ctx.save(); ctx.globalAlpha *= a.a; const x = xC(m.linkW);
      icono(ctx, PLAY, x, y + 4 * u + a.y * u, 28 * u, P.a); fuente(ctx, f.link, f.linkE); ctx.fillStyle = P.a; ctx.fillText(o.enlace, x + 36 * u, y + 18 * u + a.y * u); ctx.restore(); y += 36 * u; }
    if (o.nota) { const a = kf(tm, [[1.9, { y: 14, a: 0 }], [2.25, { y: 0, a: 1 }]]); ctx.save(); ctx.globalAlpha *= a.a; fuente(ctx, f.nota); ctx.fillStyle = P.s; ctx.fillText(o.nota, xC(m.notaW), y + 18 * u + a.y * u); ctx.restore(); }
    ctx.restore(); // tarjeta
    if (o.imagen) {
      const D = m.D, ax = pos.x + w - D / 2 - 6 * u, ay = pos.y + 10 * u;
      const av = kf(tm, [[.5, { s: 0 }], [.85, { s: 1.15 }], [1.0, { s: 1 }]], EASE.back);
      if (av.s > 0) { ctx.save(); ctx.translate(ax, ay); ctx.scale(av.s, av.s); ctx.rotate(rad(6)); ctx.translate(-ax, -ay); avatar(ctx, ax, ay, D, P, o.imagen, PLAY, u); ctx.restore(); }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, 1.2, FIN);
    ctx.restore();
  }
};

// =====================================================================
// 6 · ¡Nueva merch!
// =====================================================================
const merch = {
  id: 'merch',
  nombre: '¡Nueva merch!',
  desc: 'Tu producto en una foto-pegatina que cae de golpe, con nombre, comando y precio opcional.',
  fps: 30,
  campos: [
    { k: 'imagen', label: 'Foto del producto (PNG sin fondo queda genial)', tipo: 'imagen' },
    { k: 'chip', label: 'Etiqueta', tipo: 'texto', def: '★ Nueva merch', max: 26 },
    { k: 'producto', label: 'Nombre del producto', tipo: 'texto', def: 'Sudadera Octubre de Terror', max: 48 },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'Consíguela con', max: 30 },
    { k: 'comando', label: 'Comando o enlace (destacado)', tipo: 'texto', def: '!merch', max: 30 },
    { k: 'precio', label: 'Precio (vacío = no sale)', tipo: 'texto', def: '', max: 14 },
    { k: 'fondo', label: 'Fondo de la foto', tipo: 'chips', def: 'claro', opciones: [['claro', 'Claro'], ['acento', 'Color del estilo'], ['oscuro', 'Oscuro']] },
    ...conDef(COMUNES, { posh: 'centro', posv: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 4.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 4.2, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 7;
    const tm = tiempo(t, L, 2.6, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.15 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3.2 * uu, prod: `400 ${50 * uu}px "Cherry Bomb One"`, frase: `700 ${32 * uu}px "Fredoka"`, precio: `400 ${40 * uu}px "Cherry Bomb One"` };
      const F = (vert ? 400 : 300) * uu, pad = 30 * uu;
      const chipW = o.chip ? ancho(ctx, o.chip.toUpperCase(), f.chip, f.chipE) + 32 * uu : 0;
      const lineas = envolver(ctx, o.producto || '', f.prod, (vert ? 760 : 560) * uu, 2);
      fuente(ctx, f.prod); const prodW = Math.max(0, ...lineas.map(l => ctx.measureText(l).width));
      const frTxt = (o.frase || '') + (o.frase && o.comando ? ' ' : '');
      const fraseW = (o.frase || o.comando) ? ancho(ctx, frTxt + (o.comando || ''), f.frase) : 0;
      const precioW = o.precio ? ancho(ctx, o.precio, f.precio) + 44 * uu : 0;
      const colW = Math.max(chipW, prodW, fraseW, precioW);
      const colH = (o.chip ? 46 * uu : 0) + lineas.length * 58 * uu + ((o.frase || o.comando) ? 10 * uu + 42 * uu : 0) + (o.precio ? 20 * uu + 64 * uu : 0);
      let w, h;
      if (vert) { w = Math.max(640 * uu, F + 2 * pad + 40 * uu, colW + 2 * pad); h = pad + 10 * uu + F + 34 * uu + colH + pad; }
      else { w = pad + F + 40 * uu + colW + pad + 10 * uu; h = pad + Math.max(F + 10 * uu, colH) + pad; }
      return { f, F, pad, chipW, lineas, prodW, frTxt, fraseW, precioW, colW, colH, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, F, pad, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    balanceo(ctx, t, cx, cy, u, .8);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, 36 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.restore();
    // foto-pegatina (polaroid)
    const fx = vert ? cx - F / 2 : pos.x + pad, fy = vert ? pos.y + pad + 10 * u : cy - F / 2;
    const fa = kf(tm, [[.3, { s: 1.9, r: -22, a: 0 }], [.62, { s: .94, r: -2, a: 1 }], [.8, { s: 1.03, r: -5, a: 1 }], [.95, { s: 1, r: -4, a: 1 }]], EASE.back);
    if (fa.a > 0.01) {
      const fcx = fx + F / 2, fcy = fy + F / 2, sway = Math.sin(t * 1.6) * .8;
      ctx.save(); ctx.globalAlpha *= clamp(fa.a, 0, 1); ctx.translate(fcx, fcy); ctx.rotate(rad(fa.r + sway)); ctx.scale(fa.s, fa.s); ctx.translate(-fcx, -fcy);
      pegatina(ctx, fx, fy, F, F, 18 * u, { fill: P.p, p: P.p, o: P.o, ring: 0, out: 6 * u, drop: 10 * u, suave: true });
      const ip = 14 * u, ix = fx + ip, iy = fy + ip, iw = F - 2 * ip;
      rr(ctx, ix, iy, iw, iw, 10 * u); ctx.fillStyle = o.fondo === 'oscuro' ? P.c : o.fondo === 'acento' ? P.a : '#EAF1FB'; ctx.fill();
      ctx.save(); rr(ctx, ix, iy, iw, iw, 10 * u); ctx.clip();
      if (o.imagen) imagenEn(ctx, o.imagen, ix + 8 * u, iy + 8 * u, iw - 16 * u, iw - 16 * u, 'contener');
      else icono(ctx, CAMISETA, ix + iw * .2, iy + iw * .2, iw * .6, o.fondo === 'acento' ? P.o : P.a);
      const fl = kf(tm, [[.62, { a: .9 }], [.95, { a: 0 }]]);
      if (tm >= .62 && fl.a > 0) { ctx.fillStyle = `rgba(255,255,255,${fl.a})`; ctx.fillRect(ix, iy, iw, iw); }
      ctx.restore();
      // cinta adhesiva
      ctx.save(); ctx.translate(fcx, fy + 2 * u); ctx.rotate(rad(-8)); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-60 * u, -16 * u, 120 * u, 32 * u); ctx.restore();
      ctx.restore();
    }
    // textos
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1.5)); ctx.translate(-cx, -cy);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad + F + 40 * u;
    let y = vert ? fy + F + 34 * u : cy - m.colH / 2;
    const xC = ww => vert ? cx - ww / 2 : x0;
    if (o.chip) { const a = kf(tm, [[.5, { y: 14, a: 0 }], [.8, { y: 0, a: 1 }]]); ctx.save(); ctx.globalAlpha *= a.a; const x = xC(m.chipW);
      rr(ctx, x, y + a.y * u, m.chipW, 36 * u, 18 * u); ctx.fillStyle = P.a; ctx.fill(); fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(o.chip.toUpperCase(), x + 16 * u, y + 19 * u + a.y * u); ctx.restore(); y += 46 * u; }
    m.lineas.forEach((ln, i) => { const a = kf(tm, [[.6 + i * .1, { x: -36, a: 0 }], [1.0 + i * .1, { x: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.prod); const lw = ctx.measureText(ln).width, x = xC(lw) + a.x * u;
      ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.strokeText(ln, x, y + 30 * u); ctx.fillText(ln, x, y + 30 * u); ctx.restore(); y += 58 * u; });
    if (o.frase || o.comando) { y += 10 * u; const a = kf(tm, [[.85, { y: 18, a: 0 }], [1.2, { y: 0, a: 1 }]], EASE.back);
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.frase); let x = xC(m.fraseW); const yy = y + 21 * u + a.y * u;
      ctx.fillStyle = P.s; ctx.fillText(m.frTxt, x, yy); x += ctx.measureText(m.frTxt).width;
      if (o.comando) { const cw = ctx.measureText(o.comando).width; rr(ctx, x - 6 * u, yy - 22 * u, cw + 12 * u, 44 * u, 12 * u); ctx.fillStyle = P.a; ctx.fill(); ctx.fillStyle = P.o; ctx.fillText(o.comando, x, yy + 1); }
      ctx.restore(); y += 42 * u; }
    ctx.restore();
    // etiqueta de precio
    if (o.precio) {
      y += 20 * u; const pw = m.precioW, ph = 64 * u, px = vert ? cx - pw / 2 : x0, pcx = px + pw / 2, pcy = y + ph / 2;
      const a = kf(tm, [[1.1, { s: 0, r: 30 }], [1.4, { s: 1.15, r: 3 }], [1.6, { s: 1, r: 6 }]], EASE.back);
      if (a.s > 0) { ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(rad(a.r)); ctx.scale(a.s, a.s); ctx.translate(-pcx, -pcy);
        pegatina(ctx, px, y, pw, ph, 16 * u, { fill: '#F4C542', p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 7 * u, suave: false });
        fuente(ctx, f.precio); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.precio, pcx, pcy + 3 * u); ctx.restore(); }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, .65, FIN);
    ctx.restore();
  }
};

export const PLANTILLAS = [pegatinaCodigo, barraCodigo, sigueme, suscribete, directo, merch];
export const FORMATOS = { horizontal: { w: 1920, h: 1080 }, vertical: { w: 1080, h: 1920 } };
