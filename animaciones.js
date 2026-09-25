// Kyo Estudio · pestaña Animaciones
// Plantillas editables: cambias textos, colores, posición, tamaño y duración, ves la vista previa en vivo
// y descargas un .mov ProRes 4444 con transparencia (Premiere lo abre directo).
// Todo pasa en el navegador: cada fotograma se dibuja en un <canvas> y ffmpeg.wasm arma el video.

import { FFmpeg } from './vendor/ffmpeg/index.js';
import { PLANTILLAS, FORMATOS } from './animaciones/plantillas.js';

const CORE = window.KYO_FFMPEG_CORE || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(4, '0');
const aBlob = async (url, tipo) => URL.createObjectURL(new Blob([await (await fetch(url)).arrayBuffer()], { type: tipo }));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Tipografías propias (alojadas en el repo) para que el video salga igual en cualquier compu
const FUENTES = [
  ['Cherry Bomb One', 'fonts/cherry-bomb-one-latin-400-normal.woff2', '400'],
  ['Fredoka', 'fonts/fredoka-latin-600-normal.woff2', '600'],
  ['Fredoka', 'fonts/fredoka-latin-700-normal.woff2', '700'],
  ['Chakra Petch', 'fonts/chakra-petch-latin-700-normal.woff2', '700']
];
const fuentesListas = Promise.all(FUENTES.map(([n, u, w]) => new FontFace(n, `url(${u})`, { weight: w }).load().then(f => document.fonts.add(f)).catch(() => {})));

let ff = null, cargando = null, ocupado = false, abierto = false;

async function conversor(aviso) {
  if (ff) return ff;
  if (!cargando) cargando = (async () => {
    aviso('Cargando el conversor (solo la primera vez, ~30 MB)…', 0.02);
    const f = new FFmpeg();
    await f.load({ coreURL: await aBlob(CORE + '/ffmpeg-core.js', 'text/javascript'), wasmURL: await aBlob(CORE + '/ffmpeg-core.wasm', 'application/wasm') });
    ff = f; return f;
  })().catch(e => { cargando = null; throw e; });
  return cargando;
}

const leer = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const defecto = pl => Object.fromEntries(pl.campos.filter(c => c.tipo !== 'imagen').map(c => [c.k, c.def]));

// ---------- imágenes propias (se guardan solo en este navegador, con IndexedDB) ----------
const bd = new Promise(res => {
  try { const r = indexedDB.open('kyo_estudio', 1); r.onupgradeneeded = () => r.result.createObjectStore('imagenes'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }
  catch (e) { res(null); }
});
async function bdHacer(modo, fn) { const db = await bd; if (!db) return null; return new Promise(res => { try { const tx = db.transaction('imagenes', modo), st = tx.objectStore('imagenes'), rq = fn(st); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); } }); }
const imgLeer = k => bdHacer('readonly', st => st.get(k));
const imgGuardar = (k, v) => bdHacer('readwrite', st => st.put(v, k));
const imgBorrar = k => bdHacer('readwrite', st => st.delete(k));
// Reduce la imagen (máx. 1400 px) y la guarda como PNG para conservar la transparencia
async function prepararImagen(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

// ---------- formulario a partir de los campos de la plantilla ----------
function formulario(pl) {
  return pl.campos.map(c => {
    const si = c.si ? ' data-si="' + c.si + '"' : '';
    if (c.tipo === 'texto') return '<label class="f"' + si + '><span>' + c.label + '</span><input type="text" name="' + c.k + '" maxlength="' + (c.max || 40) + '"></label>';
    if (c.tipo === 'numero') return '<label class="f"' + si + '><span>' + c.label + '</span><input type="number" name="' + c.k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.paso + '"></label>';
    if (c.tipo === 'imagen') return '<div class="f"' + si + '><span>' + c.label + '</span><div class="imgpick"><label class="btn"><input type="file" accept="image/*" data-img="' + c.k + '" hidden>📁 Elegir imagen</label><button class="btn" type="button" data-quitar="' + c.k + '" hidden>✕ Quitar</button><small data-imgnom="' + c.k + '">Sin imagen</small></div></div>';
    if (c.tipo === 'color') return '<label class="f fcolor"' + si + '><span>' + c.label + '</span><input type="color" name="' + c.k + '"></label>';
    return '<div class="f"' + si + '><span>' + c.label + '</span><div class="chips">' + c.opciones.map(([v, l]) => '<label><input type="radio" name="' + c.k + '" value="' + v + '">' + l + '</label>').join('') + '</div></div>';
  }).join('');
}
function leerForm(card, pl) {
  const o = {};
  pl.campos.forEach(c => {
    if (c.tipo === 'imagen') { o[c.k] = (card._imgs || {})[c.k] || null; return; }
    if (c.tipo === 'chips') { const i = $('input[name="' + c.k + '"]:checked', card); o[c.k] = i ? i.value : c.def; }
    else { const i = $('[name="' + c.k + '"]', card); o[c.k] = i ? i.value : c.def; }
  });
  return o;
}
function ponerForm(card, pl, o) {
  pl.campos.forEach(c => {
    if (c.tipo === 'imagen') return;
    if (c.tipo === 'chips') $$('input[name="' + c.k + '"]', card).forEach(i => i.checked = i.value === String(o[c.k]));
    else { const i = $('[name="' + c.k + '"]', card); if (i) i.value = o[c.k]; }
  });
}

// ---------- sonido ----------
// AudioBuffer → WAV PCM 16 bits (para meterlo dentro del .mov)
function aWav(buf) {
  const nc = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, dv = new DataView(new ArrayBuffer(44 + n * nc * 2));
  const txt = (o, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, 'RIFF'); dv.setUint32(4, 36 + n * nc * 2, true); txt(8, 'WAVE'); txt(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, nc, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * nc * 2, true); dv.setUint16(32, nc * 2, true); dv.setUint16(34, 16, true); txt(36, 'data'); dv.setUint32(40, n * nc * 2, true);
  const ch = [...Array(nc)].map((_, c) => buf.getChannelData(c)); let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const v = Math.max(-1, Math.min(1, ch[c][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(dv.buffer);
}
let audioCtx = null, sonando = null;
async function oir(pl, o) {
  const buf = await pl.sonido(o);
  if (sonando) { try { sonando.stop(); } catch (e) {} sonando = null; }
  if (!buf) return false;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const src = audioCtx.createBufferSource(); src.buffer = buf; src.connect(audioCtx.destination); src.start(); sonando = src;
  return true;
}

// ---------- exportar ----------
async function exportar(pl, card) {
  if (ocupado) return;
  ocupado = true;
  const o = leerForm(card, pl), fmt = $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
  const barra = $('.progreso', card), txt = $('.ptxt', card), bi = $('.progreso i', card), btn = $('[data-mov]', card);
  const aviso = (t, p) => { txt.textContent = t; if (p != null) bi.style.width = Math.round(p * 100) + '%'; };
  btn.disabled = true; barra.hidden = false;
  const nombre = pl.id + '-' + fmt + '.mov';
  try {
    await fuentesListas;
    const f = await conversor(aviso);
    const L = pl.duracion(o), n = Math.round(L * pl.fps);
    const cv = document.createElement('canvas'); cv.width = F.w; cv.height = F.h;
    const ctx = cv.getContext('2d');
    for (let i = 0; i < n; i++) {
      ctx.clearRect(0, 0, F.w, F.h);
      pl.dibujar(ctx, i / pl.fps, o, fmt, F.w, F.h);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      await f.writeFile('f' + pad(i) + '.png', new Uint8Array(await blob.arrayBuffer()));
      if (i % 5 === 0) aviso('Dibujando fotogramas ' + (i + 1) + '/' + n + '…', 0.05 + 0.45 * (i / n));
    }
    let conAudio = false;
    if (pl.sonido) {
      aviso('Creando el sonido…', 0.5);
      const buf = await pl.sonido(o);
      if (buf) { await f.writeFile('audio.wav', aWav(buf)); conAudio = true; }
    }
    const prog = ({ progress }) => aviso('Armando el video con transparencia… ' + Math.min(99, Math.round(progress * 100)) + '%', 0.5 + 0.48 * Math.min(1, progress));
    f.on('progress', prog);
    await f.exec(['-framerate', String(pl.fps), '-i', 'f%04d.png', ...(conAudio ? ['-i', 'audio.wav', '-map', '0:v', '-map', '1:a', '-c:a', 'pcm_s16le'] : []),
      '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-qscale:v', '9', '-vendor', 'apl0', '-y', 'salida.mov']);
    f.off('progress', prog);
    const data = await f.readFile('salida.mov');
    for (let i = 0; i < n; i++) { try { await f.deleteFile('f' + pad(i) + '.png'); } catch (e) {} }
    try { await f.deleteFile('salida.mov'); } catch (e) {}
    if (conAudio) { try { await f.deleteFile('audio.wav'); } catch (e) {} }
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/quicktime' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    aviso('¡Listo! Se descargó ' + nombre + ' (' + (data.length / 1048576).toFixed(1) + ' MB · ' + L.toFixed(1) + ' s).', 1);
  } catch (e) {
    console.error(e);
    aviso('No se pudo convertir: ' + (e && e.message ? e.message : e) + '. Recarga la página y prueba otra vez.', null);
  } finally { ocupado = false; btn.disabled = false; }
}

// ---------- tarjeta de cada plantilla ----------
function tarjeta(pl) {
  const card = document.createElement('div');
  card.className = 'card anim';
  card.innerHTML =
    '<div class="animtop"><div><h2>' + esc(pl.nombre) + '</h2><p class="nota">' + esc(pl.desc) + '</p></div>' +
    '<button class="btn" type="button" data-reset>↺ Restablecer</button></div>' +
    '<div class="animgrid"><div class="animform opts">' + formulario(pl) + '</div>' +
    '<div class="animside"><div class="chips">' + Object.keys(FORMATOS).map((k, i) => '<label><input type="radio" name="fmt-' + pl.id + '" value="' + k + '"' + (i ? '' : ' checked') + '>' + (k === 'horizontal' ? '🖥️ Horizontal 1920×1080' : '📱 Vertical 1080×1920') + '</label>').join('') + '</div>' +
    '<div class="animprev"><canvas></canvas></div>' +
    '<div class="acciones"><button class="btn pri" type="button" data-mov>⬇ Descargar .mov con transparencia</button><button class="btn" type="button" data-replay>↻ Repetir</button>' + (pl.sonido ? '<button class="btn" type="button" data-oir>🔊 Repetir con sonido</button>' : '') + '</div>' +
    '<div class="progreso" hidden><i></i></div><p class="nota ptxt" aria-live="polite"></p></div></div>';
  const clave = 'kyo_anim_' + pl.id;
  ponerForm(card, pl, Object.assign(defecto(pl), leer(clave) || {}));
  const cv = $('canvas', card), ctx = cv.getContext('2d');
  let t0 = performance.now(), o = leerForm(card, pl);
  const refrescar = () => {
    o = leerForm(card, pl); guardar(clave, Object.fromEntries(Object.entries(o).filter(([k]) => !(card._imgs && k in card._imgs) && !pl.campos.some(c => c.k === k && c.tipo === 'imagen'))));
    $$('[data-si]', card).forEach(el => { const [k, v] = el.dataset.si.split('='); el.hidden = o[k] !== v; });
    const fmt = $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
    cv.width = F.w / 3; cv.height = F.h / 3; cv.dataset.fmt = fmt;
    cv.style.maxWidth = fmt === 'vertical' ? '300px' : '100%';
  };
  card.addEventListener('input', refrescar);
  card.addEventListener('change', refrescar);
  $('[data-replay]', card).addEventListener('click', () => { t0 = performance.now(); });
  $('[data-reset]', card).addEventListener('click', () => { ponerForm(card, pl, defecto(pl)); refrescar(); t0 = performance.now(); });
  $('[data-mov]', card).addEventListener('click', () => exportar(pl, card));
  if (pl.sonido) $('[data-oir]', card).addEventListener('click', async () => {
    const ok = await oir(pl, o).catch(() => false); t0 = performance.now();
    if (!ok) $('.ptxt', card).textContent = o.sonido === 'ninguno' ? 'Elegiste "Sin sonido": el video saldrá mudo.' : 'Tu navegador no pudo generar el sonido.';
  });
  // imágenes
  card._imgs = {};
  const ponerImg = async (k, blob, nombre) => {
    card._imgs[k] = blob ? await createImageBitmap(blob) : null;
    $('[data-imgnom="' + k + '"]', card).textContent = blob ? (nombre || 'Imagen guardada') : 'Sin imagen';
    $('[data-quitar="' + k + '"]', card).hidden = !blob;
    refrescar();
  };
  $$('[data-img]', card).forEach(inp => {
    const k = inp.dataset.img, idb = pl.id + ':' + k;
    imgLeer(idb).then(v => { if (v && v.blob) ponerImg(k, v.blob, v.nombre); });
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      try { const blob = await prepararImagen(file); await imgGuardar(idb, { blob, nombre: file.name }); await ponerImg(k, blob, file.name); }
      catch (e) { $('[data-imgnom="' + k + '"]', card).textContent = 'No se pudo abrir esa imagen'; }
      inp.value = '';
    });
    $('[data-quitar="' + k + '"]', card).addEventListener('click', async () => { await imgBorrar(idb); ponerImg(k, null); });
  });
  refrescar();
  // vista previa en bucle (con una pausa corta entre repeticiones)
  const bucle = now => {
    if (!card.isConnected) return;
    if (!card.closest('[hidden]')) {
      const fmt = cv.dataset.fmt, F = FORMATOS[fmt], L = pl.duracion(o);
      let t = (now - t0) / 1000; if (t > L + .8) { t0 = now; t = 0; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.scale(cv.width / F.w, cv.height / F.h);
      try { pl.dibujar(ctx, Math.min(t, L), o, fmt, F.w, F.h); } catch (e) { console.error(e); }
    }
    requestAnimationFrame(bucle);
  };
  fuentesListas.then(() => requestAnimationFrame(bucle));
  return card;
}

window.kyoAnim = {
  abrir() {
    if (abierto) return; abierto = true;
    const cont = $('#animLista'); cont.innerHTML = '';
    PLANTILLAS.forEach(pl => cont.appendChild(tarjeta(pl)));
  }
};
