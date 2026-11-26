// Kyo Estudio · Plantilla: Barra del código 2027 (estilo Coral Stream)
// Un campo HUD donde el código se escribe letra a letra con cursor de bloque; el cursor de píxel pulsa el botón
// (coral), cambia a "¡Guardado!", salen burbujas y destellos y aparece el mensaje final.
// La aleta nada por el borde de ola. Con transparencia (.mov / .webm).
import { clamp, tiempo, colocar, COMUNES } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { campanita } from './coral-2027.js';
import { C, pr, E, FRE, HUD, lerp, caja, conOla, pega, hud, texto, ancho, etiqueta, etiquetaAncho, icono, cursor, boton, botonAncho, estallido, destello, aletaEnOla, vida, pop, aparece, clic } from './tarjetas-2027.js';

const FIN = 7, PULSA = 2.35, ESCRIBE = .85; // animación base de 7 s
// tiempo por letra: el código siempre termina de escribirse antes de que llegue el cursor
const porLetra = n => Math.min(.12, 1.1 / Math.max(1, n));

export const barraCodigo2027 = {
  id: 'barra-codigo-2027',
  nombre: 'Barra del código 2027',
  desc: 'Un campo HUD donde el código se escribe letra a letra; el cursor de píxel pulsa el botón, cambia a "¡Guardado!", salen burbujas y destellos y aparece tu mensaje. La aleta nada por el borde de ola.',
  fps: 30,
  campos: [
    { k: 'etiqueta', label: 'Título de la barra', tipo: 'texto', def: 'Código de creadora', max: 32 },
    { k: 'chip', label: 'Etiqueta de la derecha (vacío para quitarla)', tipo: 'texto', def: 'Tienda de Fortnite', max: 28 },
    { k: 'ph', label: 'Texto de ejemplo en la barra', tipo: 'texto', def: 'Escribe el código…', max: 30 },
    { k: 'codigo', label: 'Lo que se escribe', tipo: 'texto', def: 'KYOSUMI', max: 16 },
    { k: 'boton', label: 'Botón', tipo: 'texto', def: 'Guardar', max: 14 },
    { k: 'hecho', label: 'Botón al pulsar', tipo: 'texto', def: '¡Guardado!', max: 14 },
    { k: 'gracias', label: 'Mensaje final (vacío para quitarlo)', tipo: 'texto', def: '¡Gracias por apoyarme!', max: 44 },
    ...COMUNES.slice(5),
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5, si: 'efectos=si' },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 5, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 5, 20),
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100, cod = String(o.codigo || ''), pl = porLetra(cod.length);
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, .6, .3 * v, -.2, .2, 6);                     // sube del agua
      blup(ac, out, .3, 560, .14 * v, -.4);                           // título
      blup(ac, out, .45, 360, .18 * v, -.1);                          // campo
      blup(ac, out, .65, 420, .18 * v, .4);                           // botón
      for (let i = 0; i < cod.length; i++) clic(ac, out, ESCRIBE + i * pl, .12 * v); // tecleo
      clic(ac, out, PULSA, .3 * v);                                   // pulsa
      for (let i = 0; i < 5; i++) blup(ac, out, PULSA + .05 + i * .07, 560 + i * 70, .13 * v, .4 - i * .1); // burbujas
      campanita(ac, out, PULSA + .1, .1 * v);                         // destellos
      if (o.gracias) blup(ac, out, 2.65, 500, .16 * v, 0);            // mensaje
      whoosh(ac, out, L - .7, .7, .28 * v, .2, -.2, 10);              // se hunde
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const L = this.duracion(o), tm = tiempo(t, L, 3.4, FIN - .7, FIN, .7);
    let u = (fmt === 'vertical' ? 1.12 : 1) * (Number(o.tam) || 1);
    const cod = String(o.codigo || ''), et = (o.etiqueta || '').toUpperCase(), chip = (o.chip || '').toUpperCase(), gracias = o.gracias || '', pl = porLetra(cod.length);
    const medir = u => {
      const f = { cod: `700 ${46 * u}px ${HUD}`, ph: `600 ${26 * u}px ${FRE}`, chip: `700 ${16 * u}px ${HUD}`, thx: `600 ${26 * u}px ${FRE}` }, esp = 10 * u, pad = 40 * u, bh = 70 * u, fh = 72 * u;
      const fw = Math.max(380 * u, ancho(ctx, cod, f.cod, esp) + 90 * u, o.ph ? ancho(ctx, o.ph, f.ph) + 94 * u : 0), bw = botonAncho(ctx, bh, o.boton || '', o.hecho || '', 200 * u);
      const cab = (et ? etiquetaAncho(ctx, et, { tam: 16 * u }) : 0) + (chip ? ancho(ctx, chip, f.chip, 2.5 * u) + 70 * u : 0);
      const w = Math.max(pad + fw + 30 * u + bw + pad, pad + cab + pad, gracias ? pad + ancho(ctx, gracias, f.thx) + 50 * u + pad : 0);
      const h = 70 * u + fh + (gracias ? 88 * u : 30 * u);
      return { f, esp, pad, bh, fh, fw, bw, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, esp, pad, bh, fh, bw, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 30 * u), x = pos.x, y = pos.y;
    const v = vida(tm, FIN);
    if (v.a <= 0) return;
    const amp = 6 * u, dy = v.y * u;
    ctx.save(); ctx.globalAlpha = v.a; ctx.translate(0, dy);
    pega(ctx, conOla(x, y, w, h, 30 * u, t, amp), { ring: 7 * u, out: 6 * u, drop: 12 * u });
    hud(ctx, x, y, w, h - 6 * u, 28 * u, 5 * u, 14 * u);
    aletaEnOla(ctx, x, y, w, h, t, 100 * u, 32 * u, amp);
    // cabecera: título en etiqueta y, a la derecha, la tienda
    if (et) { const k = pr(tm, .25, .5); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; etiqueta(ctx, et, x + pad, y + 42 * u, { tam: 16 * u }); ctx.restore(); } }
    if (chip) { const k = pr(tm, .35, .6); if (k > 0) { ctx.save(); ctx.globalAlpha *= k; const cw = ancho(ctx, chip, f.chip, 2.5 * u);
      icono(ctx, 'bolsa', x + w - pad - cw - 30 * u, y + 31 * u, 22 * u, C.espuma, 2.2); texto(ctx, chip, x + w - pad, y + 43 * u, f.chip, { esp: 2.5 * u, col: C.espuma, al: 'right' }); ctx.restore(); } }
    // campo donde se escribe el código
    const fx = x + pad, fy = y + 70 * u, fw = w - 2 * pad - 30 * u - bw;
    { const k = pr(tm, .4, .65); if (k > 0) {
      ctx.save(); ctx.globalAlpha *= k;
      ctx.fillStyle = C.abisal; ctx.fill(caja(fx, fy, fw, fh, 16 * u)); ctx.strokeStyle = 'rgba(111,227,240,.55)'; ctx.lineWidth = 3 * u; ctx.stroke(caja(fx, fy, fw, fh, 16 * u));
      const n = clamp(Math.floor((tm - ESCRIBE) / pl) + 1, 0, cod.length), parte = cod.slice(0, tm < ESCRIBE ? 0 : n);
      if (!parte && o.ph) texto(ctx, o.ph, fx + 60 * u, fy + fh / 2 + 2 * u, f.ph, { col: '#7d88b8' }); // detrás del cursor de bloque
      if (parte) texto(ctx, parte, fx + 26 * u, fy + fh / 2 + 2 * u, f.cod, { esp, col: C.perla });
      const cw = parte ? ancho(ctx, parte, f.cod, esp) : 0;
      if (tm < PULSA && tm > ESCRIBE - .3 && (n < cod.length || Math.sin(tm * 12) > 0)) { ctx.fillStyle = C.bioluz; ctx.fillRect(fx + 26 * u + cw + (parte ? 4 * u : 0), fy + 16 * u, 22 * u, fh - 32 * u); }
      ctx.restore(); } }
    // botón
    const bx = x + w - pad - bw / 2, by = fy + fh / 2, press = Math.sin(Math.PI * pr(tm, PULSA - .1, PULSA + .12));
    aparece(ctx, pop(tm, .6), bx, by, () => boton(ctx, bx, by, bh, o.boton || '', o.hecho || '', tm > PULSA, { w: bw, sq: 1 - .1 * press, icono: 'check' }));
    estallido(ctx, bx, by, tm, PULSA, 12, 140 * u, 3, u);
    [[-110, -50, 26, C.perla], [100, -56, 20, C.bioluz], [130, 30, 16, C.perla]].forEach(([ddx, ddy, s, col], i) =>
      destello(ctx, bx + ddx * u, by + ddy * u, s * u, col, clamp(Math.sin(Math.PI * pr(tm, PULSA + i * .08, PULSA + .9 + i * .08)), 0, 1), tm * 2));
    // mensaje final
    if (gracias) { const k = E.back(pr(tm, 2.6, 3.0)); if (k > 0) { const gy = fy + fh + 36 * u;
      ctx.save(); ctx.globalAlpha *= clamp(k, 0, 1); ctx.translate(0, (1 - k) * 14 * u);
      icono(ctx, 'corazon', fx + 2 * u, gy - 13 * u, 26 * u, C.coralP); texto(ctx, gracias, fx + 38 * u, gy + u, f.thx, { col: C.espuma }); ctx.restore(); } }
    ctx.restore();
    // cursor: entra cuando el código está escrito, pulsa y se va
    const cIn = E.io(pr(tm, 1.75, 2.25)), cOut = E.in(pr(tm, 2.8, 3.3));
    if (cIn > 0 && cOut < 1) cursor(ctx, lerp(W + 40, bx + 12 * u, cIn) + cOut * 200 * u, lerp(H + 40, by + dy + 8 * u, cIn) + cOut * 120 * u, 4 * u, press);
  }
};
