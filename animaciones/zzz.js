// Kyo Estudio · Assets de Zenless Zone Zero desde el repo de la comunidad ZZZdle-Assets (github.com/Gaiiiaaa-GH/ZZZdle-Assets)
// Se leen directo de GitHub (raw.githubusercontent.com, permite leerlas desde el navegador) fijadas a un commit:
// si el repo cambia, el Estudio no se rompe. Para actualizar, cambia VERSION por el commit nuevo del repo.
// No se usa jsDelivr porque no sirve repos de GitHub de más de 50 MB (este pesa ~230 MB). No se copia nada a KyoWidgets.
// El arte es de HoYoverse; el repo lo reúne para uso de fans no comercial.
export const VERSION = 'a1700d2b9ea7a6c6f3922a12f2e83d1343d003c9';
const BASE = 'https://raw.githubusercontent.com/Gaiiiaaa-GH/ZZZdle-Assets/' + VERSION + '/';
// Si GitHub no responde en 20 s se da por fallida la carga (la lista avisa en vez de quedarse vacía)
const pedir = url => fetch(url, typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {});
// Tipos de asset → carpeta del repo (todas tienen manifest.json y archivos .webp)
export const CARPETAS = {
  icono: 'icons', retrato: 'portraits', retratoAncho: 'portraits_horizontal', seleccion: 'select_art', splash: 'splash_art',
  elemento: 'type_icons/elements', especialidad: 'type_icons/specialties', ataque: 'type_icons/attack_types', faccion: 'type_icons/factions',
  amplificador: 'w_engines/icons', bangboo: 'bangboo/icons'
};
// Nombres en español de lo que tiene traducción conocida; el resto se muestra a partir del nombre del archivo
const NOMBRES = {
  physical: 'Físico', fire: 'Fuego', ice: 'Hielo', electric: 'Eléctrico', ether: 'Etéreo', wind: 'Viento', frost: 'Escarcha',
  attack: 'Ataque', stun: 'Aturdimiento', anomaly: 'Anomalía', support: 'Apoyo', defense: 'Defensa', rupture: 'Ruptura',
  slash: 'Cortante', strike: 'Contundente', pierce: 'Perforante'
};
export const nombreDe = slug => NOMBRES[slug] || slug.split('-').map(p => p ? p[0].toUpperCase() + p.slice(1) : p).join(' ');

// Lista [[slug, nombre]] de un tipo, ordenada por nombre (se pide una sola vez)
const listas = {};
export function lista(tipo) {
  if (!listas[tipo]) listas[tipo] = pedir(BASE + CARPETAS[tipo] + '/manifest.json')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(m => m.images.map(i => i.file.replace(/\.\w+$/, '')).map(s => [s, nombreDe(s)]).sort((a, b) => a[1].localeCompare(b[1], 'es')))
    .catch(e => { delete listas[tipo]; throw e; });
  return listas[tipo];
}

// Imágenes: cargar() devuelve una promesa (para exportar); imagen() responde al momento (para dibujar cada fotograma)
// y, si aún no está, empieza a descargarla. Si falla (sin internet), no se reintenta hasta pasados 30 s.
const imgs = {};
export function cargar(tipo, slug) {
  if (!slug || !CARPETAS[tipo]) return Promise.resolve(null);
  const k = tipo + '/' + slug, e = imgs[k];
  if (e && (e.bmp || !e.fallo || Date.now() - e.fallo < 30000)) return e.p;
  const nueva = { bmp: null, fallo: 0 };
  nueva.p = pedir(BASE + CARPETAS[tipo] + '/' + slug + '.webp')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
    .then(b => createImageBitmap(b)).then(b => (nueva.bmp = b))
    .catch(() => { nueva.fallo = Date.now(); return null; });
  imgs[k] = nueva;
  return nueva.p;
}
export function imagen(tipo, slug) {
  if (!slug) return null;
  const e = imgs[tipo + '/' + slug];
  if (e && e.bmp) return e.bmp;
  cargar(tipo, slug);
  return null;
}
