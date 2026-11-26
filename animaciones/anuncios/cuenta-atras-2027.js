// Kyo Estudio · Anuncio 2027 (estilo Coral Stream): cuenta atrás o fecha
// Mar 2027 con el isotipo arriba, el título que salta letra a letra, el icono (o tu imagen de adelanto) en una
// pegatina con ondas de sonar, la cuenta atrás en cajas HUD que avanza de verdad (o la fecha), el enlace en
// píldora cian y el texto de abajo. Abajo, la superficie con la aleta nadando y los corales de píxel.
// ¡Directo especial! 2027 y ¡Hoy hay directo! 2027 son variantes de este anuncio (_variante).
import { clamp, azar } from '../base/utilidades.js';
import { renderSonido, musicaFondo } from '../base/sonido.js';
import { C, pr, E, BOMB, FRE, HUD, rad, caja, pega, hud, texto, ancho, fuente, etiqueta, icono, destello, aleta, isotipo } from '../generales/tarjetas-2027.js';

const MUSICA = [['burbuja', '🫧 Burbuja'], ['alegre', '🎶 Pop'], ['chill', '🌙 Chill'], ['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['ninguna', '🔇 Sin música']];
export const CAMPOS_MUSICA_2027 = [
  { k: 'musica', label: 'Música de fondo', tipo: 'chips', def: 'burbuja', opciones: MUSICA },
  { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 }
];

// Posiciones por formato (en el espacio del formato: 1080 de ancho, o 1920 en horizontal).
// c/fr/bl = centro del icono, frase y cajas; +dc = cuánto bajan si hay etiqueta de evento debajo del título;
// +hd = cuánto bajan el enlace y el texto de abajo cuando hay hora debajo de las cajas. En horizontal: icono a la izquierda (cxI), lo demás a la derecha (cxC)
const LX = {
  vertical: { iso: [540, 150, 150], tY: 330, tF: 118, chip: 450, c: 640, R: 124, S: 320, fr: 860, bl: 1045, dc: 40, bh: 230, F: 150, url: 1390, pie: 1500, hd: 0, sup: 1650, fin: 120, cxI: 540, cxC: 540, anchoC: 980 },
  retrato: { iso: [540, 88, 110], tY: 215, tF: 100, chip: 312, c: 465, R: 96, S: 250, fr: 632, bl: 780, dc: 30, bh: 180, F: 118, url: 1010, pie: 1098, hd: 40, sup: 1185, fin: 64, cxI: 540, cxC: 540, anchoC: 980 },
  cuadrado: { iso: [540, 62, 80], tY: 150, tF: 88, chip: 226, c: 335, R: 74, S: 170, fr: 460, bl: 572, dc: 22, bh: 150, F: 98, url: 760, pie: 836, hd: 36, sup: 935, fin: 54, cxI: 540, cxC: 540, anchoC: 980 },
  horizontal: { iso: [150, 120, 150], tY: 125, tF: 104, chip: 222, c: 540, R: 150, S: 400, fr: 330, bl: 495, dc: 0, bh: 230, F: 150, url: 815, pie: 908, hd: 0, sup: 990, fin: 60, cxI: 500, cxC: 1260, anchoC: 960 }
};

// ---------- fondo: mar 2027 ----------
function mar(ctx, W, H, t, k) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16246a'); g.addColorStop(.55, '#0d1748'); g.addColorStop(1, C.abisal); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  let r = ctx.createRadialGradient(W * .9, -H * .05, 0, W * .9, -H * .05, Math.max(W, H) * .6); r.addColorStop(0, 'rgba(255,111,97,.18)'); r.addColorStop(1, 'rgba(255,111,97,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  r = ctx.createRadialGradient(W * .5, H * .4, 0, W * .5, H * .4, Math.max(W, H) * .5); r.addColorStop(0, 'rgba(58,123,213,.32)'); r.addColorStop(1, 'rgba(58,123,213,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .06; ctx.fillStyle = C.espuma;
  for (const [a, b] of [[.1, .2], [.38, .45], [.62, .7]]) { const o = Math.sin(t * .8 + a * 9) * W * .02; ctx.beginPath(); ctx.moveTo(W * a + o, 0); ctx.lineTo(W * b + o, 0); ctx.lineTo(W * (b + .22), H); ctx.lineTo(W * (a + .1), H); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([36 * k, 28 * k]); ctx.lineWidth = 5 * k;
  [[.2, 'rgba(111,227,240,.25)', 1], [.58, 'rgba(111,227,240,.22)', -1]].forEach(([y, col, d]) => { const yy = H * y; ctx.strokeStyle = col; ctx.lineDashOffset = -t * 140 * k * d; ctx.beginPath(); ctx.moveTo(-20, yy); ctx.bezierCurveTo(W * .3, yy - H * .03, W * .6, yy + H * .04, W + 20, yy - H * .01); ctx.stroke(); });
  ctx.restore();
  const rnd = azar(5); ctx.save(); ctx.strokeStyle = 'rgba(201,230,242,.6)'; ctx.lineWidth = 3 * k;
  for (let i = 0; i < 16; i++) { const x = rnd() * W, rd = (6 + rnd() * 16) * k, v = 60 * k * (.5 + rnd()), fase = rnd() * H * 1.4; const y = H + 40 * k - ((t * v + fase) % (H + 120 * k)), xx = x + Math.sin(t * 2 + i) * 10 * k; ctx.beginPath(); ctx.arc(xx, y, rd, 0, 7); ctx.stroke(); }
  ctx.restore();
  const rs = azar(11); ctx.save(); ctx.fillStyle = 'rgba(245,243,251,.6)';
  for (let i = 0; i < 26; i++) { const x = rs() * W, y = rs() * H * .7, tw = .4 + .6 * Math.abs(Math.sin(t * 1.5 + i)); ctx.globalAlpha = tw * .55; ctx.fillRect(x, y, 3 * k, 3 * k); }
  ctx.restore();
}
// superficie con borde pegatina, la aleta nadando hacia la izquierda y los corales de píxel desde el borde de abajo
function fondoAbajo(ctx, W, H, t, ySup, k, alto) {
  const olaEn = x => ySup + Math.sin(x / k * .012 + t * 3) * 10 * k;
  const p = new Path2D(); p.moveTo(-60 * k, H + 60 * k); p.lineTo(-60 * k, ySup); for (let x = -60 * k; x <= W + 60 * k; x += 20 * k) p.lineTo(x, olaEn(x)); p.lineTo(W + 60 * k, H + 60 * k); p.closePath();
  const fx = W + 150 * k - ((t * 170 * k) % (W + 300 * k));
  ctx.save(); const cl = new Path2D(); cl.rect(0, 0, W, olaEn(fx) + 4 * k); ctx.clip(cl); aleta(ctx, fx, olaEn(fx) + alto * .13 + Math.sin(t * 8) * 3 * k, alto, 1, -.05); ctx.restore();
  const g = ctx.createLinearGradient(0, ySup, 0, H); g.addColorStop(0, C.bioluz); g.addColorStop(1, C.aleta);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 26 * k; ctx.strokeStyle = C.abisal; ctx.stroke(p); ctx.lineWidth = 12 * k; ctx.strokeStyle = '#fff'; ctx.stroke(p); ctx.globalAlpha = .93; ctx.fillStyle = g; ctx.fill(p); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round'; const b = alto / 120;
  for (let i = 1; i <= 3; i++) { const ex = fx + (60 + i * 60) * b; ctx.globalAlpha = 1 - i * .25; ctx.beginPath(); ctx.arc(ex, olaEn(ex) - 2 * k, (16 + i * 8) * b, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  ctx.restore();
  const P = 14 * k, rc = azar(23), cols = [C.indigo, C.abisal, C.aleta, C.indigo, C.coralP, C.abisal, C.aleta], tope = Math.max(3, Math.floor((H - ySup - 26 * k) / P));
  const n = Math.round(W / 1080 * 13);
  for (let c = 0; c < n; c++) {
    const x0 = Math.round((20 * k + c * (W - 40 * k) / (n - 1) + (rc() - .5) * 40 * k) / P) * P, len = Math.min(tope, 4 + Math.floor(rc() * 8)), col = cols[c % cols.length], gr = c % 3 === 0 ? 1 : 2;
    ctx.fillStyle = col; const puntas = [];
    for (let i = 0; i < len; i++) { ctx.fillRect(x0, H - P - i * P, P * gr, P);
      if (i > 1 && rc() < .45) { const d = rc() < .5 ? -1 : 1, l = 1 + Math.floor(rc() * 3); let bx = x0 + (d > 0 ? P * (gr - 1) : 0), by = H - P - i * P;
        for (let j = 1; j <= l && (H - by) / P < tope; j++) { bx += d * P; by -= P; ctx.fillRect(bx, by, P, P); } puntas.push([bx, by]); } }
    puntas.push([x0 + P * (gr - 1), H - P * len]);
    ctx.fillStyle = col === C.coralP ? C.perla : C.bioluz; puntas.forEach(([tx, ty], j) => { if ((H - ty) / P >= tope) return; ctx.globalAlpha = .5 + .5 * Math.sin(t * 2 + c + j); ctx.fillRect(tx, ty - P, P, P); }); ctx.globalAlpha = 1;
  }
}

// título que salta letra a letra (encoge si no cabe)
function tituloLetras(ctx, txt, cx, cy, t, tam, maxW, k) {
  let f = `400 ${tam}px ${BOMB}`, tw = ancho(ctx, txt, f, 2 * k);
  if (tw > maxW) { tam *= maxW / tw; f = `400 ${tam}px ${BOMB}`; tw = ancho(ctx, txt, f, 2 * k); }
  let x = cx - tw / 2;
  [...txt].forEach((ch, i) => {
    const cw = ancho(ctx, ch, f, 2 * k), kk = E.back(pr(t, .2 + i * .04, .55 + i * .04));
    if (kk > 0) { ctx.save(); ctx.globalAlpha *= clamp(kk, 0, 1); ctx.translate(x + cw / 2, cy); ctx.scale(kk, kk); ctx.rotate(Math.sin(t * 2 + i) * .03); texto(ctx, ch, 0, Math.sin(t * 3 + i * .6) * 4 * k, f, { al: 'center', trazo: tam * .2, esp: 2 * k }); ctx.restore(); }
    x += cw;
  });
}
// píldora con borde pegatina (enlace en cian; etiqueta de evento en perla con punto coral)
function pildora(ctx, txt, cx, cy, kk, o) {
  if (kk <= 0 || !txt) return; const f = o.f, tw = ancho(ctx, txt, f, o.esp || 0), ic = o.ic || 0, w = tw + o.h * .9 + ic, h = o.h;
  ctx.save(); ctx.globalAlpha *= clamp(kk, 0, 1); ctx.translate(cx, cy); ctx.scale(kk * (o.lat || 1), kk * (o.lat || 1));
  pega(ctx, caja(-w / 2, -h / 2, w, h, h / 2), { ring: h * .075, out: h * .075, drop: h * .11, fill: o.fill });
  if (o.punto) { const ph = o.fase, r = h * .15, px = -w / 2 + h * .45; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(px, 0, r, 0, 7); ctx.fill();
    ctx.save(); ctx.globalAlpha *= 1 - ph; ctx.strokeStyle = C.coral; ctx.lineWidth = h * .05; ctx.beginPath(); ctx.arc(px, 0, r + ph * h * .22, 0, 7); ctx.stroke(); ctx.restore(); }
  if (o.icono) icono(ctx, o.icono, -w / 2 + h * .38, -h * .26, h * .52, C.abisal, 2.6);
  texto(ctx, txt, -w / 2 + h * .45 + ic, h * .03, f, { esp: o.esp || 0, col: C.abisal }); ctx.restore();
}

export const anuncioCuenta2027 = {
  id: 'anuncio-cuenta-2027',
  opaco: true,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal', 'retrato', 'cuadrado'],
  nombre: 'Anuncio con cuenta atrás 2027',
  desc: 'Mar 2027 con el título que salta letra a letra, el regalo (o tu imagen de adelanto en silueta o borrosa) con ondas de sonar y una cuenta atrás que avanza de verdad en cajas HUD, o la fecha de salida. Enlace en píldora, texto de abajo, aleta nadando, corales de píxel y música.',
  fps: 30,
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Nueva merch!', max: 22 },
    { k: 'modo', label: 'Tipo', tipo: 'chips', def: 'contador', opciones: [['contador', '⏱ Cuenta atrás (HH:MM:SS)'], ['fecha', '📅 Fecha (DD-MM-AAAA)']] },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'llega en…', max: 30, si: 'modo=contador' },
    { k: 'd', label: 'Días (0 = no se muestran)', tipo: 'numero', def: 0, min: 0, max: 99, paso: 1, si: 'modo=contador' },
    { k: 'h', label: 'Horas', tipo: 'numero', def: 1, min: 0, max: 23, paso: 1, si: 'modo=contador' },
    { k: 'm', label: 'Minutos', tipo: 'numero', def: 0, min: 0, max: 59, paso: 1, si: 'modo=contador' },
    { k: 's', label: 'Segundos', tipo: 'numero', def: 0, min: 0, max: 59, paso: 1, si: 'modo=contador' },
    { k: 'tic', label: 'Sonido de tic-tac', tipo: 'chips', def: 'si', opciones: [['si', '⏱ Sí'], ['no', 'No']], si: 'modo=contador' },
    { k: 'fraseF', label: 'Frase', tipo: 'texto', def: 'llega el…', max: 30, si: 'modo=fecha' },
    { k: 'fecha', label: 'Fecha (DD-MM-AAAA)', tipo: 'texto', def: '03-10-2026', max: 10, si: 'modo=fecha' },
    { k: 'hora', label: 'Hora (opcional, ej. 20:00 h · España)', tipo: 'texto', def: '', max: 26, si: 'modo=fecha' },
    { k: 'imagen', label: 'Imagen de adelanto (opcional)', tipo: 'imagen' },
    { k: 'misterio', label: 'Cómo se ve la imagen', tipo: 'chips', def: 'silueta', opciones: [['silueta', '👤 Silueta misteriosa'], ['borrosa', '🌫️ Borrosa'], ['normal', '👀 Normal']] },
    { k: 'zoom', label: 'Zoom de la imagen (%)', tipo: 'numero', def: 100, min: 50, max: 250, paso: 5 },
    { k: 'url', label: 'Enlace (opcional)', tipo: 'texto', def: 'kyomerch.shop', max: 36 },
    { k: 'envio', label: 'Texto de abajo (opcional)', tipo: 'texto', def: 'Envíos a todo el mundo', max: 32 },
    ...CAMPOS_MUSICA_2027,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 10, min: 5, max: 30, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 10, 5, 30),
  _variante: { icono: 'regalo', iconoUrl: 'bolsa', iconoPie: 'mundo' },
  _T1: 1.6, // segundo en el que empieza a correr la cuenta
  _total: o => Math.max(0, (Number(o.d) || 0) * 86400 + (Number(o.h) || 0) * 3600 + (Number(o.m) || 0) * 60 + (Number(o.s) || 0)),
  _capa(W, H) { this._c = this._c || {}; return this._c[W + 'x' + H] || (this._c[W + 'x' + H] = Object.assign(document.createElement('canvas'), { width: W, height: H })); },
  sonido(o) {
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100, tic = !this._variante.hoy && o.modo !== 'fecha' && o.tic !== 'no', mus = o.musica || 'burbuja';
    if (mus === 'ninguna' && !tic) return Promise.resolve(null);
    const T1 = this._T1, total = this._total(o);
    return renderSonido(L, (ac, out) => {
      if (mus !== 'ninguna') musicaFondo(ac, out, L, mus, 1.5 * v);
      if (tic) for (let s = 1; T1 + s < L && s <= total; s++) {
        const t0 = T1 + s, os = ac.createOscillator(); os.type = 'sine'; os.frequency.value = s % 2 ? 1800 : 1350;
        const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.18 * v, t0 + .003); g.gain.exponentialRampToValueAtTime(.0001, t0 + .05);
        os.connect(g).connect(out); os.start(t0); os.stop(t0 + .07);
      }
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const V = this._variante, hoy = !!V.hoy, fecha = o.modo === 'fecha' || hoy, img = o.imagen, horiz = fmt === 'horizontal';
    const lx = LX[fmt] || LX.vertical, k = W / (horiz ? 1920 : 1080), evento = V.evento && o.evento ? 1 : 0, d = evento ? lx.dc : 0;
    mar(ctx, W, H, t, k);
    fondoAbajo(ctx, W, H, t, lx.sup * k, k, lx.fin * k);
    // isotipo y título
    { const a = pr(t, .1, .5); if (a > 0) { ctx.save(); ctx.globalAlpha *= a; isotipo(ctx, lx.iso[0] * k, lx.iso[1] * k + Math.sin(t * 2) * 4 * k, lx.iso[2] * k); ctx.restore(); } }
    if (o.titulo) tituloLetras(ctx, o.titulo, W / 2, lx.tY * k, t, (o.titulo.length > 16 ? lx.tF * .88 : lx.tF) * k, W - (horiz ? 520 : 120) * k, k);
    // etiqueta del evento: píldora perla con el punto coral que late
    if (evento) pildora(ctx, o.evento, W / 2, lx.chip * k, E.back(pr(t, .9, 1.25)), { f: `700 ${44 * k * lx.tF / 118}px ${FRE}`, h: 84 * k * lx.tF / 118, fill: C.perla, punto: true, fase: (t * 1.1) % 1, ic: 34 * k * lx.tF / 118 });
    // icono o imagen de adelanto
    const cxI = lx.cxI * k, cyI = (lx.c + d) * k, ic = E.back(pr(t, 1.1, 1.5));
    if (ic > 0) {
      const flota = Math.sin(t * 2.4) * 10 * k;
      ctx.save(); const R = (img ? lx.S * .62 : lx.R) * k;
      for (let j = 0; j < 2; j++) { const dd = (t * .7 + j * .5) % 1; ctx.globalAlpha = (1 - dd) * .6 * clamp(ic, 0, 1); ctx.strokeStyle = C.bioluz; ctx.lineWidth = 5 * k; ctx.beginPath(); ctx.arc(cxI, cyI + flota, R + 6 * k + dd * 90 * k, 0, 7); ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.translate(cxI, cyI + flota); ctx.scale(ic, ic);
      if (img) this._imagen(ctx, img, o, lx.S * k, t, k);
      else { const p = new Path2D(); p.arc(0, 0, lx.R * k, 0, 7); pega(ctx, p, { ring: 9 * k, out: 8 * k, drop: 14 * k, fill: C.bioluz }); icono(ctx, V.icono, -lx.R * .5 * k, -lx.R * .5 * k, lx.R * k, C.abisal, 2.4); }
      ctx.restore();
    }
    // frase
    const cxC = lx.cxC * k, fr = fecha && !hoy ? o.fraseF : o.frase, fy = (lx.fr + d) * k;
    if (fr) { const a = E.back(pr(t, 1.4, 1.8)); if (a > 0) { ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); texto(ctx, fr, cxC, fy + (1 - a) * 20 * k, `700 ${54 * k * lx.F / 150}px ${FRE}`, { al: 'center', trazo: 10 * k }); ctx.restore(); } }
    // cajas: cuenta atrás, fecha u hora del día
    let partes, etiquetas, sep = '', urg = false, cambio = [];
    if (hoy) {
      const m = String(o.horaHoy || '').trim().match(/^(\d{1,2})\D+(\d{2})/);
      if (m) { partes = [m[1].padStart(2, '0'), m[2]]; etiquetas = ['', '']; sep = ':'; } else { partes = [String(o.horaHoy || '—')]; etiquetas = ['']; }
    } else if (fecha) {
      const m = String(o.fecha || '').trim().match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})$/);
      if (m) { partes = [m[1].padStart(2, '0'), m[2].padStart(2, '0'), m[3]]; etiquetas = ['DÍA', 'MES', 'AÑO']; sep = '-'; } else { partes = [String(o.fecha || '—')]; etiquetas = ['']; }
    } else {
      const total = this._total(o), T1 = this._T1, pasados = Math.max(0, Math.floor(t - T1)), rest = Math.max(0, total - pasados), frac = t - T1 - Math.floor(t - T1);
      const trozos = r => [Math.floor(r / 86400), Math.floor(r % 86400 / 3600), Math.floor(r % 3600 / 60), r % 60];
      const act = trozos(rest), ant = trozos(Math.min(total, rest + 1)), idx = (Number(o.d) || 0) > 0 ? [0, 1, 2, 3] : [1, 2, 3];
      partes = idx.map(i => String(act[i]).padStart(2, '0')); etiquetas = idx.map(i => ['DÍAS', 'HORAS', 'MIN', 'SEG'][i]); sep = ':';
      cambio = idx.map(i => t > T1 + 1 && pasados <= total && act[i] !== ant[i] && frac < .35 ? { k: frac / .35, ant: String(ant[i]).padStart(2, '0') } : null);
      urg = rest <= 10 && total > 0;
    }
    let F = (hoy ? lx.F * 1.27 : lx.F) * k, bh = (hoy ? lx.bh * 1.13 : lx.bh) * k;
    const medir = F => { const f = `700 ${F}px ${HUD}`, ws = partes.map(p => Math.max(F * 1.25, ancho(ctx, p, f) + F * .55)), sw = sep ? F * .34 : 0; return { f, ws, sw, tot: ws.reduce((a, b) => a + b, 0) + sw * (partes.length - 1) }; };
    let mm = medir(F); const maxC = lx.anchoC * k; if (mm.tot > maxC) { const s = maxC / mm.tot; F *= s; bh *= s; mm = medir(F); }
    const by = (lx.bl + d + (hoy ? 15 : 0)) * k; let x = cxC - mm.tot / 2;
    partes.forEach((p, i) => {
      const w = mm.ws[i], bx = x; x += w + mm.sw;
      const a = E.back(pr(t, 1.6 + i * .12, 1.95 + i * .12)); if (a <= 0) return;
      ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(bx + w / 2, by); ctx.scale(a, a);
      pega(ctx, caja(-w / 2, -bh / 2, w, bh, 30 * k * bh / (230 * k)), { ring: 6 * k, out: 6 * k, drop: 12 * k });
      hud(ctx, -w / 2, -bh / 2, w, bh, 30 * k * bh / (230 * k), 5 * k, 13 * k * bh / (230 * k));
      ctx.save(); ctx.clip(caja(-w / 2, -bh / 2, w, bh, 30 * k));
      const col = urg ? (Math.floor(t * 4) % 2 ? C.coral : C.coralP) : C.perla, cb = cambio[i];
      if (cb) { const e = E.out(cb.k); ctx.globalAlpha *= 1 - e; texto(ctx, cb.ant, 0, F * .04 - e * bh * .5, mm.f, { al: 'center', col }); ctx.globalAlpha = clamp(a, 0, 1) * e; texto(ctx, p, 0, F * .04 + (1 - e) * bh * .5, mm.f, { al: 'center', col }); }
      else texto(ctx, p, 0, F * .04, mm.f, { al: 'center', col });
      ctx.restore(); ctx.restore();
      if (etiquetas[i]) { ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); texto(ctx, etiquetas[i], bx + w / 2, by + bh / 2 + F * .33, `700 ${F * .21}px ${HUD}`, { al: 'center', esp: F * .04, col: C.espuma }); ctx.restore(); }
      if (i < partes.length - 1 && sep && a >= 1) {
        const sx = bx + w + mm.sw / 2; ctx.save(); ctx.fillStyle = C.bioluz; ctx.globalAlpha *= sep === ':' ? .55 + .45 * (Math.floor(t * 2) % 2) : 1;
        if (sep === ':') [-.2, .2].forEach(dd => { ctx.beginPath(); ctx.arc(sx, by + dd * F, F * .075, 0, 7); ctx.fill(); });
        else ctx.fill(caja(sx - F * .11, by - F * .04, F * .22, F * .08, F * .04));
        ctx.restore();
      }
    });
    // hora (modo fecha) u hora de "hoy": píldora perla en HUD debajo de las cajas
    const conHora = fecha && !!o.hora, s = lx.F / 150, yy = (lx.url + (conHora ? lx.hd : 0)) * k;
    if (conHora) { const a = E.back(pr(t, 2.2, 2.55)); if (a > 0) { const hy = by + bh / 2 + (hoy ? 56 * k * s : F * .33 + 72 * k * s);
      ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); ctx.translate(cxC, hy); ctx.scale(a, a); etiqueta(ctx, o.hora.toUpperCase(), 0, 0, { al: 'center', tam: 30 * k * lx.F / 150, bg: C.perla }); ctx.restore(); } }
    // enlace y texto de abajo
    const cxP = horiz ? cxC : W / 2;
    if (o.url) pildora(ctx, o.url, cxP, yy, E.back(pr(t, 2.4, 2.85)), { f: `700 ${44 * k * lx.F / 150}px ${HUD}`, esp: k, h: 92 * k * lx.F / 150, fill: C.bioluz, icono: V.iconoUrl, ic: 50 * k * lx.F / 150, lat: 1 + Math.sin(t * 4) * .012 });
    if (o.envio && t > 2.7) {
      const a = pr(t, 2.7, 3.1), f = `700 ${46 * k * s}px ${FRE}`, tw = ancho(ctx, o.envio, f), x1 = cxP - (tw + 64 * k * s) / 2, py = (lx.pie + (conHora ? lx.hd : 0)) * k;
      ctx.save(); ctx.globalAlpha *= a; icono(ctx, V.iconoPie, x1, py - 24 * k * s, 48 * k * s, C.perla, 2.4); texto(ctx, o.envio, x1 + 64 * k * s, py + 2 * k, f, { trazo: 10 * k * s });
      destello(ctx, x1 + tw + 110 * k * s, py - 10 * k * s, 26 * k * s, C.perla, .5 + .5 * Math.sin(t * 5), t); destello(ctx, x1 + tw + 140 * k * s, py - 34 * k * s, 14 * k * s, C.bioluz, .5 + .5 * Math.sin(t * 5 + 2), t); ctx.restore();
    }
  },
  // imagen de adelanto en pegatina cuadrada: silueta, borrosa o normal (con el "?" si es misterio)
  _imagen(ctx, img, o, s, t, k) {
    ctx.rotate(rad(-2 + Math.sin(t * 1.6) * 1.2));
    const marco = caja(-s / 2, -s / 2, s, s, 36 * k), mist = o.misterio || 'silueta';
    pega(ctx, marco, { ring: 9 * k, out: 7 * k, drop: 16 * k, fill: mist === 'normal' ? C.perla : C.aleta });
    ctx.save(); ctx.clip(marco);
    if (mist !== 'normal') { const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, C.indigo); g.addColorStop(1, C.aleta); ctx.fillStyle = g; ctx.fillRect(-s / 2, -s / 2, s, s); }
    const z = clamp(Number(o.zoom) || 100, 50, 250) / 100, bw = s * .84 * z, kk = Math.min(bw / img.width, bw / img.height), dw = img.width * kk, dh = img.height * kk;
    if (mist === 'silueta') {
      const mt = ctx.getTransform(), sx = Math.min(1, Math.hypot(mt.a, mt.b)) || 1, cw = Math.max(1, Math.round(dw * sx)), ch = Math.max(1, Math.round(dh * sx));
      const c2 = this._capa(cw, ch), x2 = c2.getContext('2d'); x2.setTransform(1, 0, 0, 1, 0, 0); x2.clearRect(0, 0, cw, ch); x2.globalCompositeOperation = 'source-over';
      x2.drawImage(img, 0, 0, cw, ch); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = C.abisal; x2.fillRect(0, 0, cw, ch); x2.globalCompositeOperation = 'source-over';
      ctx.drawImage(c2, -dw / 2, -dh / 2, dw, dh);
    } else if (mist === 'borrosa') {
      const mt = ctx.getTransform(), sx = Math.hypot(mt.a, mt.b) || 1;
      ctx.filter = `blur(${Math.max(2, 26 * k * sx)}px)`; ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); ctx.filter = 'none';
    } else ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    if (mist !== 'normal') { const pq = 1 + Math.sin(t * 4) * .06; ctx.save(); ctx.rotate(rad(-8)); ctx.scale(pq, pq);
      fuente(ctx, `400 ${s * .42}px ${BOMB}`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = s * .09; ctx.strokeStyle = C.abisal; ctx.strokeText('?', 0, 0); ctx.lineWidth = s * .04; ctx.strokeStyle = C.perla; ctx.strokeText('?', 0, 0); ctx.fillStyle = C.bioluz; ctx.fillText('?', 0, 0); ctx.restore(); }
  }
};
