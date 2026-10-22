// Kyo Estudio · Anuncio: ¡Hoy hay directo!
import { clamp, COLORES } from '../base/utilidades.js';
import { conAcabado } from '../base/acabado.js';
import { PLAY, CHAT } from '../base/iconos.js';
import { anuncioCuenta } from './cuenta-atras.js';

// Anuncio "¡Hoy hay directo!" (aviso rápido del día: hora + a qué juegas)
export const anuncioHoy = Object.assign({}, anuncioCuenta, {
  id: 'anuncio-hoy',
  nombre: '¡Hoy hay directo!',
  desc: 'Aviso rápido para el mismo día: a qué hora empiezas y qué vas a jugar o hacer, con la etiqueta que late, imagen opcional (portada del juego, tu avatar…) y música. Se rellena en un minuto.',
  _variante: { evento: true, hoy: true, icono: PLAY, iconoUrl: PLAY, iconoPie: CHAT },
  campos: [
    { k: 'titulo', label: 'Título', tipo: 'texto', def: '¡Hoy hay directo!', max: 22 },
    { k: 'evento', label: 'Qué vas a jugar o hacer', tipo: 'texto', def: 'Jugando Fortnite', max: 30 },
    { k: 'frase', label: 'Frase', tipo: 'texto', def: 'a las…', max: 30 },
    { k: 'horaHoy', label: 'Hora (HH:MM)', tipo: 'texto', def: '20:00', max: 5 },
    { k: 'hora', label: 'Debajo de la hora (opcional: zona u otras horas)', tipo: 'texto', def: 'hora de España', max: 30 },
    { k: 'imagen', label: 'Imagen (opcional: portada del juego, tu avatar…)', tipo: 'imagen' },
    { k: 'misterio', label: 'Cómo se ve la imagen', tipo: 'chips', def: 'normal', opciones: [['normal', '👀 Normal'], ['borrosa', '🌫️ Borrosa'], ['silueta', '👤 Silueta']] },
    { k: 'zoom', label: 'Zoom de la imagen (%)', tipo: 'numero', def: 100, min: 50, max: 250, paso: 5 },
    { k: 'url', label: 'Enlace (opcional)', tipo: 'texto', def: 'twitch.tv/KyoSumiVT', max: 36 },
    { k: 'envio', label: 'Texto de abajo (opcional)', tipo: 'texto', def: '¡Te espero en el chat!', max: 32 },
    ...COLORES,
    { k: 'musica', label: 'Música de fondo', tipo: 'chips', def: 'auto', opciones: [['auto', '🎨 Según el estilo'], ['burbuja', '🫧 Burbuja'], ['alegre', '🎶 Pop'], ['chill', '🌙 Chill'], ['halloween', '🎃 Halloween'], ['navidad', '🎄 Navidad'], ['ninguna', '🔇 Sin música']] },
    { k: 'vol', label: 'Volumen (%)', tipo: 'numero', def: 70, min: 5, max: 100, paso: 5 },
    { k: 'dur', label: 'Duración (segundos)', tipo: 'numero', def: 8, min: 5, max: 30, paso: 1 }
  ],
  duracion: o => clamp(Number(o.dur) || 8, 5, 30),
  _c: null
});
conAcabado(anuncioHoy);
