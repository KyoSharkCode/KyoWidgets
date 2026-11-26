// Kyo Estudio · Plantilla: ¡Suscríbete! en barra 2027 (estilo Coral Stream)
// Una sola fila delgada: avatar, título, la línea del canal en HUD, "Suscribirme" (coral) y la campanita.
// El cursor de píxel pulsa el botón y luego la campanita, que suena con ondas de sonar; el aviso se escribe
// en HUD en lugar de la línea del canal. La aleta nada por el borde de ola. Con transparencia (.mov / .webm).
import { clamp, tiempo, colocar, COMUNES, IMG_OPC } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { campanita } from './coral-2027.js';
import { C, pr, E, BOMB, HUD, lerp, conOla, pega, hud, texto, ancho, icono, cursor, boton, botonAncho, aletaEnOla, avatar2027, vida, pop, aparece, clic } from './tarjetas-2027.js';

const FIN = 6.5, P1 = 1.9, P2 = 2.8; // animación base de 6,5 s: pulsa el botón en P1 y la campanita en P2

export const suscribeteBarra2027 = {
  id: 'suscribete-barra-2027',
  nombre: '¡Suscríbete! en barra 2027',
  desc: 'Una sola fila delgada con avatar, título, "Suscribirme" y la campanita: el cursor de píxel pulsa los dos, la campanita suena con ondas de sonar y el aviso se escribe en letra HUD. La aleta nada por el borde de ola.',
  fps: 30,
  campos: [
    { k: 'canal', label: 'Nombre del canal (vacío para quitarlo)', tipo: 'texto', def: 'KyoSumiVT · nuevos vídeos cada semana', max: 40 },
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Suscríbete!', max: 22 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Suscribirme', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Suscrita!', max: 14 },
    { k: 'aviso', label: 'Aviso al pulsar la campanita (sustituye a la línea del canal)', tipo: 'texto', def: '¡Campanita activada!', max: 30 },
    Object.assign({}, IMG_OPC, { label: 'Tu imagen (opcional: si no hay, va el isotipo)' }),
    ...COMUNES.slice(5),
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5, si: 'efectos=si' },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 6.5, min: 5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 6.5, 5, 20),
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, .6, .3 * v, -.2, .2, 5);                     // sube del agua
      blup(ac, out, .25, 330, .2 * v, -.5);                           // avatar
      blup(ac, out, .4, 480, .2 * v, -.2);                            // título
      blup(ac, out, .65, 400, .18 * v, .3);                           // botón
      blup(ac, out, .8, 520, .16 * v, .5);                            // campanita
      clic(ac, out, P1, .3 * v);                                      // pulsa el botón
      clic(ac, out, P2, .3 * v); campanita(ac, out, P2 + .04, .12 * v); campanita(ac, out, P2 + .3, .07 * v); // la campanita suena
      whoosh(ac, out, L - .7, .7, .28 * v, .2, -.2, 9);               // se hunde
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const L = this.duracion(o), tm = tiempo(t, L, 4.2, FIN - .7, FIN, .7);
    let u = (fmt === 'vertical' ? 1.1 : 1) * (Number(o.tam) || 1);
    const canal = (o.canal || '').toUpperCase(), aviso = (o.aviso || '').toUpperCase(), titulo = o.titulo || '';
    const medir = u => {
      const f = { tit: `400 ${40 * u}px ${BOMB}`, linea: `700 ${15 * u}px ${HUD}` }, esp = 2.5 * u, R = 34 * u, pad = 24 * u, bh = 58 * u, bell = 28 * u;
      const colW = Math.max(ancho(ctx, titulo, f.tit), canal ? ancho(ctx, canal, f.linea, esp) : 0, aviso ? ancho(ctx, aviso, f.linea, esp) + 34 * u : 0);
      const bw = botonAncho(ctx, bh, o.boton || '', o.hecho || '', 220 * u);
      const w = pad + 2 * R + 22 * u + colW + 40 * u + bw + 26 * u + 2 * bell + pad + 8 * u, h = 112 * u;
      return { f, esp, R, pad, bh, bell, bw, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, esp, R, pad, bh, bell, bw, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u), x = pos.x, y = pos.y;
    const v = vida(tm, FIN);
    if (v.a <= 0) return;
    const amp = 5 * u, ay = y + (h - 6 * u) / 2, dy = v.y * u;
    ctx.save(); ctx.globalAlpha = v.a; ctx.translate(0, dy);
    pega(ctx, conOla(x, y, w, h, 30 * u, t, amp), { ring: 6 * u, out: 5 * u, drop: 10 * u });
    hud(ctx, x, y, w, h - 6 * u, 24 * u, 4 * u, 11 * u);
    aletaEnOla(ctx, x, y, w, h, t, 110 * u, 26 * u, amp);
    const ax = x + pad + R + 4 * u;
    aparece(ctx, pop(tm, .2), ax, ay, () => avatar2027(ctx, ax, ay, R, o.imagen));
    const tx = x + pad + 2 * R + 26 * u;
    { const k = E.back(pr(tm, .3, .7)); if (k > 0) { ctx.save(); ctx.globalAlpha *= clamp(k, 0, 1); texto(ctx, titulo, tx - (1 - k) * 24 * u, ay - (canal || aviso ? 12 * u : 0), f.tit, { trazo: 8 * u }); ctx.restore(); } }
    // línea de abajo: el canal; al pulsar la campanita se escribe el aviso
    const ly = ay + 26 * u;
    if (aviso && tm > P2 + .15) {
      const k = pr(tm, P2 + .2, P2 + .85), n = Math.round(aviso.length * k), parte = aviso.slice(0, n);
      ctx.save(); ctx.fillStyle = C.bioluz; ctx.beginPath(); ctx.arc(tx + 6 * u, ly, 5 * u, 0, 7); ctx.fill();
      texto(ctx, parte, tx + 20 * u, ly + u, f.linea, { esp, col: C.bioluz });
      if (k < 1 || Math.sin(tm * 10) > 0) { const cw = ancho(ctx, parte, f.linea, esp); ctx.fillRect(tx + 22 * u + cw, ly - 8 * u, 8 * u, 16 * u); }
      ctx.restore();
    } else if (canal) { const k = pr(tm, .45, .75) * (aviso ? 1 - pr(tm, P2, P2 + .15) : 1); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; texto(ctx, canal, tx + 2 * u, ly + u, f.linea, { esp, col: C.bioluz }); ctx.restore(); } }
    // botón y campanita
    const cx = x + w - pad - 8 * u - bell, bx = cx - bell - 26 * u - bw / 2;
    const pr1 = Math.sin(Math.PI * pr(tm, P1 - .1, P1 + .12)), pr2 = Math.sin(Math.PI * pr(tm, P2 - .1, P2 + .12));
    aparece(ctx, pop(tm, .6), bx, ay, () => boton(ctx, bx, ay, bh, o.boton || '', o.hecho || '', tm > P1, { w: bw, sq: 1 - .1 * pr1, icono: 'play' }));
    const suena = tm > P2;
    aparece(ctx, pop(tm, .75), cx, ay, () => {
      ctx.save(); ctx.translate(cx, ay); ctx.scale(1 - .12 * pr2, 1 - .12 * pr2);
      const p = new Path2D(); p.arc(0, 0, bell, 0, 7);
      pega(ctx, p, { ring: 5 * u, out: 4 * u, drop: 6 * u, fill: suena ? C.perla : C.indigo, borde: suena ? C.bioluz : C.perla });
      const d = tm - P2; ctx.rotate(suena ? Math.sin(d * 28) * .45 * Math.exp(-d * 2.2) : 0);
      icono(ctx, 'campana', -bell / 2, -bell * .54, bell, suena ? C.abisal : C.perla, 2.6); ctx.restore();
    });
    if (suena) {
      const d = tm - P2; ctx.save(); ctx.strokeStyle = C.bioluz; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const dd = d - k * .22; if (dd < 0 || dd > 1) continue; ctx.globalAlpha = (1 - dd) * v.a; ctx.lineWidth = 4 * u; const Rr = bell + 8 * u + dd * 50 * u; ctx.beginPath(); ctx.arc(cx, ay, Rr, -.7, .7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, ay, Rr, Math.PI - .7, Math.PI + .7); ctx.stroke(); }
      ctx.restore();
    }
    ctx.restore();
    // cursor: entra, pulsa el botón, pasa a la campanita, la pulsa y se va
    const cIn = E.io(pr(tm, 1.25, 1.8)), mv = E.io(pr(tm, 2.2, 2.7)), cOut = E.in(pr(tm, 3.2, 3.7));
    if (cIn > 0 && cOut < 1) {
      const x1 = lerp(W + 40, bx + 10 * u, cIn), y1 = lerp(H + 40, ay + dy + 6 * u, cIn);
      cursor(ctx, lerp(x1, cx + 6 * u, mv) + cOut * 200 * u, lerp(y1, ay + dy + 6 * u, mv) + cOut * 120 * u, 3.4 * u, Math.max(pr1, pr2));
    }
  }
};
