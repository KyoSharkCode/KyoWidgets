// Kyo Estudio · Anuncio 2027: ¡Hoy hay directo!
// Aviso rápido para el mismo día sobre el anuncio 2027: a qué juegas (etiqueta con el punto coral que late),
// la hora en dos cajas HUD grandes (HH:MM) y la zona debajo, con imagen opcional y música.
import { clamp } from '../base/utilidades.js';
import { anuncioCuenta2027, CAMPOS_MUSICA_2027 } from './cuenta-atras-2027.js';

export const anuncioHoy2027 = Object.assign({}, anuncioCuenta2027, {
  id: 'anuncio-hoy-2027',
  nombre: '¡Hoy hay directo! 2027',
  desc: 'Aviso rápido para el mismo día: a qué hora empiezas y qué vas a jugar o hacer, con la etiqueta que late, la hora en dos cajas HUD grandes, imagen opcional (portada del juego, tu avatar…) y música, en el mar 2027.',
  _variante: { evento: true, hoy: true, icono: 'play', iconoUrl: 'play', iconoPie: 'chat' },
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Hoy hay directo!', max: 22 },
    { k: 'evento', label: 'Qué vas a jugar o hacer (vacío para quitar la etiqueta)', tipo: 'texto', def: 'Jugando Fortnite', max: 30 },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'a las…', max: 30 },
    { k: 'horaHoy', label: 'Hora (HH:MM)', tipo: 'texto', def: '20:00', max: 5 },
    { k: 'hora', label: 'Debajo de la hora (opcional: zona u otras horas)', tipo: 'texto', def: 'hora de España', max: 30 },
    { k: 'imagen', label: 'Imagen (opcional: portada del juego, tu avatar…)', tipo: 'imagen' },
    { k: 'misterio', label: 'Cómo se ve la imagen', tipo: 'chips', def: 'normal', opciones: [['normal', '👀 Normal'], ['borrosa', '🌫️ Borrosa'], ['silueta', '👤 Silueta']] },
    { k: 'zoom', label: 'Zoom de la imagen (%)', tipo: 'numero', def: 100, min: 50, max: 250, paso: 5 },
    { k: 'url', label: 'Enlace (opcional)', tipo: 'texto', def: 'twitch.tv/KyoSumiVT', max: 36 },
    { k: 'envio', label: 'Texto de abajo (opcional)', tipo: 'texto', def: '¡Te espero en el chat!', max: 32 },
    ...CAMPOS_MUSICA_2027,
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 8, min: 5, max: 30, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 8, 5, 30),
  _c: null
});
