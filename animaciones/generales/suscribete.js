// Kyo Estudio · Plantilla: ¡Suscríbete! + campanita
import { rad, clamp, EASE, kf, tiempo, fuente, ancho, paleta, COMUNES, colocar, IMG_OPC } from '../base/utilidades.js';
import { CAMPANA, BADAJO, PLAY, icono } from '../base/iconos.js';
import { pegatina, avatar, cursor, boton, inicio, balanceo, destellosCaja } from '../base/piezas.js';

// 4 · ¡Suscríbete! + campanita
export const suscribete = {
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
