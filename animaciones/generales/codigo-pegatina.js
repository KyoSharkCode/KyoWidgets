// Kyo Estudio · Plantilla: Pegatina "Usa el código"
import * as K from '../kit-dibujado.js';
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, lerp } from '../base/utilidades.js';
import { AC, siluetaEn } from '../base/acabado.js';
import { BOLSA, ASA, CORAZON, ALETA } from '../base/iconos.js';
import { pegatina, destello } from '../base/piezas.js';

// 1 · Pegatina "Usa el código"
export const pegatinaCodigo = {
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
    if (AC) return pegatinaCodigoDibujada(ctx, t, o, fmt, W, H);
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
// Pegatina del código con acabado dibujado (mismo diseño y tiempos que la limpia)
const T_GOLPE_PEG = .82; // el código cae sobre la tarjeta
function movGeneral(tm, k) {
  if (!k.muelle) {
    const p = kf(tm, [[0, { s: .2, r: -14, a: 0 }], [.42, { s: 1.07, r: 2, a: 1 }], [.7, { s: 1, r: 0, a: 1 }], [5.88, { s: 1, r: 0, a: 1 }], [6.16, { s: 1.07, r: -2, a: 1 }], [6.58, { s: .15, r: 10, a: 0 }]], EASE.back);
    return { ...p, y: 0, sx: 1, sy: 1 };
  }
  const R = { frec: 1.8, amort: 5.2 };
  if (tm < 5.9) {
    const p = K.resorte(tm, 0, R), e = K.estirar(K.velocidad(x => K.resorte(x, 0, R), tm), { fuerza: .045, max: .22 });
    return { s: lerp(.2, 1, p), r: lerp(-14, 0, p), a: clamp(tm / .1, 0, 1), y: 0, sx: e.ancho, sy: e.largo };
  }
  // salida: se agacha (anticipación) y sale disparada hacia arriba girando
  const an = K.anticipa(tm, 6.06, { largo: .18, fuerza: .14 });
  const p = clamp((tm - 6.06) / .46, 0, 1), pe = p * p * p, fs = k.impacto && k.smear === 'estirado' ? .75 : .22, st = p > 0 ? 1 + fs * Math.sin(Math.PI * Math.min(1, p * 1.4)) : 1;
  return { s: lerp(1, .15, pe), r: lerp(0, 16, pe), a: 1 - clamp((p - .55) / .45, 0, 1), y: -160 * pe, sx: an.sx / st, sy: an.sy * st };
}
function movCodigo(tm, k) {
  if (!k.muelle) {
    const c = kf(tm, [[.63, { s: 2.4, r: -12, a: 0 }], [.91, { s: .92, r: 5, a: 1 }], [1.12, { s: 1.06, r: 2, a: 1 }], [1.33, { s: 1, r: 3, a: 1 }], [3.22, { s: 1, r: 3, a: 1 }], [3.43, { s: 1.12, r: -2, a: 1 }], [3.71, { s: 1, r: 3, a: 1 }]], EASE.back);
    return { ...c, sx: 1, sy: 1 };
  }
  // cae acelerando hacia la tarjeta…
  if (tm < T_GOLPE_PEG) { const p = clamp((tm - .63) / (T_GOLPE_PEG - .63), 0, 1), q = Math.pow(p, 1.5); return { s: lerp(2.4, 1, q), r: lerp(-12, 3, q), a: clamp(p * 4, 0, 1), sx: 1, sy: 1 }; }
  // …se aplasta al chocar, y a mitad se agacha y da un latido con rebote
  const ap = K.aplaston(tm, T_GOLPE_PEG, { fuerza: .26, frec: 3, amort: 8 });
  const an = K.anticipa(tm, 3.32, { largo: .14, fuerza: .12 }), lat = K.impulso(tm, 3.32, { frec: 2.2, amort: 5 });
  return { s: 1 + .16 * lat, r: 3 - 5 * lat - 4 * K.impulso(tm, T_GOLPE_PEG, { frec: 3, amort: 8 }), a: 1, sx: ap.sx * an.sx, sy: ap.sy * an.sy };
}
function cuerpoPegatina(ctx, tm, t, o, fmt, W, H) {
  const P = paleta(o), k = AC.k, dib = AC.dib, amp = AC.amp, vert = fmt === 'vertical';
  let u = (vert ? 1.36 : 1) * (Number(o.tam) || 1);
  const F = uu => ({ chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3.2 * uu, l1: `700 ${46 * uu}px "Fredoka"`, code: `400 ${94 * uu}px "Cherry Bomb One"`, codeE: 1.9 * uu, l2: `700 ${40 * uu}px "Fredoka"` });
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
  if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
  const { f, padX, w, h } = m;
  const pos = colocar(fmt, o, W, H, w, h, 80 * u), x0 = pos.x, y0 = pos.y, cx = x0 + w / 2, cy = y0 + h / 2, xAl = ww => vert ? x0 + (w - ww) / 2 : x0 + padX;

  const g = movGeneral(tm, k);
  if (g.a <= .001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(g.a, 0, 1);
  ctx.translate(pos.ox, pos.oy + g.y * u); ctx.rotate(rad(g.r)); ctx.scale(g.s, g.s); ctx.translate(-pos.ox, -pos.oy);
  K.deformar(ctx, cx, y0 + h, g.sx, g.sy); // squash & stretch apoyado en la base
  const wb = (1 - Math.cos(2 * Math.PI * t / 3.2)) / 2;
  ctx.translate(cx, cy - 6 * u * wb); ctx.rotate(rad(1.2 * wb)); ctx.translate(-cx, -cy);

  // aleta (detrás de la tarjeta)
  if (o.aleta !== 'no') {
    let fy, fa, fsx = 1, fsy = 1;
    if (k.muelle) {
      const R = { frec: 2.4, amort: 7 }, p = K.resorte(tm, .98, R), e = K.estirar(K.velocidad(x => K.resorte(x, .98, R), tm), { fuerza: .03, max: .3 });
      fy = lerp(70, 0, p); fa = clamp((tm - .98) / .1, 0, 1); fsx = e.ancho; fsy = e.largo;
    } else { const q = kf(tm, [[.98, { y: 70, a: 0 }], [1.4, { y: -6, a: 1 }], [1.68, { y: 0, a: 1 }]], EASE.back); fy = q.y; fa = q.a; }
    if (fa > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(fa, 0, 1);
      ctx.translate(x0 + w - 166 * u, y0 - 78 * u + fy * u); ctx.scale(u, u);
      K.deformar(ctx, 58, 78, fsx, fsy);
      if (amp) K.tiembla(ctx, 58, 40, 11, dib, 1.6, 1.2);
      ctx.fillStyle = P.c; ctx.fill(ALETA); ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = P.p;
      if (k.trazos) K.trazar(ctx, ALETA, 330, clamp((tm - 1.02) / .5, 0, 1)); else ctx.stroke(ALETA);
      ctx.restore();
    }
  }

  // tarjeta (inclinada -2°)
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-2)); ctx.translate(-cx, -cy);
  pegatina(ctx, x0, y0, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u, trazo: k.trazos ? clamp((tm - .04) / .6, 0, 1) : 1 });
  ctx.textBaseline = 'middle';
  let y = y0 + 22 * u;
  if (o.chip) {
    const a = k.muelle ? { y: lerp(16, 0, K.resorte(tm, .28, { frec: 2.6, amort: 8 })), a: clamp((tm - .28) / .15, 0, 1) } : kf(tm, [[.28, { y: 16, a: 0 }], [.63, { y: 0, a: 1 }]]);
    ctx.save(); ctx.globalAlpha *= a.a;
    const xc = xAl(m.chipW); if (amp) K.tiembla(ctx, xc + m.chipW / 2, y + 17 * u, 21, dib, 1.2 * u, .6);
    ctx.fillStyle = P.a; ctx.fill(K.rrDibujado(xc, y + a.y * u, m.chipW, 34 * u, 17 * u, { sem: 21, dib, amp: 1.2 * amp * u }).camino);
    fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.textAlign = 'left'; ctx.fillText(o.chip.toUpperCase(), xc + 16 * u, y + 17 * u + a.y * u + 1);
    ctx.restore(); y += 40 * u;
  }
  if (o.l1) {
    let a;
    if (k.muelle) {
      const R = { frec: 2.2, amort: 7 }, e = K.estirar(K.velocidad(x => K.resorte(x, .49, R), tm) * 40, { fuerza: .001, max: .22 });
      a = { x: lerp(-40, 0, K.resorte(tm, .49, R)), a: clamp((tm - .49) / .12, 0, 1), sx: e.largo, sy: e.ancho };
    } else a = { ...kf(tm, [[.49, { x: -40, a: 0 }], [.84, { x: 0, a: 1 }]], EASE.back), sx: 1, sy: 1 };
    ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
    K.deformar(ctx, xAl(m.l1W) + a.x * u, y + 26 * u, a.sx, a.sy);
    if (amp) K.tiembla(ctx, xAl(m.l1W) + m.l1W / 2, y + 26 * u, 31, dib, 1.2 * u, .5);
    fuente(ctx, f.l1); ctx.fillStyle = P.t; ctx.textAlign = 'left'; ctx.fillText(o.l1, xAl(m.l1W) + a.x * u, y + 26 * u);
    ctx.restore(); y += 57 * u;
  }

  // código
  y += 10 * u;
  {
    const cw = m.codeW, ch = 112 * u, x = vert ? x0 + (w - cw) / 2 : x0 + padX - 6 * u, ccx = x + cw / 2, ccy = y + ch / 2;
    const dibCodigo = c => {
      if (c.a <= .01) return;
      ctx.save(); ctx.globalAlpha *= clamp(c.a, 0, 1);
      ctx.translate(ccx, ccy); ctx.rotate(rad(c.r)); ctx.scale(c.s, c.s); ctx.translate(-ccx, -ccy);
      K.deformar(ctx, ccx, y + ch, c.sx, c.sy);
      const cara = pegatina(ctx, x, y, cw, ch, 24 * u, { fill: P.a, p: P.p, o: P.o, ring: 7 * u, out: 5 * u, drop: 10 * u, suave: false });
      ctx.save(); if (amp) K.tiembla(ctx, ccx, ccy, 41, dib, 1.4 * u, .8);
      fuente(ctx, f.code, f.codeE); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(o.codigo || '', ccx, ccy + 4 * u);
      ctx.restore();
      // brillo que cruza el código
      const sh = tm < 3 ? kf(tm, [[1.4, { x: -.6 }], [2.1, { x: 1.4 }]], EASE.io) : kf(tm, [[4.06, { x: -.6 }], [4.62, { x: 1.4 }]], EASE.io);
      if (sh.x > -.6 && sh.x < 1.4) {
        ctx.save(); ctx.clip(cara);
        const bx = x + sh.x * cw, bw = .32 * cw;
        ctx.translate(bx + bw / 2, ccy); ctx.transform(1, 0, Math.tan(rad(-20)), 1, 0, 0);
        if (k.sombras) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-bw * .3, -ch * .7, bw * .38, ch * 1.4); ctx.fillRect(bw * .18, -ch * .7, bw * .1, ch * 1.4); }
        else {
          const gr = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gr; ctx.fillRect(-bw / 2, -ch * .7, bw, ch * 1.4);
        }
        ctx.restore();
      }
      ctx.restore();
    };
    if (k.impacto) {
      K.rafaga(ctx, ccx, ccy, (tm - T_GOLPE_PEG) / .32, { r0: cw * .42, r1: cw * .95, n: 16, color: P.a, grosor: 18 * u, sem: 5 });
      if (k.muelle && k.smear !== 'estirado' && tm >= .63 && tm < T_GOLPE_PEG) K.estela(ctx, tm, x => dibCodigo(movCodigo(x, k)), { copias: 3, paso: 1 / 45, alfa: .22 });
    }
    const cod = movCodigo(tm, k);
    // smear estirado: en los últimos fotogramas de la caída el código se alarga como un chicle
    if (k.impacto && k.muelle && k.smear === 'estirado' && tm >= .63 && tm < T_GOLPE_PEG) { const e = 1 + 1.1 * clamp(((tm - .63) / (T_GOLPE_PEG - .63) - .45) / .55, 0, 1); cod.sx /= Math.sqrt(e); cod.sy *= e; }
    dibCodigo(cod);
    y += ch + 14 * u;
  }
  if (o.l2 || o.dest) {
    const a = k.muelle ? { y: lerp(24, 0, K.resorte(tm, 1.19, { frec: 2.4, amort: 7 })), a: clamp((tm - 1.19) / .12, 0, 1) } : kf(tm, [[1.19, { y: 24, a: 0 }], [1.61, { y: 0, a: 1 }]], EASE.back);
    ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
    let x = xAl(m.l2W); const yy = y + 24 * u + a.y * u;
    if (amp) K.tiembla(ctx, x + m.l2W / 2, yy, 51, dib, 1.2 * u, .5);
    if (o.icono !== 'ninguno') {
      ctx.save(); ctx.translate(x, yy - 22 * u); ctx.scale(44 * u / 24, 44 * u / 24);
      ctx.fillStyle = P.a; ctx.strokeStyle = P.a;
      if (o.icono === 'corazon') ctx.fill(CORAZON);
      else { ctx.fill(BOLSA); ctx.lineWidth = 2; ctx.lineCap = 'round'; if (k.trazos) K.trazar(ctx, ASA, 17, clamp((tm - 1.35) / .35, 0, 1)); else ctx.stroke(ASA); }
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
  sp.forEach(([a, b, col, dl, modo], i) => {
    let x, yy;
    if (modo === 'l') { x = x0 + a * u; yy = y0 + b * u; }
    else if (modo === 'r') { x = x0 + w - 10 * u - S; yy = y0 + 160 * u; }
    else if (modo === 'rb') { x = x0 + w + 30 * u - S; yy = y0 + h - 40 * u - S; }
    else if (modo === 'pb') { x = x0 + w * a; yy = y0 + h + 40 * u - S; }
    else { x = x0 + w * a; yy = y0 - 30 * u; }
    const q = kf(tm - dl, [[.98, { s: 0, r: 0, a: 0 }], [1.26, { s: 1.25, r: 40, a: 1 }], [1.96, { s: .8, r: 90, a: .9 }], [3.08, { s: .7, r: 120, a: .6 }], [3.5, { s: 1.15, r: 160, a: 1 }], [4.34, { s: .7, r: 200, a: .7 }], [5.88, { s: .7, r: 260, a: .7 }], [6.3, { s: 0, r: 280, a: 0 }]]);
    destello(ctx, x + S / 2, yy + S / 2, S, col, q.s, q.r, q.a);
  });
  ctx.restore();
}
function pegatinaCodigoDibujada(ctx, t, o, fmt, W, H) {
  const k = AC.k, tm = tiempo(t, pegatinaCodigo.duracion(o), 1.75, 5.88, 6.6, .72), todo = x => cuerpoPegatina(ctx, x, t, o, fmt, W, H);
  if (k.impacto && k.muelle && k.smear !== 'estirado' && tm > 6.12 && tm < 6.5) K.estela(ctx, tm, todo, { copias: 2, paso: 1 / 30, alfa: .18 });
  todo(tm);
  AC.golpe = T_GOLPE_PEG;
  if (siluetaEn(T_GOLPE_PEG)) K.silueta(ctx, paleta(o).p);
}
