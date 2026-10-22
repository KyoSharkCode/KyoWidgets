// Kyo Estudio · Plantilla: Intro de YouTube
import * as K from '../kit-dibujado.js';
import { rad, lerp, clamp, EASE, kf, tiempo, fuente, ancho, paleta, azar, COLORES } from '../base/utilidades.js';
import { AC, siluetaEn, movLetra, conAcabado } from '../base/acabado.js';
import { ALETA } from '../base/iconos.js';
import { pegatina, destello } from '../base/piezas.js';
import { sonidoConOlas, MUSICA_CAMPOS } from '../base/sonido.js';
import { nivelMar, caminoMar, lineaMar, burbujasEn, fondoNoche, dosMares } from '../base/mar-y-cielo.js';

// 10 · Intro de YouTube "KyoSumi!" (pantalla completa, fondo propio)
export const intro = {
  id: 'intro',
  fotoMomento: 55, // % de la duración para la imagen PNG por defecto
  // con "Transición a tu clip" el final es transparente → .mov; si no, fondo completo → MP4
  opaco: o => o.final !== 'transicion',
  nombre: 'Intro de YouTube "KyoSumi!"',
  desc: 'Intro con música: una aleta cruza el mar de noche, sube una ola y aparece tu nombre letra a letra. Con "Transición a tu clip", al final la ola se retira dejando el fondo transparente para enlazar directo con tu vídeo (.mov).',
  fps: 30,
  campos: [
    { k: 'texto', label: 'Nombre', tipo: 'texto', def: 'KyoSumi!', max: 14 },
    { k: 'sub', label: 'Subtítulo (opcional)', tipo: 'texto', def: 'VTUBER', max: 30 },
    { k: 'aleta', label: 'Aleta de tiburón', tipo: 'chips', def: 'si', opciones: [['si', '🦈 Sí'], ['no', 'No']] },
    { k: 'luna', label: 'Luna y estrellas', tipo: 'chips', def: 'si', opciones: [['si', '🌙 Sí'], ['no', 'No']] },
    { k: 'final', label: 'Final', tipo: 'chips', def: 'transicion', opciones: [['transicion', '🌊 Transición a tu clip (transparente, .mov)'], ['ola', 'La ola lo tapa todo (MP4)'], ['quieto', 'Se queda el nombre (MP4)']] },
    ...COLORES,
    ...MUSICA_CAMPOS('burbuja'),
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 5, max: 12, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6, 5, 12),
  sonido(o) {
    const L = this.duracion(o), tr = o.final === 'transicion';
    const olas = [[1.1, .6, 0, 0]];
    if (tr) olas.push([L - 1.3, .6, 0, 0], [L - .72, .7, 0, 0]); else if (o.final === 'ola') olas.push([L - .7, .65, 0, 0]);
    return sonidoConOlas(o, L, olas, 'burbuja');
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), FIN = 5, tr = o.final === 'transicion';
    const tm = tr ? tiempo(t, L, 3.0, FIN - 1.3, FIN, 1.3) : tiempo(t, L, 3.0, FIN - .7, FIN, .7);
    const vert = fmt === 'vertical', u = Math.min(W, H) / 1080;
    const Y0 = H * (vert ? .74 : .72), arriba = -H * .12;
    // final transparente: la ola ya lo tapó todo y ahora se retira hacia abajo, dejando ver tu clip
    if (tr && tm >= FIN - .72) { dosMares(ctx, P, W, H, t, u, kf(tm, [[FIN - .72, { y: arriba }], [FIN - .04, { y: H + 110 * u }]], EASE.io).y); return; }
    fondoNoche(ctx, P, W, H, t, u, Y0, o.luna !== 'no', vert);
    // ---- nivel del mar (sube, lo tapa todo, baja y deja ver el nombre) ----
    const fr = [[0, { y: Y0 }], [1.15, { y: Y0 }], [1.6, { y: arriba }], [1.72, { y: arriba }], [2.35, { y: Y0 }]];
    if (tr) fr.push([FIN - 1.3, { y: Y0 }], [FIN - .74, { y: arriba }]);
    else if (o.final !== 'quieto') fr.push([FIN - .7, { y: Y0 }], [FIN - .08, { y: arriba }]);
    const nivel = kf(tm, fr, EASE.io).y;
    const surge = clamp((Y0 - nivel) / (Y0 - arriba), 0, 1), A = (20 + 26 * surge) * u;
    const nivelAtras = nivel - 46 * u;
    // mar de fondo
    const marAtras = caminoMar(W, H, nivelAtras, A, 1.3, t);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, nivelAtras, A, 1.3, t));
    ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, nivelAtras, A, 1.3, t));
    ctx.fillStyle = P.a; ctx.fill(marAtras);
    // aleta que cruza
    if (o.aleta !== 'no' && tm > .1 && tm < 1.45) {
      const p = EASE.io(clamp((tm - .12) / 1.25, 0, 1)), k = (vert ? 2.1 : 2.7) * u;
      const fx = lerp(-150 * k, W + 30 * k, p), baseY = nivelMar(fx + 60 * k, nivel, A, W, 0, t) + 18 * u;
      const hund = kf(tm, [[1.0, { y: 0 }], [1.3, { y: 90 }]], EASE.io).y * k;
      // estela de espuma
      for (let i = 0; i < 6; i++) { const ex = fx - i * 34 * k + 20 * k, ey = nivelMar(ex, nivel, A, W, 0, t) + 4 * u, a = (1 - i / 6) * .8;
        ctx.beginPath(); ctx.ellipse(ex, ey, (26 - i * 2) * k * .5, 9 * u, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill(); }
      ctx.save(); ctx.translate(fx, baseY - 78 * k + hund); ctx.rotate(rad(Math.sin(t * 6) * 3)); ctx.scale(k, k);
      ctx.lineJoin = 'round'; ctx.lineWidth = 14 / k * u; ctx.strokeStyle = P.o; ctx.stroke(ALETA);
      ctx.lineWidth = 8 / k * u; ctx.strokeStyle = P.p; ctx.stroke(ALETA);
      ctx.fillStyle = P.s; ctx.fill(ALETA);
      ctx.beginPath(); ctx.moveTo(70, 20); ctx.quadraticCurveTo(58, 44, 40, 62); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
      ctx.restore();
    }
    // ---- nombre, letra a letra (capa aparte para el brillo) ----
    const txt = o.texto || '', letras = [...txt];
    let fs = (vert ? 190 : 250) * u, fT = s => `400 ${s}px "Cherry Bomb One"`;
    const esp = 6 * u;
    let anchos = letras.map(c => ancho(ctx, c, fT(fs))), tot = anchos.reduce((a, b) => a + b, 0) + esp * (letras.length - 1);
    const maxW = W - (vert ? 110 : 220) * u;
    if (tot > maxW) { const k = maxW / tot; fs *= k; anchos = anchos.map(a => a * k); tot = maxW; }
    const cyT = vert ? H * .44 : H * .43;
    const mt = ctx.getTransform(), sx = Math.min(1, Math.hypot(mt.a, mt.b)) || 1, cw = Math.round(W * sx), ch = Math.round(H * sx);
    this._capas = this._capas || {}; const capa = this._capas[cw + 'x' + ch] || (this._capas[cw + 'x' + ch] = Object.assign(document.createElement('canvas'), { width: cw, height: ch }));
    const c2 = capa.getContext('2d'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cw, ch); c2.setTransform(sx, 0, 0, sx, 0, 0);
    let x = W / 2 - tot / 2, hay = false;
    const uu = fs / 250;
    letras.forEach((c, i) => {
      const ti = 1.92 + i * .075;
      const a = AC && AC.k.muelle ? movLetra(tm, ti, 140) : kf(tm, [[ti, { y: 140, s: .3, r: -18, a: 0 }], [ti + .22, { y: -26, s: 1.14, r: 6, a: 1 }], [ti + .42, { y: 0, s: 1, r: 0, a: 1 }]], EASE.out);
      const cx = x + anchos[i] / 2; x += anchos[i] + esp;
      if (a.a <= 0.01) return; hay = true;
      const bob = tm > ti + .42 ? Math.sin(t * 3 - i * .6) * 9 * uu : 0, rb = (i % 2 ? 3 : -3) + (tm > ti + .42 ? Math.sin(t * 2.4 - i) * 2 : 0);
      c2.save(); c2.globalAlpha = clamp(a.a, 0, 1); c2.translate(cx, cyT + (a.y * uu) + bob); c2.rotate(rad(a.r + rb)); c2.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1));
      c2.font = fT(fs); c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.lineJoin = 'round';
      if (AC && AC.k.sombras) { c2.save(); c2.globalAlpha *= .55; c2.fillStyle = c2.strokeStyle = K.trama(c2, '#000', 7); c2.lineWidth = 34 * uu; c2.strokeText(c, 12 * uu, 34 * uu); c2.fillText(c, 12 * uu, 34 * uu); c2.restore(); }
      c2.lineWidth = 34 * uu; c2.strokeStyle = P.o; c2.strokeText(c, 0, 14 * uu); c2.fillStyle = P.o; c2.fillText(c, 0, 14 * uu); c2.strokeText(c, 0, 0);
      c2.lineWidth = 20 * uu; c2.strokeStyle = P.p; c2.strokeText(c, 0, 0);
      const lg = c2.createLinearGradient(0, -fs * .4, 0, fs * .4); lg.addColorStop(0, i % 2 ? P.a : P.t); lg.addColorStop(1, i % 2 ? P.a2 : P.a);
      c2.fillStyle = lg; c2.fillText(c, 0, 0);
      c2.restore();
    });
    const tGolpe = 1.92 + (letras.length - 1) * .075 + .2; // la última letra ya está arriba
    if (hay && siluetaEn(tGolpe)) K.silueta(c2, P.p);
    if (hay) {
      if (AC && AC.k.impacto) { AC.golpe = tGolpe; ctx.save(); ctx.translate(W / 2, cyT); ctx.scale(1, .45); K.rafaga(ctx, 0, 0, (tm - tGolpe) / .45, { r0: tot * .48, r1: tot * .9, n: 20, color: P.a, grosor: 30 * u, sem: 9 }); ctx.restore(); }
      // brillo que cruza las letras
      const sp = (tm - 3.0) / .7;
      if (sp > 0 && sp < 1) { c2.save(); c2.globalCompositeOperation = 'source-atop'; const bx = lerp(W / 2 - tot / 2 - 200 * uu, W / 2 + tot / 2 + 200 * uu, EASE.io(sp));
        c2.translate(bx, cyT); c2.rotate(rad(20)); c2.fillStyle = 'rgba(255,255,255,.55)'; c2.fillRect(-40 * uu, -H, 80 * uu, 2 * H); c2.fillRect(60 * uu, -H, 22 * uu, 2 * H); c2.restore(); }
      ctx.drawImage(capa, 0, 0, W, H);
    }
    // subtítulo
    if (o.sub) {
      const a = AC && AC.k.muelle ? { y: lerp(30, 0, K.resorte(tm, 2.55, { frec: 2.4, amort: 7 })), a: clamp((tm - 2.55) / .12, 0, 1) } : kf(tm, [[2.55, { y: 30, a: 0 }], [2.9, { y: 0, a: 1 }]], EASE.back);
      if (a.a > 0) {
        const fS = `700 ${(vert ? 40 : 44) * u}px "Chakra Petch"`, e = 8 * u, st = o.sub.toUpperCase(), sw = ancho(ctx, st, fS, e) + 60 * u, sh = 70 * u;
        const sy = cyT + fs * .62 + 30 * u + a.y * u;
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
        pegatina(ctx, W / 2 - sw / 2, sy, sw, sh, sh / 2, { fill: P.c, p: P.p, o: P.o, ring: 7 * u, out: 6 * u, drop: 9 * u, suave: false, trazo: clamp((tm - 2.6) / .5, 0, 1) });
        fuente(ctx, fS, e); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.a; ctx.fillText(st, W / 2 + e / 2, sy + sh / 2 + 2 * u); ctx.restore();
      }
    }
    // destellos alrededor del nombre
    [[-.52, -.95, '#F4C542', 0], [.5, -1.0, '#ffffff', .08], [.56, .55, P.a, .14], [-.5, .6, '#ffffff', .2]].forEach(([fx, fy, col, dl]) => {
      const k = kf(tm - dl, [[2.5, { s: 0, r: 0, a: 0 }], [2.75, { s: 1.3, r: 60, a: 1 }], [3.4, { s: .85, r: 140, a: .95 }], [FIN - .9, { s: .8, r: 220, a: .9 }], [FIN - .6, { s: 0, r: 240, a: 0 }]]);
      destello(ctx, W / 2 + fx * tot, cyT + fy * fs * .55, 80 * uu, col, k.s, k.r, k.a);
    });
    // mar de delante (tapa el nombre cuando sube)
    const marDelante = caminoMar(W, H, nivel, A, 0, t);
    ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, nivel, A, 0, t));
    ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, nivel, A, 0, t));
    const gm = ctx.createLinearGradient(0, Math.max(0, nivel), 0, H); gm.addColorStop(0, P.a2); gm.addColorStop(1, P.c);
    ctx.fillStyle = gm; ctx.fill(marDelante);
    ctx.save(); ctx.clip(marDelante); burbujasEn(ctx, W, H, t, u, 17, 30, 1 + surge * 2); ctx.restore();
    // gotas al bajar la ola
    const tg = tm - 1.78;
    if (tg > 0 && tg < 1.1) {
      const r = azar(29), gr = 2400 * u;
      for (let i = 0; i < 34; i++) {
        const x0 = r() * W, y0 = H * (.35 + r() * .35), vx = (r() * 2 - 1) * 380 * u, vy = -(500 + r() * 700) * u, rr0 = (8 + r() * 16) * u;
        const gx = x0 + vx * tg, gy = y0 + vy * tg + gr * tg * tg / 2, a = tg < .8 ? 1 : 1 - (tg - .8) / .3;
        if (gy > H + 40) continue;
        if (AC && AC.k.impacto) { // gotas con smear: se estiran en la dirección en la que vuelan, o dejan copias detrás
          const gota = (x, y, al, sm) => { ctx.save(); ctx.globalAlpha *= a * al; if (sm) K.deformar(ctx, x, y, sm.largo, sm.ancho, sm.giro);
            ctx.beginPath(); ctx.arc(x, y, rr0, 0, Math.PI * 2); ctx.lineWidth = 5 * u; ctx.strokeStyle = P.o; ctx.stroke(); ctx.fillStyle = i % 3 ? P.a : P.p; ctx.fill(); ctx.restore(); };
          if (AC.k.smear === 'estirado') gota(gx, gy, 1, K.smear(vx, vy + gr * tg, { umbral: 300 * u, fuerza: .0012 / u, max: 1.4 }));
          else { for (let c = 2; c >= 1; c--) { const tc = Math.max(0, tg - c * .035); gota(x0 + vx * tc, y0 + vy * tc + gr * tc * tc / 2, .22 * (3 - c), null); } gota(gx, gy, 1, null); }
          continue;
        }
        ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.arc(gx, gy, rr0, 0, Math.PI * 2); ctx.lineWidth = 5 * u; ctx.strokeStyle = P.o; ctx.stroke();
        ctx.fillStyle = i % 3 ? P.a : P.p; ctx.fill(); ctx.restore();
      }
    }
  }
};
conAcabado(intro);
