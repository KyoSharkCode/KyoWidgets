// Kyo Estudio · Plantilla: ¡Nueva merch! 2027 (estilo Coral Stream)
// La foto-pegatina del producto cae con rebote llevando la tarjeta escondida detrás (todo junto); al aterrizar,
// la tarjeta sale deslizándose con la etiqueta, el nombre y el comando en HUD, y el precio (coral) se cuelga
// de una cuerdita. La aleta nada por el borde de ola de la tarjeta. Con transparencia (.mov / .webm).
import { clamp, tiempo, colocar, COMUNES, conDef, envolver } from '../base/utilidades.js';
import { renderSonido, whoosh, blup } from '../base/sonido.js';
import { campanita } from './coral-2027.js';
import { C, pr, E, FRE, rad, caja, conOla, pega, hud, texto, ancho, etiqueta, etiquetaAncho, icono, aletaEnOla } from './tarjetas-2027.js';

const FIN = 7, ATERRIZA = .4, SALE = .75, PRECIO = 1.35; // animación base de 7 s

// El nombre en una línea si cabe; si no, en dos líneas lo más parejas posible
function partir(ctx, txt, f, maxW) {
  const pal = String(txt).split(/\s+/).filter(Boolean);
  if (pal.length < 2 || ancho(ctx, pal.join(' '), f) <= maxW) return envolver(ctx, txt, f, maxW, 2);
  let mejor = null;
  for (let i = 1; i < pal.length; i++) {
    const l = [pal.slice(0, i).join(' '), pal.slice(i).join(' ')], m = Math.max(ancho(ctx, l[0], f), ancho(ctx, l[1], f));
    if (!mejor || m < mejor.m) mejor = { l, m };
  }
  return mejor.m <= maxW ? mejor.l : envolver(ctx, txt, f, maxW, 2);
}

export const merch2027 = {
  id: 'merch-2027',
  nombre: '¡Nueva merch! 2027',
  desc: 'La foto del producto cae con rebote llevando la tarjeta escondida detrás; al aterrizar, la tarjeta sale deslizándose con el nombre, el comando y el precio colgando. La aleta nada por el borde de ola.',
  fps: 30,
  campos: [
    { k: 'imagen', label: 'Foto del producto (PNG sin fondo queda genial)', tipo: 'imagen' },
    { k: 'chip', label: 'Etiqueta (vacío para quitarla)', tipo: 'texto', def: 'Nueva merch', max: 26 },
    { k: 'producto', label: 'Nombre del producto', tipo: 'texto', def: 'Sudadera Octubre de Terror', max: 48 },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'Consíguela con', max: 30 },
    { k: 'comando', label: 'Comando o enlace (destacado)', tipo: 'texto', def: '!merch', max: 30 },
    { k: 'precio', label: 'Precio (vacío = no sale)', tipo: 'texto', def: '', max: 14 },
    { k: 'fondo', label: 'Fondo de la foto', tipo: 'chips', def: 'azul', opciones: [['azul', 'Azul 2027'], ['claro', 'Claro'], ['oscuro', 'Oscuro']] },
    ...conDef(COMUNES.slice(5), { posh: 'centro', posv: 'centro' }),
    { k: 'efectos', label: 'Efectos de sonido', tipo: 'chips', def: 'si', opciones: [['si', '🫧 Sí'], ['no', 'No']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5, si: 'efectos=si' },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 7, min: 4.2, max: 20, paso: 0.1 }
  ],
  duracion: o => clamp(Number(o.dur) || 7, 4.2, 20),
  sonido(o) {
    if (o.efectos === 'no') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => {
      whoosh(ac, out, 0, ATERRIZA + .05, .3 * v, -.3, 0, 14);         // cae
      blup(ac, out, ATERRIZA, 180, .3 * v, -.3); blup(ac, out, ATERRIZA + .12, 260, .18 * v, -.2); // aterriza
      whoosh(ac, out, SALE, .55, .25 * v, -.4, .5, 15);               // sale la tarjeta
      blup(ac, out, SALE + .35, 560, .14 * v, .2);                    // etiqueta
      blup(ac, out, SALE + .45, 460, .14 * v, .3);                    // comando
      if (o.precio) campanita(ac, out, PRECIO + .05, .1 * v);         // se cuelga el precio
      whoosh(ac, out, L - .7, .7, .28 * v, .2, -.2, 16);              // se hunde
    });
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const L = this.duracion(o), tm = tiempo(t, L, 2.6, FIN - .7, FIN, .7);
    let u = (fmt === 'vertical' ? 1.15 : 1) * (Number(o.tam) || 1);
    const chip = (o.chip || '').toUpperCase(), frase = o.frase || '', comando = o.comando || '', precio = o.precio || '';
    const medir = u => {
      const f = { prod: `700 ${40 * u}px ${FRE}`, frase: `600 ${24 * u}px ${FRE}`, precio: `700 ${30 * u}px ${FRE}` }, S = 240 * u;
      const lineas = partir(ctx, o.producto || '', f.prod, 470 * u);
      const lineW = Math.max(0, ...lineas.map(l => ancho(ctx, l, f.prod)));
      const fraseW = (frase ? ancho(ctx, frase + ' ', f.frase) : 0) + (comando ? etiquetaAncho(ctx, comando, { tam: 17 * u }) : 0);
      const colW = Math.max(chip ? etiquetaAncho(ctx, chip, { tam: 16 * u }) : 0, lineW, fraseW);
      const colH = (chip ? 46 * u : 0) + lineas.length * 44 * u + (frase || comando ? 52 * u : 0);
      const w = 330 * u + colW + (precio ? 170 * u : 60 * u), h = Math.max(230 * u, colH + 76 * u);
      return { f, S, lineas, colH, w, h };
    };
    let m = medir(u); if (m.w > W - 150) { u *= (W - 150) / m.w; m = medir(u); }
    const { f, S, lineas, colH, w, h } = m;
    const pos = colocar(fmt, o, W, H, w, h, 70 * u), x = pos.x, y = pos.y;
    const cae = E.in(pr(tm, 0, ATERRIZA)), reb = pr(tm, ATERRIZA, ATERRIZA + .4), sal = E.in(pr(tm, FIN - .7, FIN));
    if (tm <= 0 || sal >= 1) return;
    const caida = (1 - cae) * -(y + h + S), dy = caida + sal * 120 * u;
    ctx.save(); ctx.globalAlpha = 1 - sal; ctx.translate(0, dy);
    // tarjeta: cae escondida detrás de la foto y sale deslizándose cuando la foto aterriza
    const cx0 = x + 120 * u, cw = w - 120 * u, sale = E.back(pr(tm, SALE, SALE + .55));
    if (sale > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(cx0, y - 400 * u, w + 400 * u, h + 800 * u); ctx.clip(); ctx.translate((1 - sale) * -(cw + 60 * u), 0); // escondida del todo (borde y sombra incluidos) hasta que sale
      const amp = 7 * u;
      pega(ctx, conOla(cx0, y, cw, h, 34 * u, t, amp), { ring: 7 * u, out: 6 * u, drop: 12 * u });
      hud(ctx, cx0, y, cw, h - 8 * u, 34 * u, 5 * u, 14 * u);
      aletaEnOla(ctx, cx0, y, cw, h, t, 85 * u, 40 * u, amp);
      const tx = x + 330 * u; let yy = y + (h - 8 * u - colH) / 2;
      if (chip) { etiqueta(ctx, chip, tx, yy + 18 * u, { tam: 16 * u }); yy += 46 * u; }
      lineas.forEach(l => { texto(ctx, l, tx, yy + 22 * u, f.prod); yy += 44 * u; });
      if (frase || comando) { const fy = yy + 30 * u; let fx = tx;
        if (frase) { texto(ctx, frase + ' ', fx, fy, f.frase, { col: C.espuma }); fx += ancho(ctx, frase + ' ', f.frase); }
        if (comando) etiqueta(ctx, comando, fx + 4 * u, fy, { tam: 17 * u }); }
      ctx.restore();
    }
    // foto-pegatina del producto
    const fx = x + 120 * u, fy = y + (h - 8 * u) / 2;
    const giro = rad(-7) + Math.sin(reb * Math.PI * 2) * (1 - reb) * .12, salto = -Math.sin(Math.PI * reb) * (1 - reb) * 26 * u;
    ctx.save(); ctx.translate(fx, fy + salto); ctx.rotate(giro);
    const marco = caja(-S / 2, -S / 2, S, S, 26 * u), fondo = o.fondo || 'azul';
    pega(ctx, marco, { ring: 9 * u, out: 7 * u, drop: 14 * u, fill: fondo === 'claro' ? C.perla : fondo === 'oscuro' ? C.abisal : C.aleta });
    ctx.save(); ctx.clip(marco);
    if (fondo === 'azul') {
      const g = ctx.createLinearGradient(0, -S / 2, 0, S / 2); g.addColorStop(0, C.indigo); g.addColorStop(1, C.aleta); ctx.fillStyle = g; ctx.fillRect(-S / 2, -S / 2, S, S);
      ctx.fillStyle = 'rgba(111,227,240,.12)'; const p = 20 * u; for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if ((i + j) % 2 === 0) ctx.fillRect(-S / 2 + i * p, -S / 2 + j * p, p / 2, p / 2);
    }
    if (o.imagen) { const img = o.imagen, a = S - 16 * u, k = Math.min(a / img.width, a / img.height), dw = img.width * k, dh = img.height * k; ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh); }
    else icono(ctx, 'camiseta', -S * .27, -S * .27, S * .54, fondo === 'claro' ? C.indigo : C.perla);
    ctx.restore(); ctx.restore();
    // precio colgando de una cuerdita (coral: es lo importante)
    if (precio && tm > PRECIO) {
      const d = tm - PRECIO, ang = Math.sin(d * 6) * .5 * Math.exp(-d * 1.6), px = x + w - 80 * u, py = y - 6 * u;
      const pw = Math.max(130 * u, ancho(ctx, precio, f.precio) + 44 * u), ph = 58 * u;
      ctx.save(); ctx.globalAlpha *= pr(tm, PRECIO, PRECIO + .15); ctx.translate(px, py); ctx.rotate(ang);
      ctx.strokeStyle = C.perla; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46 * u); ctx.stroke();
      ctx.fillStyle = C.perla; ctx.beginPath(); ctx.arc(0, 0, 6 * u, 0, 7); ctx.fill();
      pega(ctx, caja(-pw / 2, 46 * u, pw, ph, 18 * u), { ring: 5 * u, out: 5 * u, drop: 7 * u, fill: C.coral });
      texto(ctx, precio, 0, 46 * u + ph / 2 + 2 * u, f.precio, { al: 'center' }); ctx.restore();
    }
    ctx.restore();
  }
};
