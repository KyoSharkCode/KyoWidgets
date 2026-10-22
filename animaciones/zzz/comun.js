// Kyo Estudio · ZZZ: iconos y utilidades compartidas por las plantillas ZZZ
import { EASE } from '../base/utilidades.js';
import { D_CORAZON } from '../base/acabado.js';

// Iconos dibujados para los atributos (espacio 24×24). Si se sube un icono con ese nombre en la galería, se usa ese.
export const ICONOS_ATR = {
  critProb: { d: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 3a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 3.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', par: 'evenodd' },
  critDmg: { d: 'M12 1.5l2.3 6 6.2-1.8-3.7 5.3 5.4 3.6-6.5.4.7 6.5L12 17l-4.4 4.5.7-6.5-6.5-.4 5.4-3.6-3.7-5.3 6.2 1.8Z' },
  ataque: { d: 'M21 3l-.8 4.2-9.2 9.2L7.6 13l9.2-9.2Z M5.2 12.4 6.6 11l6.4 6.4-1.4 1.4Z M7.6 15.1l1.3 1.3-4.6 4.6-1.3-1.3Z' },
  perforacion: { d: 'M8 3.5h2.6v17H8Z M2.5 10.8h13V7.5L21.5 12l-6 4.5v-3.3h-13Z' },
  energia: { d: 'M8 4.5h2.2V3h3.6v1.5H16a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V6A1.5 1.5 0 0 1 8 4.5Z M12.8 7.5 9 13.6h2.6l-.6 4.4 3.9-6.3h-2.7Z', par: 'evenodd' },
  electrico: { d: 'M13.8 2 5 13.6h6.2L9.6 22 19 9.8h-6.3Z' },
  fuego: { d: 'M12 2c.9 3.6 5.8 5.6 5.8 11.2a5.8 5.8 0 0 1-11.6 0c0-2.8 1.4-4.6 2.8-5.8.1 2.1 1 3.3 2.4 3.8C10.7 8.4 10.8 5 12 2Z' },
  hielo: { d: 'M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.4 3.9 12 6.3l2.6-2.4M9.4 20.1 12 17.7l2.6 2.4', trazo: true },
  fisico: { d: 'M12 2.3 20.4 7.1v9.8L12 21.7l-8.4-4.8V7.1Z M12 7.2 7.8 9.6v4.8l4.2 2.4 4.2-2.4V9.6Z', par: 'evenodd' },
  aereo: { d: 'M3 9h11.5a3 3 0 1 0-3-3M3 15h14a3 3 0 1 1-3 3M3 12h8', trazo: true },
  etereo: { d: 'M12 2c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10 5.6-.9 9.1-4.4 10-10Z' },
  maestria: { d: 'M12 12a1.5 1.5 0 0 1 3 0 3 3 0 0 1-6 0 4.5 4.5 0 0 1 9 0 6 6 0 0 1-12 0 7.5 7.5 0 0 1 15 0', trazo: true },
  competencia: { d: 'M12 2.5c3.6 4.6 6.6 8 6.6 11.6a6.6 6.6 0 0 1-13.2 0c0-3.6 3-7 6.6-11.6Z' },
  impacto: { d: 'M3.5 7.5 8 3l5.5 5.5L9 13Z M10.3 11.7l1.4-1.4 9 9a1 1 0 0 1 0 1.4 1 1 0 0 1-1.4 0Z' },
  vida: { d: D_CORAZON },
  defensa: { d: 'M12 2.5 19.5 5.3v6.2c0 4.6-3.1 8.3-7.5 10-4.4-1.7-7.5-5.4-7.5-10V5.3Z' },
  bono: { d: 'M18.5 5.5l-13 13M7.5 4.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM16.5 14.4a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z', trazo: true },
  otro: { d: 'M12 3.5 20.5 12 12 20.5 3.5 12Z' }
};
Object.values(ICONOS_ATR).forEach(i => { i.p = new Path2D(i.d); });
export const CHEVRON = new Path2D('M9 5l7 7-7 7');
// Nombre normalizado (sin tildes ni mayúsculas): así "Daño Crítico" y "daño critico" comparten icono
export const normIcono = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const limpio = v => String(v || '').trim();
// "≥ 86.6%" a mitad de animación → "≥ 43.3%": el primer número del texto sube desde 0 (respeta decimales y la coma)
export function contando(txt, p) {
  const mt = /^([^\d]*)(\d+(?:[.,]\d+)?)(.*)$/.exec(txt); if (!mt || p >= 1) return txt;
  const sep = mt[2].includes(',') ? ',' : '.', dec = (mt[2].split(/[.,]/)[1] || '').length, n = Number(mt[2].replace(',', '.'));
  return mt[1] + (n * EASE.out(p)).toFixed(dec).replace('.', sep) + mt[3];
}
// Tipos de habilidad: color de la paleta del tema (a = acento, a2 = acento 2, s = suave, oro) e icono dibujado (espacio 24×24)
export const HABILIDADES = {
  nucleo: { nombre: 'Central', col: 's', d: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5', trazo: true },
  basico: { nombre: 'Básico', col: 's', d: 'M7.5 10V7.8a1.6 1.6 0 0 1 3.2 0V10M10.7 9.5V6.6a1.6 1.6 0 0 1 3.2 0v2.9M13.9 9.6V7.4a1.6 1.6 0 0 1 3.2 0V11M17.1 10.5a1.6 1.6 0 0 1 3.2 0v2.8a6.7 6.7 0 0 1-6.7 6.7h-1.4a6.3 6.3 0 0 1-6.3-6.3v-1.1a2.6 2.6 0 0 1 2.6-2.6h3.2a1.8 1.8 0 0 1 0 3.6H9.5', trazo: true },
  evasion: { nombre: 'Evasión', col: 's', d: 'M6 12.5l6-6 6 6M6 18.5l6-6 6 6', trazo: true },
  asistencia: { nombre: 'Asistencia', col: 'a2', d: 'M4.5 9h13.5l-3.6-3.6M19.5 15H6l3.6 3.6', trazo: true },
  especial: { nombre: 'Especial', col: 'a', d: 'M12 2c.9 5.6 4.4 9.1 10 10-5.6.9-9.1 4.4-10 10-.9-5.6-4.4-9.1-10-10 5.6-.9 9.1-4.4 10-10Z' },
  cadena: { nombre: 'Cadena', col: 'oro', d: 'M12 1.5l2.3 6 6.2-1.8-3.7 5.3 5.4 3.6-6.5.4.7 6.5L12 17l-4.4 4.5.7-6.5-6.5-.4 5.4-3.6-3.7-5.3 6.2 1.8Z' }
};
Object.values(HABILIDADES).forEach(h => { h.p = new Path2D(h.d); });
