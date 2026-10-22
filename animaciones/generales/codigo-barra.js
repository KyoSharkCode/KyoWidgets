// Kyo Estudio · Plantilla: Barra del código
import * as K from '../kit-dibujado.js';
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar } from '../base/utilidades.js';
import { AC, L_CHECK, L_CIRCULO, morphResorte } from '../base/acabado.js';
import { CORAZON, CHECK, FLECHA } from '../base/iconos.js';
import { pegatina, destello } from '../base/piezas.js';

// 2 · Barra del código (se escribe y se pulsa Guardar)
export const barraCodigo = {
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
      ctx.save(); ctx.translate(x0, -17 * u); ctx.scale(34 * u / 24, 34 * u / 24); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o;
      ctx.stroke(AC ? K.morfearTrazo(L_CIRCULO, L_CHECK, morphResorte(tm, 3.6), 40) : CHECK); ctx.restore();
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
