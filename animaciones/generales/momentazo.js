// Kyo Estudio · Plantilla: ¡Momentazo!
import * as K from '../kit-dibujado.js';
import { rad, lerp, clamp, EASE, kf, tiempo, fuente, ancho, paleta, COMUNES, colocar, conDef, azar } from '../base/utilidades.js';
import { AC, caidaGolpe, golpeEn } from '../base/acabado.js';
import { pegatina, destello, textoPegatina, caminoEstallido } from '../base/piezas.js';

// 9 · ¡Momentazo! (estallido de cómic)
export const momentazo = {
  id: 'momentazo',
  nombre: '¡Momentazo!',
  desc: 'Estallido de cómic con líneas de velocidad y sacudida, para marcar el mejor momento de un clip.',
  fps: 30,
  campos: [
    { k: 'texto', label: 'Texto', tipo: 'texto', def: '¡MOMENTAZO!', max: 18 },
    { k: 'sub', label: 'Subtexto (opcional)', tipo: 'texto', def: 'clip del día', max: 30 },
    { k: 'lineas', label: 'Líneas de velocidad', tipo: 'chips', def: 'si', opciones: [['si', '💥 Sí'], ['no', 'No']] },
    ...conDef(COMUNES, { posh: 'centro', posv: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 2.5, min: 1.8, max: 8, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 2.5, 1.8, 8),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 2.5;
    const tm = tiempo(t, L, 1.2, FIN - .4, FIN, .4);
    const vert = fmt === 'vertical';
    let u = (vert ? 1.05 : 1) * (Number(o.tam) || 1);
    const txt = (o.texto || '').toUpperCase();
    const medir = uu => {
      const f = { t: `400 ${116 * uu}px "Cherry Bomb One"`, sub: `700 ${24 * uu}px "Chakra Petch"`, subE: 3 * uu };
      const tw = ancho(ctx, txt, f.t), subTxt = (o.sub || '').toUpperCase(), sw = subTxt ? ancho(ctx, subTxt, f.sub, f.subE) + 44 * uu : 0;
      const rx = Math.max(tw / 2 + 110 * uu, 300 * uu), ry = 190 * uu + (subTxt ? 20 * uu : 0);
      return { f, tw, subTxt, sw, rx, ry, w: rx * 2.25, h: ry * 2.25 };
    };
    let m = medir(u); if (m.w > W - 140) { u *= (W - 140) / m.w; m = medir(u); }
    const pos = colocar(fmt, o, W, H, m.w, m.h, 0);
    const cx = pos.x + m.w / 2, cy = pos.y + m.h / 2;
    // entrada/salida
    const enKF = [[0, { s: 0, r: -25 }], [.2, { s: 1.18, r: 4 }], [.34, { s: 1, r: 0 }], [FIN - .38, { s: 1, r: 0 }], [FIN - .22, { s: 1.12, r: -3 }], [FIN - .01, { s: 0, r: 20 }]];
    const en = AC && AC.k.muelle && tm < FIN - .38 ? (p => ({ s: Math.max(0, p), r: lerp(-25, 0, p) }))(K.resorte(tm, 0, { frec: 2.2, amort: 6 })) : kf(tm, enKF, EASE.out);
    if (en.s <= .001) return;
    const sh = tm > .3 && tm < .85 ? (1 - (tm - .3) / .55) * 16 * u : 0;
    const jx = Math.sin(tm * 97) * sh, jy = Math.cos(tm * 83) * sh;
    ctx.save(); ctx.translate(cx + jx, cy + jy);
    // líneas de velocidad (parpadean cada 2 fotogramas)
    if (o.lineas !== 'no') {
      const la = kf(tm, [[.18, { a: 0 }], [.26, { a: 1 }], [.9, { a: .9 }], [1.25, { a: 0 }]]);
      if (la.a > 0) {
        const r = azar(1 + Math.floor(tm * 15)), n = 30;
        ctx.save(); ctx.globalAlpha *= la.a;
        for (let i = 0; i < n; i++) {
          const ang = (i + r() * .6) / n * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang);
          const r0 = 1 / Math.sqrt((c / (m.rx * 1.12)) ** 2 + (s / (m.ry * 1.12)) ** 2), r1 = r0 + (120 + r() * 220) * u, an = (5 + r() * 7) * u;
          ctx.beginPath(); ctx.moveTo(c * r0 - s * an, s * r0 + c * an); ctx.lineTo(c * r0 + s * an, s * r0 - c * an); ctx.lineTo(c * r1, s * r1); ctx.closePath();
          ctx.fillStyle = i % 3 === 0 ? P.a : P.p; ctx.fill(); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = P.o; ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.rotate(rad(en.r - 4)); ctx.scale(en.s, en.s);
    const lat = 1 + Math.sin(t * 6) * .015; ctx.scale(lat, lat);
    // estallido exterior (pegatina) + interior
    const ext = caminoEstallido(m.rx, m.ry, 13, tm, 5), int = caminoEstallido(m.rx * .8, m.ry * .78, 11, tm * 1.3, 9);
    if (AC && AC.k.sombras) K.sombraDura(ctx, ext, 22 * u, 40 * u, '#000', { paso: 11 * u, alfa: .5 });
    ctx.save(); ctx.translate(0, 16 * u); ctx.lineJoin = 'round'; ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(ext); ctx.fillStyle = P.o; ctx.fill(ext); ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(ext);
    ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(ext);
    ctx.fillStyle = P.a; ctx.fill(ext);
    ctx.lineWidth = 7 * u; ctx.strokeStyle = P.o; ctx.stroke(int); ctx.fillStyle = '#F4C542'; ctx.fill(int);
    // puntos de trama (estilo cómic)
    ctx.save(); ctx.clip(int); ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let gx = -m.rx; gx < m.rx; gx += 22 * u) for (let gy = -m.ry; gy < m.ry; gy += 22 * u) { const d = Math.hypot(gx / m.rx, gy / m.ry); if (d > .45) { ctx.beginPath(); ctx.arc(gx + (Math.round(gy / (22 * u)) % 2 ? 11 * u : 0), gy, 4.5 * u * d, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
    // texto que golpea
    const tx = AC && AC.k.muelle ? caidaGolpe(tm, .1, .3, 3, 0, 0) : kf(tm, [[.1, { s: 3, a: 0 }], [.3, { s: .9, a: 1 }], [.42, { s: 1.06, a: 1 }], [.52, { s: 1, a: 1 }]], EASE.out);
    const dy = m.subTxt ? -16 * u : 0;
    if (AC) golpeEn(ctx, 0, dy, m.rx * 1.6, m.ry * 1.6, tm, .3, P.p, { global: true, grosor: 24 * u, n: 20 });
    if (tx.a > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(tx.a, 0, 1); ctx.translate(0, dy); ctx.scale(tx.s * (tx.sx ?? 1), tx.s * (tx.sy ?? 1)); ctx.rotate(rad(-3));
      fuente(ctx, m.f.t); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      textoPegatina(ctx, txt, 0, 0, u, P.t, P, .62);
      ctx.restore();
    }
    if (m.subTxt) { const a = kf(tm, [[.45, { y: 26, a: 0 }], [.75, { y: 0, a: 1 }]], EASE.back);
      if (a.a > 0) { ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); const y = dy + 82 * u + a.y * u;
        pegatina(ctx, -m.sw / 2, y - 21 * u, m.sw, 42 * u, 21 * u, { fill: P.c, p: P.p, o: P.o, ring: 5 * u, out: 4 * u, drop: 6 * u, suave: false });
        fuente(ctx, m.f.sub, m.f.subE); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.a; ctx.fillText(m.subTxt, m.f.subE / 2, y + 2 * u); ctx.restore(); } }
    ctx.restore();
    // destellos alrededor
    [[-1.02, -.8, '#ffffff', 0], [1.0, -.7, '#F4C542', .06], [.95, .85, P.a, .1], [-.9, .8, '#ffffff', .14]].forEach(([fx, fy, col, dl]) => {
      const k = kf(tm - dl, [[.3, { s: 0, r: 0, a: 0 }], [.5, { s: 1.3, r: 60, a: 1 }], [1.1, { s: .8, r: 130, a: .9 }], [FIN - .5, { s: .7, r: 200, a: .7 }], [FIN - .25, { s: 0, r: 220, a: 0 }]]);
      destello(ctx, cx + fx * m.rx, cy + fy * m.ry, 60 * u, col, k.s * en.s, k.r, k.a);
    });
  }
};
