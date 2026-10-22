// Kyo Estudio · Plantilla: Directo en Twitch (horario)
import { rad, clamp, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, IMG_OPC } from '../base/utilidades.js';
import { AC, puntoVivo } from '../base/acabado.js';
import { PLAY, CALENDARIO, CAL_LINEAS, icono } from '../base/iconos.js';
import { pegatina, avatar, inicio, balanceo, destellosCaja } from '../base/piezas.js';

// 5 · Directo en Twitch (horario)
export const directo = {
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
      if (AC) puntoVivo(ctx, x + 22 * u, y + 18 * u + a.y * u, 7 * u * lat, tm, .75);
      else { ctx.beginPath(); ctx.arc(x + 22 * u, y + 18 * u + a.y * u, 7 * u * lat, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }
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
