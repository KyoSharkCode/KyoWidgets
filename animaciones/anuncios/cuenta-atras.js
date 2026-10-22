// Kyo Estudio · Anuncio: cuenta atrás
import * as K from '../kit-dibujado.js';
import { rad, clamp, EASE, kf, rr, fuente, ancho, paleta, imagenEn, COLORES } from '../base/utilidades.js';
import { AC, siluetaEn, parMorph, D_REGALO_SIL, D_CAMISETA, morphResorte, puntoVivo, conAcabado } from '../base/acabado.js';
import { REGALO } from '../base/iconos.js';
import { pegatina, destello, avatar, textoPegatina, letrasSaltan, chipTexto } from '../base/piezas.js';
import { renderSonido, musicaElegida, musicaFondo } from '../base/sonido.js';
import { fondoAnuncio } from '../base/mar-y-cielo.js';
import { pieAnuncio } from './comun.js';

// Anuncio con cuenta atrás o fecha ("Nueva merch en 01:00:00" / "el 03-10-2026")
export const anuncioCuenta = {
  id: 'anuncio-cuenta',
  opaco: true,
  fmtDef: 'vertical',
  formatos: ['vertical', 'horizontal', 'retrato', 'cuadrado'],
  nombre: 'Anuncio con cuenta atrás o fecha',
  desc: '"¡Nueva merch!" con una cuenta atrás que avanza de verdad (HH:MM:SS) o con la fecha de salida (DD-MM-AAAA). Imagen de adelanto opcional (en silueta o borrosa para crear misterio) y música.',
  fps: 30,
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Nueva merch!', max: 22 },
    { k: 'modo', label: 'Tipo', tipo: 'chips', def: 'contador', opciones: [['contador', '⏱ Cuenta atrás (HH:MM:SS)'], ['fecha', '📅 Fecha (DD-MM-AAAA)']] },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'llega en…', max: 30, si: 'modo=contador' },
    { k: 'd', label: 'Días (0 = no se muestran)', tipo: 'numero', def: 0, min: 0, max: 99, paso: 1, si: 'modo=contador' },
    { k: 'h', label: 'Horas', tipo: 'numero', def: 1, min: 0, max: 23, paso: 1, si: 'modo=contador' },
    { k: 'm', label: 'Minutos', tipo: 'numero', def: 0, min: 0, max: 59, paso: 1, si: 'modo=contador' },
    { k: 's', label: 'Segundos', tipo: 'numero', def: 0, min: 0, max: 59, paso: 1, si: 'modo=contador' },
    { k: 'tic', label: 'Sonido de tic-tac', tipo: 'chips', def: 'si', opciones: [['si', '⏱ Sí'], ['no', 'No']], si: 'modo=contador' },
    { k: 'fraseF', label: 'Frase', tipo: 'texto', def: 'llega el…', max: 30, si: 'modo=fecha' },
    { k: 'fecha', label: 'Fecha (DD-MM-AAAA)', tipo: 'texto', def: '03-10-2026', max: 10, si: 'modo=fecha' },
    { k: 'hora', label: 'Hora (opcional, ej. 20:00 h · España)', tipo: 'texto', def: '', max: 26, si: 'modo=fecha' },
    { k: 'imagen', label: 'Imagen de adelanto (opcional)', tipo: 'imagen' },
    { k: 'misterio', label: 'Cómo se ve la imagen', tipo: 'chips', def: 'silueta', opciones: [['silueta', '👤 Silueta misteriosa'], ['borrosa', '🌫️ Borrosa'], ['normal', '👀 Normal']] },
    { k: 'zoom', label: 'Zoom de la imagen (%)', tipo: 'numero', def: 100, min: 50, max: 250, paso: 5 },
    { k: 'url', label: 'Enlace (opcional)', tipo: 'texto', def: 'kyomerch.shop', max: 36 },
    { k: 'envio', label: 'Texto de abajo (opcional)', tipo: 'texto', def: 'Envíos a todo el mundo', max: 32 },
    ...COLORES,
    { k: 'musica', label: 'Música de fondo', tipo: 'chips', def: 'auto', opciones: [['auto', '🎨 Según el estilo'], ['burbuja', '🫧 Burbuja'], ['alegre', '🎶 Pop'], ['chill', '🌙 Chill'], ['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['ninguna', '🔇 Sin música']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 10, min: 5, max: 30, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 10, 5, 30),
  _T1: 1.6, // segundo en el que empieza a correr la cuenta
  sonido(o) {
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100, tic = !(this._variante || {}).hoy && o.modo !== 'fecha' && o.tic !== 'no', mus = musicaElegida(o, 'burbuja');
    if (mus === 'ninguna' && !tic) return Promise.resolve(null);
    const T1 = this._T1, total = this._total(o);
    return renderSonido(L, (ac, out) => {
      if (mus !== 'ninguna') musicaFondo(ac, out, L, mus, 1.5 * v);
      if (tic) for (let s = 1; T1 + s < L && s <= total; s++) {
        const t0 = T1 + s, os = ac.createOscillator(); os.type = 'sine'; os.frequency.value = s % 2 ? 1800 : 1350;
        const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.18 * v, t0 + .003); g.gain.exponentialRampToValueAtTime(.0001, t0 + .05);
        os.connect(g).connect(out); os.start(t0); os.stop(t0 + .07);
      }
    });
  },
  _total: o => Math.max(0, (Number(o.d) || 0) * 86400 + (Number(o.h) || 0) * 3600 + (Number(o.m) || 0) * 60 + (Number(o.s) || 0)),
  _capa(W, H) { this._c = this._c || {}; return this._c[W + 'x' + H] || (this._c[W + 'x' + H] = Object.assign(document.createElement('canvas'), { width: W, height: H })); },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), vert = fmt !== 'horizontal', u = Math.min(W, H) / 1080, k = vert ? W / 1080 : W / 1920;
    const V = this._variante || {}, hoy = !!V.hoy, fecha = o.modo === 'fecha' || hoy, img = o.imagen;
    // posiciones por formato: [con imagen, sin imagen]
    const Lx = {
      vertical: { tY: 250, tF: 145, img: [460, 450], regalo: [560, 250], fr: [390, 800], bl: [1090, 1030], F: [140, 200], hora: 100, url: 1430, env: 1545 },
      retrato: { tY: 140, tF: 125, img: [360, 215], regalo: [330, 220], fr: [640, 510], bl: [800, 700], F: [135, 170], hora: 70, url: 1085, env: 1185 },
      cuadrado: { tY: 105, tF: 110, img: [250, 175], regalo: [270, 170], fr: [485, 430], bl: [610, 580], F: [110, 135], hora: 55, url: 860, env: 948 },
      horizontal: { tY: 120, tF: 120, fr: [330, 300], bl: [500, 500], F: [150, 150], hora: 80, url: 835, env: 930 }
    }[fmt] || {};
    // con etiqueta de evento (anuncio de directo) se deja sitio debajo del título
    if (V.evento && o.evento) Object.assign(Lx, {
      vertical: { img: [400, 510], regalo: [600, 230], fr: [460, 820], bl: [1060, 1040] },
      retrato: { img: [300, 270], regalo: [360, 200], fr: [650, 540], bl: [815, 720] },
      cuadrado: { img: [220, 225], regalo: [318, 140], fr: [495, 450], bl: [615, 595] }
    }[fmt] || {});
    // "¡Hoy hay directo!": solo 2 bloques (HH:MM), más grandes y con la frase justo encima
    if (hoy) Object.assign(Lx, {
      vertical: { img: [430, 470], fr: [970, 820], bl: [1120, 1060], F: [170, 250] },
      retrato: { img: [300, 290], fr: [650, 560], bl: [800, 730], F: [140, 190] },
      cuadrado: { img: [190, 255], fr: [510, 440], bl: [622, 580], F: [112, 150] },
      horizontal: { F: [150, 190] }
    }[fmt] || {});
    const iI = img ? 0 : 1;
    fondoAnuncio(ctx, P, W, H, t, u, fmt === 'vertical');
    if (o.titulo) letrasSaltan(ctx, o.titulo, W / 2, Lx.tY * k, Lx.tF * k, P, t, .2, .06, t, W - 140 * k);
    // etiqueta del evento (anuncio de directo): punto rojo que late + texto
    if (V.evento && o.evento) { const a = kf(t, [[.5, { s: 0 }], [.8, { s: 1.1 }], [.95, { s: 1 }]], EASE.back);
      if (a.s > .01) { const ev = fmt === 'vertical' ? 1.3 : 1.1, f = `700 ${32 * ev * k}px "Fredoka"`, tw = ancho(ctx, o.evento, f), h = 58 * ev * k, w = tw + 96 * ev * k, cx = W / 2, cy = (Lx.tY + Lx.tF * .8) * k;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-2)); ctx.scale(a.s, a.s);
        pegatina(ctx, -w / 2, -h / 2, w, h, h / 2, { fill: '#FF4D6A', p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 8 * u, suave: false });
        const lat = .75 + .25 * Math.abs(Math.sin(t * 3));
        if (AC) puntoVivo(ctx, -w / 2 + 34 * ev * k, 0, 9 * ev * k * lat, t, 1.0);
        else { ctx.beginPath(); ctx.arc(-w / 2 + 34 * ev * k, 0, 9 * ev * k * lat, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(-w / 2 + 34 * ev * k, 0, 15 * ev * k * lat, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2.5 * k; ctx.stroke();
        fuente(ctx, f); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(o.evento, -w / 2 + 62 * ev * k, 2 * k); ctx.restore(); } }
    // zona de la cuenta (derecha en horizontal si hay imagen)
    const cxC = !vert && img ? 1280 * k : W / 2, anchoC = vert ? W - 110 * k : img ? 1060 * k : W - 360 * k;
    const yFrase = Lx.fr[iI] * k, yBloques = Lx.bl[iI] * k;
    // frase
    const fr = fecha && !hoy ? o.fraseF : o.frase;
    if (fr) { const a = kf(t, [[.6, { y: 24, a: 0 }], [.95, { y: 0, a: 1 }]], EASE.back);
      if (a.a > .01) { ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); fuente(ctx, `700 ${(vert ? 62 : 56) * k}px "Fredoka"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = 10 * u; ctx.strokeStyle = P.o; ctx.strokeText(fr, cxC, yFrase + a.y * u); ctx.fillStyle = P.t; ctx.fillText(fr, cxC, yFrase + a.y * u); ctx.restore(); } }
    // imagen de adelanto
    if (img) {
      const s = (vert ? Lx.img[0] : 440) * k, x = vert ? (W - s) / 2 : 190 * k, y = vert ? Lx.img[1] * k : 300 * k, cx = x + s / 2, cy = y + s / 2;
      const a = kf(t, [[.8, { s: .2, r: -14, a: 0 }], [1.15, { s: 1.08, r: 4, a: 1 }], [1.35, { s: 1, r: 0, a: 1 }]], EASE.back);
      if (a.a > .01) {
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, cy + Math.sin(t * 2.2) * 6 * u); ctx.rotate(rad(a.r - 2 + Math.sin(t * 1.6) * 1.2)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy);
        pegatina(ctx, x, y, s, s, 36 * u, { fill: o.misterio === 'normal' ? '#ffffff' : P.a2, p: P.p, o: P.o, ring: 9 * u, out: 7 * u, drop: 16 * u });
        ctx.save(); rr(ctx, x, y, s, s, 36 * u); ctx.clip();
        const z = clamp(Number(o.zoom) || 100, 50, 250) / 100, bw = s * .84 * z, bx = cx - bw / 2, by = cy - bw / 2;
        if (o.misterio === 'silueta') {
          // silueta: la imagen se rellena de un solo color en una capa aparte
          const mt = ctx.getTransform(), sx = Math.min(1, Math.hypot(mt.a, mt.b)) || 1, cw = Math.max(1, Math.round(bw * sx));
          const c2 = this._capa(cw, cw), x2 = c2.getContext('2d'); x2.setTransform(1, 0, 0, 1, 0, 0); x2.clearRect(0, 0, cw, cw); x2.globalCompositeOperation = 'source-over';
          imagenEn(x2, img, 0, 0, cw, cw, 'contener'); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = P.o; x2.fillRect(0, 0, cw, cw); x2.globalCompositeOperation = 'source-over';
          ctx.drawImage(c2, bx, by, bw, bw);
        } else if (o.misterio === 'borrosa') {
          const mt = ctx.getTransform(), sx = Math.hypot(mt.a, mt.b) || 1;
          ctx.filter = `blur(${Math.max(2, 26 * u * sx)}px)`; imagenEn(ctx, img, bx, by, bw, bw, 'contener'); ctx.filter = 'none';
        } else imagenEn(ctx, img, bx, by, bw, bw, 'contener');
        ctx.restore();
        if (o.misterio !== 'normal') { const pq = 1 + Math.sin(t * 4) * .06; ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(-8)); ctx.scale(pq, pq);
          fuente(ctx, `400 ${s * .42}px "Cherry Bomb One"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; textoPegatina(ctx, '?', 0, 0, u * 1.2, '#F4C542', P, 1); ctx.restore(); }
        ctx.restore();
      }
    }
    // sin imagen en vertical: regalo misterioso en el centro
    if (!img && vert) {
      const a = kf(t, [[.8, { s: 0, r: -30 }], [1.15, { s: 1.12, r: 8 }], [1.35, { s: 1, r: 0 }]], EASE.back);
      if (a.s > .01) { const cx = W / 2, cy = Lx.regalo[0] * k + Math.sin(t * 2.4) * 10 * u, D = Lx.regalo[1] * k;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rad(a.r + Math.sin(t * 3) * 5)); ctx.scale(a.s, a.s); ctx.translate(-cx, -cy);
        // acabado dibujado: el regalo tiembla, se transforma en camiseta y se aplasta al cambiar
        const revela = AC && !V.icono, T_REV = 2.4;
        if (revela) { const sq = K.aplaston(t, T_REV + .12, { fuerza: .25, frec: 3, amort: 9 }); ctx.translate(cx, cy); ctx.rotate(rad(K.impulso(t, T_REV - .2, { frec: 6, amort: 6 }) * 14)); ctx.scale(sq.sx, sq.sy); ctx.translate(-cx, -cy); }
        avatar(ctx, cx, cy, D, P, null, revela && t > T_REV ? K.morfear(...parMorph('regalo', D_REGALO_SIL, D_CAMISETA), morphResorte(t, T_REV)) : V.icono || REGALO, u * 1.3 * D / (250 * k)); ctx.restore();
        if (revela && AC.k.impacto) K.rafaga(ctx, cx, cy, (t - T_REV) / .45, { r0: D * .64, r1: D * 1.1, n: 16, color: P.a, grosor: 16 * k, sem: 6 });
        [[-.75, -.6, '#F4C542', 0], [.8, -.45, '#ffffff', .1], [.7, .7, P.a, .2]].forEach(([fx, fy, col, dl]) => { const kk = kf(t - dl, [[1.2, { s: 0, r: 0 }], [1.45, { s: 1.2, r: 60 }], [2, { s: .9, r: 140 }]]); destello(ctx, cx + fx * D, cy + fy * D, 54 * k, col, kk.s * (.8 + .2 * Math.sin(t * 4 + dl * 9)), kk.r + t * 30, 1); });
      }
    }
    // bloques
    let partes, etiquetas, seps, urg = false, cambio = [];
    if (hoy) {
      const m = String(o.horaHoy || '').trim().match(/^(\d{1,2})\D+(\d{2})/);
      if (m) { partes = [m[1].padStart(2, '0'), m[2]]; etiquetas = ['', '']; seps = ':'; }
      else { partes = [String(o.horaHoy || '—')]; etiquetas = ['']; seps = ''; }
    } else if (fecha) {
      const m = String(o.fecha || '').trim().match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})$/);
      if (m) { partes = [m[1].padStart(2, '0'), m[2].padStart(2, '0'), m[3]]; etiquetas = ['DÍA', 'MES', 'AÑO']; seps = '-'; }
      else { partes = [String(o.fecha || '—')]; etiquetas = ['']; seps = ''; }
    } else {
      const total = this._total(o), T1 = this._T1, pasados = Math.max(0, Math.floor(t - T1)), rest = Math.max(0, total - pasados), frac = t - T1 - Math.floor(t - T1);
      const trozos = r => [Math.floor(r / 86400), Math.floor(r % 86400 / 3600), Math.floor(r % 3600 / 60), r % 60];
      const act = trozos(rest), ant = trozos(Math.min(total, rest + 1)), conD = (Number(o.d) || 0) > 0;
      const idx = conD ? [0, 1, 2, 3] : [1, 2, 3];
      partes = idx.map(i => String(act[i]).padStart(2, '0')); etiquetas = idx.map(i => ['DÍAS', 'HORAS', 'MIN', 'SEG'][i]); seps = ':';
      cambio = idx.map(i => t > T1 + 1 && pasados <= total && act[i] !== ant[i] && frac < .3 ? frac / .3 : 1);
      urg = rest <= 10 && total > 0;
    }
    let F = Lx.F[iI] * k;
    const medir = F => { fuente(ctx, `700 ${F}px "Fredoka"`); const ws = partes.map(p => ctx.measureText(p).width + F * .5), sw = seps ? F * .42 : 0; return { ws, sw, tot: ws.reduce((a, b) => a + b, 0) + sw * (partes.length - 1) }; };
    let mm = medir(F); if (mm.tot > anchoC) { F *= anchoC / mm.tot; mm = medir(F); }
    const hB = F * 1.3; let x = cxC - mm.tot / 2;
    const colDig = urg ? (Math.floor(t * 4) % 2 ? '#FF5A6E' : '#FF8FA3') : P.t;
    const tGolpe = 1.05 + (partes.length - 1) * .12 + .11; // el último bloque cae
    if (AC && AC.k.impacto) { AC.golpe = tGolpe; ctx.save(); ctx.translate(cxC, yBloques); ctx.scale(1, .55); K.rafaga(ctx, 0, 0, (t - tGolpe) / .45, { r0: mm.tot * .5, r1: mm.tot * .9, n: 18, color: P.a, grosor: 26 * k, sem: 4 }); ctx.restore(); }
    const sil = siluetaEn(tGolpe);
    partes.forEach((p, i) => {
      const w = mm.ws[i], bx = x, cyB = yBloques; x += w + mm.sw;
      const ti = 1.05 + i * .12;
      const a = AC && AC.k.muelle ? Object.assign({ s: Math.max(0, K.resorte(t, ti, { frec: 2.2, amort: 6.5 })) }, K.aplaston(t, ti + .11, { fuerza: .2, frec: 3, amort: 9 }))
        : kf(t, [[1.05 + i * .12, { s: 0 }], [1.35 + i * .12, { s: 1.12 }], [1.5 + i * .12, { s: 1 }]], EASE.back);
      if (a.s <= .01) return;
      ctx.save(); ctx.translate(bx + w / 2, cyB); ctx.rotate(rad((i % 2 ? 1.5 : -1.5))); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1));
      pegatina(ctx, -w / 2, -hB / 2, w, hB, 26 * u, { fill: sil ? P.p : P.c, p: P.p, o: P.o, ring: 8 * u, out: 6 * u, drop: 12 * u, trazo: clamp((t - ti) / .5, 0, 1) });
      if (sil) { ctx.restore(); return; } // fotograma de impacto: el bloque es solo una silueta blanca
      ctx.save(); rr(ctx, -w / 2, -hB / 2, w, hB, 26 * u); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(-w / 2, -hB / 2, w, hB / 2);
      const fl = cambio[i] ?? 1, sy = fl < 1 ? .25 + .75 * EASE.back(fl) : 1;
      ctx.save(); ctx.scale(1, sy); fuente(ctx, `700 ${F}px "Fredoka"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = F * .08; ctx.strokeStyle = P.o; ctx.strokeText(p, 0, F * .06); ctx.fillStyle = colDig; ctx.fillText(p, 0, F * .06); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-w / 2, -2 * u, w, 4 * u); ctx.restore();
      ctx.restore();
      if (etiquetas[i]) { ctx.save(); ctx.globalAlpha *= clamp(a.s, 0, 1); fuente(ctx, `700 ${F * .2}px "Chakra Petch"`, F * .03); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.a; ctx.fillText(etiquetas[i], bx + w / 2 + F * .015, cyB + hB / 2 + F * .25); ctx.restore(); }
      if (i < partes.length - 1 && seps) {
        const sa = seps === ':' ? .45 + .55 * (Math.floor(t * 2) % 2 ? 1 : .35) : 1;
        ctx.save(); ctx.globalAlpha *= clamp(a.s, 0, 1) * sa; fuente(ctx, `700 ${F * .9}px "Fredoka"`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = F * .08; ctx.strokeStyle = P.o; ctx.strokeText(seps, bx + w + mm.sw / 2, cyB); ctx.fillStyle = P.t; ctx.fillText(seps, bx + w + mm.sw / 2, cyB); ctx.restore();
      }
    });
    // hora (modo fecha)
    if (fecha && o.hora) { const a = kf(t, [[1.6, { s: 0 }], [1.9, { s: 1.1 }], [2.05, { s: 1 }]], EASE.back);
      if (a.s > .01) { ctx.save(); ctx.translate(cxC, yBloques + hB / 2 + (hoy ? (vert ? 72 : 60) * k : F * .25 + Lx.hora * k)); ctx.scale(a.s, a.s); ctx.rotate(rad(-2)); chipTexto(ctx, o.hora, 0, 0, u * (vert ? 1.25 : 1.1), P, '#F4C542'); ctx.restore(); } }
    pieAnuncio(ctx, o, P, W, H, t, u, k, vert, 2.0, Lx.url, Lx.env, { url: V.iconoUrl, pie: V.iconoPie });
  }
};
conAcabado(anuncioCuenta);
