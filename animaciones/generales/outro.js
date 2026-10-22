// Kyo Estudio · Plantilla: Outro / pantalla final de YouTube
import * as K from '../kit-dibujado.js';
import { rad, lerp, clamp, EASE, kf, rr, ancho, paleta, azar, COLORES } from '../base/utilidades.js';
import { AC, popResorte, golpeEn } from '../base/acabado.js';
import { ALETA, CAMPANA, PLAY, icono } from '../base/iconos.js';
import { pegatina, letrasSaltan, chipTexto } from '../base/piezas.js';
import { sonidoConOlas, MUSICA_CAMPOS } from '../base/sonido.js';
import { nivelMar, caminoMar, lineaMar, burbujasEn, fondoNoche, dosMares } from '../base/mar-y-cielo.js';

// 11 · Outro / pantalla final de YouTube (pantalla completa, MP4)
export const outro = {
  id: 'outro',
  fotoMomento: 85, // % de la duración para la imagen PNG por defecto
  // con "Transición desde tu clip" empieza transparente → .mov; si no, MP4
  opaco: o => o.entrada === 'tapada',
  formatos: ['horizontal'],
  nombre: 'Outro de YouTube (pantalla final)',
  desc: 'Con música. Empieza sobre tu clip: sube una ola que lo tapa todo (transición incluida, .mov), el mar baja y aparecen los huecos para la pantalla final de YouTube: vídeos y suscribirse.',
  fps: 30,
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Gracias por ver!', max: 24 },
    { k: 'huecos', label: 'Huecos', tipo: 'chips', def: 'uno', opciones: [['uno', '1 vídeo + suscribirse'], ['dos', '2 vídeos + suscribirse']] },
    { k: 'e1', label: 'Etiqueta del vídeo 1', tipo: 'texto', def: '¡Mira este!', max: 24 },
    { k: 'e2', label: 'Etiqueta del vídeo 2', tipo: 'texto', def: 'O este otro', max: 24, si: 'huecos=dos' },
    { k: 'es', label: 'Etiqueta de suscribirse', tipo: 'texto', def: '¡Suscríbete!', max: 22 },
    { k: 'aleta', label: 'Aleta de tiburón', tipo: 'chips', def: 'si', opciones: [['si', '🦈 Sí'], ['no', 'No']] },
    { k: 'luna', label: 'Luna y estrellas', tipo: 'chips', def: 'si', opciones: [['si', '🌙 Sí'], ['no', 'No']] },
    { k: 'entrada', label: 'Entrada', tipo: 'chips', def: 'transicion', opciones: [['transicion', '🌊 Transición desde tu clip (transparente, .mov)'], ['tapada', 'Empieza ya tapada (MP4)']] },
    ...COLORES,
    ...MUSICA_CAMPOS('chill'),
    { k: 'dur', label: 'Duración (segundos · YouTube admite de 5 a 20)', tipo: 'numero', def: 12, min: 5, max: 20, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 12, 5, 20),
  sonido(o) { const T0 = o.entrada === 'tapada' ? 0 : .8, olas = [[T0 + .1, .75, 0, 0]]; if (T0) olas.unshift([0, .8, 0, 0]); return sonidoConOlas(o, this.duracion(o), olas, 'chill'); },
  // Huecos en coordenadas de 1920×1080 (para colocar los elementos en YouTube Studio)
  _huecos(o) {
    return o.huecos === 'dos'
      ? { videos: [[120, 300, 780, 439], [1020, 300, 780, 439]], sub: [960, 860, 190] }
      : { videos: [[150, 300, 900, 506]], sub: [1480, 553, 300] };
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), L = this.duracion(o), u = Math.min(W, H) / 1080, k = W / 1920;
    // entrada con transición: sobre tu clip (transparente) sube la ola hasta taparlo todo
    const T0 = o.entrada === 'tapada' ? 0 : .8;
    if (t < T0) { dosMares(ctx, P, W, H, t, u, kf(t, [[0, { y: H + 110 * u }], [.76, { y: -H * .12 }]], EASE.io).y); return; }
    t -= T0;
    const tm = t; // la entrada dura ~2 s y después se queda quieta hasta el final
    const Y0 = H * .9;
    fondoNoche(ctx, P, W, H, t, u, Y0, o.luna !== 'no', false);
    // el mar empieza arriba (tapando todo, como acaba la intro) y baja
    const arriba = -H * .12, nivel = kf(tm, [[0, { y: arriba }], [.15, { y: arriba }], [.85, { y: Y0 }]], EASE.io).y;
    const surge = clamp((Y0 - nivel) / (Y0 - arriba), 0, 1), A = (18 + 26 * surge) * u, nivelAtras = nivel - 40 * u;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, nivelAtras, A, 1.3, t));
    ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, nivelAtras, A, 1.3, t));
    ctx.fillStyle = P.a; ctx.fill(caminoMar(W, H, nivelAtras, A, 1.3, t));
    // aleta que pasa cada 7 s por el horizonte
    if (o.aleta !== 'no' && t > 1) {
      const ciclo = ((t - 1) % 7) / 7, kk = 2.2 * u, fx = lerp(W + 60 * kk, -180 * kk, ciclo);
      const baseY = nivelMar(fx + 60 * kk, nivel, A, W, 0, t) + 18 * u;
      ctx.save(); ctx.translate(fx + 116 * kk, baseY - 78 * kk); ctx.scale(-kk, kk); ctx.rotate(rad(Math.sin(t * 6) * 3));
      ctx.lineWidth = 14 / kk * u; ctx.strokeStyle = P.o; ctx.stroke(ALETA); ctx.lineWidth = 8 / kk * u; ctx.strokeStyle = P.p; ctx.stroke(ALETA); ctx.fillStyle = P.s; ctx.fill(ALETA);
      ctx.restore();
    }
    const gm = ctx.createLinearGradient(0, Math.max(0, nivel), 0, H); gm.addColorStop(0, P.a2); gm.addColorStop(1, P.c);
    const marD = caminoMar(W, H, nivel, A, 0, t);
    ctx.lineWidth = 30 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, nivel, A, 0, t));
    ctx.lineWidth = 16 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, nivel, A, 0, t));
    ctx.fillStyle = gm; ctx.fill(marD);
    ctx.save(); ctx.clip(marD); burbujasEn(ctx, W, H, t, u, 17, 30, 1 + surge * 2); ctx.restore();
    // gotas al bajar el agua
    const tg = tm - .45;
    if (tg > 0 && tg < 1.1) { const r = azar(31), gr = 2400 * u;
      for (let i = 0; i < 30; i++) { const x0 = r() * W, y0 = H * (.4 + r() * .4), vx = (r() * 2 - 1) * 380 * u, vy = -(500 + r() * 650) * u, rr0 = (8 + r() * 14) * u;
        const gx = x0 + vx * tg, gy = y0 + vy * tg + gr * tg * tg / 2, a = tg < .8 ? 1 : 1 - (tg - .8) / .3; if (gy > H + 40) continue;
        ctx.save(); ctx.globalAlpha *= a; if (AC && AC.k.impacto && AC.k.smear === 'estirado') { const sm = K.smear(vx, vy + gr * tg, { umbral: 300 * u, fuerza: .0012 / u, max: 1.4 }); K.deformar(ctx, gx, gy, sm.largo, sm.ancho, sm.giro); }
        ctx.beginPath(); ctx.arc(gx, gy, rr0, 0, Math.PI * 2); ctx.lineWidth = 5 * u; ctx.strokeStyle = P.o; ctx.stroke(); ctx.fillStyle = i % 3 ? P.a : P.p; ctx.fill(); ctx.restore(); } }
    // título
    if (o.titulo) letrasSaltan(ctx, o.titulo, W / 2, 150 * k, 120 * k, P, tm, .7, .05, t, W - 700 * k);
    // huecos
    const hz = this._huecos(o);
    hz.videos.forEach(([x, y, w, h], i) => {
      x *= k; y *= k; w *= k; h *= k;
      const ti = 1.05 + i * .15, a = AC && AC.k.muelle ? popResorte(tm, ti, { s0: .4, r0: -6 }) : kf(tm, [[1.05 + i * .15, { s: .4, a: 0, r: -6 }], [1.4 + i * .15, { s: 1.05, a: 1, r: 1.5 }], [1.6 + i * .15, { s: 1, a: 1, r: 0 }]], EASE.back);
      if (a.a <= .01) return;
      const cx = x + w / 2, cy = y + h / 2;
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, cy); ctx.rotate(rad(a.r + (i ? 1 : -1))); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1)); ctx.translate(-cx, -cy);
      pegatina(ctx, x, y, w, h, 28 * u, { fill: P.o, p: P.p, o: P.o, ring: 9 * u, out: 7 * u, drop: 14 * u, trazo: clamp((tm - ti) / .5, 0, 1) });
      rr(ctx, x + 18 * u, y + 18 * u, w - 36 * u, h - 36 * u, 16 * u); ctx.setLineDash([16 * u, 12 * u]); ctx.lineDashOffset = -t * 30 * u; ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); ctx.setLineDash([]);
      icono(ctx, PLAY, cx - 40 * u, cy - 40 * u, 80 * u, 'rgba(255,255,255,.18)');
      const et = i ? o.e2 : o.e1;
      if (et) { const b = Math.sin(t * 3 + i) * 4 * u; ctx.save(); ctx.translate(x + 40 * u, y - 4 * u + b); ctx.rotate(rad(-4)); chipTexto(ctx, et, ancho(ctx, et, `700 ${30 * u}px "Fredoka"`) / 2 + 28 * u, 0, u, P); ctx.restore(); }
      ctx.restore();
    });
    { let [cx, cy, d] = hz.sub; cx *= k; cy *= k; d *= k; const R = d / 2;
      const a = AC && AC.k.muelle ? popResorte(tm, 1.45, { s0: .3 }) : kf(tm, [[1.45, { s: .3, a: 0 }], [1.8, { s: 1.12, a: 1 }], [1.95, { s: 1, a: 1 }]], EASE.back);
      if (AC) golpeEn(ctx, cx, cy, R * 1.5, R * 1.5, tm, 1.57, P.a, { grosor: 18 * u, n: 16 });
      if (a.a > .01) {
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, cy); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1)); ctx.translate(-cx, -cy);
        const pul = (t % 1.6) / 1.6; ctx.save(); ctx.globalAlpha *= (1 - pul) * .7; ctx.beginPath(); ctx.arc(cx, cy, R + 14 * u + pul * 50 * u, 0, Math.PI * 2); ctx.lineWidth = 6 * u; ctx.strokeStyle = P.a; ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(cx, cy + 14 * u, R + 16 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, R + 16 * u, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, R + 9 * u, 0, Math.PI * 2); ctx.fillStyle = P.p; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, R - 14 * u, 0, Math.PI * 2); ctx.setLineDash([12 * u, 10 * u]); ctx.lineDashOffset = t * 30 * u; ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); ctx.setLineDash([]);
        icono(ctx, CAMPANA, cx - R * .3, cy - R * .32, R * .6, 'rgba(255,255,255,.18)');
        if (o.es) { const b = Math.sin(t * 3 + 2) * 4 * u, dos = o.huecos === 'dos'; ctx.save(); ctx.translate(dos ? cx + R + 30 * u + ancho(ctx, o.es, `700 ${30 * u}px "Fredoka"`) / 2 + 28 * u : cx, dos ? cy + b : cy + R + 56 * u + b); ctx.rotate(rad(dos ? -3 : 3)); chipTexto(ctx, o.es, 0, 0, u, P, '#F4C542'); ctx.restore(); }
        ctx.restore();
      }
    }
  }
};
