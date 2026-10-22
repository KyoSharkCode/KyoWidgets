// Kyo Estudio · Plantillas de animación (se dibujan en un <canvas>, fotograma a fotograma)
// Cada plantilla: { id, nombre, desc, fps, campos:[…], duracion(o), dibujar(ctx, t, o, fmt, W, H) }
// Este archivo solo junta las piezas; cada plantilla vive en su propio archivo:
//   base/       utilidades, acabado dibujado, iconos, piezas, sonido, mar y cielo
//   generales/  una animación por archivo
//   zzz/        plantillas de Zenless Zone Zero, sus piezas comunes y la hoja de build
//   anuncios/   anuncios de la pestaña Anuncios
//   fondos.js   fondos de la pestaña Imágenes
// Para añadir una animación nueva: crea su archivo en generales/ (copia uno parecido), impórtala aquí y añádela a PLANTILLAS.
import { rad, rr, fuente, ancho, TEMAS, paleta, azar } from './base/utilidades.js';
import { conAcabado } from './base/acabado.js';
import { BOLSA, ASA, CORAZON, CHECK, ALETA, CAMPANA, BADAJO, PLAY, CALENDARIO, CAL_LINEAS, CAMISETA, ESTRELLA, icono, CHAT, REGALO, MANDO, NOTA, MUNDO } from './base/iconos.js';
import { pegatina, destello } from './base/piezas.js';
import { pegatinaCodigo } from './generales/codigo-pegatina.js';
import { barraCodigo } from './generales/codigo-barra.js';
import { sigueme } from './generales/sigueme.js';
import { suscribete } from './generales/suscribete.js';
import { suscribeteBarra } from './generales/suscribete-barra.js';
import { directo } from './generales/directo.js';
import { merch } from './generales/merch.js';
import { transicion } from './generales/transicion.js';
import { nota } from './generales/nota.js';
import { momentazo } from './generales/momentazo.js';
import { intro } from './generales/intro.js';
import { outro } from './generales/outro.js';
import { rotulo } from './generales/rotulo.js';
import { presentacion } from './generales/presentacion.js';
import { guiaDiscos } from './zzz/guia-discos.js';
import { equipoZZZ } from './zzz/equipo.js';
import { habilidadesZZZ } from './zzz/habilidades.js';
import { amplisZZZ } from './zzz/amplificadores.js';
import { guiaFrameo } from './zzz/guia-frameo.js';
import { anuncioMerch } from './anuncios/merch.js';
import { anuncioCuenta } from './anuncios/cuenta-atras.js';
import { anuncioDirecto } from './anuncios/directo-especial.js';
import { anuncioHoy } from './anuncios/hoy-hay-directo.js';

// Campos que vienen de la Guía de mejora (se eligen una vez arriba de la pestaña ZZZ)
[[guiaDiscos, ['personaje', 'agente', 'imagen', 'elemento', 'especialidad']], [habilidadesZZZ, ['personaje', 'agente', 'imagen']], [amplisZZZ, ['personaje', 'agente', 'imagen']], [guiaFrameo, ['personaje', 'agente', 'imagen']]]
  .forEach(([pl, ks]) => pl.campos.forEach(c => { if (ks.includes(c.k)) c.guia = true; }));
// todas las animaciones aceptan el acabado dibujado
[intro, outro, presentacion, rotulo, guiaDiscos, equipoZZZ, habilidadesZZZ, amplisZZZ, guiaFrameo, pegatinaCodigo, barraCodigo, sigueme, suscribete, suscribeteBarra, directo, merch, transicion, nota, momentazo].forEach(conAcabado);
export const PLANTILLAS = [intro, outro, presentacion, rotulo, guiaDiscos, equipoZZZ, habilidadesZZZ, amplisZZZ, guiaFrameo, pegatinaCodigo, barraCodigo, sigueme, suscribete, suscribeteBarra, directo, merch, transicion, nota, momentazo];
// Anuncios (pestaña propia)
// todos los anuncios aceptan el acabado dibujado
[anuncioHoy, anuncioMerch, anuncioCuenta, anuncioDirecto].forEach(conAcabado);
export const ANUNCIOS = [anuncioHoy, anuncioMerch, anuncioCuenta, anuncioDirecto];
// Utilidades de dibujo para otras pestañas (paneles de Twitch)
export const UT = { TEMAS, paleta, pegatina, rr, fuente, ancho, destello, icono, azar, rad,
  ICONOS: { estrella: [ESTRELLA], corazon: [CORAZON], calendario: [CALENDARIO, CAL_LINEAS], check: [CHECK], camiseta: [CAMISETA], bolsa: [BOLSA, ASA], chat: [CHAT], regalo: [REGALO], mando: [MANDO], nota: [NOTA], play: [PLAY], campana: [CAMPANA, BADAJO], aleta: [ALETA], mundo: [MUNDO] } };

// Lo que usan las demás páginas del Estudio
export { EASE, FORMATOS } from './base/utilidades.js';
export { musicaFondo, renderSonido } from './base/sonido.js';
export { normIcono } from './zzz/comun.js';
export { pintarIconoGaleria } from './zzz/guia-discos.js';
export { pintarHabilidadGaleria } from './zzz/habilidades.js';
export { pintarFrameoGaleria } from './zzz/guia-frameo.js';
export { hojaBuild } from './zzz/hoja-build.js';
export { FONDOS } from './fondos.js';
