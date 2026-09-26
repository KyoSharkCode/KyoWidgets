// Kyo Estudio · pestaña Animaciones
// Plantillas editables: cambias textos, colores, posición, tamaño y duración, ves la vista previa en vivo
// y descargas un .mov ProRes 4444 con transparencia (Premiere lo abre directo).
// Todo pasa en el navegador: cada fotograma se dibuja en un <canvas> y ffmpeg.wasm arma el video.

import { FFmpeg } from './vendor/ffmpeg/index.js';
import { PLANTILLAS, FORMATOS, ANUNCIOS } from './animaciones/plantillas.js';

const CORE = window.KYO_FFMPEG_CORE || 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(4, '0');
const aBlob = async (url, tipo) => URL.createObjectURL(new Blob([await (await fetch(url)).arrayBuffer()], { type: tipo }));
const FMTS = pl => pl.formatos || Object.keys(FORMATOS);
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
async function exportar(pl, card, fmtElegido, tipo) {
  if (ocupado) return;
  ocupado = true;
  const o = leerForm(card, pl), fmt = fmtElegido || $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
  const barra = $('.progreso', card), txt = $('.ptxt', card), bi = $('.progreso i', card), btn = $$('[data-mov],[data-ambos],[data-webm]', card);
  const aviso = (t, p) => { txt.textContent = t; if (p != null) bi.style.width = Math.round(p * 100) + '%'; };
  btn.forEach(b => b.disabled = true); barra.hidden = false;
  const webm = tipo === 'webm', mp4 = !webm && esOpaco(pl, o), ext = webm ? '.webm' : mp4 ? '.mp4' : '.mov', nombre = pl.id + '-' + fmt + ext;
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
  } finally { ocupado = false; btn.forEach(b => b.disabled = false); }
}

// ---------- tarjeta de cada plantilla ----------
function tarjeta(pl) {
  // cada tarjeta es un <form> para que sus opciones no se mezclen con las de otras tarjetas
  const card = document.createElement('form');
  card.className = 'card anim'; card.addEventListener('submit', e => e.preventDefault());
  card.innerHTML =
    '<div class="animtop"><div><h2>' + esc(pl.nombre) + '</h2><p class="nota">' + esc(pl.desc) + '</p></div>' +
    '<button class="btn" type="button" data-reset>↺ Restablecer</button></div>' +
    '<div class="versiones"><span>⭐ Mis versiones</span><select data-ver><option value="">Elegir versión guardada…</option></select>' +
    '<input type="text" data-vernom maxlength="30" placeholder="Nombre (ej. Código Halloween)"><button class="btn" type="button" data-verguardar>💾 Guardar versión</button><button class="btn" type="button" data-verborrar hidden>🗑 Borrar</button></div>' +
    '<div class="animgrid"><div class="animform opts">' + formulario(pl) + '</div>' +
    '<div class="animside"><div class="chips">' + FMTS(pl).map((k, i) => '<label><input type="radio" name="fmt-' + pl.id + '" value="' + k + '"' + ((pl.fmtDef ? k === pl.fmtDef : !i) ? ' checked' : '') + '>' + (k === 'horizontal' ? '🖥️ Horizontal 1920×1080' : '📱 Vertical 1080×1920') + '</label>').join('') + '</div>' +
    '<div class="animprev"><canvas></canvas></div>' +
    '<div class="acciones"><button class="btn pri" type="button" data-mov>⬇ Descargar</button><button class="btn" type="button" data-webm title="WebM con transparencia: para OBS (transiciones de escena, fuentes multimedia)">⬇ .webm para OBS</button>' + (FMTS(pl).length > 1 ? '<button class="btn" type="button" data-ambos>⬇ Horizontal + vertical</button>' : '') + '<button class="btn" type="button" data-replay>↻ Repetir</button>' + (pl.sonido ? '<button class="btn" type="button" data-oir>🔊 Repetir con sonido</button>' : '') + '</div>' +
    '<div class="progreso" hidden><i></i></div><p class="nota ptxt" aria-live="polite"></p></div></div>';
  const clave = 'kyo_anim_' + pl.id;
  ponerForm(card, pl, Object.assign(defecto(pl), leer(clave) || {}));
  const cv = $('canvas', card), ctx = cv.getContext('2d');
  let t0 = performance.now(), o = leerForm(card, pl);
  const refrescar = () => {
    o = leerForm(card, pl); guardar(clave, Object.fromEntries(Object.entries(o).filter(([k]) => !(card._imgs && k in card._imgs) && !pl.campos.some(c => c.k === k && c.tipo === 'imagen'))));
    $('[data-mov]', card).textContent = textoDescarga(pl, o);
    $('[data-webm]', card).hidden = esOpaco(pl, o);
    $$('[data-si]', card).forEach(el => { const [k, v] = el.dataset.si.split('='); el.hidden = !v.split('|').includes(String(o[k])); });
    const fmt = $('input[name="fmt-' + pl.id + '"]:checked', card).value, F = FORMATOS[fmt];
    cv.width = F.w / 3; cv.height = F.h / 3; cv.dataset.fmt = fmt;
    cv.style.maxWidth = fmt === 'vertical' ? '300px' : '100%';
  };
  card.addEventListener('input', refrescar);
  card.addEventListener('change', refrescar);
  $('[data-replay]', card).addEventListener('click', () => { t0 = performance.now(); });
  $('[data-reset]', card).addEventListener('click', () => { ponerForm(card, pl, defecto(pl)); refrescar(); t0 = performance.now(); });
  $('[data-mov]', card).addEventListener('click', () => exportar(pl, card));
  $('[data-webm]', card).addEventListener('click', () => exportar(pl, card, null, 'webm'));
  const ambos = $('[data-ambos]', card);
  if (ambos) ambos.addEventListener('click', async () => { if (ocupado) return; for (const f of FMTS(pl)) await exportar(pl, card, f); });
  // versiones guardadas (textos y opciones; las imágenes se quedan como estén)
  const claveV = 'kyo_versiones_' + pl.id, sel = $('[data-ver]', card), nom = $('[data-vernom]', card), borrar = $('[data-verborrar]', card);
  const pintarV = elegida => {
    const v = leer(claveV) || {};
    sel.innerHTML = '<option value="">' + (Object.keys(v).length ? 'Elegir versión guardada…' : 'Aún no hay versiones guardadas') + '</option>' + Object.keys(v).sort().map(n => '<option' + (n === elegida ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    borrar.hidden = !sel.value;
  };
  sel.addEventListener('change', e => { e.stopPropagation(); const v = leer(claveV) || {}; borrar.hidden = !sel.value; if (!sel.value || !v[sel.value]) return;
    ponerForm(card, pl, Object.assign(defecto(pl), v[sel.value])); nom.value = sel.value; refrescar(); t0 = performance.now(); });
  $('[data-verguardar]', card).addEventListener('click', () => {
    const n = nom.value.trim(); if (!n) { nom.focus(); $('.ptxt', card).textContent = 'Escribe un nombre para la versión.'; return; }
    const v = leer(claveV) || {}; v[n] = Object.fromEntries(Object.entries(leerForm(card, pl)).filter(([k]) => !pl.campos.some(c => c.k === k && c.tipo === 'imagen')));
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
    if (!ocupado && card._visible !== false && !card.closest('[hidden]')) {
      const fmt = cv.dataset.fmt, F = FORMATOS[fmt], L = pl.duracion(o);
      let t = (now - t0) / 1000; if (t > L + .8) { t0 = now; t = 0; }
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

let anunciosAbierto = false;
window.kyoAnim = {
  abrir() {
    if (abierto) return; abierto = true;
    const cont = $('#animLista'); cont.innerHTML = '';
    PLANTILLAS.forEach(pl => cont.appendChild(tarjeta(pl)));
  },
  abrirAnuncios() {
    if (anunciosAbierto) return; anunciosAbierto = true;
    const cont = $('#anunLista'); cont.innerHTML = '';
    ANUNCIOS.forEach(pl => cont.appendChild(tarjeta(pl)));
  }
};
