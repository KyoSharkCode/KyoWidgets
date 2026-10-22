// Kyo Estudio · Anuncio: ¡Directo especial!
import { conDef } from '../base/utilidades.js';
import { PLAY, CHAT } from '../base/iconos.js';
import { anuncioCuenta } from './cuenta-atras.js';

// Anuncio "¡Directo especial!" (misma cuenta atrás, pensado para avisar de un stream)
export const anuncioDirecto = Object.assign({}, anuncioCuenta, {
  id: 'anuncio-directo',
  nombre: '¡Directo especial!',
  desc: 'Avisa de un stream especial (maratón, colaboración, aniversario…) con cuenta atrás o fecha, etiqueta "en directo" que late, imagen opcional y música.',
  _variante: { evento: true, icono: PLAY, iconoUrl: PLAY, iconoPie: CHAT },
  campos: (() => {
    const c = conDef(anuncioCuenta.campos, { titulo: '¡Directo especial!', frase: 'empieza en…', fraseF: 'será el…', h: 2, url: 'twitch.tv/KyoSumiVT', envio: '¡Te espero en el chat!', misterio: 'normal', fecha: '31-10-2026', hora: '20:00 h · España' })
      .map(x => x.k === 'imagen' ? Object.assign({}, x, { label: 'Imagen (opcional: invitada, juego, tu avatar…)' }) : x);
    c.splice(1, 0, { k: 'evento', label: 'Qué directo es', tipo: 'texto', def: 'Maratón de 12 horas', max: 30 });
    return c;
  })(),
  _c: null
});
