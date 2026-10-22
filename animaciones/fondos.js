// Kyo Estudio · Fondos para diseños estáticos (pestaña Imágenes)
import { FORMATOS, paleta, azar } from './base/utilidades.js';
import { destello } from './base/piezas.js';
import { nivelMar, lineaMar, burbujasEn, fondoNoche, fondoAnuncio, marQuieto } from './base/mar-y-cielo.js';

const FORMATOS_IMG = Object.assign({}, FORMATOS, { twitch: { w: 1200, h: 480 }, youtube: { w: 2560, h: 1440 } });
const OPC_FONDO = {
  rayas: [{ k: 'mar', label: 'Olas abajo', opciones: [['si', '🌊 Sí'], ['no', 'No']], def: 'si' }],
  noche: [{ k: 'luna', label: 'Luna y estrellas', opciones: [['si', '🌙 Sí'], ['no', 'No']], def: 'si' },
    { k: 'mar', label: 'Mar', opciones: [['bajo', 'Bajito'], ['medio', 'A media altura'], ['no', 'Sin mar']], def: 'bajo' }],
  mar: [{ k: 'rayos', label: 'Rayos de luz', opciones: [['si', '✨ Sí'], ['no', 'No']], def: 'si' },
    { k: 'ola', label: 'Superficie arriba', opciones: [['si', '🌊 Sí'], ['no', 'No']], def: 'si' }]
};
export const FONDOS = {
  formatos: FORMATOS_IMG,
  lista: [
    { id: 'rayas', nombre: 'Rayas de anuncio', desc: 'El fondo de tus anuncios: degradado con rayas diagonales, destellos y las olas abajo.', opciones: OPC_FONDO.rayas,
      dibujar(ctx, o, W, H, t) { const P = paleta(o), u = Math.min(W, H) / 1080; fondoAnuncio(ctx, P, W, H, t, u, H > W, o.mar !== 'no'); } },
    { id: 'noche', nombre: 'Noche con mar', desc: 'El cielo de la intro y la outro: estrellas, luna pegatina y el mar con burbujas.', opciones: OPC_FONDO.noche,
      dibujar(ctx, o, W, H, t) { const P = paleta(o), u = Math.min(W, H) / 1080, vert = H > W, Y0 = o.mar === 'medio' ? H * .6 : H * (vert ? .82 : .8);
        fondoNoche(ctx, P, W, H, t, u, o.mar === 'no' ? H : Y0, o.luna !== 'no', vert);
        if (o.mar !== 'no') marQuieto(ctx, P, W, H, t, u, Y0); } },
    { id: 'mar', nombre: 'Bajo el mar', desc: 'Todo mar: degradado profundo, rayos de luz y burbujas. Ideal para poner texto encima.', opciones: OPC_FONDO.mar,
      dibujar(ctx, o, W, H, t) { const P = paleta(o), u = Math.min(W, H) / 1080;
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P.a2); g.addColorStop(.55, P.c); g.addColorStop(1, P.o);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (o.rayos !== 'no') { const r = azar(5); ctx.save(); ctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < 7; i++) { const x = r() * W * 1.2 - W * .1, w = (60 + r() * 140) * u, gr = ctx.createLinearGradient(0, 0, 0, H * .85); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * .4 - W * .12, H * .85); ctx.lineTo(x - w * .6 - W * .12, H * .85); ctx.closePath(); ctx.fill(); }
          ctx.restore(); }
        burbujasEn(ctx, W, H, t, u, 23, Math.round(18 + 22 * W * H / 2073600));
        { const r = azar(9); for (let i = 0; i < 10; i++) destello(ctx, r() * W, H * .15 + r() * H * .8, (8 + r() * 14) * u, i % 3 ? '#ffffff' : P.a, .6, i * 40 + t * 20, .5); }
        if (o.ola !== 'no') { const A = 18 * u, y = H * .07;
          ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.fillStyle = P.o;
          const cielo = new Path2D(); cielo.moveTo(-20, -40); for (let x = -20; x <= W + 20 + W / 60; x += W / 60) cielo.lineTo(x, nivelMar(x, y, A, W, 0, t)); cielo.lineTo(W + 20, -40); cielo.closePath(); ctx.fill(cielo);
          ctx.lineWidth = 26 * u; ctx.strokeStyle = P.o; ctx.stroke(lineaMar(W, y, A, 0, t)); ctx.lineWidth = 14 * u; ctx.strokeStyle = P.p; ctx.stroke(lineaMar(W, y, A, 0, t)); } } }
  ]
};
