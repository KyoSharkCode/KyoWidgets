// Kyo Estudio · Plantilla ZZZ: Guía de discos
import * as K from '../kit-dibujado.js';
import * as ZZZ from '../zzz.js';
import { imagenEn, TEMAS, ancho, rad, lerp, clamp, EASE, kf, tiempo, rr, fuente, paleta, COMUNES, colocar, conDef } from '../base/utilidades.js';
import { AC } from '../base/acabado.js';
import { MAS, ESTRELLA, icono } from '../base/iconos.js';
import { pegatina, destello, avatar, inicio, balanceo, destellosCaja } from '../base/piezas.js';
import { ICONOS_ATR, normIcono, limpio, CHEVRON, contando } from './comun.js';

const DISCO = new Path2D('M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z');
export function iconoAtributo(nombre) {
  const n = normIcono(nombre), hay = (...ps) => ps.some(p => n.includes(p));
  const k = hay('crit') ? (hay('dano', 'dmg') ? 'critDmg' : 'critProb')
    : hay('perfor', 'pen') ? 'perforacion' : hay('energ') ? 'energia' : hay('maestr') ? 'maestria' : hay('compet', 'anomal') ? 'competencia'
    : hay('impact') ? 'impacto' : hay('fuego', 'igneo') ? 'fuego' : hay('hielo', 'escarcha') ? 'hielo' : hay('electr') ? 'electrico'
    : hay('fisic') ? 'fisico' : hay('aereo', 'viento') ? 'aereo' : hay('eter') ? 'etereo' : hay('vida', 'hp', 'pv') ? 'vida' : hay('defens', 'def') ? 'defensa'
    : hay('ataq', 'atq', 'atk') ? 'ataque' : hay('bono', 'dano', 'dmg') ? 'bono' : 'otro';
  return ICONOS_ATR[k];
}
// Icono de atributo en una moneda oscura con borde de acento (imagen propia o icono dibujado)
export function badgeIcono(ctx, cx, cy, D, P, img, ico) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  ctx.lineWidth = D * .07; ctx.strokeStyle = P.a; ctx.stroke();
  if (img) { const k = D * .72; imagenEn(ctx, img, cx - k / 2, cy - k / 2, k, k, 'contener'); }
  else {
    const k = D * .58; ctx.translate(cx - k / 2, cy - k / 2); ctx.scale(k / 24, k / 24);
    if (ico.trazo) { ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.a; ctx.stroke(ico.p); }
    else { ctx.fillStyle = P.a; ctx.fill(ico.p, ico.par || 'nonzero'); }
  }
  ctx.restore();
}
// Icono del set de discos con borde de pegatina (como el avatar)
export function badgeSet(ctx, cx, cy, D, P, img, u) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy + 7 * u, D / 2 + 10 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + 10 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2 + 5 * u, 0, Math.PI * 2); ctx.fillStyle = P.p; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, D / 2, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
  if (img) { ctx.save(); ctx.clip(); imagenEn(ctx, img, cx - D / 2, cy - D / 2, D, D, 'cubrir'); ctx.restore(); }
  else { const k = D * .66; ctx.translate(cx - k / 2, cy - k / 2); ctx.scale(k / 24, k / 24); ctx.fillStyle = P.a; ctx.fill(DISCO, 'evenodd'); }
  ctx.restore();
}
// Miniatura para la galería de iconos del Estudio
export function pintarIconoGaleria(ctx, grupo, nombre, img, S) {
  const P = TEMAS.marea; ctx.clearRect(0, 0, S, S);
  if (grupo === 'set') badgeSet(ctx, S / 2, S / 2 - S * .03, S * .64, P, img, S / 160);
  else badgeIcono(ctx, S / 2, S / 2, S * .86, P, img, iconoAtributo(nombre));
}
const clipDe = o => ['1', '2', '3', '4'].includes(String(o.clip)) ? String(o.clip) : '1';
export function listasGuia(o) {
  return {
    sets: [[o.set4, o.set4sub, '4'], [o.set2, o.set2sub, '2']].filter(s => limpio(s[0])).map(([n, s, p]) => ({ nombre: limpio(n), sub: limpio(s), piezas: p })),
    filas: [['4', o.d4, o.d4b], ['5', o.d5, o.d5b], ['6', o.d6, o.d6b]].filter(f => limpio(f[1])).map(([n, a, b]) => ({ n, main: limpio(a), alt: limpio(b) })),
    subs: [o.s1, o.s2, o.s3, o.s4].map(limpio).filter(Boolean),
    objs: [[o.o1, o.v1], [o.o2, o.v2], [o.o3, o.v3], [o.o4, o.v4]].filter(x => limpio(x[0])).map(([n, v]) => ({ nombre: limpio(n), valor: limpio(v) }))
  };
}
// Momento en que entra cada elemento del clip, fin de la entrada y duración mínima
function tiemposGuia(o) {
  const L = listasGuia(o), c = clipDe(o);
  const ts = c === '1' ? L.sets.map((_, i) => .8 + i * .55) : c === '2' ? L.filas.map((_, i) => .75 + i * .5) : c === '3' ? L.subs.map((_, i) => .75 + i * .4) : L.objs.map((_, i) => .75 + i * .45);
  const ultAlt = c === '2' && L.filas.length && L.filas[L.filas.length - 1].alt ? .25 : c === '4' && L.objs.length ? .5 : 0;
  const intro = (ts.length ? ts[ts.length - 1] + ultAlt : .5) + .7, fin = intro + 1.2 + .7;
  return { ts, intro, fin, minimo: o.salida === 'no' ? intro + .3 : fin };
}
// Medidas de los tres clips (comparten ancho para que se vean iguales al cortar de uno a otro)
function medirGuia(ctx, o, u) {
  const f = {
    chip: `700 ${20 * u}px "Chakra Petch"`, chipE: 3 * u, pj: `400 ${62 * u}px "Cherry Bomb One"`, pjS: `700 ${30 * u}px "Fredoka"`,
    nom: `700 ${36 * u}px "Fredoka"`, sub: `600 ${25 * u}px "Fredoka"`, pz: `700 ${22 * u}px "Fredoka"`, num: `700 ${30 * u}px "Fredoka"`,
    atr: `700 ${34 * u}px "Fredoka"`, pill: `700 ${30 * u}px "Fredoka"`, val: `700 ${32 * u}px "Fredoka"`
  };
  const pad = 34 * u, L = listasGuia(o), pj = limpio(o.personaje);
  const tit = { 1: limpio(o.titulo1).toUpperCase(), 2: limpio(o.titulo2).toUpperCase(), 3: limpio(o.titulo3).toUpperCase(), 4: limpio(o.titulo4).toUpperCase() };
  const chipW = {}; ['1', '2', '3', '4'].forEach(k => { chipW[k] = tit[k] ? ancho(ctx, tit[k], f.chip, f.chipE) + 32 * u : 0; });
  const pjW = pj ? ancho(ctx, pj, f.pj) + 10 * u : 0, pjSW = pj ? ancho(ctx, pj, f.pjS) : 0;
  // avatar (imagen propia o retrato del repo) e insignias de elemento y especialidad
  const conAv = !!o.imagen || !!limpio(o.agente), ins = [['elemento', limpio(o.elemento)], ['especialidad', limpio(o.especialidad)]].filter(i => i[1]);
  const avD = 112 * u, avOff = conAv ? avD + 30 * u : 0, insD = 44 * u, insW = ins.length ? (pj ? 12 * u : 0) + ins.length * insD + (ins.length - 1) * 8 * u : 0;
  const avS = 30 * u, insS = 34 * u, insSW = ins.length ? 10 * u + ins.length * insS + (ins.length - 1) * 6 * u : 0;
  const cab = k => {
    const resto = (conAv ? avS + 22 * u : 0) + (pj ? pjSW : 0) + insSW;
    return { w: chipW[k] + (resto ? (chipW[k] ? 16 * u : 0) + resto : 0), h: (tit[k] || pj || conAv || ins.length) ? 52 * u : 0 };
  };
  const txtH1 = (tit[1] ? 46 * u : 0) + (pj || ins.length ? 76 * u : 0);
  const head = { 1: { w: avOff + Math.max(chipW[1], (pj ? pjW : 0) + insW), h: Math.max(txtH1, conAv ? avD + 20 * u : 0), txtH: txtH1 }, 2: cab('2'), 3: cab('3'), 4: cab('4') };
  // clip 1: sets
  const D = 80 * u, rowPad = 16 * u, rowH1 = 108 * u, gap1 = 26 * u, txtGap = 26 * u;
  const sets = L.sets.map(s => Object.assign({}, s, { w: rowPad + D + txtGap + Math.max(ancho(ctx, s.nombre, f.nom), s.sub ? ancho(ctx, s.sub, f.sub) : 0) + 26 * u }));
  const c1 = { w: Math.max(0, ...sets.map(s => s.w)), h: sets.length ? sets.length * rowH1 + (sets.length - 1) * gap1 : 0 };
  // clip 2: discos 4, 5 y 6 (la alternativa va al lado o, si no cabe, debajo)
  const numD = 54 * u, icD = 50 * u, rowH2 = 80 * u, rowH2b = 58 * u, gap2 = 14 * u;
  const slashW = ancho(ctx, '/', f.atr) + 36 * u, oW = ancho(ctx, '/', f.atr) + 16 * u;
  const filas = L.filas.map(fl => {
    const mw = icD + 12 * u + ancho(ctx, fl.main, f.atr), aw = fl.alt ? icD + 12 * u + ancho(ctx, fl.alt, f.atr) : 0;
    const base = rowPad + numD + 18 * u, enLinea = base + mw + (fl.alt ? slashW + aw : 0) + 22 * u, apilar = !!fl.alt && enLinea > 820 * u;
    return Object.assign({}, fl, { mw, aw, apilar, w: apilar ? base + Math.max(mw, oW + aw) + 22 * u : enLinea, h: rowH2 + (apilar ? rowH2b : 0) });
  });
  const c2 = { w: Math.max(0, ...filas.map(r => r.w)), h: filas.reduce((a, r) => a + r.h, 0) + Math.max(0, filas.length - 1) * gap2 };
  // clip 3: substats en fila, unidas con ›, que saltan de línea si no caben
  const pillH = 66 * u, icP = 46 * u, chev = 40 * u, gap3 = 16 * u;
  // clip 4: atributos recomendados con su valor objetivo (≥ 86.6 %)
  const rowH4 = 74 * u, gap4 = 12 * u, icO = 48 * u, valH = 52 * u, signo = o.signo ? o.signo + ' ' : '';
  const objs = L.objs.map(x => {
    const txt = x.valor ? signo + x.valor : '', vw = txt ? ancho(ctx, txt, f.val) + 34 * u : 0;
    return Object.assign({}, x, { txt, vw, w: rowPad + icO + 12 * u + ancho(ctx, x.nombre, f.atr) + (vw ? 40 * u + vw : 0) + rowPad });
  });
  const c4 = { w: Math.max(0, ...objs.map(x => x.w)), h: objs.length ? objs.length * rowH4 + (objs.length - 1) * gap4 : 0 };
  const limite = Math.max(c1.w, c2.w, c4.w, head[1].w, head[2].w, head[3].w, head[4].w, 560 * u);
  let px = 0, py = 0, maxX = 0; const pills = [];
  L.subs.forEach((s, i) => {
    const pw = 12 * u + icP + 12 * u + ancho(ctx, s, f.pill) + 22 * u;
    let cv = null;
    if (i) { if (px + chev + pw > limite) { px = 0; py += pillH + gap3; } cv = px; px += chev; }
    pills.push({ txt: s, x: px, y: py, w: pw, chev: cv }); px += pw; maxX = Math.max(maxX, px);
  });
  const c3 = { w: maxX, h: pills.length ? py + pillH : 0 };
  const w = Math.max(head[1].w, head[2].w, head[3].w, head[4].w, c1.w, c2.w, c3.w, c4.w, 480 * u) + 2 * pad;
  const alto = (k, c) => pad + head[k].h + (c.h ? 14 * u : 0) + c.h + pad;
  return { f, pad, pj, tit, chipW, pjW, pjSW, head, conAv, ins, avD, avOff, insD, avS, insS, D, rowPad, rowH1, gap1, txtGap, sets, numD, icD, rowH2, rowH2b, gap2, slashW, oW, filas, pillH, icP, chev, pills, rowH4, gap4, icO, valH, objs, w, h: { 1: alto('1', c1), 2: alto('2', c2), 3: alto('3', c3), 4: alto('4', c4) } };
}
// 13 · Guía de discos (ZZZ): tres clips (título y sets · discos 4-5-6 · substats)
export const guiaDiscos = {
  id: 'guia-discos',
  grupo: 'zzz',
  nombre: 'Guía de discos (ZZZ)',
  desc: 'Tres clips para poner encima del gameplay: 1) título y sets de discos, 2) atributo principal de los discos 4, 5 y 6, 3) substats por prioridad. Rellenas los datos una vez y eliges el clip.',
  fps: 30,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal'],
  fotoMomento: 60,
  // "⬇ Los 3 clips" descarga una versión por cada valor del campo clip
  variantes: { k: 'clip', todos: '⬇ Los 4 clips', valores: [['1', 'clip1-sets'], ['2', 'clip2-discos'], ['3', 'clip3-substats'], ['4', 'clip4-objetivos']] },
  // Galería de iconos: se guardan por nombre y se reutilizan en cualquier personaje
  galeria: {
    grupos: [{ id: 'set', label: 'Sets de discos', campos: ['set4', 'set2'] }, { id: 'atributo', label: 'Atributos', campos: ['d4', 'd4b', 'd5', 'd5b', 'd6', 'd6b', 's1', 's2', 's3', 's4', 'o1', 'o2', 'o3', 'o4'] }],
    pintar: pintarIconoGaleria
  },
  campos: [
    { k: 'clip', label: 'Clip', tipo: 'chips', def: '1', opciones: [['1', '1 · Título y sets'], ['2', '2 · Discos'], ['3', '3 · Substats'], ['4', '4 · Objetivos']] },
    { k: 'personaje', label: 'Personaje', tipo: 'texto', def: 'Personaje', max: 28 },
    { k: 'agente', label: 'Retrato (del repo de assets ZZZdle)', tipo: 'lista', def: '', vacio: 'Sin retrato', cargar: () => ZZZ.lista('retrato') },
    { k: 'imagen', label: '…o sube tu imagen (tiene prioridad sobre la del repo)', tipo: 'imagen' },
    { k: 'elemento', label: 'Insignia de elemento', tipo: 'lista', def: '', vacio: 'Ninguna', cargar: () => ZZZ.lista('elemento') },
    { k: 'especialidad', label: 'Insignia de especialidad', tipo: 'lista', def: '', vacio: 'Ninguna', cargar: () => ZZZ.lista('especialidad') },
    { k: 'titulo1', label: 'Título', tipo: 'texto', def: 'Pistas de disco', max: 30, si: 'clip=1' },
    { k: 'set4', label: 'Set de 4 piezas', tipo: 'texto', def: 'Monarca del Pináculo', max: 34, si: 'clip=1' },
    { k: 'set4sub', label: 'Debajo del set de 4 (opcional)', tipo: 'texto', def: 'Conjunto de 4 piezas', max: 30, si: 'clip=1' },
    { k: 'set2', label: 'Set de 2 piezas (opcional)', tipo: 'texto', def: 'Nana a la luz cenicienta', max: 34, si: 'clip=1' },
    { k: 'set2sub', label: 'Debajo del set de 2 (opcional)', tipo: 'texto', def: 'Conjunto de 2 piezas', max: 30, si: 'clip=1' },
    { k: 'titulo2', label: 'Título', tipo: 'texto', def: 'Atributo principal', max: 30, si: 'clip=2' },
    { k: 'd4', label: 'Disco 4', tipo: 'texto', def: 'Probabilidad de Crítico', max: 32, si: 'clip=2' },
    { k: 'd4b', label: 'Disco 4 · alternativa (opcional)', tipo: 'texto', def: '', max: 32, si: 'clip=2' },
    { k: 'd5', label: 'Disco 5', tipo: 'texto', def: 'Tasa de Perforación', max: 32, si: 'clip=2' },
    { k: 'd5b', label: 'Disco 5 · alternativa (opcional)', tipo: 'texto', def: '', max: 32, si: 'clip=2' },
    { k: 'd6', label: 'Disco 6', tipo: 'texto', def: 'Recuperación de Energía', max: 32, si: 'clip=2' },
    { k: 'd6b', label: 'Disco 6 · alternativa (opcional)', tipo: 'texto', def: '', max: 32, si: 'clip=2' },
    { k: 'titulo3', label: 'Título', tipo: 'texto', def: 'Atributos secundarios', max: 30, si: 'clip=3' },
    { k: 's1', label: 'Substat 1 (la más importante)', tipo: 'texto', def: 'Probabilidad de Crítico', max: 30, si: 'clip=3' },
    { k: 's2', label: 'Substat 2', tipo: 'texto', def: 'Porcentaje de Ataque', max: 30, si: 'clip=3' },
    { k: 's3', label: 'Substat 3 (opcional)', tipo: 'texto', def: 'Daño Crítico', max: 30, si: 'clip=3' },
    { k: 's4', label: 'Substat 4 (opcional)', tipo: 'texto', def: '', max: 30, si: 'clip=3' },
    { k: 'titulo4', label: 'Título', tipo: 'texto', def: 'Atributo recomendado', max: 30, si: 'clip=4' },
    { k: 'signo', label: 'Signo delante del valor', tipo: 'chips', def: '≥', si: 'clip=4', opciones: [['≥', '≥ Igual o superior'], ['≤', '≤ Igual o inferior'], ['≈', '≈ Aproximado'], ['', 'Sin signo']] },
    { k: 'o1', label: 'Atributo 1', tipo: 'texto', def: 'Probabilidad de Crítico', max: 30, si: 'clip=4' },
    { k: 'v1', label: 'Valor 1 (ej. 86.6%)', tipo: 'texto', def: '86.6%', max: 12, si: 'clip=4' },
    { k: 'o2', label: 'Atributo 2 (opcional)', tipo: 'texto', def: 'Daño Crítico', max: 30, si: 'clip=4' },
    { k: 'v2', label: 'Valor 2', tipo: 'texto', def: '112.4%', max: 12, si: 'clip=4' },
    { k: 'o3', label: 'Atributo 3 (opcional)', tipo: 'texto', def: 'Ataque', max: 30, si: 'clip=4' },
    { k: 'v3', label: 'Valor 3', tipo: 'texto', def: '2200', max: 12, si: 'clip=4' },
    { k: 'o4', label: 'Atributo 4 (opcional)', tipo: 'texto', def: '', max: 30, si: 'clip=4' },
    { k: 'v4', label: 'Valor 4', tipo: 'texto', def: '', max: 12, si: 'clip=4' },
    { k: 'contar', label: 'Números', tipo: 'chips', def: 'si', si: 'clip=4', opciones: [['si', '🔢 Suben contando'], ['no', 'Aparecen fijos']] },
    { k: 'salida', label: 'Al terminar', tipo: 'chips', def: 'si', opciones: [['si', '✨ Sale con animación'], ['no', '⏸ Se queda quieto']] },
    ...conDef(COMUNES, { posv: 'centro' }),
    { k: 'dur1', label: 'Duración del clip 1 (segundos)', tipo: 'numero', def: 5, min: 3, max: 30, paso: 0.1, si: 'clip=1' },
    { k: 'dur2', label: 'Duración del clip 2 (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1, si: 'clip=2' },
    { k: 'dur3', label: 'Duración del clip 3 (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1, si: 'clip=3' },
    { k: 'dur4', label: 'Duración del clip 4 (segundos)', tipo: 'numero', def: 6, min: 3, max: 30, paso: 0.1, si: 'clip=4' }
  ],
  // antes de exportar: espera a que lleguen las imágenes del repo de assets
  preparar: o => Promise.all([['retrato', o.agente], ['elemento', o.elemento], ['especialidad', o.especialidad]].map(([t, s]) => ZZZ.cargar(t, limpio(s)))),
  duracion: o => Math.max(tiemposGuia(o).minimo, clamp(Number(o['dur' + clipDe(o)]) || 6, 3, 30)),
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), c = clipDe(o), T = tiemposGuia(o), quieto = o.salida === 'no';
    const tm = quieto ? t : tiempo(t, L, T.intro, T.fin - .7, T.fin, .7), FIN = quieto ? 1e4 : T.fin;
    const ic = typeof o.iconos === 'function' ? o.iconos : () => null;
    let u = (fmt === 'vertical' ? 1.3 : 1) * (Number(o.tam) || 1);
    let m = medirGuia(ctx, o, u); if (m.w > W - 120) { u *= (W - 120) / m.w; m = medirGuia(ctx, o, u); }
    const { f, pad, w } = m, h = m.h[c];
    const pos = colocar(fmt, o, W, H, w, h, 30 * u);
    if (!inicio(ctx, pos, tm, FIN)) return;
    balanceo(ctx, t, pos.x + w / 2, pos.y + h / 2, u, .6);
    pegatina(ctx, pos.x, pos.y, w, h, 34 * u, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 14 * u });
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const x0 = pos.x + pad, cw = w - 2 * pad;
    let y = pos.y + pad;
    // --- cabecera ---
    const tit = m.tit[c], chipW = m.chipW[c], hd = m.head[c];
    const avImg = o.imagen || ZZZ.imagen('retrato', limpio(o.agente)); // la imagen subida tiene prioridad sobre la del repo
    const chip = (x, yy) => {
      if (!tit) return;
      const a = kf(tm, [[.3, { y: 14, a: 0 }], [.6, { y: 0, a: 1 }]]);
      ctx.save(); ctx.globalAlpha *= a.a;
      rr(ctx, x, yy + a.y * u, chipW, 34 * u, 17 * u); ctx.fillStyle = P.a; ctx.fill();
      fuente(ctx, f.chip, f.chipE); ctx.fillStyle = P.o; ctx.fillText(tit, x + 16 * u, yy + 18 * u + a.y * u); ctx.restore();
    };
    const avatarPop = (cx, cyy, D, t0) => {
      const a = kf(tm, [[t0, { s: 0, r: -30 }], [t0 + .3, { s: 1.15, r: 8 }], [t0 + .5, { s: 1, r: 0 }]], EASE.back);
      if (a.s <= .01) return;
      ctx.save(); ctx.translate(cx, cyy); ctx.rotate(rad(a.r)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cyy);
      avatar(ctx, cx, cyy, D, P, avImg, ESTRELLA, D === m.avD ? u : u * .5); ctx.restore();
    };
    const insignias = (x, cyy, D, paso, t0) => m.ins.forEach(([tipo, slug], i) => {
      const cx = x + D / 2 + i * paso;
      const k = kf(tm, [[t0 + i * .12, { s: 0 }], [t0 + i * .12 + .3, { s: 1.15 }], [t0 + i * .12 + .45, { s: 1 }]], EASE.back);
      if (k.s <= .01) return;
      ctx.save(); ctx.translate(cx, cyy); ctx.scale(k.s, k.s); ctx.translate(-cx, -cyy);
      badgeIcono(ctx, cx, cyy, D, P, ZZZ.imagen(tipo, slug), ICONOS_ATR.otro); ctx.restore();
    });
    if (c === '1') {
      if (m.conAv) avatarPop(x0 + m.avD / 2 + 6 * u, y + hd.h / 2, m.avD, .35);
      const tx = x0 + m.avOff;
      let ty = y + (hd.h - hd.txtH) / 2;
      chip(tx, ty);
      if (tit) ty += 46 * u;
      if (m.pj) {
        const a = kf(tm, [[.45, { s: .6, a: 0 }], [.8, { s: 1.08, a: 1 }], [.95, { s: 1, a: 1 }]], EASE.back);
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(tx, ty + 36 * u); ctx.scale(a.s, a.s); fuente(ctx, f.pj);
        ctx.lineWidth = 9 * u; ctx.lineJoin = 'round'; ctx.strokeStyle = P.o; ctx.fillStyle = P.t; ctx.strokeText(m.pj, 0, 0); ctx.fillText(m.pj, 0, 0); ctx.restore();
      }
      if (m.ins.length) insignias(tx + (m.pj ? m.pjW + 12 * u : 0), ty + 36 * u, m.insD, m.insD + 8 * u, .75);
      y += hd.h;
    } else if (hd.h) {
      chip(x0, y);
      let x = x0 + (chipW ? chipW + 16 * u : 0);
      if (m.conAv) { avatarPop(x + m.avS / 2 + 8 * u, y + 18 * u, m.avS, .4); x += m.avS + 22 * u; }
      if (m.pj) {
        const a = kf(tm, [[.45, { x: -16, a: 0 }], [.8, { x: 0, a: 1 }]], EASE.back);
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, f.pjS); ctx.fillStyle = P.s;
        ctx.fillText(m.pj, x + a.x * u, y + 18 * u); ctx.restore(); x += m.pjSW;
      }
      if (m.ins.length) insignias(x + 10 * u, y + 18 * u, m.insS, m.insS + 6 * u, .6);
      y += 52 * u;
    }
    y += 14 * u;
    // --- piezas de animación comunes ---
    const entra = ti => AC && AC.k.muelle ? (p => ({ x: lerp(-36, 0, p), s: lerp(.85, 1, p), a: clamp((tm - ti) / .12, 0, 1) }))(tm <= ti ? 0 : K.resorte(tm, ti, { frec: 2.2, amort: 7 }))
      : kf(tm, [[ti, { x: -36, s: .85, a: 0 }], [ti + .38, { x: 0, s: 1, a: 1 }]], EASE.back);
    const conEntrada = (ti, ox, oy, fn) => {
      const e = entra(ti); if (e.a <= .001) return;
      ctx.save(); ctx.globalAlpha *= clamp(e.a, 0, 1); ctx.translate(ox + e.x * u, oy); ctx.scale(e.s, e.s); ctx.translate(-ox, -oy); fn(); ctx.restore();
    };
    const conPop = (ti, px, py, fn) => {
      const s = kf(tm, [[ti + .06, { s: 0 }], [ti + .32, { s: 1.18 }], [ti + .48, { s: 1 }]], EASE.back).s; if (s <= .01) return;
      ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.translate(-px, -py); fn(); ctx.restore();
    };
    const brillo = (ti, x, yy, S, col) => { const k = kf(tm, [[ti + .2, { s: 0, r: 0, a: 0 }], [ti + .38, { s: 1.2, r: 60, a: 1 }], [ti + .85, { s: 0, r: 140, a: 0 }]]); destello(ctx, x, yy, S, col, k.s, k.r, k.a); };
    // fondo de la fila con un destello de acento al entrar
    const fondoFila = (ti, x, yy, ww, hh, r, marcada) => {
      rr(ctx, x, yy, ww, hh, r); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      if (marcada) { ctx.lineWidth = 3 * u; ctx.strokeStyle = P.a; ctx.stroke(); }
      const fl = kf(tm, [[ti + .1, { a: 0 }], [ti + .28, { a: .32 }], [ti + .9, { a: 0 }]]);
      if (fl.a > .001) { ctx.save(); ctx.globalAlpha *= fl.a; rr(ctx, x, yy, ww, hh, r); ctx.fillStyle = P.a; ctx.fill(); ctx.restore(); }
    };
    const atributo = (x, yy, nombre, D, fnt, ti) => {
      conPop(ti, x + D / 2, yy, () => badgeIcono(ctx, x + D / 2, yy, D, P, ic('atributo', nombre), iconoAtributo(nombre)));
      fuente(ctx, fnt); ctx.fillStyle = P.t; ctx.fillText(nombre, x + D + 12 * u, yy + 1.5 * u);
    };
    // --- clip 1: sets de discos ---
    if (c === '1') {
      m.sets.forEach((s, i) => {
        const ti = T.ts[i], ry = y + i * (m.rowH1 + m.gap1), rcy = ry + m.rowH1 / 2, bx = x0 + m.rowPad + m.D / 2;
        conEntrada(ti, x0, rcy, () => {
          fondoFila(ti, x0, ry, cw, m.rowH1, 24 * u);
          conPop(ti, bx, rcy, () => {
            badgeSet(ctx, bx, rcy, m.D, P, ic('set', s.nombre), u);
            const nx = bx + m.D * .38, ny = rcy + m.D * .36, R = 19 * u; // número de piezas
            ctx.beginPath(); ctx.arc(nx, ny, R + 4 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
            ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2); ctx.fillStyle = '#F4C542'; ctx.fill();
            fuente(ctx, f.pz); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(s.piezas, nx, ny + 1.5 * u); ctx.textAlign = 'left';
          });
          const tx = x0 + m.rowPad + m.D + m.txtGap;
          fuente(ctx, f.nom); ctx.fillStyle = P.t;
          if (s.sub) { ctx.fillText(s.nombre, tx, rcy - 16 * u); fuente(ctx, f.sub); ctx.fillStyle = P.s; ctx.fillText(s.sub, tx, rcy + 22 * u); }
          else ctx.fillText(s.nombre, tx, rcy);
        });
        brillo(ti, bx + m.D * .45, rcy - m.D * .45, 40 * u, '#F4C542');
      });
      // "+" entre los dos sets (encima de las filas)
      if (m.sets.length > 1) {
        const ti = T.ts[1], pk = kf(tm, [[ti - .15, { s: 0, r: -90 }], [ti + .15, { s: 1.15, r: 0 }], [ti + .3, { s: 1, r: 0 }]], EASE.back);
        if (pk.s > .01) {
          const R = 20 * u;
          ctx.save(); ctx.translate(x0 + m.rowPad + m.D / 2, y + m.rowH1 + m.gap1 / 2); ctx.rotate(rad(pk.r)); ctx.scale(pk.s, pk.s);
          ctx.beginPath(); ctx.arc(0, 0, R + 5 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
          ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill();
          icono(ctx, MAS, -R * .7, -R * .7, R * 1.4, P.o, { trazo: true, grosor: 3.6 }); ctx.restore();
        }
      }
    }
    // --- clip 2: discos 4, 5 y 6 ---
    if (c === '2') {
      let ry = y;
      m.filas.forEach((fl, i) => {
        const ti = T.ts[i], l1 = ry + m.rowH2 / 2;
        conEntrada(ti, x0, ry + fl.h / 2, () => {
          fondoFila(ti, x0, ry, cw, fl.h, 24 * u);
          const nx = x0 + m.rowPad + m.numD / 2;
          conPop(ti, nx, l1, () => {
            ctx.beginPath(); ctx.arc(nx, l1, m.numD / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill();
            fuente(ctx, f.num); ctx.fillStyle = P.o; ctx.textAlign = 'center'; ctx.fillText(fl.n, nx, l1 + 2 * u); ctx.textAlign = 'left';
          });
          const x = x0 + m.rowPad + m.numD + 18 * u;
          atributo(x, l1, fl.main, m.icD, f.atr, ti + .08);
          if (fl.alt) {
            const ta = ti + .25, ea = kf(tm, [[ta, { x: -20, a: 0 }], [ta + .32, { x: 0, a: 1 }]], EASE.back);
            if (ea.a > .001) {
              ctx.save(); ctx.globalAlpha *= clamp(ea.a, 0, 1); ctx.translate(ea.x * u, 0);
              if (fl.apilar) {
                const l2 = l1 + m.rowH2b; fuente(ctx, f.atr); ctx.fillStyle = P.a; ctx.fillText('/', x + 4 * u, l2);
                atributo(x + m.oW, l2, fl.alt, m.icD, f.atr, ta);
              } else {
                fuente(ctx, f.atr); ctx.fillStyle = P.a; ctx.fillText('/', x + fl.mw + 18 * u, l1);
                atributo(x + fl.mw + m.slashW, l1, fl.alt, m.icD, f.atr, ta);
              }
              ctx.restore();
            }
          }
        });
        ry += fl.h + m.gap2;
      });
    }
    // --- clip 3: substats por prioridad ---
    if (c === '3') m.pills.forEach((p, i) => {
      const ti = T.ts[i], py = y + p.y, pcy = py + m.pillH / 2;
      if (p.chev != null) {
        const ch = kf(tm, [[ti - .12, { a: 0, x: -10 }], [ti + .12, { a: 1, x: 0 }]]);
        if (ch.a > .001) {
          const s = 26 * u; ctx.save(); ctx.globalAlpha *= ch.a; ctx.translate(x0 + p.chev + (m.chev - s) / 2 + ch.x * u, pcy - s / 2); ctx.scale(s / 24, s / 24);
          ctx.lineWidth = 3.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = P.a; ctx.stroke(CHEVRON); ctx.restore();
        }
      }
      conEntrada(ti, x0 + p.x, pcy, () => {
        fondoFila(ti, x0 + p.x, py, p.w, m.pillH, m.pillH / 2, i === 0);
        atributo(x0 + p.x + 12 * u, pcy, p.txt, m.icP, f.pill, ti);
      });
    });
    // --- clip 4: atributos recomendados con su valor objetivo ---
    if (c === '4') m.objs.forEach((x, i) => {
      const ti = T.ts[i], ry = y + i * (m.rowH4 + m.gap4), rcy = ry + m.rowH4 / 2;
      conEntrada(ti, x0, rcy, () => {
        fondoFila(ti, x0, ry, cw, m.rowH4, 22 * u);
        atributo(x0 + m.rowPad, rcy, x.nombre, m.icO, f.atr, ti + .05);
        if (!x.txt) return;
        // el valor: pegatina de acento que salta y cuyo número sube contando hasta el objetivo
        const tv = ti + .2, vx = x0 + cw - m.rowPad - x.vw, vcx = vx + x.vw / 2;
        const k = kf(tm, [[tv, { s: 0, r: -8 }], [tv + .3, { s: 1.12, r: 3 }], [tv + .45, { s: 1, r: 0 }]], EASE.back);
        if (k.s <= .01) return;
        ctx.save(); ctx.translate(vcx, rcy); ctx.rotate(rad(k.r)); ctx.scale(k.s, k.s); ctx.translate(-vcx, -rcy);
        rr(ctx, vx, rcy - m.valH / 2, x.vw, m.valH, m.valH / 2); ctx.fillStyle = P.o; ctx.fill();
        rr(ctx, vx + 3 * u, rcy - m.valH / 2 + 3 * u, x.vw - 6 * u, m.valH - 6 * u, m.valH / 2); ctx.fillStyle = P.a; ctx.fill();
        fuente(ctx, f.val); ctx.fillStyle = P.o; ctx.textAlign = 'right';
        ctx.fillText(o.contar === 'no' ? x.txt : contando(x.txt, clamp((tm - tv) / .75, 0, 1)), vx + x.vw - 17 * u, rcy + 1.5 * u);
        ctx.textAlign = 'left'; ctx.restore();
        brillo(tv + .2, vx + x.vw - 6 * u, rcy - m.valH / 2, 34 * u, '#F4C542');
      });
    });
    destellosCaja(ctx, pos, w, h, u, P, tm, T.intro - .3, FIN);
    ctx.restore();
  }
};
// Desplegables de atributos: cada hueco muestra solo lo que puede salir en él (y siempre "✏️ Otro" para escribir)
const PCT = ['Porcentaje de Ataque', 'Porcentaje de PV', 'Porcentaje de Defensa'];
const BONOS = ['Bono de daño físico', 'Bono de daño ígneo', 'Bono de daño de hielo', 'Bono de daño eléctrico', 'Bono de daño etéreo', 'Bono de daño aéreo'];
const ATR_DISCO = {
  4: ['Probabilidad de Crítico', 'Daño Crítico', 'Maestría de Anomalía', ...PCT],
  5: ['Tasa de Perforación', ...BONOS, ...PCT],
  6: ['Recuperación de Energía', 'Tasa de Anomalía', 'Impacto', ...PCT]
};
const ATR_SUBSTATS = ['Probabilidad de Crítico', 'Daño Crítico', 'Porcentaje de Ataque', 'Ataque', 'Perforación', 'Maestría de Anomalía', 'Porcentaje de PV', 'PV', 'Porcentaje de Defensa', 'Defensa'];
const ATR_TODOS = [...new Set([...ATR_SUBSTATS, ...ATR_DISCO[4], ...ATR_DISCO[5], ...ATR_DISCO[6]])];
const listaAtr = k => /^d[456]b?$/.test(k) ? ATR_DISCO[k[1]] : /^s\d$/.test(k) ? ATR_SUBSTATS : /^o\d$/.test(k) ? ATR_TODOS : null;
guiaDiscos.campos.forEach(c => { const l = listaAtr(c.k); if (l) Object.assign(c, { tipo: 'elegir', opciones: l }); });
