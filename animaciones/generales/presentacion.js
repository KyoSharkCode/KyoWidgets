// Kyo Estudio · Plantilla: Presentación de modelo
import * as K from '../kit-dibujado.js';
import { clamp, fuente, ancho, rad, lerp, EASE, kf, paleta, azar, COLORES } from '../base/utilidades.js';
import { AC, golpeEn } from '../base/acabado.js';
import { pegatina, destello, textoPegatina, letrasSaltan, chipTexto } from '../base/piezas.js';
import { ruido, whoosh, blup, renderSonido, MUSICA_CAMPOS, musicaElegida, musicaFondo } from '../base/sonido.js';
import { burbujasEn, dosMares, marQuieto } from '../base/mar-y-cielo.js';

// Presentación de modelo: silueta misteriosa → la ola lo tapa → aparece el modelo a color, con nombre y créditos
// El modelo puede ser un PNG transparente o un vídeo (fondo verde que se quita solo, o WebM con transparencia)
const _modelos = new WeakMap();
// Devuelve el fotograma actual del modelo ya recortado (sin fondo) a la resolución pedida, con su caja útil
function modeloListo(m, altoDev, quitar) {
  if (!m) return null;
  const vid = !!m.esVideo, el = vid ? m.video : m, sw = vid ? el.videoWidth : el.width, sh = vid ? el.videoHeight : el.height;
  if (!sw || !sh || (vid && el.readyState < 2)) return null;
  const alto = clamp(Math.round(altoDev / 60) * 60, 240, Math.max(240, Math.min(1600, sh)));
  const verde = quitar === 'verde' || (quitar === 'auto' && vid);
  const clave = (vid ? el.currentTime.toFixed(3) : 'img') + '|' + alto + '|' + verde;
  let c = _modelos.get(m);
  if (c && c.clave === clave) return c;
  if (!c) { c = { cv: document.createElement('canvas'), caja: null, tintes: {} }; _modelos.set(m, c); }
  const k = Math.min(1, alto / sh), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  c.cv.width = w; c.cv.height = h;
  const x = c.cv.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, w, h); x.drawImage(el, 0, 0, w, h);
  if (verde || !c.caja) {
    const id = x.getImageData(0, 0, w, h), d = id.data;
    if (verde) for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, b), dif = g - mx;
      if (dif > 18 && g > 60) {
        const a = dif >= 70 ? 0 : 1 - (dif - 18) / 52;
        d[i + 3] = Math.min(d[i + 3], Math.round(a * 255));
        d[i + 1] = mx + (g - mx) * .15; // quita el reflejo verde de los bordes
      }
    }
    if (!c.caja) { // caja del modelo (se calcula una vez para que no salte)
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) if (d[(yy * w + xx) * 4 + 3] > 60) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 > x0 && y1 > y0) { const px = (x1 - x0) * .06, py = (y1 - y0) * .04; c.caja = { x: Math.max(0, x0 - px) / w, y: Math.max(0, y0 - py) / h, w: Math.min(w, x1 - x0 + 2 * px) / w, h: Math.min(h, y1 - y0 + 2 * py) / h }; }
    }
    if (verde) x.putImageData(id, 0, 0);
  }
  if (!c.caja) c.caja = { x: 0, y: 0, w: 1, h: 1 };
  c.clave = clave; c.tintes = {};
  return c;
}
// Versión de un solo color (silueta)
function tinteModelo(c, color) {
  if (c.tintes[color]) return c.tintes[color];
  const t = document.createElement('canvas'); t.width = c.cv.width; t.height = c.cv.height;
  const x = t.getContext('2d'); x.drawImage(c.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, t.width, t.height);
  return (c.tintes[color] = t);
}
// Dibuja el modelo con los pies (parte baja de su caja) en "abajo" y la altura pedida; devuelve el rectángulo ocupado
function ponerModelo(ctx, c, img, cx, abajo, alto, maxW) {
  const cw = c.cv.width, ch = c.cv.height, bx = c.caja.x * cw, by = c.caja.y * ch, bw = c.caja.w * cw, bh = c.caja.h * ch;
  let k = alto / bh; if (bw * k > maxW) k = maxW / bw;
  const dx = cx - (bx + bw / 2) * k, dy = abajo - (by + bh) * k;
  ctx.drawImage(img, dx, dy, cw * k, ch * k);
  return { x: dx + bx * k, y: dy + by * k, w: bw * k, h: bh * k };
}
// Silueta genérica cuando todavía no hay modelo
function siluetaEjemplo(ctx, cx, abajo, alto, color) {
  const u = alto / 1000, p = new Path2D();
  p.arc(cx, abajo - 780 * u, 170 * u, 0, Math.PI * 2);
  p.moveTo(cx - 330 * u, abajo); p.bezierCurveTo(cx - 330 * u, abajo - 330 * u, cx - 200 * u, abajo - 560 * u, cx, abajo - 560 * u);
  p.bezierCurveTo(cx + 200 * u, abajo - 560 * u, cx + 330 * u, abajo - 330 * u, cx + 330 * u, abajo); p.closePath();
  ctx.fillStyle = color; ctx.fill(p);
  return { x: cx - 330 * u, y: abajo - 950 * u, w: 660 * u, h: 950 * u };
}
// Chip de crédito: "ARTE" (etiqueta) + "@artista"
function chipCredito(ctx, lbl, val, cx, cy, u, P) {
  const fL = `700 ${24 * u}px "Chakra Petch"`, fV = `700 ${36 * u}px "Fredoka"`;
  const wl = lbl ? ancho(ctx, lbl.toUpperCase(), fL, 3 * u) : 0, wv = ancho(ctx, val, fV), gap = lbl ? 18 * u : 0, w = wl + gap + wv + 60 * u, h = 68 * u;
  pegatina(ctx, cx - w / 2, cy - h / 2, w, h, h / 2, { fill: P.c, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 8 * u, suave: false });
  let x = cx - w / 2 + 30 * u; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (lbl) { fuente(ctx, fL, 3 * u); ctx.fillStyle = P.a; ctx.fillText(lbl.toUpperCase(), x, cy + 2 * u); x += wl + gap; }
  fuente(ctx, fV); ctx.fillStyle = P.t; ctx.fillText(val, x, cy + 2 * u);
  return w;
}
const PR = { sil: .35, ola: 5.0, cubre: 5.55, baja: 5.8, fuera: 6.6, mueve: 6.75, nombre: 7.0, cred: 7.9 };
export const presentacion = {
  id: 'presentacion',
  nombre: 'Presentación de modelo',
  desc: 'Vídeo de revelación (15–22 s): tu silueta aparece bajo un foco, la ola lo tapa todo y al retirarse sale tu modelo a color con su nombre y los créditos. Acepta un PNG transparente o un vídeo de tu modelo con fondo verde (lo quita solo) o WebM transparente.',
  fps: 30,
  opaco: true,
  fotoMomento: 72,
  campos: [
    { k: 'modelo', label: 'Tu modelo (PNG transparente, vídeo con fondo verde o WebM transparente)', tipo: 'media' },
    { k: 'quitar', label: 'Fondo del modelo', tipo: 'chips', def: 'auto', opciones: [['auto', '🎬 Automático (quita el verde de los vídeos)'], ['verde', '🟩 Quitar verde'], ['no', '✨ Ya es transparente']] },
    { k: 'zoom', label: 'Tamaño del modelo (%)', tipo: 'numero', def: 100, min: 40, max: 220, paso: 5 },
    { k: 'bajar', label: 'Subir (−) / bajar (+) el modelo', tipo: 'numero', def: 0, min: -600, max: 600, paso: 10 },
    { k: 'teaserOn', label: 'Texto del misterio', tipo: 'chips', def: 'si', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'teaser', label: 'Texto durante la silueta', tipo: 'texto', def: 'Algo nuevo se acerca…', max: 34, si: 'teaserOn=si' },
    { k: 'etiquetaOn', label: 'Etiqueta sobre el nombre', tipo: 'chips', def: 'si', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'etiqueta', label: 'Etiqueta', tipo: 'texto', def: 'Nuevo modelo', max: 26, si: 'etiquetaOn=si' },
    { k: 'nombre', label: 'Nombre', tipo: 'texto', def: 'KyoSumi', max: 16 },
    { k: 'c1On', label: 'Crédito 1', tipo: 'chips', def: 'si', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'c1l', label: 'Crédito 1 · etiqueta', tipo: 'texto', def: 'Arte', max: 18, si: 'c1On=si' },
    { k: 'c1', label: 'Crédito 1 · quién', tipo: 'texto', def: '@artista', max: 30, si: 'c1On=si' },
    { k: 'c2On', label: 'Crédito 2', tipo: 'chips', def: 'si', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'c2l', label: 'Crédito 2 · etiqueta', tipo: 'texto', def: 'Rig', max: 18, si: 'c2On=si' },
    { k: 'c2', label: 'Crédito 2 · quién', tipo: 'texto', def: '@rigger', max: 30, si: 'c2On=si' },
    { k: 'c3On', label: 'Crédito 3', tipo: 'chips', def: 'no', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'c3l', label: 'Crédito 3 · etiqueta', tipo: 'texto', def: 'Modelado 3D', max: 18, si: 'c3On=si' },
    { k: 'c3', label: 'Crédito 3 · quién', tipo: 'texto', def: '@modelador', max: 30, si: 'c3On=si' },
    { k: 'c4On', label: 'Crédito 4', tipo: 'chips', def: 'no', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'c4l', label: 'Crédito 4 · etiqueta', tipo: 'texto', def: 'Diseño', max: 18, si: 'c4On=si' },
    { k: 'c4', label: 'Crédito 4 · quién', tipo: 'texto', def: '@diseñador', max: 30, si: 'c4On=si' },
    { k: 'finalOn', label: 'Texto final', tipo: 'chips', def: 'no', opciones: [['si', '👁 Mostrar'], ['no', 'Ocultar']] },
    { k: 'final', label: 'Texto final', tipo: 'texto', def: '¡Estreno en directo!', max: 30, si: 'finalOn=si' },
    ...COLORES,
    ...MUSICA_CAMPOS('burbuja'),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 18, min: 15, max: 22, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 18, 15, 22),
  _creditos(o) { return [1, 2, 3, 4].filter(i => o['c' + i + 'On'] === 'si' && (o['c' + i] || '').trim()).map(i => [(o['c' + i + 'l'] || '').trim(), o['c' + i].trim()]); },
  sonido(o) {
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100, mus = musicaElegida(o, 'burbuja'), ef = o.efectos !== 'no';
    return renderSonido(L, (ac, out) => {
      // tensión: acorde grave que se abre poco a poco
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, 0); g.gain.exponentialRampToValueAtTime(.14 * v, 4.7); g.gain.exponentialRampToValueAtTime(0.0001, 5.9); g.connect(out);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, 0); lp.frequency.exponentialRampToValueAtTime(1500, 5.4); lp.connect(g);
      [55, 82.4, 110.6].forEach((f, i) => { const os = ac.createOscillator(); os.type = i === 2 ? 'triangle' : 'sawtooth'; os.frequency.value = f; os.detune.value = i * 6 - 6; os.connect(lp); os.start(0); os.stop(6); });
      // latidos cada vez más seguidos
      [0.9, 1.22, 2.1, 2.4, 3.15, 3.42, 3.95, 4.18, 4.55, 4.74].forEach((t0, i) => {
        const os = ac.createOscillator(); os.type = 'sine'; os.frequency.setValueAtTime(95, t0); os.frequency.exponentialRampToValueAtTime(42, t0 + .18);
        const gg = ac.createGain(); gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime((i % 2 ? .38 : .55) * v, t0 + .012); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + .26);
        os.connect(gg).connect(out); os.start(t0); os.stop(t0 + .3);
      });
      // subida antes de la ola
      const rs = ac.createBufferSource(); rs.buffer = ruido(ac, 1.8, 21);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.setValueAtTime(300, 3.8); bp.frequency.exponentialRampToValueAtTime(5200, 5.5);
      const rg = ac.createGain(); rg.gain.setValueAtTime(0.0001, 3.8); rg.gain.exponentialRampToValueAtTime(.3 * v, 5.45); rg.gain.exponentialRampToValueAtTime(0.0001, 5.62);
      rs.connect(bp).connect(rg).connect(out); rs.start(3.8); rs.stop(5.65);
      if (ef) { whoosh(ac, out, PR.ola, .7, .9 * v, -.4, .4, 3); whoosh(ac, out, PR.baja, .85, .8 * v, .4, -.4, 5); }
      // golpe de la revelación
      const b = ac.createOscillator(); b.type = 'sine'; b.frequency.setValueAtTime(150, PR.baja); b.frequency.exponentialRampToValueAtTime(38, PR.baja + .8);
      const bg = ac.createGain(); bg.gain.setValueAtTime(0.0001, PR.baja); bg.gain.exponentialRampToValueAtTime(.95 * v, PR.baja + .02); bg.gain.exponentialRampToValueAtTime(0.0001, PR.baja + 1.1);
      b.connect(bg).connect(out); b.start(PR.baja); b.stop(PR.baja + 1.2);
      // brillo de campanitas
      [0, 4, 7, 12, 16, 19].forEach((s, i) => { const t0 = PR.baja + .06 + i * .07, os = ac.createOscillator(); os.type = 'triangle'; os.frequency.value = 880 * Math.pow(2, s / 12);
        const gg = ac.createGain(); gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(.16 * v, t0 + .01); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1); os.connect(gg).connect(out); os.start(t0); os.stop(t0 + 1.05); });
      const r = azar(31); for (let i = 0; i < 9; i++) blup(ac, out, PR.baja + .25 + i * .09 + r() * .05, 480 + r() * 420, .22 * v, r() * 2 - 1);
      // la música entra con la revelación
      if (mus !== 'ninguna') { const mg = ac.createGain(); mg.gain.setValueAtTime(0, 0); mg.gain.setValueAtTime(0, PR.baja - .02); mg.gain.linearRampToValueAtTime(1, PR.baja + .12); mg.connect(out); musicaFondo(ac, mg, L, mus, 1.5 * v); }
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), vert = fmt === 'vertical', u = Math.min(W, H) / 1080, mt = ctx.getTransform(), esc = Math.hypot(mt.a, mt.b) || 1;
    const Y0 = H * (vert ? .64 : .87), rev = t >= PR.baja; // ¿ya se ve a color?
    // ---- fondo: noche con estrellas ----
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.o); g.addColorStop(.75, P.c); g.addColorStop(1, P.c);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const brillo = rev ? 1 : .55;
    { const rg = ctx.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, Math.max(W, H) * .6); rg.addColorStop(0, P.a2 + (rev ? '66' : '33')); rg.addColorStop(1, P.a2 + '00'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
    { const r = azar(12); for (let i = 0; i < 70; i++) { const sx = r() * W, sy = r() * Y0 * .95, tw = .5 + .5 * Math.sin(t * (1.5 + r() * 3) + i), s = (1.2 + r() * 2.4) * u; ctx.globalAlpha = (.25 + .6 * tw) * brillo; ctx.fillStyle = i % 7 ? '#ffffff' : P.a; ctx.beginPath(); ctx.arc(sx, sy, s, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
    // ---- dónde va el modelo ----
    const zoom = clamp(Number(o.zoom) || 100, 40, 220) / 100, baja = (Number(o.bajar) || 0) * u;
    const altoM = (vert ? H * .5 : H * .84) * zoom, maxW = vert ? W * .92 : W * .56;
    const mover = vert ? 0 : EASE.io(clamp((t - PR.mueve) / .8, 0, 1));
    const cx = vert ? W / 2 : lerp(W / 2, W * .7, mover), abajo = (vert ? H * .69 : H * .99) + baja;
    const flota = rev ? Math.sin(t * 1.6) * 8 * u : Math.sin(t * 1.1) * 4 * u;
    const m = modeloListo(o.modelo, altoM * esc / .8, o.quitar || 'auto');
    // foco de luz (antes de la revelación)
    const foco = rev ? 0 : clamp((t - PR.sil) / .8, 0, 1) * (.85 + .15 * Math.sin(t * 7) * Math.sin(t * 3.1));
    if (foco > .01) {
      ctx.save(); ctx.globalAlpha = foco; const top = -40 * u, bw = (vert ? W * .5 : W * .3);
      const lg = ctx.createLinearGradient(0, top, 0, abajo); lg.addColorStop(0, 'rgba(255,255,255,.34)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(cx - 60 * u, top); ctx.lineTo(cx + 60 * u, top); ctx.lineTo(cx + bw, abajo); ctx.lineTo(cx - bw, abajo); ctx.closePath(); ctx.fill();
      const pg = ctx.createRadialGradient(cx, Y0, 0, cx, Y0, bw); pg.addColorStop(0, 'rgba(255,255,255,.25)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = pg; ctx.fillRect(cx - bw, Y0 - bw * .4, bw * 2, bw * .8);
      ctx.restore();
    }
    // ---- el modelo: silueta o a color ----
    let caja = null;
    const aparece = clamp((t - PR.sil) / .9, 0, 1);
    if (aparece > 0) {
      ctx.save(); ctx.translate(0, flota);
      if (!rev) {
        const sube = (1 - EASE.out(aparece)) * 60 * u; ctx.translate(0, sube); ctx.globalAlpha = aparece;
        if (m) {
          // brillo del borde y silueta oscura encima
          ctx.save(); ctx.shadowColor = P.a; ctx.shadowBlur = 34 * u * esc; ponerModelo(ctx, m, tinteModelo(m, P.a), cx, abajo, altoM, maxW); ctx.restore();
          caja = ponerModelo(ctx, m, tinteModelo(m, P.o), cx, abajo, altoM, maxW);
        } else {
          ctx.save(); ctx.shadowColor = P.a; ctx.shadowBlur = 34 * u * esc; siluetaEjemplo(ctx, cx, abajo, altoM, P.a); ctx.restore();
          caja = siluetaEjemplo(ctx, cx, abajo, altoM, P.o);
        }
      } else {
        const pop = kf(t, [[PR.baja, { s: .92 }], [PR.fuera, { s: 1.03 }], [PR.fuera + .3, { s: 1 }]], EASE.out).s;
        const ap = AC && AC.k.muelle ? K.aplaston(t, PR.fuera - .15, { fuerza: .12, frec: 2.5, amort: 6 }) : { sx: 1, sy: 1 };
        ctx.translate(cx, abajo); ctx.scale(pop * ap.sx, pop * ap.sy); ctx.translate(-cx, -abajo);
        if (m) caja = ponerModelo(ctx, m, m.cv, cx, abajo, altoM, maxW);
        else { caja = siluetaEjemplo(ctx, cx, abajo, altoM, P.a2); fuente(ctx, `700 ${34 * u}px "Fredoka"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.t; ctx.fillText('Sube tu modelo ✨', cx, abajo - altoM * .35); }
      }
      ctx.restore();
    }
    if (AC && rev && caja) golpeEn(ctx, caja.x + caja.w / 2, caja.y + caja.h * .45, Math.max(caja.w, caja.h) * .62, caja.h * .62, t, PR.fuera - .15, P.a, { grosor: 30 * u, n: 22 }); // cuando el mar ya ha bajado
    // "?" que late junto a la silueta
    if (!rev && caja && aparece > .5) {
      const pq = 1 + Math.sin(t * 5) * .08, a = kf(t, [[PR.sil + .7, { s: 0 }], [PR.sil + 1.05, { s: 1.15 }], [PR.sil + 1.25, { s: 1 }]], EASE.back).s;
      if (a > .01) { const qx = clamp(caja.x + caja.w * .92, 120 * u, W - 120 * u), qy = clamp(caja.y + caja.h * .08, 150 * u, H), fs = 170 * u;
        ctx.save(); ctx.translate(qx, qy + flota); ctx.rotate(rad(12 + Math.sin(t * 2) * 6)); ctx.scale(a * pq, a * pq);
        fuente(ctx, `400 ${fs}px "Cherry Bomb One"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; textoPegatina(ctx, '?', 0, 0, u * 1.3, '#F4C542', P, 1); ctx.restore(); }
    }
    // ---- mar ----
    marQuieto(ctx, P, W, H, t, u, Y0);
    // texto del misterio
    if (!rev && o.teaserOn !== 'no' && o.teaser) {
      const a = clamp((t - 1.0) / .6, 0, 1) * (1 - clamp((t - (PR.ola - .2)) / .3, 0, 1));
      if (a > .01) { const f = `700 ${(vert ? 58 : 52) * u}px "Fredoka"`; fuente(ctx, f, 1 * u); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        const ty = vert ? H * .755 : H * .935; ctx.globalAlpha = a; ctx.lineWidth = 12 * u; ctx.strokeStyle = P.o; ctx.strokeText(o.teaser, W / 2, ty); ctx.fillStyle = P.s || P.t; ctx.fillText(o.teaser, W / 2, ty); ctx.globalAlpha = 1; }
    }
    // ---- después de la revelación: destellos, burbujas, nombre y créditos ----
    if (rev) {
      if (caja) [[-.1, .1, '#F4C542', 0, 70], [1.08, .18, '#ffffff', .08, 56], [-.06, .62, P.a, .16, 48], [1.02, .7, '#F4C542', .24, 40], [.5, -.05, '#ffffff', .12, 44]].forEach(([fx, fy, col, dl, tam]) => {
        const k = kf(t - dl, [[PR.baja + .2, { s: 0, r: 0 }], [PR.baja + .5, { s: 1.3, r: 80 }], [PR.baja + 1.1, { s: 1, r: 160 }]]);
        if (k.s > .01) destello(ctx, caja.x + fx * caja.w, caja.y + fy * caja.h + flota, tam * u, col, k.s * (.75 + .25 * Math.sin(t * 4 + dl * 20)), k.r + t * 25, 1);
      });
      if (t < PR.baja + 3) { ctx.save(); ctx.globalAlpha = clamp(1 - (t - PR.baja) / 3, 0, 1); burbujasEn(ctx, W, H, t, u, 41, 22, 2.2); ctx.restore(); }
      const cxT = vert ? W / 2 : W * .31, maxT = vert ? W - 120 * u : W * .5;
      const yNom = vert ? H * .7 : H * .45, yEt = vert ? H * .115 : H * .29;
      if (o.etiquetaOn !== 'no' && o.etiqueta) { const a = kf(t, [[PR.nombre - .15, { s: 0 }], [PR.nombre + .15, { s: 1.15 }], [PR.nombre + .3, { s: 1 }]], EASE.back).s;
        if (a > .01) { ctx.save(); ctx.translate(cxT, yEt); ctx.rotate(rad(-3)); ctx.scale(a, a); chipTexto(ctx, o.etiqueta.toUpperCase(), 0, 0, u * (vert ? 1.35 : 1.25), P, P.a); ctx.restore(); } }
      if (o.nombre) letrasSaltan(ctx, o.nombre, cxT, yNom, (vert ? 190 : 200) * u, P, t, PR.nombre, .07, t, maxT);
      const cr = this._creditos(o);
      if (cr.length) {
        // en horizontal: uno debajo de otro; en vertical: de dos en dos
        const filas = vert ? [cr.slice(0, 2), cr.slice(2, 4)].filter(f => f.length) : cr.map(c => [c]);
        const cu = u * (vert ? 1.3 : 1.35), y0 = vert ? H * .8 : H * .615, paso = 94 * cu; let n = 0;
        filas.forEach((fila, fi) => {
          const anchos = fila.map(([l, v]) => { fuente(ctx, `700 ${24 * cu}px "Chakra Petch"`, 3 * cu); const wl = l ? ctx.measureText(l.toUpperCase()).width + 18 * cu : 0; fuente(ctx, `700 ${36 * cu}px "Fredoka"`); return wl + ctx.measureText(v).width + 60 * cu; });
          const tot = anchos.reduce((a, b) => a + b, 0) + 24 * cu * (fila.length - 1); let x = cxT - tot / 2;
          fila.forEach(([l, v], j) => { const cxC = x + anchos[j] / 2; x += anchos[j] + 24 * cu;
            const a = kf(t, [[PR.cred + n * .22, { s: 0, y: 30 }], [PR.cred + n * .22 + .25, { s: 1.12, y: -4 }], [PR.cred + n * .22 + .4, { s: 1, y: 0 }]], EASE.back); n++;
            if (a.s > .01) { ctx.save(); ctx.translate(cxC, y0 + fi * paso + a.y * u); ctx.rotate(rad(((fi + j) % 2 ? 1.5 : -1.5))); ctx.scale(a.s, a.s); chipCredito(ctx, l, v, 0, 0, cu, P); ctx.restore(); } });
        });
      }
      if (o.finalOn === 'si' && o.final) { const tf = PR.cred + cr.length * .22 + .5, a = kf(t, [[tf, { s: 0 }], [tf + .3, { s: 1.12 }], [tf + .45, { s: 1 }]], EASE.back).s;
        if (a > .01) { const yF = cr.length ? H * .615 + cr.length * 94 * u * 1.35 + 10 * u : H * .63; ctx.save(); ctx.translate(cxT, vert ? H * .06 + 60 * u : yF); ctx.scale(a, a); chipTexto(ctx, o.final, 0, 0, u * 1.2, P, '#F4C542'); ctx.restore(); } }
    }
    // ---- la ola: sube, lo tapa todo y se retira ----
    if (t >= PR.ola && t < PR.fuera + .05) {
      const arriba = -H * .14, nivel = t < PR.cubre ? kf(t, [[PR.ola, { y: H + 110 * u }], [PR.cubre, { y: arriba }]], EASE.io).y
        : t < PR.baja ? arriba : kf(t, [[PR.baja, { y: arriba }], [PR.fuera, { y: H + 120 * u }]], EASE.io).y;
      dosMares(ctx, P, W, H, t, u, nivel);
    }
    // destello blanco al destapar
    if (t >= PR.baja && t < PR.baja + .5) { ctx.fillStyle = 'rgba(255,255,255,' + (.45 * (1 - (t - PR.baja) / .5)).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
  }
};
