// Kyo Estudio · pestaña Animaciones
// Convierte los fotogramas PNG (con transparencia) de cada animación en un video .mov ProRes 4444
// con canal alfa, DENTRO del navegador (ffmpeg.wasm). No se sube nada a ningún sitio.
//
// Los fotogramas de cada formato van empaquetados en pocos archivos: animaciones/<id>/<h|v>.json (índice) + <h|v>-N.bin.
// Añadir una animación nueva: generar su paquete y listarla en animaciones/lista.json

import { FFmpeg } from './vendor/ffmpeg/index.js';

const CORE = window.KYO_FFMPEG_CORE || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(4, '0');
const aBlob = async (url, tipo) => URL.createObjectURL(new Blob([await (await fetch(url)).arrayBuffer()], { type: tipo }));

let ff = null, cargando = null, ocupado = false, lista = null;
const paquetes = {};

// Descarga (una vez) el paquete de fotogramas de un formato y lo trocea en PNGs
function paquete(an, fmt) {
  const k = an.id + '/' + fmt;
  if (!paquetes[k]) paquetes[k] = (async () => {
    const dir = 'animaciones/' + an.id + '/', F = an.formatos[fmt];
    const idx = await (await fetch(dir + F.dir + '.json')).json();
    const partes = await Promise.all(idx.partes.map(async n => new Uint8Array(await (await fetch(dir + n)).arrayBuffer())));
    // Cada parte: cabecera "KYOPACK1" + PNGs seguidos. Se recorren los bloques de cada PNG hasta IEND
    // (así da igual si algún programa añadió metadatos dentro de un PNG).
    const out = [];
    for (const d of partes) {
      let i = 8;
      while (i + 8 <= d.length) {
        const ini = i; i += 8; // firma PNG
        while (i + 8 <= d.length) {
          const len = ((d[i] << 24) >>> 0) + (d[i + 1] << 16) + (d[i + 2] << 8) + d[i + 3];
          const tipo = String.fromCharCode(d[i + 4], d[i + 5], d[i + 6], d[i + 7]);
          i += 12 + len;
          if (tipo === 'IEND') break;
        }
        out.push(d.subarray(ini, i));
      }
    }
    return out;
  })().catch(e => { delete paquetes[k]; throw e; });
  return paquetes[k];
}

async function conversor(aviso) {
  if (ff) return ff;
  if (!cargando) cargando = (async () => {
    aviso('Cargando el conversor (solo la primera vez, ~30 MB)…', 0.02);
    const f = new FFmpeg();
    await f.load({
      coreURL: await aBlob(CORE + '/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await aBlob(CORE + '/ffmpeg-core.wasm', 'application/wasm'),
    });
    ff = f; return f;
  })().catch(e => { cargando = null; throw e; });
  return cargando;
}

async function convertir(an, fmt, card) {
  if (ocupado) return;
  ocupado = true;
  const barra = $('.progreso', card), txt = $('.ptxt', card), bi = $('.progreso i', card);
  const botones = card.querySelectorAll('button[data-mov]');
  botones.forEach(b => b.disabled = true);
  barra.hidden = false;
  const aviso = (t, p) => { txt.textContent = t; if (p != null) bi.style.width = Math.round(p * 100) + '%'; };
  const F = an.formatos[fmt];
  const nombre = an.id + '-' + fmt + '.mov';
  try {
    const f = await conversor(aviso);
    // 1) Fotogramas al sistema de archivos del conversor
    aviso('Descargando fotogramas…', 0.05);
    const frames = await paquete(an, fmt);
    for (let i = 0; i < frames.length; i++) {
      await f.writeFile('f' + pad(i) + '.png', frames[i].slice());
      if (i % 6 === 0) aviso('Preparando fotogramas ' + (i + 1) + '/' + frames.length + '…', 0.1 + 0.2 * (i / frames.length));
    }
    // 2) Conversión a ProRes 4444 con transparencia (lo que Premiere abre directamente)
    const prog = ({ progress }) => aviso('Convirtiendo a video con transparencia… ' + Math.min(99, Math.round(progress * 100)) + '%', 0.3 + 0.68 * Math.min(1, progress));
    f.on('progress', prog);
    await f.exec(['-framerate', String(an.fps), '-i', 'f%04d.png', '-c:v', 'prores_ks', '-profile:v', '4444',
      '-pix_fmt', 'yuva444p10le', '-qscale:v', '9', '-vendor', 'apl0', '-y', 'salida.mov']);
    f.off('progress', prog);
    const data = await f.readFile('salida.mov');
    // 3) Limpieza y descarga
    for (let i = 0; i < an.frames; i++) { try { await f.deleteFile('f' + pad(i) + '.png'); } catch (e) {} }
    try { await f.deleteFile('salida.mov'); } catch (e) {}
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/quicktime' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    aviso('¡Listo! Se descargó ' + nombre + ' (' + (data.length / 1048576).toFixed(1) + ' MB).', 1);
  } catch (e) {
    console.error(e);
    aviso('No se pudo convertir: ' + (e && e.message ? e.message : e) + '. Recarga la página y prueba otra vez.', null);
  } finally {
    ocupado = false;
    botones.forEach(b => b.disabled = false);
  }
}

// Vista previa: reproduce los fotogramas en un canvas sobre fondo de cuadros
function vistaPrevia(an, fmt, card) {
  const cv = $('canvas', card), F = an.formatos[fmt], ctx = cv.getContext('2d');
  cv.width = F.w / 4; cv.height = F.h / 4;
  cv.style.aspectRatio = F.w + '/' + F.h;
  cv.style.maxWidth = fmt === 'vertical' ? '240px' : '100%';
  const paso = 2; // la vista previa usa 1 de cada 2 fotogramas
  const imgs = [];
  clearInterval(card._t);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const txt = $('.ptxt', card); if (!ocupado) txt.textContent = 'Cargando vista previa…';
  paquete(an, fmt).then(frames => {
    if (!ocupado) txt.textContent = '';
    for (let i = 0; i < frames.length; i += paso) { const im = new Image(); im.src = URL.createObjectURL(new Blob([frames[i]], { type: 'image/png' })); imgs.push(im); }
  }).catch(() => { txt.textContent = 'No se pudieron cargar los fotogramas.'; });
  let k = 0;
  card._t = setInterval(() => {
    const im = imgs[k % (imgs.length + 8)]; k++;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (im && im.complete) ctx.drawImage(im, 0, 0, cv.width, cv.height);
  }, 1000 / an.fps * paso);
}

function tarjeta(an) {
  const card = document.createElement('div');
  card.className = 'card anim';
  card.innerHTML =
    '<h2>' + an.nombre + '</h2><p class="nota">' + an.desc + ' · ' + (an.frames / an.fps).toFixed(1) + ' s · ' + an.fps + ' fps</p>' +
    '<div class="chips" role="radiogroup" aria-label="Formato">' +
    Object.keys(an.formatos).map((k, i) => '<label><input type="radio" name="fmt-' + an.id + '" value="' + k + '"' + (i ? '' : ' checked') + '>' + (k === 'horizontal' ? '🖥️ Horizontal ' : '📱 Vertical ') + an.formatos[k].w + '×' + an.formatos[k].h + '</label>').join('') + '</div>' +
    '<div class="animprev"><canvas aria-label="Vista previa de ' + an.nombre + '"></canvas></div>' +
    '<div class="acciones"><button class="btn pri" type="button" data-mov>⬇ Descargar .mov con transparencia</button></div>' +
    '<div class="progreso" hidden><i></i></div><p class="nota ptxt" aria-live="polite"></p>';
  const fmt = () => $('input[name="fmt-' + an.id + '"]:checked', card).value;
  card.addEventListener('change', () => vistaPrevia(an, fmt(), card));
  $('[data-mov]', card).addEventListener('click', () => convertir(an, fmt(), card));
  vistaPrevia(an, fmt(), card);
  return card;
}

window.kyoAnim = {
  async abrir() {
    if (lista) return;
    const cont = $('#animLista');
    try {
      lista = (await (await fetch('animaciones/lista.json', { cache: 'no-cache' })).json()).animaciones || [];
      cont.innerHTML = '';
      lista.forEach(an => cont.appendChild(tarjeta(an)));
      if (!lista.length) cont.innerHTML = '<p class="nota">Todavía no hay animaciones.</p>';
    } catch (e) { cont.innerHTML = '<p class="nota">No encuentro animaciones/lista.json.</p>'; lista = null; }
  }
};
