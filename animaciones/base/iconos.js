// Kyo Estudio · Iconos (espacio 24×24) y cómo pintarlos

export const SPK = new Path2D('M50 0C53 38 62 47 100 50 62 53 53 62 50 100 47 62 38 53 0 50 38 47 47 38 50 0Z');
export const BOLSA = new Path2D('M5 8h14l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3Z');
export const ASA = new Path2D('M9 10V6.5a3 3 0 0 1 6 0V10');
export const CORAZON = new Path2D('M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z');
export const CHECK = new Path2D('M4 12.5l5 5L20 6.5');
export const FLECHA = new Path2D('M6 3 L6 31 L13 24.5 L18 36 L23 34 L18 22.8 L27.5 22.8 Z');
export const ALETA = new Path2D('M6 78 C 30 70 46 40 78 6 C 80 36 92 60 116 78 Z');
export const MAS = new Path2D('M12 5v14M5 12h14');
export const CAMPANA = new Path2D('M12 3a6 6 0 0 0-6 6v4.2L4.2 16.4c-.4.7.1 1.6.9 1.6h13.8c.8 0 1.3-.9.9-1.6L18 13.2V9a6 6 0 0 0-6-6Z');
export const BADAJO = new Path2D('M9.5 19.5a2.5 2.5 0 0 0 5 0Z');
export const PLAY = new Path2D('M8 5.5v13l11-6.5Z');
export const CALENDARIO = new Path2D('M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z');
export const CAL_LINEAS = new Path2D('M4 10.5h16M8.5 3.5v4M15.5 3.5v4');
export const CAMISETA = new Path2D('M8.5 3.5 3 6.5l2.2 5 2.8-1.3V20.5h8V10.2l2.8 1.3 2.2-5-5.5-3a3.5 3.5 0 0 1-7 0Z');
export const ESTRELLA = new Path2D('M12 2.2l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.3l-6 3.3 1.3-6.7-5-4.7 6.8-.8Z');
export function icono(ctx, path, x, y, tam, color, { trazo = false, grosor = 2.4 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(tam / 24, tam / 24);
  if (trazo) { ctx.lineWidth = grosor; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(path); }
  else { ctx.fillStyle = color; ctx.fill(path); }
  ctx.restore();
}
// Iconos extra (paneles y anuncios)
export const CHAT = new Path2D('M4 4.5h16a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-9.5l-5 3.8v-3.8H4A1.5 1.5 0 0 1 2.5 16V6A1.5 1.5 0 0 1 4 4.5Z');
export const REGALO = new Path2D('M3.5 8.5h17v4.5h-17Z M5 14h6v6.5H5Z M13 14h6v6.5h-6Z M12 8.3C10 3.8 6.3 4.4 6.8 6.5 7.2 8 10 8.3 12 8.3Z M12 8.3C14 3.8 17.7 4.4 17.2 6.5 16.8 8 14 8.3 12 8.3Z');
export const MANDO = new Path2D('M7 7.5h10a5 5 0 0 1 4.8 6.3l-.9 3.4a2.2 2.2 0 0 1-3.9.7l-1.5-2.4h-7L7 17.9a2.2 2.2 0 0 1-3.9-.7l-.9-3.4A5 5 0 0 1 7 7.5Z');
export const NOTA = new Path2D('M9 18.5a3 3 0 1 1-2-2.83V5.2l12-2.4v12.7a3 3 0 1 1-2-2.83V6.6L9 8.1Z');
export const MUNDO = new Path2D('M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm6.9 8.5h-3.3a15 15 0 0 0-1.2-5.7A7.5 7.5 0 0 1 18.9 11ZM12 4.6c.9 1.2 1.8 3.4 2 6.4h-4c.2-3 1.1-5.2 2-6.4ZM9.6 5.3A15 15 0 0 0 8.4 11H5.1a7.5 7.5 0 0 1 4.5-5.7ZM5.1 13h3.3a15 15 0 0 0 1.2 5.7A7.5 7.5 0 0 1 5.1 13Zm6.9 6.4c-.9-1.2-1.8-3.4-2-6.4h4c-.2 3-1.1 5.2-2 6.4Zm2.4-.7a15 15 0 0 0 1.2-5.7h3.3a7.5 7.5 0 0 1-4.5 5.7Z');
