// Kyo Estudio · Anuncio 2027: ¡Directo especial!
// La misma cuenta atrás 2027, pensada para avisar de un stream especial: debajo del título va la etiqueta del
// evento (píldora perla con el punto coral que late), el icono es el play y el enlace apunta a tu canal.
import { conDef } from '../base/utilidades.js';
import { anuncioCuenta2027 } from './cuenta-atras-2027.js';

export const anuncioDirecto2027 = Object.assign({}, anuncioCuenta2027, {
  id: 'anuncio-directo-2027',
  nombre: '¡Directo especial! 2027',
  desc: 'Avisa de un stream especial (maratón, colaboración, aniversario…) con cuenta atrás o fecha, la etiqueta del evento con el punto coral que late, imagen opcional y música, en el mar 2027.',
  _variante: { evento: true, icono: 'play', iconoUrl: 'play', iconoPie: 'chat' },
  campos: (() => {
    const c = conDef(anuncioCuenta2027.campos, { titulo: '¡Directo especial!', frase: 'empieza en…', fraseF: 'será el…', h: 2, url: 'twitch.tv/KyoSumiVT', envio: '¡Te espero en el chat!', misterio: 'normal', fecha: '11-01-2027', hora: '20:00 h · España' })
      .map(x => x.k === 'imagen' ? Object.assign({}, x, { label: 'Imagen (opcional: invitada, juego, tu avatar…)' }) : x);
    c.splice(1, 0, { k: 'evento', label: 'Qué directo es (vacío para quitar la etiqueta)', tipo: 'texto', def: 'Maratón de 12 horas', max: 30 });
    return c;
  })(),
  _c: null
});
