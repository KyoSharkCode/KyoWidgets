// Kyo Estudio · Plantilla: ¡Nueva merch!
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, envolver, imagenEn } from '../base/utilidades.js';
import { AC, popResorte, caidaGolpe, golpeEn } from '../base/acabado.js';
import { CAMISETA, icono } from '../base/iconos.js';
import { pegatina, inicio, balanceo, destellosCaja } from '../base/piezas.js';

// 6 · ¡Nueva merch!
export const merch = {
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
    const fa = AC && AC.k.muelle ? caidaGolpe(tm, .3, .58, 1.9, -22, -4) : kf(tm, [[.3, { s: 1.9, r: -22, a: 0 }], [.62, { s: .94, r: -2, a: 1 }], [.8, { s: 1.03, r: -5, a: 1 }], [.95, { s: 1, r: -4, a: 1 }]], EASE.back);
    if (AC) golpeEn(ctx, fx + F / 2, fy + F / 2, F * .78, F * .78, tm, .58, P.a, { global: true, grosor: 22 * u });
    if (fa.a > 0.01) {
      const fcx = fx + F / 2, fcy = fy + F / 2, sway = Math.sin(t * 1.6) * .8;
      ctx.save(); ctx.globalAlpha *= clamp(fa.a, 0, 1); ctx.translate(fcx, fcy); ctx.rotate(rad(fa.r + sway)); ctx.scale(fa.s * (fa.sx ?? 1), fa.s * (fa.sy ?? 1)); ctx.translate(-fcx, -fcy);
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
      const a = AC && AC.k.muelle ? (q => Object.assign(q, { r: q.r + 6 }))(popResorte(tm, 1.1, { s0: 0, r0: 24 })) : kf(tm, [[1.1, { s: 0, r: 30 }], [1.4, { s: 1.15, r: 3 }], [1.6, { s: 1, r: 6 }]], EASE.back);
      if (a.s > 0) { ctx.save(); ctx.translate(pcx, pcy); ctx.rotate(rad(a.r)); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1)); ctx.translate(-pcx, -pcy);
        pegatina(ctx, px, y, pw, ph, 16 * u, { fill: '#F4C542', p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 7 * u, suave: false });
        fuente(ctx, f.precio); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.precio, pcx, pcy + 3 * u); ctx.restore(); }
    }
    destellosCaja(ctx, pos, w, h, u, P, tm, .65, FIN);
    ctx.restore();
  }
};
