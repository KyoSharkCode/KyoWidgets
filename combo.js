// Kyo Estudio · En directo → 🧩 Overlay combinado
// Junta varios widgets en una sola fuente de navegador de OBS (overlays/combo.html), con una
// distribución propia para la escena vertical (1080×1920) y otra para la horizontal (1920×1080).
// Cada widget usa el estilo de su pestaña; aquí se elige cuáles salen, dónde y a qué tamaño.
// Los huecos se colocan arrastrándolos en la vista previa o con X / Y.
// Se pueden guardar varias versiones con nombre (una por escena de OBS), cada una con su enlace.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GUARDADO = 'kyo_estudio_combo';
const LIENZO = { v: [1080, 1920], h: [1920, 1080] };
// Orden = orden de capa (el último queda encima): los avisos grandes van al final
const LISTA = [
  ['contador', '🔢 Contador'], ['cuenta', '⏱ Timer (cuenta atrás)'], ['spotify', '🎵 Música'], ['fortnite', '🏆 Fortnite'],
  ['meta', '💰 Meta de donaciones'], ['chat', '💬 Chat'], ['anuncios', '📣 Anuncios'], ['sorteo', '🎁 Sorteo y encuesta'], ['prediccion', '🔮 Predicción']
];
const NOMBRE = Object.fromEntries(LISTA);
const nuevoId = () => Math.random().toString(36).slice(2, 9);
const ANUNCIOS_BASE = [960, 700];
const TAMANOS = [['0.5', '50 %'], ['0.6', '60 %'], ['0.75', '75 %'], ['0.8', '80 %'], ['0.9', '90 %'], ['1', '100 %'], ['1.25', '125 %'], ['1.5', '150 %']];
const CADA = [['0', 'Siempre en pantalla'], ['3', 'Cada 3 min'], ['5', 'Cada 5 min'], ['10', 'Cada 10 min'], ['15', 'Cada 15 min'], ['30', 'Cada 30 min']];
// Distribución inicial: los cinco del directo encendidos, el resto apagados pero ya colocados
const DEF = () => ({
  id: nuevoId(), nombre: 'Juego', fmt: 'v', datos: 'demo', fondo: 'screen', cada: '5', contador: '',
  v: {
    cuenta: { on: true, x: 196, y: 20, esc: '0.8' },
    prediccion: { on: true, x: 0, y: 260, esc: '0.9' },
    anuncios: { on: true, x: 180, y: 680, esc: '0.75' },
    sorteo: { on: true, x: 216, y: 1190, esc: '0.9' },
    contador: { on: true, x: 20, y: 1740, esc: '0.8' },
    spotify: { on: false, x: 180, y: 1720, esc: '1' },
    fortnite: { on: false, x: 160, y: 1650, esc: '1' },
    meta: { on: false, x: 220, y: 1660, esc: '1' },
    chat: { on: false, x: 90, y: 920, esc: '1' }
  },
  h: {
    cuenta: { on: true, x: 616, y: 10, esc: '0.8' },
    prediccion: { on: true, x: 0, y: 20, esc: '0.9' },
    anuncios: { on: true, x: 1344, y: 640, esc: '0.6' },
    sorteo: { on: true, x: 1272, y: 60, esc: '0.9' },
    contador: { on: true, x: 20, y: 900, esc: '0.8' },
    spotify: { on: false, x: 20, y: 700, esc: '1' },
    fortnite: { on: false, x: 580, y: 820, esc: '1' },
    meta: { on: false, x: 640, y: 840, esc: '1' },
    chat: { on: false, x: 100, y: 150, esc: '1' }
  }
});

// st = la versión que se está editando; versiones = todas (se guardan juntas en este navegador)
let abierto = false, st, versiones = [];
function completar(g) {
  const d = DEF();
  ['v', 'h'].forEach(f => LISTA.forEach(([id]) => { d[f][id] = Object.assign(d[f][id], (g[f] || {})[id] || {}); }));
  ['id', 'nombre', 'fmt', 'datos', 'fondo', 'cada', 'contador'].forEach(k => { if (g[k] !== undefined) d[k] = g[k]; });
  return d;
}
function cargarEstado() {
  let g = null; try { g = JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch (e) {}
  // Antes de las versiones se guardaba una sola distribución: pasa a ser la versión "Juego"
  const lista = !g ? [] : Array.isArray(g.versiones) ? g.versiones : [g];
  versiones = lista.map(completar);
  if (!versiones.length) versiones = [DEF()];
  st = versiones.find(v => v.id === (g && g.sel)) || versiones[0];
}
const guardarEstado = () => { try { localStorage.setItem(GUARDADO, JSON.stringify({ sel: st.id, versiones })); } catch (e) {} };
// Cambiar de versión mantiene cómo estás mirando la vista previa (formato, fondo y datos)
function usarVersion(v) { ['fmt', 'fondo', 'datos'].forEach(k => { v[k] = st[k]; }); st = v; }

// Tamaño del hueco: el del diseño elegido en la pestaña del widget × el tamaño de aquí
function tam(id) {
  const it = st[st.fmt][id], k = Number(it.esc) || 1;
  const base = id === 'anuncios' ? ANUNCIOS_BASE : id === 'chat' ? window.kyoWidgetTam('chat', st.fmt === 'v' ? 'vertical' : 'horizontal') : window.kyoWidgetTam(id);
  return [Math.ceil(base[0] * k), Math.ceil(base[1] * k)];
}
function encajar(id) {
  const it = st[st.fmt][id], [W, H] = LIENZO[st.fmt], [w, h] = tam(id);
  it.x = Math.round(Math.max(0, Math.min(W - Math.min(w, W), +it.x || 0)));
  it.y = Math.round(Math.max(0, Math.min(H - Math.min(h, H), +it.y || 0)));
}
// Parámetros propios de cada widget, sacados de su pestaña (el mismo enlace que si fuera suelto)
function paramsWidget(id, demo) {
  const it = st[st.fmt][id], k = it.esc === '1' ? '' : it.esc;
  if (id === 'anuncios') {
    const p = new URLSearchParams();
    const tema = (document.querySelector('#fSorteo input[name=tema]:checked') || {}).value;
    if (tema && tema !== 'marea') p.set('tema', tema);
    if (k) p.set('escala', k);
    if (st.cada !== '0') p.set('cada', st.cada);
    if (demo) p.set('demo', '1');
    return p.toString();
  }
  const extra = { escala: k, demo: demo ? '1' : '' };
  if (id === 'chat') extra.diseno = st.fmt === 'v' ? 'vertical' : 'horizontal';
  if (id === 'contador' && st.contador) extra.id = st.contador;
  return new URL(window.kyoWidgetUrl(id, extra)).search.slice(1);
}
const activos = () => LISTA.map(([id]) => id).filter(id => st[st.fmt][id].on);
function urlCombo(demo) {
  const p = new URLSearchParams({ n: st.nombre, f: st.fmt, w: activos().join(',') });
  activos().forEach(id => {
    encajar(id);
    const it = st[st.fmt][id], [w, h] = tam(id);
    p.set(id, [it.x, it.y, w, h].join(','));
    const wp = paramsWidget(id, demo); if (wp) p.set(id + '_', wp);
  });
  return new URL('overlays/combo.html?' + p, location.href).href;
}

function abrir() {
  if (!window.kyoWidgetUrl || !window.kyoWidgetTam) return;
  const app = $('#comboApp');
  if (!abierto) { abierto = true; cargarEstado(); construir(app); pintarFilas(app); }
  // La lista de contadores llega de Supabase (la misma de la pestaña Contadores)
  if (window.kyoContadores) Promise.resolve(window.kyoContadores.abrir()).then(() => pintarContadores(app)).catch(() => {});
  pintar(app);
}

function construir(app) {
  app.innerHTML =
    '<div class="card animhead"><h2>🧩 Overlay combinado</h2>' +
    '<p class="nota">Varios widgets en <b>una sola fuente de navegador</b> de OBS: menos fuentes que abrir, colocar y recargar. Cada widget usa el estilo de su pestaña; aquí eliges cuáles salen, dónde y a qué tamaño, con una distribución para la escena <b>vertical</b> y otra para la <b>horizontal</b>. Arrastra los recuadros en la vista previa para moverlos.</p></div>' +
    '<div class="card cbversiones"><div class="f"><span>Versión</span><select name="cbver" aria-label="Versión que estás editando"></select></div>' +
      '<label class="f"><span>Nombre</span><input type="text" name="cbnombre" maxlength="40" placeholder="Just Chatting"></label>' +
      '<div class="acciones"><button class="btn" type="button" data-ver="nueva">＋ Nueva</button><button class="btn" type="button" data-ver="duplicar">⧉ Duplicar</button><button class="btn" type="button" data-ver="borrar">🗑 Borrar</button></div>' +
      '<p class="nota">Una versión por escena de OBS (o por grupo de escenas que se parezcan). Cada una tiene su colocación vertical y horizontal y su propio enlace: los enlaces que ya pegaste en OBS siguen funcionando aunque edites otra versión. Si editas una versión, vuelve a copiar su enlace.</p></div>' +
    '<div class="grid">' +
    '<form class="card opts" id="fCombo" onsubmit="return false">' +
      '<div class="grupo"><h3>Escena</h3>' +
        '<div class="f"><span>Formato</span><div class="chips"><label><input type="radio" name="fmt" value="v">📱 Vertical 1080×1920</label><label><input type="radio" name="fmt" value="h">🖥️ Horizontal 1920×1080</label></div></div>' +
        '<p class="nota">Cada formato guarda su propia distribución: cambia de uno a otro y colócalos por separado.</p>' +
      '</div>' +
      '<div class="grupo"><h3>Widgets</h3><div class="cbfilas"></div></div>' +
      '<div class="grupo"><h3>Ajustes de los widgets</h3>' +
        '<label class="f"><span>📣 Anuncios: cuándo salen</span><select name="cada">' + CADA.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select></label>' +
        '<p class="nota">Pasan todos tus anuncios activos (se editan en <b>📺 Overlays → 📣 Anuncios</b>) y luego descansan ese tiempo. Usan la temporada de <b>🎁 Sorteo y encuesta</b>.</p>' +
        '<label class="f"><span>🔢 Qué contador se ve</span><select name="contador"><option value="">El elegido en la pestaña Contadores</option></select></label>' +
      '</div>' +
      '<div class="grupo"><h3>Recuerda</h3>' +
        '<p class="nota">El enlace lleva el estilo de cada widget tal y como está ahora. Si luego cambias el diseño de alguno en su pestaña, vuelve aquí y copia el enlace otra vez. Lo que llega en vivo (predicción, sorteo, votos, contador, anuncios guardados) se actualiza solo.</p>' +
      '</div>' +
    '</form>' +
    '<div class="prev"><div class="card" style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="acciones"><div class="chips" data-cb="fondo"><label><input type="radio" name="cbfondo" value="screen">Escena Pantalla</label><label><input type="radio" name="cbfondo" value="just-chatting">Just Chatting</label><label><input type="radio" name="cbfondo" value="oscuro">Oscuro</label></div></div>' +
      '<div class="cbcentro"><div class="ovmarco cbmarco"><iframe class="cbfondo" title="Fondo de la vista previa" scrolling="no" tabindex="-1"></iframe><iframe class="cbvista" title="Vista previa del overlay combinado" scrolling="no" tabindex="-1"></iframe><div class="cbcapa" aria-label="Arrastra los recuadros para colocar los widgets"></div></div></div>' +
      '<div class="acciones"><div class="chips" data-cb="datos"><label><input type="radio" name="cbdatos" value="demo">Datos de ejemplo</label><label><input type="radio" name="cbdatos" value="real">Mis datos reales</label></div></div>' +
      '<div class="cbpruebas"></div>' +
      '<div class="url"><input readonly aria-label="Enlace para OBS"><button class="btn pri" type="button" data-copy>Copiar enlace</button></div>' +
      '<ol class="pasos"><li>En OBS: <b>+ Fuente → Navegador</b>, encima de la escena.</li><li>Pega el enlace. <b>Ancho <span data-cbw></span></b> · <b>Alto <span data-cbh></span></b>, en la posición 0, 0.</li><li>Quita de esa escena las fuentes sueltas de estos widgets: ya van todos aquí dentro.</li></ol>' +
    '</div></div></div>';

  const f = $('#fCombo', app);
  f.addEventListener('change', e => {
    const t = e.target, fila = t.closest('[data-id]');
    if (t.name === 'fmt') { st.fmt = t.value; pintarFilas(app); }
    else if (t.name === 'cada') st.cada = t.value;
    else if (t.name === 'contador') st.contador = t.value;
    else if (fila) {
      const it = st[st.fmt][fila.dataset.id];
      if (t.dataset.k === 'on') it.on = t.checked;
      else if (t.dataset.k === 'esc') it.esc = t.value;
      else it[t.dataset.k] = Number(t.value) || 0;
    }
    pintar(app);
  });
  const ver = $('.cbversiones', app);
  ver.addEventListener('change', e => {
    if (e.target.name === 'cbver') { usarVersion(versiones.find(v => v.id === e.target.value)); pintarFilas(app); pintarContadores(app); pintar(app); }
  });
  ver.addEventListener('input', e => {
    if (e.target.name !== 'cbnombre') return;
    st.nombre = e.target.value.trim() || 'Sin nombre';
    $('[name=cbver] option[value="' + st.id + '"]', ver).textContent = st.nombre;
    clearTimeout(ver.t); ver.t = setTimeout(() => pintar(app), 400);
  });
  ver.addEventListener('click', e => {
    const b = e.target.closest('[data-ver]'); if (!b) return;
    const accion = b.dataset.ver;
    if (accion === 'borrar') {
      if (versiones.length < 2) return aviso('Necesitas al menos una versión.');
      if (!confirm('¿Borrar la versión "' + st.nombre + '"? Su enlace en OBS seguirá funcionando, pero ya no podrás editarla aquí.')) return;
      const i = versiones.indexOf(st); versiones.splice(i, 1);
      usarVersion(versiones[Math.max(0, i - 1)]);
    } else {
      if (versiones.length >= 20) return aviso('Máximo 20 versiones.');
      const v = accion === 'duplicar' ? JSON.parse(JSON.stringify(st)) : DEF();
      v.id = nuevoId(); v.nombre = accion === 'duplicar' ? st.nombre + ' (copia)' : 'Versión ' + (versiones.length + 1);
      versiones.splice(versiones.indexOf(st) + 1, 0, v); usarVersion(v);
      setTimeout(() => { const n = $('[name=cbnombre]', ver); n.focus(); n.select(); });
    }
    pintarFilas(app); pintarContadores(app); pintar(app);
  });
  app.addEventListener('change', e => {
    if (e.target.name === 'cbfondo') { st.fondo = e.target.value; pintar(app); }
    else if (e.target.name === 'cbdatos') { st.datos = e.target.value; pintar(app); }
  });
  app.addEventListener('click', async e => {
    const t = e.target.closest('[data-test]');
    if (t) $('.cbvista', app).contentWindow.postMessage({ type: 'kyo-test', widget: t.dataset.w, accion: t.dataset.test }, '*');
    const c = e.target.closest('[data-copy]');
    if (c) {
      const inp = $('.url input', app);
      try { await navigator.clipboard.writeText(inp.value); } catch (err) { inp.select(); document.execCommand && document.execCommand('copy'); }
      c.textContent = '✓ Copiado'; setTimeout(() => c.textContent = 'Copiar enlace', 1800);
    }
  });
  arrastrar(app);
  window.addEventListener('resize', () => { if (!app.closest('[hidden]')) escalar(app); });
}

function pintarFilas(app) {
  $('.cbfilas', app).innerHTML = LISTA.map(([id, nom]) => {
    const it = st[st.fmt][id];
    return '<div class="cbfila' + (it.on ? '' : ' apagado') + '" data-id="' + id + '">' +
      '<label class="cbnom"><input type="checkbox" data-k="on"' + (it.on ? ' checked' : '') + '> ' + nom + '</label>' +
      '<label class="cbnum"><span>X</span><input type="number" data-k="x" value="' + it.x + '" step="10"' + (it.on ? '' : ' disabled') + '></label>' +
      '<label class="cbnum"><span>Y</span><input type="number" data-k="y" value="' + it.y + '" step="10"' + (it.on ? '' : ' disabled') + '></label>' +
      '<select data-k="esc" aria-label="Tamaño de ' + esc(nom) + '"' + (it.on ? '' : ' disabled') + '>' + TAMANOS.map(([v, l]) => '<option value="' + v + '"' + (v === it.esc ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
      '</div>';
  }).join('');
}
function pintarContadores(app) {
  const s = $('#fCombo [name=contador]', app), lista = window.kyoContadores && window.kyoContadores.lista ? window.kyoContadores.lista() : [];
  s.innerHTML = '<option value="">El elegido en la pestaña Contadores</option>' + lista.map(c => '<option value="' + esc(c.id) + '">' + esc(c.nombre) + '</option>').join('');
  if (lista.length && st.contador && !lista.some(c => c.id === st.contador)) st.contador = '';
  s.value = st.contador;
  if (lista.length) pintar(app);
}

let ultimaVista = '', ultimoFondo = '';
function pintar(app) {
  activos().forEach(encajar);
  guardarEstado();
  const sv = $('[name=cbver]', app);
  sv.innerHTML = versiones.map(v => '<option value="' + v.id + '">' + esc(v.nombre) + '</option>').join(''); sv.value = st.id;
  const nom = $('[name=cbnombre]', app); if (document.activeElement !== nom) nom.value = st.nombre;
  const f = $('#fCombo', app);
  $$('input[name=fmt]', f).forEach(r => r.checked = r.value === st.fmt);
  f.cada.value = st.cada; f.contador.value = st.contador;
  $$('input[name=cbfondo]', app).forEach(r => r.checked = r.value === st.fondo);
  $$('input[name=cbdatos]', app).forEach(r => r.checked = r.value === st.datos);
  $$('.cbfila', app).forEach(fila => {
    const it = st[st.fmt][fila.dataset.id];
    fila.classList.toggle('apagado', !it.on);
    $$('input[type=number], select', fila).forEach(el => el.disabled = !it.on);
    $('[data-k=x]', fila).value = it.x; $('[data-k=y]', fila).value = it.y;
  });
  const [W, H] = LIENZO[st.fmt];
  $('[data-cbw]', app).textContent = W; $('[data-cbh]', app).textContent = H;
  $('.url input', app).value = urlCombo(false);
  // Fondo: la escena de Marea Nocturna en el formato elegido, o liso
  const fondo = $('.cbfondo', app), srcF = st.fondo === 'oscuro' ? 'about:blank' : 'overlays/escenas/marea/' + st.fondo + (st.fmt === 'v' ? '-vertical' : '') + '.html?preview=1';
  if (srcF !== ultimoFondo) { ultimoFondo = srcF; fondo.src = srcF; }
  const vista = $('.cbvista', app), srcV = urlCombo(st.datos === 'demo');
  if (srcV !== ultimaVista) { ultimaVista = srcV; vista.src = srcV; }
  // Recuadros arrastrables y botones de prueba de los widgets que salen
  $('.cbcapa', app).innerHTML = activos().map(id => {
    const it = st[st.fmt][id], [w, h] = tam(id);
    return '<div class="cbcaja" data-id="' + id + '" style="left:' + it.x + 'px;top:' + it.y + 'px;width:' + w + 'px;height:' + h + 'px"><span>' + NOMBRE[id] + '</span></div>';
  }).join('');
  const pr = window.kyoWidgetPruebas || (() => []);
  $('.cbpruebas', app).innerHTML = activos().filter(id => pr(id).length).map(id =>
    '<div class="acciones"><span class="cbplbl">' + NOMBRE[id] + '</span>' + pr(id).map(([a, l]) => '<button class="btn" type="button" data-w="' + id + '" data-test="' + a + '">' + l + '</button>').join('') + '</div>').join('');
  escalar(app);
}

let k = 1;
function escalar(app) {
  const m = $('.cbmarco', app), [W, H] = LIENZO[st.fmt], disp = $('.cbcentro', app).clientWidth || 600;
  k = Math.min(disp / W, (st.fmt === 'v' ? 720 : 520) / H);
  m.style.width = Math.round(W * k) + 'px'; m.style.height = Math.round(H * k) + 'px';
  $$('iframe, .cbcapa', m).forEach(el => { el.style.width = W + 'px'; el.style.height = H + 'px'; el.style.transform = 'scale(' + k + ')'; });
}

// Arrastrar los recuadros: el widget se mueve en vivo y al soltar se guarda la posición
function arrastrar(app) {
  const capa = $('.cbcapa', app);
  let d = null;
  capa.addEventListener('pointerdown', e => {
    const c = e.target.closest('.cbcaja'); if (!c) return;
    e.preventDefault(); c.setPointerCapture(e.pointerId); c.classList.add('mueve');
    const it = st[st.fmt][c.dataset.id];
    d = { c, id: c.dataset.id, x0: e.clientX, y0: e.clientY, ix: it.x, iy: it.y };
  });
  capa.addEventListener('pointermove', e => {
    if (!d) return;
    const it = st[st.fmt][d.id], [w, h] = tam(d.id);
    it.x = d.ix + (e.clientX - d.x0) / k; it.y = d.iy + (e.clientY - d.y0) / k;
    encajar(d.id);
    d.c.style.left = it.x + 'px'; d.c.style.top = it.y + 'px';
    $('.cbvista', app).contentWindow.postMessage({ type: 'kyo-combo-mover', widget: d.id, x: it.x, y: it.y, w, h }, '*');
    const fila = $('.cbfila[data-id="' + d.id + '"]', app);
    if (fila) { $('[data-k=x]', fila).value = it.x; $('[data-k=y]', fila).value = it.y; }
  });
  const soltar = () => {
    if (!d) return;
    d.c.classList.remove('mueve'); d = null;
    // La vista ya tiene el widget en su sitio: se apunta el enlace nuevo sin recargarla
    guardarEstado();
    $('.url input', app).value = urlCombo(false);
    ultimaVista = urlCombo(st.datos === 'demo');
  };
  capa.addEventListener('pointerup', soltar);
  capa.addEventListener('pointercancel', soltar);
}

window.kyoCombo = { abrir };
