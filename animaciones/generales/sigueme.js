// Kyo Estudio · Plantilla: ¡Sígueme!
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, IMG_OPC } from '../base/utilidades.js';
import { CORAZON, MAS, ESTRELLA, icono } from '../base/iconos.js';
import { pegatina, avatar, cursor, boton, inicio, balanceo, destellosCaja } from '../base/piezas.js';

// 3 · ¡Sígueme!
export const sigueme = {
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
