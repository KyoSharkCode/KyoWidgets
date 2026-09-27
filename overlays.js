// Kyo Estudio · pestaña Overlays
// 1) Las escenas de OBS (overlays/escenas/<tema>/<escena>.html) con su enlace para copiar.
// 2) Editor de anuncios rotativos de "Ya regreso" y "Terminando": se guardan en Supabase
//    (función "anuncios") y las escenas los leen solas cada 30 s, sin cambiar el enlace en OBS.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const FN = n => (K.SUPABASE_URL || '') + '/functions/v1/' + n;
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const BORRADOR = 'kyo_anuncios_borrador';

const TEMAS = [['marea', '🌊 Marea Nocturna'], ['octubre', '🎃 Octubre de terror'], ['navidad', '🎄 Navidad']];
const ESCENAS = [['comenzando', 'Comenzando'], ['just-chatting', 'Just Chatting'], ['screen', 'Pantalla'], ['ya-regreso', 'Ya regreso'], ['terminando', 'Terminando']];
const CON_ANUNCIOS = ['ya-regreso', 'terminando'];
const ICONOS = [['bolsa', '🛍️ Bolsa'], ['camiseta', '👕 Camiseta'], ['reloj', '⏱ Reloj'], ['aleta', '🦈 Aleta'], ['estrella', '⭐ Estrella'], ['corazon', '💙 Corazón'], ['regalo', '🎁 Regalo'], ['chat', '💬 Chat'], ['play', '▶ Play'], ['mando', '🎮 Mando'], ['campana', '🔔 Campana']];
const TIPOS = [['merch', '🛍️ Merch ya disponible'], ['cuenta', '⏱ Cuenta atrás o fecha'], ['codigo', '🦈 Código de creador'], ['libre', '✏️ Texto libre']];
const DONDE = [['ambos', 'Ya regreso y Terminando'], ['ya-regreso', 'Solo Ya regreso'], ['terminando', 'Solo Terminando']];
const nuevoId = () => Math.random().toString(36).slice(2, 9);
const hoyMas = d => { const f = new Date(Date.now() + d * 864e5); return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); };
const PLANTILLA = {
  merch: () => ({ tipo: 'merch', icono: 'bolsa', etiqueta: '¡Nueva merch!', texto: 'Ya disponible', enlace: 'kyomerch.shop' }),
  cuenta: () => ({ tipo: 'cuenta', icono: 'reloj', etiqueta: 'Nueva merch en', modo: 'cuenta', fecha: hoyMas(3), hora: '20:00', textoFin: '¡Ya disponible!', enlace: 'kyomerch.shop' }),
  codigo: () => ({ tipo: 'codigo', icono: 'aleta', etiqueta: 'Código de creador', texto: 'KYOSUMI', enlace: 'Tienda de Fortnite' }),
  libre: () => ({ tipo: 'libre', icono: 'corazon', etiqueta: '¡Sígueme!', texto: '@KyoSumiVT', enlace: 'TikTok · YouTube' })
};
const nuevo = tipo => Object.assign({ id: nuevoId(), activo: true, donde: 'ambos', seg: 10 }, PLANTILLA[tipo]());
const DEF = () => ({ anuncios: [nuevo('merch'), Object.assign(nuevo('cuenta'), { activo: false }), nuevo('codigo')] });
// La fecha y la hora se guardan también como instante exacto (tu hora local), para que la cuenta sea igual en cualquier sitio
const conObjetivo = d => ({ anuncios: d.anuncios.map(a => a.tipo === 'cuenta' && a.fecha ? Object.assign({}, a, { objetivo: new Date(a.fecha + 'T' + (a.hora || '00:00') + ':00').toISOString() }) : a) });

let abierto = false;
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#overlaysApp');
  let datos = null, sinFuncion = false, guardado = '', prevTema = 'marea', prevEsc = 'ya-regreso', prevFmt = '';
  const url = (tema, e, v) => new URL('overlays/escenas/' + tema + '/' + e + (v ? '-vertical' : '') + '.html', location.href).href;

  app.innerHTML =
    '<div class="card"><h2>📺 Tus escenas</h2>' +
    '<p class="nota">Copia el enlace y pégalo en OBS como <b>Fuente de navegador</b> con el tamaño indicado (1920×1080 u 1080×1920). Cuando mejoremos algo, OBS lo recibe solo, sin cambiar el enlace. Tus archivos de siempre siguen en tu carpeta como copia de seguridad.</p>' +
    TEMAS.map(([t, tn]) => '<div class="ovgrupo"><h3>' + tn + '</h3><div class="ovlista">' +
      ESCENAS.flatMap(([e, en]) => [false, true].filter(v => !(v && t === 'navidad')).map(v =>
        '<div class="ovcard' + (v ? ' vertical' : '') + '"><div class="ovmini"><img loading="lazy" src="fondos/escenas/mini/' + t + '-' + e + '-' + (v ? 'vertical' : 'horizontal') + '.jpg" alt=""></div>' +
        '<div class="ovinfo"><b>' + en + (CON_ANUNCIOS.includes(e) ? ' <span class="ovtag">📣 anuncios</span>' : '') + '</b><span>' + (v ? '📱 1080×1920' : '🖥️ 1920×1080') + '</span></div>' +
        '<div class="acciones"><button class="btn pri" type="button" data-copiar="' + esc(url(t, e, v)) + '">📋 Copiar enlace</button><a class="btn" href="' + esc(url(t, e, v)) + '" target="_blank" rel="noopener">↗ Abrir</a></div></div>')).join('') +
      '</div></div>').join('') +
    '</div>' +
    '<div class="card"><h2>📣 Anuncios de "Ya regreso" y "Terminando"</h2>' +
    '<p class="nota">Van rotando en una tarjeta debajo del título. Pulsa <b>Guardar</b> y en unos 30 segundos OBS los cambia solo, aunque estés en directo. La cuenta atrás usa tu hora local.</p>' +
    '<div class="ovestado" id="ovEstado">Cargando anuncios…</div>' +
    '<div class="ovedit"><div class="ovcol"><div id="ovLista" class="ovads"></div>' +
    '<div class="acciones"><select id="ovTipoNuevo">' + TIPOS.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select><button class="btn" type="button" id="ovAnadir">＋ Añadir anuncio</button></div></div>' +
    '<div class="ovcol ovprev"><div class="f"><span>Vista previa</span>' +
    '<div class="chips" id="ovPrevTema">' + TEMAS.map(([t, tn]) => '<label><input type="radio" name="ovpt" value="' + t + '"' + (t === prevTema ? ' checked' : '') + '>' + tn.split(' ')[0] + ' ' + tn.split(' ').slice(1).join(' ') + '</label>').join('') + '</div>' +
    '<div class="chips" id="ovPrevEsc"><label><input type="radio" name="ovpe" value="ya-regreso" checked>Ya regreso</label><label><input type="radio" name="ovpe" value="terminando">Terminando</label></div></div>' +
    '<div class="ovmarco"><iframe id="ovFrame" title="Vista previa de la escena" scrolling="no"></iframe></div>' +
    '<div class="acciones"><button class="btn pri" type="button" id="ovGuardar">💾 Guardar (en vivo)</button><button class="btn" type="button" id="ovDeshacer">↺ Descartar cambios</button></div></div></div></div>';

  // ---------- escenas ----------
  app.addEventListener('click', async e => {
    const c = e.target.closest('[data-copiar]'); if (!c) return;
    try { await navigator.clipboard.writeText(c.dataset.copiar); } catch (er) { const t = document.createElement('textarea'); t.value = c.dataset.copiar; document.body.appendChild(t); t.select(); document.execCommand && document.execCommand('copy'); t.remove(); }
    const txt = c.textContent; c.textContent = '✓ Copiado'; setTimeout(() => c.textContent = txt, 1800);
  });

  // ---------- anuncios ----------
  const lista = $('#ovLista'), frame = $('#ovFrame'), estado = $('#ovEstado');
  const opts = (arr, v) => arr.map(([k, l]) => '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + l + '</option>').join('');
  const campo = (lbl, html, extra = '') => '<label class="f' + extra + '"><span>' + lbl + '</span>' + html + '</label>';
  const inp = (k, v, max, ph = '') => '<input type="text" data-k="' + k + '" maxlength="' + max + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '">';
  function pintarLista() {
    lista.innerHTML = datos.anuncios.map((a, i) => {
      const c = a.tipo === 'cuenta';
      return '<div class="ovad' + (a.activo === false ? ' apagado' : '') + '" data-i="' + i + '">' +
        '<div class="ovadcab"><label class="ovsw"><input type="checkbox" data-k="activo"' + (a.activo !== false ? ' checked' : '') + '><span></span></label>' +
        '<select data-k="tipo">' + opts(TIPOS, a.tipo) + '</select><div class="ovmover"><button class="btn" type="button" data-sube title="Subir">↑</button><button class="btn" type="button" data-quita title="Quitar">✕</button></div></div>' +
        '<div class="ovcampos">' +
        campo('Icono', '<select data-k="icono">' + opts(ICONOS, a.icono) + '</select>') +
        campo('Texto pequeño (arriba)', inp('etiqueta', a.etiqueta, 40, '¡Nueva merch!')) +
        (c ? campo('Mostrar', '<select data-k="modo">' + opts([['cuenta', '⏱ Cuenta atrás'], ['fecha', '📅 Fecha y hora']], a.modo) + '</select>') +
            campo('Fecha', '<input type="date" data-k="fecha" value="' + esc(a.fecha) + '">') + campo('Hora (tu hora)', '<input type="time" data-k="hora" value="' + esc(a.hora) + '">') +
            campo('Texto al llegar a cero', inp('textoFin', a.textoFin, 40, '¡Ya disponible!'))
          : campo('Texto grande', inp('texto', a.texto, 40, 'Ya disponible'))) +
        campo('Chip de abajo (enlace, opcional)', inp('enlace', a.enlace, 50, 'kyomerch.shop')) +
        campo('Dónde sale', '<select data-k="donde">' + opts(DONDE, a.donde) + '</select>') +
        campo('Segundos en pantalla', '<input type="number" data-k="seg" min="4" max="120" value="' + (a.seg || 10) + '">') +
        '</div></div>';
    }).join('') || '<p class="nota">No hay anuncios. Añade uno abajo.</p>';
  }
  const cambiado = () => JSON.stringify(datos) !== guardado;
  function marcar() {
    try { localStorage.setItem(BORRADOR, JSON.stringify(datos)); } catch (e) {}
    const n = datos.anuncios.filter(a => a.activo !== false).length;
    if (sinFuncion) return enviarPrevia();
    estado.className = 'ovestado' + (cambiado() ? ' pend' : ' ok');
    estado.textContent = cambiado() ? '✏️ Cambios sin guardar · ' + n + ' anuncio(s) activo(s)' : '✅ En vivo · ' + n + ' anuncio(s) activo(s)';
    enviarPrevia();
  }
  // Vista previa: la escena real dentro de un iframe, con los anuncios aún sin guardar
  function cargarPrevia() {
    const t = $('input[name=ovpt]:checked', app).value, e = $('input[name=ovpe]:checked', app).value;
    frame.src = 'overlays/escenas/' + t + '/' + e + '.html?preview=1';
    frame.onload = () => { escalar(); enviarPrevia(); };
  }
  const enviarPrevia = () => { try { frame.contentWindow.postMessage({ tipo: 'kyo-anuncios', datos: conObjetivo(datos) }, '*'); } catch (e) {} };
  const escalar = () => { const m = frame.parentElement, k = m.clientWidth / 1920; frame.style.transform = 'scale(' + k + ')'; m.style.height = Math.round(1080 * k) + 'px'; };
  window.addEventListener('resize', () => { if (!app.closest('[hidden]')) escalar(); });

  lista.addEventListener('input', e => {
    const el = e.target, fila = el.closest('.ovad'); if (!fila || !el.dataset.k) return;
    const a = datos.anuncios[+fila.dataset.i], k = el.dataset.k;
    if (k === 'activo') { a.activo = el.checked; fila.classList.toggle('apagado', !el.checked); }
    else if (k === 'seg') a.seg = Math.max(4, Math.min(120, +el.value || 10));
    else if (k === 'tipo') { Object.assign(a, PLANTILLA[el.value](), { tipo: el.value }); pintarLista(); }
    else if (k === 'modo') { a.modo = el.value; }
    else a[k] = el.value;
    marcar();
  });
  lista.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const i = +b.closest('.ovad').dataset.i;
    if (b.matches('[data-quita]')) datos.anuncios.splice(i, 1);
    else if (b.matches('[data-sube]') && i > 0) [datos.anuncios[i - 1], datos.anuncios[i]] = [datos.anuncios[i], datos.anuncios[i - 1]];
    pintarLista(); marcar();
  });
  $('#ovAnadir').addEventListener('click', () => { if (datos.anuncios.length >= 30) return aviso('Máximo 30 anuncios.'); datos.anuncios.push(nuevo($('#ovTipoNuevo').value)); pintarLista(); marcar(); lista.lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  $$('input[name=ovpt], input[name=ovpe]', app).forEach(r => r.addEventListener('change', cargarPrevia));
  $('#ovDeshacer').addEventListener('click', () => { datos = JSON.parse(guardado || JSON.stringify(DEF())); pintarLista(); marcar(); aviso('Cambios descartados.'); });
  $('#ovGuardar').addEventListener('click', async () => {
    const b = $('#ovGuardar'); b.disabled = true; b.textContent = 'Guardando…';
    try {
      const r = await fetch(FN('anuncios'), { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify({ clave: localStorage.getItem('kyo_codigo') || '', datos: conObjetivo(datos) }) });
      const d = await r.json().catch(() => ({}));
      if (d.ok) { sinFuncion = false; guardado = JSON.stringify(datos); marcar(); aviso('¡Guardado! OBS lo mostrará en unos 30 segundos 🦈', 4500); }
      else aviso(d.error === 'clave' ? 'El código de acceso no coincide con KYO_SETUP_KEY.' : d.error === 'tabla' ? 'Falta la tabla: ejecuta 02_anuncios.sql en Supabase.' : 'No se pudo guardar (' + (d.error || r.status) + ').', 5000);
    } catch (e) { aviso('No encuentro la función "anuncios" en Supabase. Revisa que esté creada.', 5000); }
    b.disabled = false; b.textContent = '💾 Guardar (en vivo)';
  });

  // Carga inicial: lo guardado en Supabase (+ borrador local si lo hay)
  (async () => {
    let remoto = null, ok = false;
    try { const r = await fetch(FN('anuncios') + '?t=' + Date.now(), { headers: HDR }); const d = await r.json(); ok = !!d.ok; if (d.ok && d.datos && Array.isArray(d.datos.anuncios) && d.datos.anuncios.length) remoto = d.datos; } catch (e) {}
    const base = remoto ? { anuncios: remoto.anuncios.map(a => { const x = Object.assign({}, a); delete x.objetivo; return x; }) } : DEF();
    guardado = remoto ? JSON.stringify(base) : '';
    let borr = null; try { borr = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch (e) {}
    datos = borr && Array.isArray(borr.anuncios) ? borr : base;
    if (borr && JSON.stringify(borr) === guardado) datos = base;
    pintarLista(); marcar(); cargarPrevia();
    if (!ok) { sinFuncion = true; estado.className = 'ovestado mal'; estado.innerHTML = '⚠️ No encuentro la función <b>anuncios</b> en Supabase. Puedes preparar los anuncios y verlos en la vista previa; se guardarán cuando esté creada.'; }
  })();
}
window.kyoOverlays = { abrir };
