// Kyo Estudio · Plantilla ZZZ: Amplificadores
import * as ZZZ from '../zzz.js';
import { clamp, rad, EASE, kf, tiempo, rr, fuente, ancho, paleta, COMUNES, colocar, conDef, envolver, imagenEn, fuenteQueCabe } from '../base/utilidades.js';
import { AC, popResorte } from '../base/acabado.js';
import { ESTRELLA, icono } from '../base/iconos.js';
import { pegatina, destello, avatar, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { limpio } from './comun.js';

// 16 · Amplificadores (ZZZ): el mejor, opciones rango S y opciones rango A
// Secciones de arriba abajo; cada una con hasta 3 amplificadores (del repo o con imagen propia)
export function seccionesAmplis(o) {
  return ['1', '2', '3'].map(s => ({
    s, rango: limpio(o['t' + s + 'r']), tit: limpio(o['t' + s]), sub: limpio(o['t' + s + 'sub']), oro: s === '1',
    items: ['1', '2', '3'].map(n => ({ slug: limpio(o['w' + s + n]), img: o['w' + s + n + 'img'], nom: limpio(o['w' + s + n + 'nom']) }))
      .filter(w => w.slug || w.img || w.nom).map(w => Object.assign(w, { nom: w.nom || (w.slug ? ZZZ.nombreDe(w.slug) : '') }))
  })).filter(sec => sec.items.length || sec.tit);
}
// Cada sección entra en su turno (se separan los segundos elegidos, para ir al ritmo de la voz)
function tiemposAmplis(o) {
  const secs = seccionesAmplis(o), paso = clamp(Number(o.paso) || 1.6, .4, 6), ts = secs.map((_, i) => .7 + i * paso);
  const ult = secs.length ? ts[ts.length - 1] + .3 + (secs[secs.length - 1].items.length - 1) * .18 : .5;
  const intro = ult + .8, fin = intro + 1.2 + .7;
  return { ts, intro, fin, minimo: o.salida === 'no' ? intro + .3 : fin };
}
export const amplisZZZ = {
  id: 'amplificadores-zzz',
  grupo: 'zzz',
  nombre: 'Amplificadores (ZZZ)',
  desc: 'Tres secciones de arriba abajo (su amplificador, opciones rango S y opciones rango A) con hasta 3 amplificadores cada una; cada sección entra en su turno para ir al ritmo de lo que dices.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 85,
  campos: [
    { k: 'titulo', label: 'Etiqueta', tipo: 'texto', def: 'Amplificadores', max: 30 },
    { k: 'personaje', label: 'Personaje (opcional)', tipo: 'texto', def: 'Personaje', max: 28 },
    { k: 'agente', label: 'Retrato (del repo de assets ZZZdle)', tipo: 'lista', def: '', vacio: 'Sin retrato', cargar: () => ZZZ.lista('retrato') },
    { k: 'imagen', label: '…o sube tu imagen (tiene prioridad sobre la del repo)', tipo: 'imagen' },
    { k: 'sec', label: 'Sección', tipo: 'chips', def: '1', opciones: [['1', '⭐ El mejor'], ['2', 'S · Rango S'], ['3', 'A · Rango A']] },
    ...[['1', '★', 'Su amplificador', 'La mejor opción', ['deep-sea-visitor', '', '']],
        ['2', 'S', 'Opciones rango S', 'No tan económicas', ['the-brimstone', 'starlight-engine', '']],
        ['3', 'A', 'Opciones rango A', 'Las más accesibles', ['cannon-rotor', 'street-superstar', 'housekeeper']]].flatMap(([s, r, t, sub, defs]) => [
      { k: 't' + s, label: 'Título de la sección', tipo: 'texto', def: t, max: 26, si: 'sec=' + s },
      { k: 't' + s + 'sub', label: 'Debajo del título (opcional)', tipo: 'texto', def: sub, max: 30, si: 'sec=' + s },
      { k: 't' + s + 'r', label: 'Insignia (letra o símbolo)', tipo: 'texto', def: r, max: 2, si: 'sec=' + s },
      ...['1', '2', '3'].flatMap((n, i) => [
        { k: 'w' + s + n, label: 'Amplificador ' + n + ' (del repo)', tipo: 'lista', def: defs[i], vacio: 'Ninguno', cargar: () => ZZZ.lista('amplificador'), si: 'sec=' + s },
        { k: 'w' + s + n + 'img', label: '…o su imagen (tiene prioridad)', tipo: 'imagen', si: 'sec=' + s },
        { k: 'w' + s + n + 'nom', label: 'Nombre (vacío = el del repo)', tipo: 'texto', def: '', max: 26, si: 'sec=' + s }
      ])
    ]),
    { k: 'paso', label: 'Segundos entre secciones', tipo: 'numero', def: 1.6, min: 0.4, max: 6, paso: 0.1 },
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    ...conDef(COMUNES, { posv: 'centro', posh: 'centro' }),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 3, max: 40, paso: 0.1 }
  ],
  preparar: o => Promise.all([ZZZ.cargar('retrato', limpio(o.agente)), ...seccionesAmplis(o).flatMap(s => s.items).filter(w => !w.img).map(w => ZZZ.cargar('amplificador', w.slug))]),
  duracion: o => Math.max(tiemposAmplis(o).minimo, clamp(Number(o.dur) || 7, 3, 40)),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), T = tiemposAmplis(o), quieto = o.salida === 'no', ORO = '#F4C542';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    const secs = seccionesAmplis(o), avImg = o.imagen || ZZZ.imagen('retrato', limpio(o.agente)), conAv = !!o.imagen || !!limpio(o.agente);
    let u = (fmt === 'vertical' ? 1.3 : .82) * (Number(o.tam) || 1);
    const medir = uu => {
      const f = { chip: `700 ${20 * uu}px "Chakra Petch"`, chipE: 3 * uu, pj: `700 ${32 * uu}px "Fredoka"`, st: `400 ${38 * uu}px "Cherry Bomb One"`, ss: `600 ${22 * uu}px "Fredoka"`, rg: `700 ${30 * uu}px "Fredoka"` };
      const tit = limpio(o.titulo).toUpperCase(), pj = limpio(o.personaje), pad = 34 * uu, avS = 30 * uu;
      const chipW = tit ? ancho(ctx, tit, f.chip, f.chipE) + 32 * uu : 0;
      const headW = chipW + ((pj || conAv) ? (chipW ? 16 * uu : 0) + (conAv ? avS + 22 * uu : 0) + (pj ? ancho(ctx, pj, f.pj) : 0) : 0);
      const headH = (tit || pj || conAv) ? 52 * uu : 0, rgD = 54 * uu, cw = 190 * uu, ch = 228 * uu, gap = 22 * uu;
      const secH = sec => 64 * uu + (sec.items.length ? 16 * uu + ch : 0);
      const secW = sec => Math.max(rgD + 16 * uu + Math.max(sec.tit ? ancho(ctx, sec.tit, f.st) : 0, sec.sub ? ancho(ctx, sec.sub, f.ss) : 0), sec.items.length * cw + (sec.items.length - 1) * gap);
      const sepH = 30 * uu, cuerpoH = secs.reduce((a, s) => a + secH(s), 0) + Math.max(0, secs.length - 1) * sepH;
      const w = Math.max(headW, ...secs.map(secW), 3 * cw + 2 * gap) + 2 * pad;
      return { f, tit, pj, pad, avS, chipW, headH, rgD, cw, ch, gap, secH, sepH, w, h: pad + headH + (headH && secs.length ? 20 * uu : 0) + cuerpoH + pad };
    };
    let m = medir(u); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medir(u); }
    if (m.h > H - 120) { u *= (H - 120) / m.h; m = medir(u); }
    const { f, pad, w, h, cw, ch } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + w / 2, pos.y + h / 2, u, .5);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad, cwid = w - 2 * pad;
    let y = pos.y + pad;
    // --- cabecera ---
    if (m.headH) {
      if (m.tit) {
        const a = kf(tm, [[.25, { y: 14, a: 0 }], [.55, { y: 0, a: 1 }]]);
        ctx.save(); ctx.globalAlpha *= a.a; rr(ctx, x0, y + a.y * u, m.chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
        fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(m.tit, x0 + 16 * u, y + 18 * u + a.y * u); ctx.restore();
      }
      let x = x0 + (m.chipW ? m.chipW + 16 * u : 0);
      if (conAv) {
        const cx = x + m.avS / 2 + 8 * u, cy = y + 18 * u, a = kf(tm, [[.35, { s: 0, r: -30 }], [.65, { s: 1.15, r: 8 }], [.85, { s: 1, r: 0 }]], EASE.back);
        if (a.s > .01) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(a.r)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy); avatar(ctx, cx, cy, m.avS, P, avImg, ESTRELLA, u * .5); ctx.restore(); }
        x += m.avS + 22 * u;
      }
      if (m.pj) { const a = kf(tm, [[.4, { x: -16, a: 0 }], [.75, { x: 0, a: 1 }]], EASE.back);
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.pj); ctx.fillStyle = P.s; ctx.fillText(m.pj, x + a.x * u, y + 18 * u); ctx.restore(); }
      y += m.headH + (secs.length ? 20 * u : 0);
    }
    // --- secciones ---
    secs.forEach((sec, si) => {
      const ti = T.ts[si], acento = sec.oro ? ORO : P.a, sh = m.secH(sec);
      // separador ondulado entre secciones
      if (si) {
        const sy = y - m.sepH / 2, p = EASE.out(clamp((tm - ti + .2) / .5, 0, 1));
        if (p > 0) {
          ctx.save(); ctx.beginPath();
          for (let xx = 0; xx <= cwid * p; xx += 6 * u) { const yy = sy + 4 * u * Math.sin(xx / (22 * u) + t * 3); xx ? ctx.lineTo(x0 + xx, yy) : ctx.moveTo(x0 + xx, yy); }
          ctx.lineWidth = 3 * u; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke(); ctx.restore();
        }
      }
      // cabecera de la sección: insignia de rango, título y subtítulo
      const hk = kf(tm, [[ti, { x: -40, a: 0 }], [ti + .38, { x: 0, a: 1 }]], EASE.back);
      if (hk.a > .001) {
        ctx.save(); ctx.globalAlpha *= clamp(hk.a, 0, 1); ctx.translate(hk.x * u, 0);
        const rcx = x0 + m.rgD / 2, rcy = y + 30 * u, pr = kf(tm, [[ti + .05, { s: 0, r: -60 }], [ti + .35, { s: 1.2, r: 10 }], [ti + .5, { s: 1, r: 0 }]], EASE.back);
        if (pr.s > .01 && sec.rango) {
          ctx.save(); ctx.translate(rcx, rcy); ctx.rotate(rad(pr.r)); ctx.scale(pr.s, pr.s);
          ctx.beginPath(); ctx.arc(0, 3 * u, m.rgD / 2 + 4 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, m.rgD / 2 + 4 * u, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, m.rgD / 2, 0, Math.PI * 2); ctx.fillStyle = acento; ctx.fill();
          if (sec.rango === '★') icono(ctx, ESTRELLA, -m.rgD * .32, -m.rgD * .32, m.rgD * .64, P.o);
          else { fuente(ctx, f.rg); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(sec.rango, 0, 2 * u); ctx.textAlign = 'left'; }
          ctx.restore();
        }
        const tx = x0 + (sec.rango ? m.rgD + 16 * u : 0);
        fuente(ctx, f.st); ctx.lineWidth = 7 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = sec.oro ? ORO : P.t;
        const ty = sec.sub ? y + 18 * u : y + 30 * u;
        if (sec.tit) { ctx.strokeText(sec.tit, tx, ty); ctx.fillText(sec.tit, tx, ty); }
        if (sec.sub) { fuente(ctx, f.ss); ctx.fillStyle = P.s; ctx.fillText(sec.sub, tx, y + 50 * u); }
        ctx.restore();
      }
      // tarjetas de los amplificadores
      const fy = y + 64 * u + 16 * u, filaW = sec.items.length * cw + (sec.items.length - 1) * m.gap, fx = x0 + (cwid - filaW) / 2;
      sec.items.forEach((wp, i) => {
        const tc = ti + .3 + i * .18, x = fx + i * (cw + m.gap), cx = x + cw / 2, cy = fy + ch / 2, r0 = [-2, 1.6, -1.4][i];
        const k = AC && AC.k.muelle && tm < FIN - .75 ? popResorte(tm, tc, { s0: .3, r0: r0 * 6 }) : kf(tm, [[tc, { s: .3, r: r0 * 6, a: 0 }], [tc + .3, { s: 1.08, r: -r0, a: 1 }], [tc + .48, { s: 1, r: r0, a: 1 }]], EASE.back);
        if ((k.a ?? 1) <= .001 || k.s <= .01) return;
        ctx.save(); ctx.globalAlpha *= clamp(k.a ?? 1, 0, 1); ctx.translate(cx, cy); ctx.rotate(rad(k.r ?? r0)); ctx.scale(k.s * (k.sx ?? 1), k.s * (k.sy ?? 1)); ctx.translate(-cx, -cy);
        const R = 22 * u, bandaH = 58 * u;
        pegatina(ctx, x, fy, cw, ch, R, { fill: P.o, p: acento, o: P.o, ring: 6 * u, out: 5 * u, drop: 10 * u, suave: false });
        ctx.save(); rr(ctx, x, fy, cw, ch, R); ctx.clip();
        const g = ctx.createRadialGradient(cx, fy + (ch - bandaH) * .45, 10 * u, cx, fy + (ch - bandaH) * .45, cw * .75);
        g.addColorStop(0, sec.oro ? 'rgba(244,197,66,.55)' : P.a2); g.addColorStop(1, P.c); ctx.fillStyle = g; ctx.fillRect(x, fy, cw, ch);
        const img = wp.img || ZZZ.imagen('amplificador', wp.slug);
        if (img) imagenEn(ctx, img, x + 12 * u, fy + 10 * u, cw - 24 * u, ch - bandaH - 16 * u, 'contener');
        else icono(ctx, ESTRELLA, cx - 34 * u, fy + (ch - bandaH) / 2 - 34 * u, 68 * u, 'rgba(255,255,255,.25)');
        // brillo al aterrizar
        const b = kf(tm, [[tc + .4, { x: -.6 }], [tc + 1, { x: 1.5 }]], EASE.io);
        if (b.x > -.6 && b.x < 1.5) { const bx = x + b.x * cw, bw = .4 * cw; ctx.save(); ctx.translate(bx, cy); ctx.transform(1, 0, Math.tan(rad(-20)), 1, 0, 0);
          const gb = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0); gb.addColorStop(0, 'rgba(255,255,255,0)'); gb.addColorStop(.5, 'rgba(255,255,255,.45)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gb; ctx.fillRect(-bw / 2, -ch, bw, ch * 2); ctx.restore(); }
        ctx.fillStyle = P.o; ctx.fillRect(x, fy + ch - bandaH, cw, bandaH); ctx.fillStyle = acento; ctx.fillRect(x, fy + ch - bandaH, cw, 4 * u);
        if (wp.nom) { // nombre en hasta 2 líneas
          const lin = envolver(ctx, wp.nom, `700 ${21 * u}px "Fredoka"`, cw - 20 * u, 2); ctx.fillStyle = P.t; ctx.textAlign = 'center';
          lin.forEach((l, j) => { fuenteQueCabe(ctx, l, 700, 21 * u, 'Fredoka', cw - 20 * u); ctx.fillText(l, cx, fy + ch - bandaH / 2 + 2 * u + (j - (lin.length - 1) / 2) * 23 * u); });
          ctx.textAlign = 'left';
        }
        ctx.restore(); ctx.restore();
        const d = kf(tm, [[tc + .2, { s: 0, r: 0, a: 0 }], [tc + .4, { s: 1.2, r: 60, a: 1 }], [tc + .9, { s: 0, r: 140, a: 0 }]]);
        destello(ctx, x + cw - 6 * u, fy + 8 * u, 40 * u, sec.oro ? ORO : '#ffffff', d.s, d.r, d.a);
      });
      y += sh + m.sepH;
    });
    destellosCaja(ctx, pos, w, h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
