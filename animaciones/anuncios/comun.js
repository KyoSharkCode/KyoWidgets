// Kyo Estudio · Anuncios: piezas compartidas
import { clamp, EASE, kf, fuente, ancho } from '../base/utilidades.js';
import { BOLSA, ASA, icono, MUNDO } from '../base/iconos.js';
import { pegatina, destello } from '../base/piezas.js';

// Pie de los anuncios: enlace de la tienda + "envíos a todo el mundo" con destellos
export function pieAnuncio(ctx, o, P, W, H, t, u, k, vert, tU, yUrl, yEnv, ic = {}) {
    // enlace de la tienda
    if (o.url) {
      const a = kf(t, [[tU, { y: 60, s: .6, a: 0 }], [tU + .35, { y: -8, s: 1.05, a: 1 }], [tU + .5, { y: 0, s: 1, a: 1 }]], EASE.back);
      if (a.a > .01) {
        const f = `700 ${(vert ? 50 : 44) * k}px "Chakra Petch"`, fe = 2 * k, tw = ancho(ctx, o.url, f, fe), hh = (vert ? 104 : 92) * k, ww = Math.min(W - 80 * k, tw + 150 * k);
        const cx = W / 2, cy = yUrl * k + a.y * u, lat = 1 + Math.sin(t * 4) * .015;
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1); ctx.translate(cx, cy); ctx.scale(a.s * lat, a.s * lat);
        pegatina(ctx, -ww / 2, -hh / 2, ww, hh, hh / 2, { fill: P.a, p: P.p, o: P.o, ring: 8 * u, out: 7 * u, drop: 12 * u });
        if (ic.url) icono(ctx, ic.url, -ww / 2 + 30 * k, -28 * k, 56 * k, P.o); else { icono(ctx, BOLSA, -ww / 2 + 30 * k, -28 * k, 56 * k, P.o); icono(ctx, ASA, -ww / 2 + 30 * k, -28 * k, 56 * k, P.o, { trazo: true, grosor: 2.2 }); }
        const sc = Math.min(1, (ww - 130 * k) / tw); ctx.translate(34 * k, 3 * k); ctx.scale(sc, sc); fuente(ctx, f, fe); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = P.o; ctx.fillText(o.url, 0, 0);
        ctx.restore();
      }
    }
    // envíos a todo el mundo ✨
    if (o.envio) {
      const a = kf(t, [[tU + .35, { y: 30, a: 0 }], [tU + .7, { y: 0, a: 1 }]], EASE.back);
      if (a.a > .01) {
        const f = `700 ${(vert ? 50 : 40) * k}px "Fredoka"`, tw = ancho(ctx, o.envio, f), cy = yEnv * k + a.y * u, icT = 44 * k, ic2 = ic.pie;
        ctx.save(); ctx.globalAlpha *= clamp(a.a, 0, 1);
        const x0 = W / 2 - (tw + icT + 14 * k) / 2;
        icono(ctx, ic2 || MUNDO, x0, cy - icT / 2, icT, P.t);
        fuente(ctx, f); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.lineWidth = 8 * u; ctx.strokeStyle = P.o; ctx.strokeText(o.envio, x0 + icT + 14 * k, cy + 2 * k); ctx.fillStyle = P.t; ctx.fillText(o.envio, x0 + icT + 14 * k, cy + 2 * k);
        ctx.restore();
        const xs = W / 2 + (tw + icT + 14 * k) / 2 + 34 * k;
        [[0, 0, 40, '#F4C542', 0], [26, -26, 22, '#ffffff', .8], [-4, 30, 16, P.a, 1.6]].forEach(([dx, dy, s, col, ph]) => { const tw2 = .6 + .4 * Math.sin(t * 5 + ph); destello(ctx, xs + dx * k, cy + dy * k, s * k, col, a.a * tw2 * 1.2, t * 60 + ph * 40, a.a); });
      }
    }
}
