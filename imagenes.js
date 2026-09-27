// Kyo Estudio · pestaña Imágenes
// 1) Fondos de las escenas de OBS (JPG ya preparados en fondos/escenas/, sin textos ni personaje).
// 2) Fondos generados con las utilidades de las animaciones, en cualquier estilo y tamaño.
// Todo se descarga en JPG o PNG.

import { FONDOS } from './animaciones/plantillas.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CLAVE = 'kyo_imagenes';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
const guardar = v => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {} };
const bajar = (blob, nombre) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); };
const aviso = t => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), 3200); };

// ---------- 1) fondos de las escenas ----------
const TEMA_N = { marea: '🌊 Marea Nocturna', octubre: '🎃 Octubre de terror', navidad: '🎄 Navidad' };
const ESCENA_N = { comenzando: 'Comenzando', 'just-chatting': 'Just Chatting', screen: 'Pantalla', terminando: 'Terminando', 'ya-regreso': 'Ya regreso' };
const ESCENAS = [];
for (const tema of ['marea', 'octubre', 'navidad'])
  for (const esc of ['comenzando', 'just-chatting', 'screen', 'terminando', 'ya-regreso'])
    for (const fmt of ['horizontal', 'vertical'])
      if (!(tema === 'navidad' && fmt === 'vertical')) ESCENAS.push({ tema, esc, fmt, id: tema + '-' + esc + '-' + fmt });

// ---------- 2) fondos generados ----------
const NOMBRE_FMT = { horizontal: '🖥️ 1920×1080', vertical: '📱 1080×1920', retrato: '📷 Feed 4:5', cuadrado: '⬛ 1080×1080', twitch: '🟪 Banner Twitch 1200×480', youtube: '▶️ Portada YouTube 2560×1440' };
const DEF = { tema: 'marea', propios: 'no', acento: '#6FE3F0', caja: '#0f1a4a', borde: '#ffffff', fmt: 'horizontal', filtroT: 'todos', filtroF: 'todos', semilla: {}, op: {} };

function chips(nombre, opciones, valor) {
  return '<div class="chips">' + opciones.map(([v, l]) => '<label><input type="radio" name="' + nombre + '" value="' + v + '"' + (v === valor ? ' checked' : '') + '>' + l + '</label>').join('') + '</div>';
}
function lienzoJPG(cv, tipo) { return new Promise(r => cv.toBlob(r, tipo === 'png' ? 'image/png' : 'image/jpeg', .95)); }

let abierto = false;
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#imagenesApp');
  const st = Object.assign({}, DEF, leer() || {}); st.semilla = st.semilla || {}; st.op = st.op || {};
  FONDOS.lista.forEach(f => { st.op[f.id] = Object.assign(Object.fromEntries(f.opciones.map(x => [x.k, x.def])), st.op[f.id] || {}); if (st.semilla[f.id] == null) st.semilla[f.id] = 2; });

  app.innerHTML =
    '<div class="card"><h2>🌙 Fondos de tus escenas</h2>' +
    '<p class="nota">Los fondos de las escenas de OBS, sin textos, marco del chat ni personaje. Perfectos para miniaturas, publicaciones o cualquier diseño.</p>' +
    '<form class="imgfiltros" onsubmit="return false">' +
    '<div class="f"><span>Estilo</span>' + chips('filtroT', [['todos', 'Todos'], ['marea', '🌊 Normal'], ['octubre', '🎃 Halloween'], ['navidad', '🎄 Navidad']], st.filtroT) + '</div>' +
    '<div class="f"><span>Formato</span>' + chips('filtroF', [['todos', 'Todos'], ['horizontal', '🖥️ Horizontal'], ['vertical', '📱 Vertical']], st.filtroF) + '</div>' +
    '</form><div class="imggal" id="imgEscenas">' +
    ESCENAS.map(e => '<figure class="imgcard ' + e.fmt + '" data-id="' + e.id + '" data-tema="' + e.tema + '" data-fmt="' + e.fmt + '">' +
      '<div class="imgmini"><img loading="lazy" src="fondos/escenas/mini/' + e.id + '.jpg" alt="' + ESCENA_N[e.esc] + '"></div>' +
      '<figcaption><b>' + ESCENA_N[e.esc] + '</b><span>' + TEMA_N[e.tema] + ' · ' + (e.fmt === 'vertical' ? '1080×1920' : '1920×1080') + '</span></figcaption>' +
      '<div class="acciones"><button class="btn pri" type="button" data-jpg>⬇ JPG</button><button class="btn" type="button" data-png>⬇ PNG</button></div></figure>').join('') +
    '</div></div>' +
    '<div class="card"><h2>✨ Fondos para diseñar</h2>' +
    '<p class="nota">Los fondos de tus animaciones y anuncios, en el estilo y el tamaño que quieras. Pulsa 🎲 para mover las olas, las burbujas y los destellos.</p>' +
    '<form class="imgopts" onsubmit="return false"><div class="panopts">' +
    '<div class="f"><span>Estilo</span>' + chips('tema', [['marea', '🌊 Normal'], ['octubre', '🎃 Halloween'], ['navidad', '🎄 Navidad']], st.tema) + '</div>' +
    '<div class="f"><span>Colores</span>' + chips('propios', [['no', 'Los del estilo'], ['si', 'Mis colores']], st.propios) + '</div>' +
    '<div class="f fila3" data-si="si"' + (st.propios === 'si' ? '' : ' hidden') + '><label class="fcolor"><span>Acento</span><input type="color" name="acento" value="' + st.acento + '"></label><label class="fcolor"><span>Caja</span><input type="color" name="caja" value="' + st.caja + '"></label><label class="fcolor"><span>Borde</span><input type="color" name="borde" value="' + st.borde + '"></label></div>' +
    '<div class="f"><span>Tamaño</span>' + chips('fmt', Object.keys(FONDOS.formatos).map(k => [k, NOMBRE_FMT[k] || k]), st.fmt) + '</div>' +
    '</div></form><div class="imggen">' +
    FONDOS.lista.map(f => '<form class="imgcard gen" data-gen="' + f.id + '" onsubmit="return false">' +
      '<div class="imgmini"><canvas></canvas></div>' +
      '<figcaption><b>' + f.nombre + '</b><span>' + f.desc + '</span></figcaption>' +
      f.opciones.map(x => '<div class="f"><span>' + x.label + '</span>' + chips(x.k, x.opciones, st.op[f.id][x.k]) + '</div>').join('') +
      '<div class="acciones"><button class="btn" type="button" data-dado title="Otra versión">🎲</button><button class="btn pri" type="button" data-jpg>⬇ JPG</button><button class="btn" type="button" data-png>⬇ PNG</button></div></form>').join('') +
    '</div></div>';

  const filtrar = () => $$('#imgEscenas .imgcard', app).forEach(c => { c.hidden = (st.filtroT !== 'todos' && c.dataset.tema !== st.filtroT) || (st.filtroF !== 'todos' && c.dataset.fmt !== st.filtroF); });
  const opciones = id => Object.assign({ tema: st.tema, propios: st.propios, acento: st.acento, caja: st.caja, borde: st.borde }, st.op[id]);
  const dibujar = (f, cv, W, H) => { cv.width = W; cv.height = H; const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, W, H); ctx.save(); ctx.scale(W / FONDOS.formatos[st.fmt].w, H / FONDOS.formatos[st.fmt].h); f.dibujar(ctx, opciones(f.id), FONDOS.formatos[st.fmt].w, FONDOS.formatos[st.fmt].h, st.semilla[f.id]); ctx.restore(); };
  const previas = () => {
    const F = FONDOS.formatos[st.fmt], k = Math.min(520 / F.w, 360 / F.h);
    FONDOS.lista.forEach(f => { const c = $('[data-gen="' + f.id + '"]', app); c.classList.toggle('vertical', F.h > F.w); dibujar(f, $('canvas', c), Math.round(F.w * k), Math.round(F.h * k)); });
    guardar(st);
  };
  filtrar(); previas();

  app.addEventListener('input', e => {
    const el = e.target; if (!el.name) return;
    const g = el.closest('[data-gen]');
    if (g) { st.op[g.dataset.gen][el.name] = el.value; return previas(); }
    st[el.name] = el.value;
    if (el.name.startsWith('filtro')) { filtrar(); guardar(st); return; }
    const c = $('.imgopts [data-si]', app); if (c) c.hidden = st.propios !== 'si';
    previas();
  });
  app.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const tipo = b.matches('[data-png]') ? 'png' : b.matches('[data-jpg]') ? 'jpg' : null;
    const esc = b.closest('[data-id]'), gen = b.closest('[data-gen]');
    if (gen && b.matches('[data-dado]')) { st.semilla[gen.dataset.gen] = Math.round(Math.random() * 1000) / 10 + 1; return previas(); }
    if (!tipo) return;
    b.disabled = true;
    try {
      if (esc) {
        const url = 'fondos/escenas/' + esc.dataset.id + '.jpg';
        if (tipo === 'jpg') bajar(await (await fetch(url)).blob(), 'fondo-' + esc.dataset.id + '.jpg');
        else { const im = new Image(); im.src = url; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); bajar(await lienzoJPG(cv, 'png'), 'fondo-' + esc.dataset.id + '.png'); }
      } else if (gen) {
        const f = FONDOS.lista.find(x => x.id === gen.dataset.gen), F = FONDOS.formatos[st.fmt], cv = document.createElement('canvas');
        dibujar(f, cv, F.w, F.h);
        bajar(await lienzoJPG(cv, tipo), 'fondo-' + f.id + '-' + st.tema + '-' + st.fmt + '.' + tipo);
      }
      aviso('¡Imagen descargada! 🖼');
    } catch (er) { aviso('No se pudo descargar la imagen.'); }
    b.disabled = false;
  });
}
window.kyoImagenes = { abrir };
