// Kyo Estudio · pestaña Animaciones
// Plantillas editables: cambias textos, colores, posición, tamaño y duración, ves la vista previa en vivo
// y descargas un .mov ProRes 4444 con transparencia (Premiere lo abre directo).
// Todo pasa en el navegador: cada fotograma se dibuja en un <canvas> y ffmpeg.wasm arma el video.

import { FFmpeg } from './vendor/ffmpeg/index.js';
import { PLANTILLAS, FORMATOS, ANUNCIOS, musicaFondo, renderSonido, normIcono } from './animaciones/plantillas.js';
import * as ZZZ from './animaciones/zzz.js';

const CORE = window.KYO_FFMPEG_CORE || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(4, '0');
const aBlob = async (url, tipo) => URL.createObjectURL(new Blob([await (await fetch(url)).arrayBuffer()], { type: tipo }));
const FMTS = pl => pl.formatos || ['horizontal', 'vertical'];
const NOMBRE_FMT = { horizontal: '🖥️ Horizontal 1920×1080', vertical: '📱 Vertical 1080×1920', retrato: '📷 Feed 4:5 1080×1350', cuadrado: '⬛ Cuadrado 1080×1080' };
const ANCHO_PREVIA = { horizontal: '100%', vertical: '300px', retrato: '380px', cuadrado: '420px' };
// ¿Fondo completo? (MP4) — puede depender de las opciones (p. ej. intro con final transparente → .mov)
const esOpaco = (pl, o) => typeof pl.opaco === 'function' ? !!pl.opaco(o) : !!pl.opaco;
const textoDescarga = (pl, o) => esOpaco(pl, o) ? '⬇ Descargar .mp4' : '⬇ Descargar .mov con transparencia';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Tipografías propias (alojadas en el repo) para que el video salga igual en cualquier compu
const FUENTES = [
  ['Cherry Bomb One', 'fonts/cherry-bomb-one-latin-400-normal.woff2', '400'],
  ['Fredoka', 'fonts/fredoka-latin-600-normal.woff2', '600'],
  ['Fredoka', 'fonts/fredoka-latin-700-normal.woff2', '700'],
  ['Chakra Petch', 'fonts/chakra-petch-latin-700-normal.woff2', '700']
];
export const fuentesListas = Promise.all(FUENTES.map(([n, u, w]) => new FontFace(n, `url(${u})`, { weight: w }).load().then(f => document.fonts.add(f)).catch(() => {})));

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
const ES_IMG = c => c.tipo === 'imagen' || c.tipo === 'media';
const defecto = pl => Object.fromEntries(pl.campos.filter(c => !ES_IMG(c)).map(c => [c.k, c.def]));

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
async function prepararImagen(file, max = 1400) {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

// ---------- formulario a partir de los campos de la plantilla ----------
function formulario(pl) {
  return pl.campos.map(c => {
    const si = (c.si ? ' data-si="' + c.si + '"' : '') + (c.guia ? ' data-guia hidden' : '');
    if (c.tipo === 'texto') return '<label class="f"' + si + '><span>' + c.label + '</span><input type="text" name="' + c.k + '" maxlength="' + (c.max || 40) + '"></label>';
    // elegir: desplegable con opciones fijas + "Otro" que abre un campo de texto (el valor vive en el campo de texto)
    if (c.tipo === 'elegir') return '<div class="f"' + si + '><span>' + c.label + '</span><select data-elegir="' + c.k + '" aria-label="' + esc(c.label) + '"><option value="">Ninguno</option>' +
      c.opciones.map(v => '<option value="' + esc(v) + '">' + esc(v) + '</option>').join('') + '<option value="__otro">✏️ Otro (escribir)</option></select>' +
      '<input type="text" name="' + c.k + '" maxlength="' + (c.max || 40) + '" placeholder="Escribe el que quieras" aria-label="' + esc(c.label) + ' (texto)" hidden></div>';
    if (c.tipo === 'numero') return '<label class="f"' + si + '><span>' + c.label + '</span><input type="number" name="' + c.k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.paso + '"></label>';
    if (c.tipo === 'imagen') return '<div class="f"' + si + '><span>' + c.label + '</span><div class="imgpick"><label class="btn"><input type="file" accept="image/*" data-img="' + c.k + '" hidden>📁 Elegir imagen</label><button class="btn" type="button" data-quitar="' + c.k + '" hidden>✕ Quitar</button><small data-imgnom="' + c.k + '">Sin imagen</small></div></div>';
    if (c.tipo === 'media') return '<div class="f"' + si + '><span>' + c.label + '</span><div class="imgpick"><label class="btn"><input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" data-img="' + c.k + '" data-media hidden>📁 Elegir imagen o vídeo</label><button class="btn" type="button" data-quitar="' + c.k + '" hidden>✕ Quitar</button><small data-imgnom="' + c.k + '">Sin archivo</small></div></div>';
    if (c.tipo === 'lista') return '<label class="f"' + si + '><span>' + c.label + '</span><select name="' + c.k + '"><option value="">' + esc(c.vacio || 'Ninguno') + '</option>' + (c.opciones || []).map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join('') + '</select></label>';
    if (c.tipo === 'color') return '<label class="f fcolor"' + si + '><span>' + c.label + '</span><input type="color" name="' + c.k + '"></label>';
    return '<div class="f"' + si + '><span>' + c.label + '</span><div class="chips">' + c.opciones.map(([v, l]) => '<label><input type="radio" name="' + c.k + '" value="' + v + '">' + l + '</label>').join('') + '</div></div>';
  }).join('');
}
function leerForm(card, pl) {
  const o = {};
  pl.campos.forEach(c => {
    if (ES_IMG(c)) { o[c.k] = (card._imgs || {})[c.k] || null; return; }
    if (c.tipo === 'chips') { const i = $('input[name="' + c.k + '"]:checked', card); o[c.k] = i ? i.value : c.def; }
    else if (c.tipo === 'lista') { const i = $('select[name="' + c.k + '"]', card); o[c.k] = !i ? c.def : (c.cargar && !i.dataset.cargada) ? (i.dataset.quiero ?? c.def) : i.value; }
    else { const i = $('[name="' + c.k + '"]', card); o[c.k] = i ? i.value : c.def; }
  });
  // iconos de la galería (no enumerable: no se guarda en localStorage ni en las versiones)
  if (pl.galeria) Object.defineProperty(o, 'iconos', { value: (g, n) => (card._galeria || {})[g + ':' + normIcono(n)] || null, enumerable: false });
  return o;
}
// Pone el desplegable según el texto: opción de la lista, "Ninguno" u "Otro" (con el campo de texto visible)
function sincElegir(card, c) {
  const sel = $('select[data-elegir="' + c.k + '"]', card), inp = $('input[name="' + c.k + '"]', card); if (!sel || !inp) return;
  const v = inp.value.trim(), otro = !!v && !c.opciones.includes(v);
  sel.value = otro ? '__otro' : v; inp.hidden = !otro;
}
function ponerForm(card, pl, o) {
  pl.campos.forEach(c => {
    if (ES_IMG(c)) return;
    if (c.tipo === 'chips') $$('input[name="' + c.k + '"]', card).forEach(i => i.checked = i.value === String(o[c.k]));
    else if (c.tipo === 'lista') { const i = $('select[name="' + c.k + '"]', card); if (i) { i.dataset.quiero = o[c.k] ?? ''; i.value = o[c.k] ?? ''; } }
    else { const i = $('[name="' + c.k + '"]', card); if (i) i.value = o[c.k]; }
    if (c.tipo === 'elegir') sincElegir(card, c);
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

// ---------- vídeos dentro de las plantillas ----------
// Un campo "media" puede ser una imagen (ImageBitmap) o un vídeo: {video: <video>, esVideo: true}.
// En la vista previa el vídeo se reproduce en bucle; al exportar se pausa y se busca cada fotograma exacto.
const videosDe = (pl, o) => pl.campos.filter(c => c.tipo === 'media' && o[c.k] && o[c.k].esVideo).map(c => o[c.k].video);
function buscar(v, seg) {
  return new Promise(res => {
    const d = v.duration || 0, x = d ? (seg % d) : 0;
    if (Math.abs(v.currentTime - x) < 1e-3 && v.readyState >= 2) return res();
    let listo = false; const fin = () => { if (listo) return; listo = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, 1500); v.currentTime = x;
  });
}
async function sincronizarMedia(pl, o, t) {
  const vs = videosDe(pl, o); if (!vs.length) return;
  if (t === 'pausa') { vs.forEach(v => v.pause()); return; }
  if (t === 'seguir') { vs.forEach(v => { v.play().catch(() => {}); }); return; }
  await Promise.all(vs.map(v => buscar(v, t)));
}
async function hacerFuenteVideo(blob) {
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.src = URL.createObjectURL(blob);
  await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('video')); setTimeout(res, 8000); });
  v.play().catch(() => {});
  return { esVideo: true, video: v, nombre: '' };
}

// ---------- exportar ----------
// Nombre del archivo: incluye la variante (p. ej. el clip) si la plantilla tiene variantes
const sufijo = (pl, o) => { const v = pl.variantes && pl.variantes.valores.find(([val]) => val === String(o[pl.variantes.k])); return v ? '-' + v[1] : ''; };
async function exportar(pl, card, fmtElegido, tipo, extra) {
  if (ocupado) return;
  ocupado = true;
  const o = Object.assign(leerForm(card, pl), extra || {}), fmt = fmtElegido || $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
  const barra = $('.progreso', card), txt = $('.ptxt', card), bi = $('.progreso i', card), btn = $$('[data-mov],[data-ambos],[data-webm],[data-variantes]', card);
  const aviso = (t, p) => { txt.textContent = t; if (p != null) bi.style.width = Math.round(p * 100) + '%'; };
  btn.forEach(b => b.disabled = true); barra.hidden = false;
  const webm = tipo === 'webm', mp4 = !webm && esOpaco(pl, o), ext = webm ? '.webm' : mp4 ? '.mp4' : '.mov', nombre = pl.id + sufijo(pl, o) + '-' + fmt + ext;
  try {
    await fuentesListas;
    const f = await conversor(aviso);
    if (pl.preparar) { aviso('Cargando imágenes…', null); await pl.preparar(o); }
    const L = pl.duracion(o), n = Math.round(L * pl.fps);
    const cv = document.createElement('canvas'); cv.width = F.w; cv.height = F.h;
    const ctx = cv.getContext('2d');
    await sincronizarMedia(pl, o, 'pausa');
    for (let i = 0; i < n; i++) {
      ctx.clearRect(0, 0, F.w, F.h);
      await sincronizarMedia(pl, o, i / pl.fps);
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
    const prog = ({ progress }) => aviso((mp4 ? 'Armando el video MP4… ' : webm ? 'Armando el WebM con transparencia… ' : 'Armando el video con transparencia… ') + Math.min(99, Math.round(progress * 100)) + '%', 0.5 + 0.48 * Math.min(1, progress));
    f.on('progress', prog);
    const salida = 'salida' + ext;
    await f.exec(['-framerate', String(pl.fps), '-i', 'f%04d.png', ...(conAudio ? ['-i', 'audio.wav', '-map', '0:v', '-map', '1:a', '-c:a', webm ? 'libvorbis' : mp4 ? 'aac' : 'pcm_s16le', ...(mp4 || webm ? ['-b:a', '160k'] : [])] : []),
      ...(webm ? ['-c:v', 'libvpx', '-pix_fmt', 'yuva420p', '-b:v', '12M', '-crf', '8', '-deadline', 'realtime', '-cpu-used', '16', '-auto-alt-ref', '0']
        : mp4 ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '15', '-movflags', '+faststart']
        : ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-qscale:v', '9', '-vendor', 'apl0']), '-y', salida]);
    f.off('progress', prog);
    const data = await f.readFile(salida);
    for (let i = 0; i < n; i++) { try { await f.deleteFile('f' + pad(i) + '.png'); } catch (e) {} }
    try { await f.deleteFile(salida); } catch (e) {}
    if (conAudio) { try { await f.deleteFile('audio.wav'); } catch (e) {} }
    const url = URL.createObjectURL(new Blob([data.buffer], { type: webm ? 'video/webm' : mp4 ? 'video/mp4' : 'video/quicktime' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    aviso('¡Listo! Se descargó ' + nombre + ' (' + (data.length / 1048576).toFixed(1) + ' MB · ' + L.toFixed(1) + ' s).', 1);
  } catch (e) {
    console.error(e);
    aviso('No se pudo convertir: ' + (e && e.message ? e.message : e) + '. Recarga la página y prueba otra vez.', null);
  } finally { ocupado = false; btn.forEach(b => b.disabled = false); sincronizarMedia(pl, o, 'seguir'); }
}

// ---------- tarjeta de cada plantilla ----------
function tarjeta(pl) {
  // cada tarjeta es un <form> para que sus opciones no se mezclen con las de otras tarjetas
  const card = document.createElement('form');
  card.className = 'card anim'; card.addEventListener('submit', e => e.preventDefault());
  card.innerHTML =
    '<div class="animtop"><div><h2>' + esc(pl.nombre) + '</h2><p class="nota">' + esc(pl.desc) + '</p></div>' +
    '<button class="btn" type="button" data-reset>↺ Restablecer</button></div>' +
    '<div class="versiones"><span>⭐ Mis versiones</span><select data-ver aria-label="Versión guardada"><option value="">Elegir versión guardada…</option></select>' +
    '<input type="text" data-vernom maxlength="30" aria-label="Nombre de la versión" placeholder="Nombre (ej. Código Halloween)"><button class="btn" type="button" data-verguardar>💾 Guardar versión</button><button class="btn" type="button" data-verborrar hidden>🗑 Borrar</button></div>' +
    '<div class="animgrid"><div class="animform opts">' + (pl.campos.some(c => c.guia) ? '<p class="nota guianota">🎯 El personaje y su retrato se eligen arriba, en la <b>Guía de mejora</b>.</p>' : '') + formulario(pl) + '</div>' +
    '<div class="animside"><div class="chips">' + FMTS(pl).map((k, i) => '<label><input type="radio" name="fmt-' + pl.id + '" value="' + k + '"' + ((pl.fmtDef ? k === pl.fmtDef : !i) ? ' checked' : '') + '>' + NOMBRE_FMT[k] + '</label>').join('') + '</div>' +
    '<div class="animprev"><canvas></canvas></div>' +
    '<div class="acciones"><button class="btn pri" type="button" data-mov>⬇ Descargar</button><button class="btn" type="button" data-webm title="WebM con transparencia: para OBS (transiciones de escena, fuentes multimedia)">⬇ .webm para OBS</button>' + (FMTS(pl).length > 1 ? '<button class="btn" type="button" data-ambos>' + (FMTS(pl).length > 2 ? '⬇ Todos los formatos' : '⬇ Horizontal + vertical') + '</button>' : '') + (pl.variantes ? '<button class="btn" type="button" data-variantes>' + esc(pl.variantes.todos) + '</button>' : '') + '<button class="btn" type="button" data-png>🖼 Imagen PNG</button><button class="btn" type="button" data-replay>↻ Repetir</button>' + (pl.sonido ? '<button class="btn" type="button" data-oir>🔊 Repetir con sonido</button>' : '') + '</div>' +
    '<label class="momento"><span>🖼 Momento de la imagen</span><input type="range" data-momento min="0" max="100" step="1"><output></output></label>' +
    '<div class="progreso" hidden><i></i></div><p class="nota ptxt" aria-live="polite"></p></div></div>';
  const clave = 'kyo_anim_' + pl.id;
  pl.campos.filter(c => c.tipo === 'elegir').forEach(c => {
    const sel = $('select[data-elegir="' + c.k + '"]', card), inp = $('input[name="' + c.k + '"]', card);
    sel.addEventListener('change', () => {
      if (sel.value === '__otro') { inp.hidden = false; if (c.opciones.includes(inp.value.trim())) inp.value = ''; inp.focus(); }
      else { inp.hidden = true; inp.value = sel.value; }
    });
  });
  ponerForm(card, pl, Object.assign(defecto(pl), leer(clave) || {}));
  const cv = $('canvas', card), ctx = cv.getContext('2d');
  let t0 = performance.now(), o = leerForm(card, pl);
  const refrescar = () => {
    o = leerForm(card, pl); guardar(clave, Object.fromEntries(Object.entries(o).filter(([k]) => !(card._imgs && k in card._imgs) && !pl.campos.some(c => c.k === k && ES_IMG(c)))));
    $('[data-mov]', card).textContent = textoDescarga(pl, o);
    if (card._pintarMom) card._pintarMom();
    if (card._galPintar) card._galPintar();
    $('[data-webm]', card).hidden = esOpaco(pl, o);
    $$('[data-si]', card).forEach(el => { const [k, v] = el.dataset.si.split('='); el.hidden = !v.split('|').includes(String(o[k])); });
    const fmt = $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
    cv.width = F.w / 3; cv.height = F.h / 3; cv.dataset.fmt = fmt;
    cv.style.maxWidth = ANCHO_PREVIA[fmt] || '100%';
  };
  card.addEventListener('input', refrescar);
  card.addEventListener('change', refrescar);
  $('[data-replay]', card).addEventListener('click', () => { t0 = performance.now(); });
  // los campos de la Guía de mejora no se tocan al restablecer ni al cargar una versión
  const conGuia = o => { const act = leerForm(card, pl); pl.campos.forEach(c => { if (c.guia && !ES_IMG(c)) o[c.k] = act[c.k]; }); return o; };
  $('[data-reset]', card).addEventListener('click', () => { ponerForm(card, pl, conGuia(defecto(pl))); refrescar(); t0 = performance.now(); });
  $('[data-mov]', card).addEventListener('click', () => exportar(pl, card));
  // imagen PNG de un momento concreto (el control muestra ese fotograma en la vista previa)
  const mom = $('[data-momento]', card), momOut = $('.momento output', card);
  mom.value = pl.fotoMomento ?? 70;
  const pintarMom = () => { const L = pl.duracion(o); momOut.textContent = (mom.value / 100 * L).toFixed(1) + ' s'; };
  mom.addEventListener('input', e => { e.stopPropagation(); card._fijo = { p: mom.value / 100, hasta: performance.now() + 1800 }; pintarMom(); });
  pintarMom(); card._pintarMom = pintarMom;
  $('[data-png]', card).addEventListener('click', async () => {
    await fuentesListas;
    const fmt = $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt], L = pl.duracion(o);
    const c = document.createElement('canvas'); c.width = F.w; c.height = F.h; const tp = Math.min(L - .001, mom.value / 100 * L);
    await sincronizarMedia(pl, o, 'pausa'); await sincronizarMedia(pl, o, tp);
    if (pl.preparar) await pl.preparar(o);
    pl.dibujar(c.getContext('2d'), tp, o, fmt, F.w, F.h);
    sincronizarMedia(pl, o, 'seguir');
    const blob = await new Promise(r => c.toBlob(r, 'image/png')), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = pl.id + sufijo(pl, o) + '-' + fmt + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('.ptxt', card).textContent = '🖼 Imagen descargada (' + F.w + '×' + F.h + ', segundo ' + (mom.value / 100 * L).toFixed(1) + ').';
  });
  $('[data-webm]', card).addEventListener('click', () => exportar(pl, card, null, 'webm'));
  const ambos = $('[data-ambos]', card);
  if (ambos) ambos.addEventListener('click', async () => { if (ocupado) return; for (const f of FMTS(pl)) await exportar(pl, card, f); });
  const variantes = $('[data-variantes]', card);
  if (variantes) variantes.addEventListener('click', async () => { if (ocupado) return; for (const [v] of pl.variantes.valores) await exportar(pl, card, null, null, { [pl.variantes.k]: v }); });
  // versiones guardadas (textos y opciones; las imágenes se quedan como estén)
  const claveV = 'kyo_versiones_' + pl.id, sel = $('[data-ver]', card), nom = $('[data-vernom]', card), borrar = $('[data-verborrar]', card);
  const pintarV = elegida => {
    const v = leer(claveV) || {};
    sel.innerHTML = '<option value="">' + (Object.keys(v).length ? 'Elegir versión guardada…' : 'Aún no hay versiones guardadas') + '</option>' + Object.keys(v).sort().map(n => '<option' + (n === elegida ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    borrar.hidden = !sel.value;
  };
  sel.addEventListener('change', e => { e.stopPropagation(); const v = leer(claveV) || {}; borrar.hidden = !sel.value; if (!sel.value || !v[sel.value]) return;
    ponerForm(card, pl, conGuia(Object.assign(defecto(pl), v[sel.value]))); nom.value = sel.value; refrescar(); t0 = performance.now(); });
  $('[data-verguardar]', card).addEventListener('click', () => {
    const n = nom.value.trim(); if (!n) { nom.focus(); $('.ptxt', card).textContent = 'Escribe un nombre para la versión.'; return; }
    const v = leer(claveV) || {}; v[n] = Object.fromEntries(Object.entries(leerForm(card, pl)).filter(([k]) => !pl.campos.some(c => c.k === k && ES_IMG(c))));
    guardar(claveV, v); pintarV(n); $('.ptxt', card).textContent = '⭐ Versión "' + n + '" guardada.';
  });
  borrar.addEventListener('click', () => { const v = leer(claveV) || {}; const n = sel.value; if (!n) return; delete v[n]; guardar(claveV, v); nom.value = ''; pintarV(); $('.ptxt', card).textContent = 'Versión "' + n + '" borrada.'; });
  nom.addEventListener('input', e => e.stopPropagation());
  pintarV();
  if (pl.sonido) $('[data-oir]', card).addEventListener('click', async () => {
    const ok = await oir(pl, o).catch(() => false); t0 = performance.now();
    if (!ok) $('.ptxt', card).textContent = (o.sonido === 'ninguno' || o.musica === 'ninguna') ? 'Sin música ni sonido elegido: el video saldrá mudo.' : 'Tu navegador no pudo generar el sonido.';
  });
  // imágenes
  card._imgs = {};
  const ponerImg = async (k, blob, nombre) => {
    const ant = card._imgs[k]; if (ant && ant.esVideo) { ant.video.pause(); URL.revokeObjectURL(ant.video.src); }
    const vid = blob && /^video\//.test(blob.type);
    try { card._imgs[k] = blob ? (vid ? await hacerFuenteVideo(blob) : await createImageBitmap(blob)) : null; }
    catch (e) { card._imgs[k] = null; $('[data-imgnom="' + k + '"]', card).textContent = 'No se pudo abrir ese archivo'; refrescar(); return; }
    const media = pl.campos.some(c => c.k === k && c.tipo === 'media');
    $('[data-imgnom="' + k + '"]', card).textContent = blob ? (vid ? '🎬 ' : '') + (nombre || (vid ? 'Vídeo guardado' : 'Imagen guardada')) : (media ? 'Sin archivo' : 'Sin imagen');
    $('[data-quitar="' + k + '"]', card).hidden = !blob;
    refrescar();
  };
  $$('[data-img]', card).forEach(inp => {
    const k = inp.dataset.img, idb = pl.id + ':' + k;
    if (!pl.campos.some(c => c.k === k && c.guia)) imgLeer(idb).then(v => { if (v && v.blob) ponerImg(k, v.blob, v.nombre); });
    inp.addEventListener('change', async () => {
      const file = inp.files && inp.files[0]; if (!file) return;
      try {
        let blob;
        if (inp.hasAttribute('data-media') && /^video\//.test(file.type)) {
          if (file.size > 300 * 1048576) throw new Error('grande');
          blob = file.slice(0, file.size, file.type);
        } else blob = await prepararImagen(file, inp.hasAttribute('data-media') ? 2000 : 1400);
        $('[data-imgnom="' + k + '"]', card).textContent = 'Cargando…';
        await imgGuardar(idb, { blob, nombre: file.name }); await ponerImg(k, blob, file.name);
      }
      catch (e) { $('[data-imgnom="' + k + '"]', card).textContent = e && e.message === 'grande' ? 'Vídeo demasiado grande (máx. 300 MB)' : 'No se pudo abrir ese archivo'; }
      inp.value = '';
    });
    $('[data-quitar="' + k + '"]', card).addEventListener('click', async () => { await imgBorrar(idb); ponerImg(k, null); });
  });
  if (pl.galeria) montarGaleria(pl, card, refrescar);
  // para la Guía de mejora: leer y poner valores desde fuera, y poner la imagen compartida
  card._api = {
    pl,
    leer: () => leerForm(card, pl),
    poner: parcial => { ponerForm(card, pl, Object.assign(leerForm(card, pl), parcial)); refrescar(); },
    imagen: (k, blob, nombre) => ponerImg(k, blob, nombre)
  };
  pl.campos.filter(c => c.tipo === 'lista' && c.cargar).forEach(c => {
    const sel = $('select[name="' + c.k + '"]', card);
    sel.insertAdjacentHTML('beforeend', '<option disabled data-aviso>Cargando la lista…</option>');
    c.cargar().then(ops => {
      $('[data-aviso]', sel).remove();
      sel.insertAdjacentHTML('beforeend', ops.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join(''));
      sel.dataset.cargada = '1'; sel.value = sel.dataset.quiero || ''; refrescar();
    }).catch(() => { $('[data-aviso]', sel).textContent = 'No se pudo cargar la lista: recarga la página o sube la imagen a mano'; });
  });
  refrescar();
  // vista previa en bucle (con una pausa corta entre repeticiones)
  const bucle = now => {
    if (!card.isConnected) return;
    if (!ocupado && card._visible !== false && !card.closest('[hidden]')) {
      const fmt = cv.dataset.fmt, F = FORMATOS[fmt], L = pl.duracion(o);
      let t = (now - t0) / 1000; if (t > L + .8) { t0 = now; t = 0; }
      if (card._fijo && now < card._fijo.hasta) t = card._fijo.p * L;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.scale(cv.width / F.w, cv.height / F.h);
      try { pl.dibujar(ctx, Math.min(t, L), o, fmt, F.w, F.h); } catch (e) { console.error(e); }
    }
    requestAnimationFrame(bucle);
  };
  // solo se anima la vista previa de las tarjetas que están en pantalla
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { card._visible = e.isIntersecting; })).observe(cv);
  fuentesListas.then(() => requestAnimationFrame(bucle));
  return card;
}

// ---------- galería de iconos (sets y atributos) ----------
// Cada icono se guarda con su nombre normalizado ("icono:atributo:dano critico") y aparece solo
// cada vez que ese nombre se escribe en cualquier campo de la galería, en cualquier personaje.
function montarGaleria(pl, card, refrescar) {
  card._galeria = {};
  const caja = document.createElement('div'); caja.className = 'galeria';
  caja.innerHTML = '<span class="galtit">🎨 Iconos</span><p class="nota">Sube el icono de cada set o atributo una sola vez: se guarda con su nombre y aparece solo cada vez que lo escribas. Los atributos sin icono propio usan uno dibujado.</p><div data-gallista></div>';
  $('.animform', card).appendChild(caja);
  const lista = $('[data-gallista]', caja), leidos = new Set();
  const clave = id => 'icono:' + id;
  const nombres = () => {
    const o = leerForm(card, pl), vistos = new Set(), out = [];
    pl.galeria.grupos.forEach(g => g.campos.forEach(k => {
      const n = String(o[k] || '').trim(), id = g.id + ':' + normIcono(n);
      if (n && !vistos.has(id)) { vistos.add(id); out.push({ g, n, id, et: g.etiqueta ? g.etiqueta(n) : n }); }
    }));
    return out;
  };
  const pintar = () => {
    const ns = nombres();
    ns.forEach(x => {
      if (leidos.has(x.id)) return; leidos.add(x.id);
      imgLeer(clave(x.id)).then(async v => { if (!v || !v.blob) return; try { card._galeria[x.id] = await createImageBitmap(v.blob); lista._firma = null; refrescar(); } catch (e) {} });
    });
    const firma = ns.map(x => x.id + (card._galeria[x.id] ? '*' : '') + '=' + x.n).join('|');
    if (firma === lista._firma) return; lista._firma = firma;
    lista.innerHTML = pl.galeria.grupos.map(g => {
      const de = ns.filter(x => x.g === g); if (!de.length) return '';
      return '<div class="galgrupo"><small>' + esc(g.label) + '</small>' + de.map(x => {
        const tiene = !!card._galeria[x.id];
        return '<div class="galfila" data-id="' + esc(x.id) + '"><canvas width="88" height="88" aria-hidden="true"></canvas><span>' + esc(x.et) + '<small>' + (tiene ? 'Icono tuyo' : g.id === 'set' ? 'Sin icono (se ve un disco)' : 'Icono dibujado') + '</small></span>' +
          '<label class="btn" title="Subir icono para ' + esc(x.et) + '"><input type="file" accept="image/*" hidden>📁 ' + (tiene ? 'Cambiar' : 'Subir') + '</label>' +
          (tiene ? '<button class="btn" type="button" data-galquitar aria-label="Quitar el icono de ' + esc(x.et) + '">✕</button>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('');
    $$('.galfila', lista).forEach(fila => {
      const x = ns.find(n => n.id === fila.dataset.id); if (!x) return;
      pl.galeria.pintar($('canvas', fila).getContext('2d'), x.g.id, x.n, card._galeria[x.id] || null, 88);
    });
  };
  let espera = null;
  card._galPintar = () => { clearTimeout(espera); espera = setTimeout(pintar, 200); };
  lista.addEventListener('change', async e => {
    const inp = e.target.closest('input[type=file]'); if (!inp) return; e.stopPropagation();
    const id = inp.closest('.galfila').dataset.id, file = inp.files && inp.files[0]; if (!file) return;
    try {
      const blob = await prepararImagen(file, 400);
      await imgGuardar(clave(id), { blob, nombre: file.name });
      card._galeria[id] = await createImageBitmap(blob);
    } catch (err) { $('.ptxt', card).textContent = 'No se pudo abrir esa imagen.'; }
    lista._firma = null; refrescar();
  });
  lista.addEventListener('click', async e => {
    const b = e.target.closest('[data-galquitar]'); if (!b) return;
    const id = b.closest('.galfila').dataset.id;
    await imgBorrar(clave(id)); delete card._galeria[id]; lista._firma = null; refrescar();
  });
  pintar();
}

// ---------- pestaña Mis músicas: música propia en MP3 ----------
const ESTILOS = [['burbuja', '🫧 Burbuja', 'Alegre y saltarina (la de la intro)'], ['alegre', '🎶 Pop', 'Pop brillante con batería'], ['chill', '🌙 Chill', 'Lofi suave (la de la outro)'], ['halloween', '🎃 Halloween', 'Misteriosa y juguetona'], ['navidad', '🎄 Navidad', 'Campanitas y cascabeles']];
let musicaAbierta = false;
function abrirMusica() {
  if (musicaAbierta) return; musicaAbierta = true;
  const app = $('#musicaApp'), st = Object.assign({ estilo: 'burbuja', dur: 60, vol: 80 }, leer('kyo_musica') || {});
  app.innerHTML = '<form class="musform" onsubmit="return false">' +
    '<div class="f"><span>Estilo</span><div class="chips">' + ESTILOS.map(([v, l]) => '<label><input type="radio" name="estilo" value="' + v + '"' + (v === st.estilo ? ' checked' : '') + '>' + l + '</label>').join('') + '</div><small class="nota" data-desc></small></div>' +
    '<div class="fila3"><label class="f"><span>Duración (segundos)</span><input type="number" name="dur" min="10" max="300" step="5" value="' + st.dur + '"></label>' +
    '<label class="f"><span>Volumen (%)</span><input type="number" name="vol" min="5" max="100" step="5" value="' + st.vol + '"></label></div>' +
    '<div class="acciones"><button class="btn" type="button" data-oir>▶ Escuchar</button><button class="btn" type="button" data-parar hidden>■ Parar</button><button class="btn pri" type="button" data-mp3>⬇ Descargar MP3</button></div>' +
    '<div class="progreso" hidden><i></i></div><p class="nota ptxt" aria-live="polite">La música es 100 % tuya: se compone en tu navegador y puedes usarla donde quieras.</p></form>';
  const leerM = () => ({ estilo: ($('input[name=estilo]:checked', app) || {}).value || 'burbuja', dur: Math.max(10, Math.min(300, Number($('[name=dur]', app).value) || 60)), vol: Math.max(5, Math.min(100, Number($('[name=vol]', app).value) || 80)) });
  const desc = () => { const m = leerM(); $('[data-desc]', app).textContent = (ESTILOS.find(e => e[0] === m.estilo) || [])[2] || ''; guardar('kyo_musica', m); };
  app.addEventListener('input', desc); app.addEventListener('change', desc); desc();
  const txt = $('.ptxt', app), barra = $('.progreso', app), bi = $('.progreso i', app);
  const aviso = (t, p) => { txt.textContent = t; if (p != null) { barra.hidden = false; bi.style.width = Math.round(p * 100) + '%'; } };
  let cache = null;
  const crear = async () => { const m = leerM(), clave = JSON.stringify(m); if (cache && cache.clave === clave) return cache.buf;
    aviso('Componiendo ' + m.dur + ' s de música…', .1);
    const buf = await renderSonido(m.dur, (ac, out) => musicaFondo(ac, out, m.dur, m.estilo, 1.5 * m.vol / 100)); cache = { clave, buf }; return buf; };
  const parar = () => { if (sonando) { try { sonando.stop(); } catch (e) {} sonando = null; } $('[data-parar]', app).hidden = true; };
  $('[data-oir]', app).addEventListener('click', async () => {
    parar(); const buf = await crear(); if (!buf) { aviso('Tu navegador no pudo crear la música.'); return; }
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') await audioCtx.resume();
    const src = audioCtx.createBufferSource(); src.buffer = buf; src.connect(audioCtx.destination); src.start(); sonando = src; src.onended = () => { if (sonando === src) parar(); };
    $('[data-parar]', app).hidden = false; aviso('▶ Sonando (' + leerM().dur + ' s).', 1);
  });
  $('[data-parar]', app).addEventListener('click', parar);
  $('[data-mp3]', app).addEventListener('click', async () => {
    if (ocupado) return; ocupado = true; const b = $('[data-mp3]', app); b.disabled = true;
    try {
      const m = leerM(), buf = await crear(), f = await conversor(aviso);
      aviso('Convirtiendo a MP3…', .6); await f.writeFile('musica.wav', aWav(buf));
      await f.exec(['-i', 'musica.wav', '-c:a', 'libmp3lame', '-b:a', '192k', '-y', 'musica.mp3']);
      const data = await f.readFile('musica.mp3'); try { await f.deleteFile('musica.wav'); await f.deleteFile('musica.mp3'); } catch (e) {}
      const nombre = 'musica-' + m.estilo + '-' + m.dur + 's.mp3', url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mpeg' })), a = document.createElement('a');
      a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      aviso('¡Listo! Se descargó ' + nombre + ' (' + (data.length / 1048576).toFixed(1) + ' MB).', 1);
    } catch (e) { console.error(e); aviso('No se pudo crear el MP3: ' + (e && e.message ? e.message : e) + '. Recarga la página y prueba otra vez.'); }
    finally { ocupado = false; b.disabled = false; }
  });
}

// ---------- Guía de mejora (pestaña ZZZ) ----------
// Se elige el personaje una vez y todas las plantillas ZZZ lo usan (campos con guia: true).
// "Guías guardadas" guarda, por personaje, la guía y los textos y opciones de todas las plantillas ZZZ.
const CAMPOS_GUIA = ['personaje', 'agente', 'elemento', 'especialidad'];
function montarGuia(cards) {
  const caja = document.createElement('div');
  caja.className = 'card guiazzz';
  caja.innerHTML = '<div class="guiatop"><canvas width="128" height="128" aria-hidden="true"></canvas><div><h2>🎯 Guía de mejora</h2>' +
    '<p class="nota">Elige aquí el personaje: la Guía de discos, Habilidades y Amplificadores lo usan a la vez. Guarda la guía con su nombre y recupérala entera (discos, habilidades, amplificadores y equipo) cuando vuelvas a ese personaje.</p></div></div>' +
    '<form class="guiaform" onsubmit="return false">' +
    '<label class="f"><span>Personaje</span><input type="text" name="personaje" maxlength="28"></label>' +
    '<label class="f"><span>Retrato (del repo de assets)</span><select name="agente"><option value="">Sin retrato</option></select></label>' +
    '<div class="f"><span>…o tu imagen (tiene prioridad)</span><div class="imgpick"><label class="btn"><input type="file" accept="image/*" hidden>📁 Elegir imagen</label><button class="btn" type="button" data-quitar hidden>✕ Quitar</button><small data-imgnom>Sin imagen</small></div></div>' +
    '<label class="f"><span>Elemento</span><select name="elemento"><option value="">Ninguno</option></select></label>' +
    '<label class="f"><span>Especialidad</span><select name="especialidad"><option value="">Ninguna</option></select></label>' +
    '</form>' +
    '<div class="versiones"><span>📚 Guías guardadas</span><select data-gsel aria-label="Guía guardada"></select><input type="text" data-gnom maxlength="30" aria-label="Nombre de la guía" placeholder="Nombre (ej. Roxy)">' +
    '<button class="btn" type="button" data-gguardar>💾 Guardar guía</button><button class="btn" type="button" data-gborrar hidden>🗑 Borrar</button></div><p class="nota ptxt" aria-live="polite"></p>';
  const form = $('.guiaform', caja), cv = $('canvas', caja), txt = $('.ptxt', caja), aviso = t => { txt.textContent = t; };
  const IMG = 'guia:imagen', ESTADO = 'kyo_guia_zzz', GUIAS = 'kyo_guias_zzz';
  let img = null, imgNom = '';
  const leerG = () => Object.fromEntries(CAMPOS_GUIA.map(k => { const i = $('[name="' + k + '"]', form); return [k, i.tagName === 'SELECT' && !i.dataset.cargada ? (i.dataset.quiero || '') : i.value]; }));
  const ponerG = g => CAMPOS_GUIA.forEach(k => { const i = $('[name="' + k + '"]', form), v = (g && g[k]) || ''; if (i.tagName === 'SELECT') i.dataset.quiero = v; i.value = v; });
  // miniatura del retrato
  const pintar = async () => {
    const g = leerG(), c = cv.getContext('2d'); c.clearRect(0, 0, 128, 128);
    const bmp = img || (g.agente ? await ZZZ.cargar('retrato', g.agente) : null);
    c.save(); c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fillStyle = '#6FE3F0'; c.fill(); c.clip();
    if (bmp) { const k = Math.max(120 / bmp.width, 120 / bmp.height); c.drawImage(bmp, 64 - bmp.width * k / 2, 64 - bmp.height * k / 2, bmp.width * k, bmp.height * k); }
    c.restore(); c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = '#ffffff'; c.stroke();
  };
  // reparte la guía a todas las plantillas ZZZ que tengan esos campos
  const repartir = () => {
    const g = leerG();
    cards.forEach(card => {
      const pl = card._api.pl, parcial = {};
      CAMPOS_GUIA.forEach(k => { if (pl.campos.some(c => c.k === k && c.guia)) parcial[k] = g[k]; });
      if (Object.keys(parcial).length) card._api.poner(parcial);
      if (pl.campos.some(c => c.k === 'imagen' && c.guia)) card._api.imagen('imagen', imgBlob, imgNom);
    });
    try { localStorage.setItem(ESTADO, JSON.stringify(g)); } catch (e) {}
    pintar();
  };
  let imgBlob = null;
  const ponerImagen = async (blob, nombre) => {
    imgBlob = blob || null; imgNom = nombre || '';
    try { img = blob ? await createImageBitmap(blob) : null; } catch (e) { img = null; imgBlob = null; }
    $('[data-imgnom]', caja).textContent = img ? (imgNom || 'Imagen guardada') : 'Sin imagen'; $('[data-quitar]', caja).hidden = !img;
  };
  // listas del repo
  [['agente', 'retrato'], ['elemento', 'elemento'], ['especialidad', 'especialidad']].forEach(([k, tipo]) => {
    const sel = $('[name="' + k + '"]', form);
    sel.insertAdjacentHTML('beforeend', '<option disabled data-aviso>Cargando la lista…</option>');
    ZZZ.lista(tipo).then(ops => {
      $('[data-aviso]', sel).remove(); sel.insertAdjacentHTML('beforeend', ops.map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join(''));
      sel.dataset.cargada = '1'; sel.value = sel.dataset.quiero || ''; pintar();
    }).catch(() => { $('[data-aviso]', sel).textContent = 'No se pudo cargar la lista: recarga la página o sube la imagen a mano'; });
  });
  form.addEventListener('input', repartir); form.addEventListener('change', e => { if (!e.target.matches('input[type=file]')) repartir(); });
  $('input[type=file]', caja).addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const blob = await prepararImagen(file, 1400); await imgGuardar(IMG, { blob, nombre: file.name }); await ponerImagen(blob, file.name); repartir(); }
    catch (err) { aviso('No se pudo abrir esa imagen.'); }
    e.target.value = '';
  });
  $('[data-quitar]', caja).addEventListener('click', async () => { await imgBorrar(IMG); await ponerImagen(null); repartir(); });
  // guías guardadas
  const leerGuias = () => leer(GUIAS) || {}, sel = $('[data-gsel]', caja), nom = $('[data-gnom]', caja), borrar = $('[data-gborrar]', caja);
  const pintarGuias = elegida => {
    const v = leerGuias();
    sel.innerHTML = '<option value="">' + (Object.keys(v).length ? 'Elegir guía guardada…' : 'Aún no hay guías guardadas') + '</option>' + Object.keys(v).sort().map(n => '<option' + (n === elegida ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    borrar.hidden = !sel.value;
  };
  const sinCompartidos = card => { const pl = card._api.pl, o = card._api.leer();
    return Object.fromEntries(Object.entries(o).filter(([k]) => !pl.campos.some(c => c.k === k && (c.guia || c.tipo === 'imagen' || c.tipo === 'media')))); };
  $('[data-gguardar]', caja).addEventListener('click', async () => {
    const n = (nom.value.trim() || leerG().personaje.trim()); if (!n) { nom.focus(); aviso('Escribe un nombre para la guía.'); return; }
    const v = leerGuias(); v[n] = { guia: leerG(), plantillas: Object.fromEntries(cards.map(c => [c._api.pl.id, sinCompartidos(c)])) };
    guardar(GUIAS, v);
    if (imgBlob) await imgGuardar('guia-img:' + n, { blob: imgBlob, nombre: imgNom }); else await imgBorrar('guia-img:' + n);
    nom.value = n; pintarGuias(n); aviso('📚 Guía "' + n + '" guardada: personaje, discos, habilidades, amplificadores y equipo.');
  });
  sel.addEventListener('change', async () => {
    borrar.hidden = !sel.value; const v = leerGuias()[sel.value]; if (!v) return;
    ponerG(v.guia);
    const im = await imgLeer('guia-img:' + sel.value); await ponerImagen(im && im.blob, im && im.nombre);
    if (im && im.blob) await imgGuardar(IMG, im); else await imgBorrar(IMG);
    cards.forEach(c => { const datos = v.plantillas && v.plantillas[c._api.pl.id]; if (datos) c._api.poner(datos); });
    repartir(); nom.value = sel.value; aviso('📚 Guía "' + sel.value + '" cargada en todas las plantillas ZZZ.');
  });
  borrar.addEventListener('click', async () => {
    const n = sel.value; if (!n) return; const v = leerGuias(); delete v[n]; guardar(GUIAS, v); await imgBorrar('guia-img:' + n);
    nom.value = ''; pintarGuias(); aviso('Guía "' + n + '" borrada.');
  });
  nom.addEventListener('input', e => e.stopPropagation());
  // estado inicial: la guía guardada o, la primera vez, lo que ya había en la Guía de discos
  (async () => {
    let g = leer(ESTADO);
    if (!g) { const gd = cards.find(c => c._api.pl.id === 'guia-discos'); g = gd ? Object.fromEntries(CAMPOS_GUIA.map(k => [k, gd._api.leer()[k] || ''])) : {}; }
    ponerG(g);
    let im = await imgLeer(IMG);
    if (!im) { const viejo = await imgLeer('guia-discos:imagen'); if (viejo && viejo.blob) { im = viejo; await imgGuardar(IMG, viejo); } }
    await ponerImagen(im && im.blob, im && im.nombre);
    pintarGuias(); repartir();
  })();
  return caja;
}

let anunciosAbierto = false;
window.kyoAnim = {
  abrir() {
    if (abierto) return; abierto = true;
    const cont = $('#animLista'); cont.innerHTML = '';
    // pestañas: las plantillas con grupo 'zzz' van en su propia pestaña para no mezclarse con las generales
    const PEST = [['general', '🎬 Generales'], ['zzz', '🎮 ZZZ']], barra = document.createElement('div');
    barra.className = 'subtabs animpest'; barra.setAttribute('role', 'group'); barra.setAttribute('aria-label', 'Tipo de animaciones');
    barra.innerHTML = '<div class="subbtns">' + PEST.map(([k, l]) => '<button type="button" data-pest="' + k + '" aria-pressed="false">' + l + '</button>').join('') + '</div>';
    cont.before(barra);
    const cards = PLANTILLAS.map(pl => { const c = tarjeta(pl); c.dataset.grupo = pl.grupo || 'general'; cont.appendChild(c); return c; });
    const guia = montarGuia(cards.filter(c => c.dataset.grupo === 'zzz'));
    cont.prepend(guia);
    const elegir = k => {
      $$('[data-pest]', barra).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pest === k)));
      cards.forEach(c => { c.hidden = c.dataset.grupo !== k; });
      guia.hidden = k !== 'zzz';
      try { localStorage.setItem('kyo_anim_pestana', k); } catch (e) {}
    };
    barra.addEventListener('click', e => { const b = e.target.closest('[data-pest]'); if (b) elegir(b.dataset.pest); });
    let ini = 'general'; try { ini = localStorage.getItem('kyo_anim_pestana') || 'general'; } catch (e) {}
    elegir(PEST.some(p => p[0] === ini) ? ini : 'general');
  },
  abrirMusica,
  abrirAnuncios() {
    if (anunciosAbierto) return; anunciosAbierto = true;
    const cont = $('#anunLista'); cont.innerHTML = '';
    ANUNCIOS.forEach(pl => cont.appendChild(tarjeta(pl)));
  }
};
