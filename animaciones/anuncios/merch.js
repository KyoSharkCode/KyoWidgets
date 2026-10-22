// Kyo Estudio · Anuncio: merch
import { rad, lerp, clamp, EASE, kf, rr, fuente, ancho, paleta, imagenEn, COLORES } from '../base/utilidades.js';
import { AC, popResorte, golpeEn } from '../base/acabado.js';
import { CAMISETA, icono } from '../base/iconos.js';
import { pegatina, caminoEstallido, letrasSaltan } from '../base/piezas.js';
import { renderSonido, musicaElegida, musicaFondo } from '../base/sonido.js';
import { fondoAnuncio } from '../base/mar-y-cielo.js';
import { pieAnuncio } from './comun.js';

// Anuncio de merch (pestaña Anuncios)
const itemCampos = i => {
  const si = i === 1 ? undefined : i === 2 ? 'cantidad=2|3' : 'cantidad=3';
  const defs = [['Camiseta KyoSumi'], ['Sudadera Tiburón'], ['Taza Marea']][i - 1];
  return [
    { k: 'imagen' + i, label: 'Producto ' + i + ' · foto (PNG sin fondo queda genial)', tipo: 'imagen', si },
    { k: 'nombre' + i, label: 'Producto ' + i + ' · nombre', tipo: 'texto', def: defs[0], max: 26, si },
    { k: 'precio' + i, label: 'Producto ' + i + ' · precio (vacío = no sale)', tipo: 'texto', def: '', max: 12, si },
    { k: 'zoom' + i, label: 'Producto ' + i + ' · zoom de la foto (%)', tipo: 'numero', def: 100, min: 50, max: 250, paso: 5, si }
  ];
};
// Posiciones de los anuncios por formato (en px de diseño: ancho 1080 en vertical/retrato/cuadrado, 1920 en horizontal)
const DISENO_ANUNCIO = {
  vertical: { tY: 270, tF: 150, url: 1430, env: 1545 },
  retrato: { tY: 150, tF: 130, url: 1075, env: 1175 },
  cuadrado: { tY: 105, tF: 110, url: 860, env: 948 },
  horizontal: { tY: 130, tF: 130, url: 835, env: 930 }
};
export const anuncioMerch = {
  id: 'anuncio-merch',
  opaco: true,
  fmtDef: 'vertical',
  nombre: 'Anuncio de merch',
  desc: 'Anuncio a pantalla completa con 1, 2 o 3 productos, el enlace de tu tienda, "envíos a todo el mundo" y música de fondo propia.',
  fps: 30,
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Nueva merch!', max: 22 },
    { k: 'cantidad', label: 'Productos a la vez', tipo: 'chips', def: '1', opciones: [['1', '1 producto'], ['2', '2 productos'], ['3', '3 productos']] },
    ...itemCampos(1), ...itemCampos(2), ...itemCampos(3),
    { k: 'fondoFoto', label: 'Fondo de las fotos', tipo: 'chips', def: 'claro', opciones: [['claro', 'Claro'], ['acento', 'Color del estilo'], ['oscuro', 'Oscuro']] },
    { k: 'url', label: 'Dónde comprar (enlace)', tipo: 'texto', def: 'kyomerch.shop', max: 36 },
    { k: 'envio', label: 'Texto de envíos', tipo: 'texto', def: 'Envíos a todo el mundo', max: 32 },
    ...COLORES,
    { k: 'musica', label: 'Música de fondo', tipo: 'chips', def: 'auto', opciones: [['auto', '🎨 Según el estilo'], ['alegre', '🎶 Alegre'], ['burbuja', '🫧 Burbuja'], ['chill', '🌙 Chill'], ['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['ninguna', '🔇 Sin música']] },
    { k: 'vol', label: 'Volumen de la música (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 12, min: 6, max: 30, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 12, 6, 30),
  sonido(o) {
    const mus = musicaElegida(o, 'alegre'); if (mus === 'ninguna') return Promise.resolve(null);
    const L = this.duracion(o), v = clamp(Number(o.vol) || 70, 5, 100) / 100;
    return renderSonido(L, (ac, out) => musicaFondo(ac, out, L, mus, 1.5 * v));
  },
  formatos: ['vertical', 'horizontal', 'retrato', 'cuadrado'],
  _cajas(n, fmt, W, H) {
    if (fmt === 'cuadrado') return [[[315, 235, 450, 450]], [[110, 220, 410, 410], [560, 220, 410, 410]], [[40, 260, 320, 320], [380, 260, 320, 320], [720, 260, 320, 320]]][n - 1];
    if (fmt === 'retrato') return [[[215, 245, 650, 650]], [[70, 290, 450, 540], [560, 290, 450, 540]], [[40, 320, 320, 390], [380, 320, 320, 390], [720, 320, 320, 390]]][n - 1];
    if (fmt === 'vertical') {
      if (n === 1) return [[160, 420, 760, 760]];
      if (n === 2) return [[60, 470, 460, 600], [560, 470, 460, 600]];
      return [[95, 410, 420, 420], [565, 410, 420, 420], [330, 890, 420, 420]];
    }
    if (n === 1) return [[710, 250, 500, 500]];
    if (n === 2) return [[440, 260, 480, 480], [1000, 260, 480, 480]];
    return [[190, 270, 460, 460], [730, 270, 460, 460], [1270, 270, 460, 460]];
  },
  dibujar(ctx, t, o, fmt, W, H) {
    const P = paleta(o), vert = fmt !== 'horizontal', u = Math.min(W, H) / 1080, k = vert ? W / 1080 : W / 1920, D = DISENO_ANUNCIO[fmt];
    fondoAnuncio(ctx, P, W, H, t, u, fmt === 'vertical');
    // título
    if (o.titulo) letrasSaltan(ctx, o.titulo, W / 2, D.tY * k, D.tF * k, P, t, .25, .06, t, W - 140 * k);
    // productos
    const n = clamp(Number(o.cantidad) || 1, 1, 3), cajas = this._cajas(n, fmt, W, H);
    const fondoF = o.fondoFoto === 'acento' ? P.a : o.fondoFoto === 'oscuro' ? P.o : '#ffffff';
    cajas.forEach(([x, y, w, h], i) => {
      x *= k; y *= k; w *= k; h *= k;
      const ti = .8 + i * .3, a = AC && AC.k.muelle ? popResorte(t, ti, { s0: .2, r0: -16, y0: 80 }) : kf(t, [[ti, { s: .2, r: -16, a: 0, y: 80 }], [ti + .35, { s: 1.08, r: 4, a: 1, y: -10 }], [ti + .55, { s: 1, r: 0, a: 1, y: 0 }]], EASE.back);
      if (AC) golpeEn(ctx, x + w / 2, y + h / 2, w * .72, h * .72, t, ti + .12, P.a, { grosor: 20 * u, n: 14, sem: 3 + i });
      if (a.a <= .01) return;
      const cx = x + w / 2, cy = y + h / 2, base = (i % 2 ? 2.5 : -2.5) + (n === 3 && i === 2 ? 2 : 0);
      const bob = Math.sin(t * 2.2 + i * 1.3) * 6 * u, rb = Math.sin(t * 1.6 + i) * 1.2;
      ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, cy + a.y * u + bob); ctx.rotate(rad(a.r + base + rb)); ctx.scale(a.s * (a.sx ?? 1), a.s * (a.sy ?? 1)); ctx.translate(-cx, -cy);
      pegatina(ctx, x, y, w, h, 34 * u, { fill: fondoF, p: P.p, o: P.o, ring: 9 * u, out: 7 * u, drop: 16 * u, trazo: clamp((t - ti) / .5, 0, 1) });
      const img = o['imagen' + (i + 1)];
      ctx.save(); rr(ctx, x, y, w, h, 34 * u); ctx.clip();
      if (img) { const z = clamp(Number(o['zoom' + (i + 1)]) || 100, 50, 250) / 100, bw = w * .88 * z, bh = h * .78 * z; imagenEn(ctx, img, cx - bw / 2, y + h * .45 - bh / 2, bw, bh, 'contener'); }
      else icono(ctx, CAMISETA, cx - w * .28, cy - h * .32, w * .56, o.fondoFoto === 'claro' ? P.a2 + '66' : 'rgba(255,255,255,.35)');
      // brillo que cruza la foto cada 4 s
      const sp = ((t - ti - .6) % 4) / .8;
      if (t > ti + .6 && sp > 0 && sp < 1) { ctx.save(); ctx.translate(lerp(x - w * .3, x + w * 1.3, sp), cy); ctx.rotate(rad(20)); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-26 * u, -h, 52 * u, 2 * h); ctx.restore(); }
      ctx.restore();
      // nombre (chip sobre el borde inferior)
      const nom = o['nombre' + (i + 1)];
      if (nom) { const f = `700 ${(n === 1 ? 40 : 32) * u}px "Fredoka"`; let wn = ancho(ctx, nom, f) + 50 * u; const sc = Math.min(1, (w + 40 * u) / wn);
        ctx.save(); ctx.translate(cx, y + h); ctx.scale(sc, sc);
        pegatina(ctx, -wn / 2, -30 * u, wn, 62 * u, 31 * u, { fill: P.c, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 8 * u, suave: false });
        fuente(ctx, f); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.t; ctx.fillText(nom, 0, 3 * u); ctx.restore(); }
      // precio (estrella pegatina en la esquina)
      const pr = o['precio' + (i + 1)];
      if (pr) { const pk = kf(t, [[ti + .45, { s: 0 }], [ti + .7, { s: 1.2 }], [ti + .85, { s: 1 }]], EASE.back).s, R = (n === 1 ? 88 : 70) * u;
        if (pk > 0) { const px = x + w - R * .35, py = y + R * .35; ctx.save(); ctx.translate(px, py); ctx.rotate(rad(12 + Math.sin(t * 3 + i) * 5)); ctx.scale(pk, pk);
          const est = caminoEstallido(R, R, 10, t, 3 + i); ctx.lineJoin = 'round'; ctx.lineWidth = 18 * u; ctx.strokeStyle = P.o; ctx.stroke(est); ctx.lineWidth = 10 * u; ctx.strokeStyle = P.p; ctx.stroke(est); ctx.fillStyle = '#F4C542'; ctx.fill(est);
          const fp = `400 ${(n === 1 ? 40 : 32) * u}px "Cherry Bomb One"`; let s2 = Math.min(1, R * 1.35 / ancho(ctx, pr, fp)); ctx.scale(s2, s2); fuente(ctx, fp); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.o; ctx.fillText(pr, 0, 3 * u); ctx.restore(); } }
      ctx.restore();
    });
    pieAnuncio(ctx, o, P, W, H, t, u, k, vert, .8 + n * .3 + .35, D.url, D.env);
  }
};
