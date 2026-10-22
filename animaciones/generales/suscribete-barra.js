// Kyo Estudio · Plantilla: ¡Suscríbete! en barra
import { rad, clamp, EASE, kf, tiempo, fuente, ancho, paleta, COMUNES, colocar, IMG_OPC } from '../base/utilidades.js';
import { CAMPANA, BADAJO, PLAY, icono } from '../base/iconos.js';
import { pegatina, avatar, cursor, boton, inicio, balanceo, destellosCaja } from '../base/piezas.js';

// 4b · ¡Suscríbete! en barra (versión horizontal y delgada)
export const suscribeteBarra = {
  id: 'suscribete-barra',
  nombre: '¡Suscríbete! en barra',
  desc: 'Versión horizontal y delgada: una sola fila con avatar, título, "Suscribirme" y la campanita.',
  fps: 30,
  campos: [
    { k: 'canal', label: 'Nombre del canal', tipo: 'texto', def: 'KyoSumiVT', max: 24 },
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Suscríbete!', max: 22 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Suscribirme', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Suscrito!', max: 14 },
    { k: 'aviso', label: 'Texto al pulsar la campanita (sustituye al título)', tipo: 'texto', def: '¡Campanita activada!', max: 26 },
    IMG_OPC,
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 5.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 5.2, 20),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 7;
    const tm = tiempo(t, L, 4.4, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.1 : 1) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { canal: `700 ${18 * uu}px "Chakra Petch"`, canalE: 2.4 * uu, tit: `400 ${44 * uu}px "Cherry Bomb One"`, btn: `700 ${28 * uu}px "Fredoka"`, ok: `700 ${26 * uu}px "Fredoka"`, aviso: `700 ${24 * uu}px "Fredoka"` };
      const canalW = o.canal ? ancho(ctx, o.canal.toUpperCase(), f.canal, f.canalE) : 0, titW = ancho(ctx, o.titulo || '', f.tit);
      const avisoW = o.aviso ? ancho(ctx, o.aviso, f.aviso) + 34 * uu : 0;
      const colW = Math.max(canalW, titW, avisoW), colH = (o.canal ? 24 * uu : 0) + 48 * uu;
      const btnW = Math.max(200 * uu, ancho(ctx, o.boton || '', f.btn) + 60 * uu, ancho(ctx, o.hecho || '', f.ok) + 80 * uu), btnH = 62 * uu, bell = 62 * uu;
      const pad = 18 * uu, D = 74 * uu, h = pad + Math.max(D, colH) + pad;
      const w = pad + D + 22 * uu + colW + 30 * uu + btnW + 16 * uu + bell + pad + 6 * uu;
      return { f, canalW, titW, avisoW, colW, colH, btnW, btnH, bell, pad, D, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, pad, D, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    const cx = pos.x + w / 2, cy = pos.y + h / 2;
    balanceo(ctx, t, cx, cy, u, .5);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-1)); ctx.translate(-cx, -cy);
    pegatina(ctx, pos.x, pos.y, w, h, h / 2, { fill: P.c, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 10 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    // avatar
    const ax = pos.x + pad + D / 2;
    const av = kf(tm, [[.25, { s: 0 }], [.6, { s: 1.15 }], [.8, { s: 1 }]], EASE.back);
    if (av.s > 0) { ctx.save(); ctx.translate(ax, cy); ctx.scale(av.s, av.s); ctx.translate(-ax, -cy); avatar(ctx, ax, cy, D * .82, P, o.imagen, PLAY, u * .8); ctx.restore(); }
    // textos: el título se va hacia arriba y entra el aviso al activar la campanita
    const x0 = pos.x + pad + D + 22 * u; let y = cy - m.colH / 2;
    if (o.canal) { const a = kf(tm, [[.35, { y: 12, a: 0 }], [.65, { y: 0, a: 1 }]]); ctx.save(); ctx.globalAlpha *= a.a; fuente(ctx, f.canal, f.canalE); ctx.fillStyle = P.a; ctx.fillText(o.canal.toUpperCase(), x0, y + 10 * u + a.y * u); ctx.restore(); y += 24 * u; }
    const yT = y + 25 * u;
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 20 * u, y - 4 * u, m.colW + 40 * u, 56 * u); ctx.clip();
    { const a = kf(tm, [[.45, { s: .6, a: 0 }], [.8, { s: 1.08, a: 1 }], [.95, { s: 1, a: 1 }]], EASE.back), sal = o.aviso ? kf(tm, [[3.2, { y: 0 }], [3.45, { y: -52 }]], EASE.io) : { y: 0 };
      if (sal.y > -51) { ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(x0 + m.titW / 2, yT + sal.y * u); ctx.scale(a.s, a.s); fuente(ctx, f.tit); ctx.lineWidth = 8 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.textAlign = 'center';
        ctx.strokeText(o.titulo || '', 0, 0); ctx.fillText(o.titulo || '', 0, 0); ctx.restore(); } }
    if (o.aviso) { const a = kf(tm, [[3.3, { y: 40, a: 0 }], [3.65, { y: 0, a: 1 }]], EASE.back);
      if (a.a > 0) { ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const yy = yT + a.y * u;
        icono(ctx, CAMPANA, x0, yy - 13 * u, 26 * u, P.a); fuente(ctx, f.aviso); ctx.fillStyle = P.t; ctx.fillText(o.aviso, x0 + 34 * u, yy + 1 * u); ctx.restore(); } }
    ctx.restore();
    // botón y campanita
    const bell = m.bell, fx = pos.x + w - pad - 6 * u - bell - 16 * u - m.btnW, fy = cy - m.btnH / 2, filaW = m.btnW + 16 * u + bell;
    const bi = kf(tm, [[.75, { s: 0 }], [1.05, { s: 1.1 }], [1.2, { s: 1 }]], EASE.back);
    if (bi.s > 0) {
      const ccx = fx + filaW / 2;
      ctx.save(); ctx.translate(ccx, cy); ctx.scale(bi.s, bi.s); ctx.translate(-ccx, -cy);
      boton(ctx, fx, fy, m.btnW, m.btnH, u, P, tm, 2.05, o.boton || '', o.hecho || '', f.btn, f.ok, null);
      const bx = fx + m.btnW + 16 * u, bcx = bx + bell / 2, bcy = cy, by = cy - bell / 2;
      const pc = kf(tm, [[2.95, { s: 1 }], [3.1, { s: .88 }], [3.35, { s: 1.1 }], [3.6, { s: 1 }]]);
      ctx.save(); ctx.translate(bcx, bcy); ctx.scale(pc.s, pc.s); ctx.translate(-bcx, -bcy);
      const on = kf(tm, [[3.1, { a: 0 }], [3.3, { a: 1 }]]);
      pegatina(ctx, bx, by, bell, bell, bell / 2, { fill: P.c, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 6 * u, suave: false });
      if (on.a > 0) { ctx.save(); ctx.globalAlpha *= on.a; ctx.beginPath(); ctx.arc(bcx, bcy, bell / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill(); ctx.restore(); }
      const sw = tm > 3.1 && tm < 4.3 ? Math.sin((tm - 3.1) * 22) * 22 * (1 - (tm - 3.1) / 1.2) : 0;
      ctx.save(); ctx.translate(bcx, by + 13 * u); ctx.rotate(rad(sw)); ctx.translate(-bcx, -(by + 13 * u));
      const col = on.a > .5 ? P.o : P.a; icono(ctx, CAMPANA, bcx - 17 * u, bcy - 18 * u, 34 * u, col); icono(ctx, BADAJO, bcx - 17 * u, bcy - 18 * u, 34 * u, col);
      ctx.restore();
      if (tm > 3.15 && tm < 4.2) for (let s = 0; s < 2; s++) { const p = ((tm - 3.15) * 1.6 + s * .5) % 1; ctx.save(); ctx.globalAlpha *= (1 - p) * .9; ctx.lineWidth = 4 * u; ctx.strokeStyle = P.a; ctx.lineCap = 'round';
        [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(bcx, bcy, bell / 2 + 8 * u + p * 20 * u, d > 0 ? -.6 : Math.PI - .6, d > 0 ? .6 : Math.PI + .6); ctx.stroke(); }); ctx.restore(); }
      ctx.restore(); ctx.restore();
    }
    ctx.restore(); // barra
    destellosCaja(ctx, pos, w, h, u * .8, P, tm, 3.2, FIN);
    // cursor: botón y luego campanita
    const b1x = fx + m.btnW * .6 - pos.x, b1y = fy + m.btnH * .6 - pos.y, b2x = fx + m.btnW + 16 * u + bell * .55 - pos.x, b2y = fy + bell * .65 - pos.y;
    const pt = kf(tm, [[1.3, { x: w + 200 * u, y: h + 40 * u, a: 0, s: 1 }], [1.55, { x: w + 120 * u, y: h, a: 1, s: 1 }], [1.95, { x: b1x, y: b1y, a: 1, s: 1 }], [2.05, { x: b1x, y: b1y, a: 1, s: .8 }], [2.2, { x: b1x, y: b1y, a: 1, s: 1 }], [2.5, { x: b1x, y: b1y, a: 1, s: 1 }], [2.95, { x: b2x, y: b2y, a: 1, s: 1 }], [3.1, { x: b2x, y: b2y, a: 1, s: .8 }], [3.25, { x: b2x, y: b2y, a: 1, s: 1 }], [3.6, { x: b2x, y: b2y, a: 1, s: 1 }], [4.0, { x: w + 200 * u, y: h + 60 * u, a: 0, s: 1 }]], EASE.io);
    if (tm > 1.3 && tm < 4.0) cursor(ctx, pos.x + pt.x, pos.y + pt.y, pt.s * .85, pt.a, u);
    ctx.restore();
  }
};
