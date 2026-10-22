// Kyo Estudio · Plantilla: Rótulo con nombre
import * as K from '../kit-dibujado.js';
import { rad, lerp, clamp, EASE, kf, rr, fuente, ancho, paleta, COMUNES, colocar } from '../base/utilidades.js';
import { AC, popResorte, golpeEn } from '../base/acabado.js';
import { CORAZON, PLAY, ESTRELLA } from '../base/iconos.js';
import { pegatina, destello, avatar } from '../base/piezas.js';

// 12 · Rótulo con nombre (invitadas, juegos…)
export const rotulo = {
  id: 'rotulo',
  nombre: 'Rótulo con nombre',
  desc: 'Barra tipo pegatina para presentar a una invitada (o un juego): entra barriendo, salta el avatar y una ola recorre el borde.',
  fps: 30,
  campos: [
    { k: 'etiqueta', label: 'Etiqueta', tipo: 'texto', def: 'Invitada especial', max: 24 },
    { k: 'nombre', label: 'Nombre', tipo: 'texto', def: 'NombreInvitada', max: 24 },
    { k: 'sub', label: 'Debajo del nombre (opcional)', tipo: 'texto', def: '@usuario · en Twitch', max: 36 },
    { k: 'imagen', label: 'Avatar de la invitada (opcional)', tipo: 'imagen' },
    { k: 'icono', label: 'Icono (si no hay imagen)', tipo: 'chips', def: 'estrella', opciones: [['estrella', '⭐ Estrella'], ['corazon', '💙 Corazón'], ['play', '▶ Juego'], ['ninguno', 'Sin avatar']] },
    ...COMUNES,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.5 }
  ],
  duracion: o => clamp(Number(o.dur) || 6, 3, 30),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), vert = fmt === 'vertical';
    let u = (vert ? 1.2 : 1.15) * (Number(o.tam) || 1);
    const conAv = !!o.imagen || o.icono !== 'ninguno';
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3 * uu, nom: `400 ${66 * uu}px "Cherry Bomb One"`, sub: `700 ${28 * uu}px "Fredoka"` };
      const chipTxt = (o.etiqueta || '').toUpperCase(), chipW = chipTxt ? ancho(ctx, chipTxt, f.chip, f.chipE) + 32 * uu : 0;
      const nomW = ancho(ctx, o.nombre || '', f.nom), subW = o.sub ? ancho(ctx, o.sub, f.sub) : 0;
      const D = conAv ? 130 * uu : 0, pad = 30 * uu, txtX = pad + (D ? D * .72 : 0) + 10 * uu;
      const h = pad + (chipTxt ? 42 * uu : 0) + 72 * uu + (o.sub ? 38 * uu : 0) + pad - 10 * uu;
      const w = Math.max(txtX + Math.max(chipW, nomW, subW) + pad + 20 * uu, 420 * uu);
      return { f, chipTxt, chipW, nomW, subW, D, pad, txtX, w, h };
    };
    let m = medir(u); if (m.w > W - 200) { u *= (W - 200) / m.w; m = medir(u); }
    const { f, D, pad, txtX, w, h } = m;
    const pos = colocar(fmt, o, W, H, w + (D ? D * .28 : 0), h, 40 * u);
    const x = pos.x + (D ? D * .28 : 0), y = pos.y;
    // entrada y salida (barrido)
    const ent = EASE.back(clamp((t - .1) / .55, 0, 1)), sal = EASE.io(clamp((t - (L - .6)) / .5, 0, 1));
    const contA = clamp((t - .35) / .3, 0, 1) * (1 - clamp((t - (L - .75)) / .25, 0, 1));
    if (ent <= 0 || sal >= 1) return;
    ctx.save();
    const izq = x - 40 * u, anchoTot = w + 80 * u;
    const clipX0 = sal > 0 ? izq + anchoTot * sal : izq - 400 * u, clipX1 = ent >= 1 ? x + w + 400 * u : izq + anchoTot * ent;
    ctx.beginPath(); ctx.rect(clipX0, y - 300 * u, Math.max(0, clipX1 - clipX0), h + 600 * u); ctx.clip();
    const cy = y + h / 2;
    ctx.translate(x, cy); ctx.rotate(rad(-1.2)); ctx.translate(-x, -cy);
    pegatina(ctx, x, y, w, h, 30 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 12 * u });
    // ola que recorre el borde inferior
    ctx.save(); rr(ctx, x, y, w, h, 30 * u); ctx.clip();
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let xx = 0; xx <= w; xx += 8 * u) ctx.lineTo(x + xx, y + h - 16 * u - 7 * u * Math.sin(xx / (60 * u) - t * 4));
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = P.a2; ctx.fill();
    ctx.restore();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let ty = y + pad - 6 * u; const tx = x + txtX;
    ctx.save(); ctx.globalAlpha *= contA;
    if (m.chipTxt) { const a = kf(t, [[.4, { x: -20 }], [.7, { x: 0 }]], EASE.back);
      rr(ctx, tx + a.x * u, ty, m.chipW, 32 * u, 16 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.chipTxt, tx + 16 * u + a.x * u, ty + 17 * u); ty += 42 * u; }
    { const a = AC && AC.k.muelle ? (p => ({ x: lerp(-30, 0, p), s: lerp(.8, 1, p) }))(K.resorte(t, .5, { frec: 2.2, amort: 7 })) : kf(t, [[.5, { x: -30, s: .8 }], [.85, { x: 0, s: 1 }]], EASE.back);
      fuente(ctx, f.nom); ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t;
      ctx.strokeText(o.nombre || '', tx + a.x * u, ty + 36 * u); ctx.fillText(o.nombre || '', tx + a.x * u, ty + 36 * u); ty += 72 * u; }
    if (o.sub) { const a = kf(t, [[.65, { y: 12 }], [.95, { y: 0 }]], EASE.back); fuente(ctx, f.sub); ctx.fillStyle = P.s; ctx.fillText(o.sub, tx, ty + 14 * u + a.y * u); }
    ctx.restore();
    ctx.restore();
    // avatar (fuera del barrido para que sobresalga)
    if (D) {
      const ax = x + 6 * u, ay = cy;
      const avKF = [[.3, { s: 0, r: -30 }], [.6, { s: 1.15, r: 8 }], [.8, { s: 1, r: 0 }], [L - .75, { s: 1, r: 0 }], [L - .55, { s: 1.1, r: -6 }], [L - .35, { s: 0, r: 20 }]];
      const av = AC && AC.k.muelle && t < L - .75 ? popResorte(t, .3, { s0: 0, r0: -30 }) : kf(t, avKF, EASE.back);
      if (AC) golpeEn(ctx, ax, ay, D * .95, D * .95, t, .45, P.a, { global: true, grosor: 12 * u, n: 12 });
      if (av.s > .01) { ctx.save(); ctx.translate(ax, ay); ctx.rotate(rad(av.r + Math.sin(t * 2.5) * 3)); ctx.scale(av.s * (av.sx ?? 1), av.s * (av.sy ?? 1)); ctx.translate(-ax, -ay);
        avatar(ctx, ax, ay, D, P, o.imagen, o.icono === 'corazon' ? CORAZON : o.icono === 'play' ? PLAY : ESTRELLA, u); ctx.restore(); }
      const k2 = kf(t, [[.7, { s: 0, r: 0, a: 0 }], [.9, { s: 1.2, r: 60, a: 1 }], [1.4, { s: 0, r: 140, a: 0 }]]);
      destello(ctx, ax + D * .42, ay - D * .45, 44 * u, '#F4C542', k2.s, k2.r, k2.a);
    }
  }
};
