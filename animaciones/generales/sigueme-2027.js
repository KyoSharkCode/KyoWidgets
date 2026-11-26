// Kyo Estudio · Plantilla: ¡Sígueme! 2027 (estilo Coral Stream)
// La tarjeta sube del agua con tu @ y la red en etiqueta HUD; el cursor de píxel pulsa "Seguir" (coral),
// cambia a "¡Siguiendo!" y salen burbujas y corazones. La aleta nada por el borde de ola de la tarjeta.
// Con transparencia (.mov / .webm), en horizontal (tarjeta en fila) o vertical (tarjeta en columna).
import { clamp, tiempo, colocar, COMUNES, IMG_OPC } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { C, pr, E, BOMB, FRE, lerp, rad, conOla, pega, hud, texto, ancho, etiqueta, etiquetaAncho, icono, cursor, boton, botonAncho, estallido, aletaEnOla, avatar2027, vida, pop, aparece, clic } from './tarjetas-2027.js';

const FIN = 6, PULSA = 2.15; // tiempos de la animación base (6 s); la parte central se estira con la duración

export const sigueme2027 = {
  id: 'sigueme-2027',
  nombre: '¡Sígueme! 2027',
  desc: 'Sube del agua con tu @ y la red en etiqueta HUD. El cursor de píxel pulsa "Seguir", cambia a "¡Siguiendo!" y salen burbujas y corazones, con la aleta nadando por el borde de ola.',
  fps: 30,
  campos: [
    { k: 'red', label: 'Red social (vacío para quitar la etiqueta)', tipo: 'texto', def: 'TikTok', max: 20 },
    { k: 'usuario', label: 'Usuario', tipo: 'texto', def: '@KyoSumiVT', max: 24 },
    { k: 'frase', label: 'Frase (opcional)', tipo: 'texto', def: '¡Sígueme para más contenido!', max: 40 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Seguir', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Siguiendo!', max: 14 },
    Object.assign({}, IMG_OPC, { label: 'Tu imagen (opcional: si no hay, va el isotipo)' }),
    ...COMUNES.slice(5),
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5, si: 'efectos=si' },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6, min: 4.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6, 4.2, 20),
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, .6, .35 * v, -.2, .2, 4);                    // sube del agua
      blup(ac, out, .3, 330, .22 * v, -.4);                           // avatar
      if (o.red) blup(ac, out, .4, 620, .14 * v, -.1);                // etiqueta
      blup(ac, out, .55, 480, .2 * v, 0);                             // usuario
      blup(ac, out, .85, 400, .2 * v, .4);                            // botón
      clic(ac, out, PULSA, .3 * v);                                   // el cursor pulsa
      for (let i = 0; i < 6; i++) blup(ac, out, PULSA + .05 + i * .07, 560 + i * 70, .14 * v, .4 - i * .1); // burbujas
      whoosh(ac, out, L - .7, .7, .3 * v, .2, -.2, 8);                // se hunde
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const L = this.duracion(o), tm = tiempo(t, L, 3.3, FIN - .7, FIN, .7), vert = fmt === 'vertical';
    let u = (vert ? 1.25 : 1) * (Number(o.tam) || 1);
    const red = o.red ? ('EN ' + o.red).toUpperCase() : '', usuario = o.usuario || '', frase = o.frase || '';
    const medir = u => {
      const f = { user: `400 ${58 * u}px ${BOMB}`, frase: `600 ${26 * u}px ${FRE}` }, R = 66 * u, pad = 44 * u, bh = 74 * u;
      const chipW = red ? etiquetaAncho(ctx, red, { tam: 18 * u }) : 0, userW = ancho(ctx, usuario, f.user), fraseW = frase ? ancho(ctx, frase, f.frase) : 0;
      const colW = Math.max(chipW, userW, fraseW), colH = (red ? 46 * u : 0) + 62 * u + (frase ? 46 * u : 0), bw = botonAncho(ctx, bh, o.boton || '', o.hecho || '', 210 * u);
      let w, h;
      if (vert) { w = Math.max(560 * u, colW + 2 * pad, bw + 2 * pad); h = pad + 2 * R + 28 * u + colH + 30 * u + bh + pad + 10 * u; }
      else { w = pad + 2 * R + 30 * u + colW + 44 * u + bw + pad; h = Math.max(2 * R + 80 * u, colH + 76 * u); }
      return { f, R, pad, bh, bw, colW, colH, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, R, pad, bh, bw, colH, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u), x = pos.x, y = pos.y, cxT = x + w / 2, cyT = y + h / 2;
    const v = vida(tm, FIN);
    if (v.a <= 0) return;
    ctx.save(); ctx.globalAlpha = v.a;
    ctx.translate(cxT, cyT + v.y * u); ctx.rotate(rad(-1.2) + v.giro); ctx.translate(-cxT, -cyT);
    const amp = 7 * u;
    pega(ctx, conOla(x, y, w, h, 34 * u, t, amp), { ring: 7 * u, out: 6 * u, drop: 12 * u });
    hud(ctx, x, y, w, h - 8 * u, 34 * u, 5 * u, 14 * u);
    aletaEnOla(ctx, x, y, w, h, t, 90 * u, 46 * u, amp);
    // avatar (tu imagen o el isotipo)
    const ax = vert ? cxT : x + pad + R, ay = vert ? y + pad + R : y + (h - 8 * u) / 2;
    aparece(ctx, pop(tm, .25), ax, ay, () => avatar2027(ctx, ax, ay, R, o.imagen));
    // textos
    const al = vert ? 'center' : 'left', tx = vert ? cxT : x + pad + 2 * R + 30 * u;
    let ty = vert ? y + pad + 2 * R + 28 * u : y + (h - 8 * u - colH) / 2;
    if (red) { const k = pr(tm, .35, .6); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; etiqueta(ctx, red, tx, ty + 15 * u + (1 - k) * 12 * u, { tam: 18 * u, al }); ctx.restore(); } ty += 46 * u; }
    { const k = E.back(pr(tm, .45, .85)); if (k > 0) { ctx.save(); ctx.globalAlpha *= clamp(k, 0, 1); texto(ctx, usuario, tx - (vert ? 0 : (1 - k) * 30 * u), ty + 31 * u + (vert ? (1 - k) * 20 * u : 0), f.user, { trazo: 10 * u, al }); ctx.restore(); } ty += 62 * u; }
    if (frase) { const k = pr(tm, .6, .9); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; texto(ctx, frase, tx, ty + 23 * u, f.frase, { col: C.espuma, al }); ctx.restore(); } }
    // botón
    const bx = vert ? cxT : x + w - pad - bw / 2, by = vert ? y + h - pad - 10 * u - bh / 2 : ay;
    const press = Math.sin(Math.PI * pr(tm, PULSA - .1, PULSA + .12));
    aparece(ctx, pop(tm, .75), bx, by, () => boton(ctx, bx, by, bh, o.boton || '', o.hecho || '', tm > PULSA, { w: bw, sq: 1 - .1 * press }));
    estallido(ctx, bx, by, tm, PULSA, 14, 150 * u, 7, u);
    [[-70, -60], [40, -80], [90, -40]].forEach(([dx, dy], i) => {
      const d = tm - PULSA - i * .08; if (d <= 0 || d >= 1.1) return;
      ctx.save(); ctx.globalAlpha *= clamp(1.2 - d, 0, 1); icono(ctx, 'corazon', bx + (dx + Math.sin(d * 6 + i) * 6) * u, by + (dy - d * 60) * u, 26 * u, C.coralP); ctx.restore();
    });
    ctx.restore();
    // cursor (fuera del giro de la tarjeta): entra por la esquina, pulsa y se va
    const cIn = E.io(pr(tm, 1.35, 2.0)), cOut = E.in(pr(tm, 2.55, 3.1));
    if (cIn > 0 && cOut < 1) {
      const px = bx + 10 * u, py = by + v.y * u + 6 * u;
      cursor(ctx, lerp(W + 40, px, cIn) + cOut * 200 * u, lerp(H + 40, py, cIn) + cOut * 140 * u, 4 * u, press);
    }
  }
};
