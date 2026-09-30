// Kyo Estudio · pestaña 📰 Prensa
// Editor del Kit de prensa (ES / EN) con vista previa en vivo. Se guarda en Supabase
// (función "prensa") y lo muestra la página pública prensa.html, que se descarga en PDF.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const FN = n => (K.SUPABASE_URL || '') + '/functions/v1/' + n;
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const clave = () => { try { return localStorage.getItem('kyo_codigo') || ''; } catch (e) { return ''; } };
const BORRADOR = 'kyo_prensa_borrador';
const copia = o => JSON.parse(JSON.stringify(o));
const errTexto = d => d.error === 'bloqueado' ? 'Demasiados intentos fallidos con el código. Espera ' + Math.ceil((d.espera || 60) / 60) + ' min.'
  : d.error === 'clave' ? 'El código de acceso no es válido. Vuelve a entrar al Estudio.'
  : d.error === 'falta_intentos' ? 'Falta ejecutar 03_intentos.sql en Supabase.'
  : d.error === 'tabla' ? 'Falta la tabla kyo_ajustes (02_anuncios.sql).'
  : 'Error: ' + (d.error || 'sin respuesta');

const ICONOS = [['directo', '📺 Directo'], ['play', '▶ Vídeo'], ['nota', '🎵 Música'], ['chat', '💬 Mensajes'], ['grupo', '👥 Comunidad'], ['web', '🌐 Web'], ['aleta', '🦈 Aleta']];
const IMAGENES = [['kyo', '🎨 Ilustración de Kyo'], ['kyo3d', '🧊 Modelo 3D'], ['url', '🔗 Una imagen mía (enlace https)'], ['', '🚫 Sin imagen']];

// Listas editables: qué campos tiene cada fila
const LISTAS = {
  datos: { max: 4, nuevo: () => ({ valor: '', es: '', en: '' }), campos: [['valor', 'Número (12,4K)', 'corto'], ['es', 'Qué es (ES)'], ['en', 'What it is (EN)']] },
  redes: { max: 9, nuevo: () => ({ red: '', icono: 'directo', usuario: '', url: 'https://', seguidores: '' }), campos: [['red', 'Plataforma'], ['usuario', 'Usuario'], ['seguidores', 'Seguidores', 'corto'], ['url', 'Enlace https://', 'ancho'], ['icono', '', 'icono']] },
  contenido: { max: 12, nuevo: () => ({ es: '', en: '' }), campos: [['es', 'ES'], ['en', 'EN']] },
  audiencia: { max: 4, nuevo: () => ({ es: '', en: '', valor: '', texto: { es: '', en: '' } }), campos: [['es', 'Dato (ES)'], ['en', 'Label (EN)'], ['texto.es', 'Valor (ES)'], ['texto.en', 'Value (EN)']] },
  destacados: { max: 5, nuevo: () => ({ es: '', en: '' }), campos: [['es', 'ES', 'ancho'], ['en', 'EN', 'ancho']] },
  servicios: { max: 8, nuevo: () => ({ es: '', en: '' }), campos: [['es', 'ES'], ['en', 'EN']] },
  marcas: { max: 8, nuevo: () => ({ nombre: '', es: '', en: '' }), campos: [['nombre', 'Marca'], ['es', 'Qué hicimos (ES)'], ['en', 'What we did (EN)']] }
};
const leerK = (o, k) => k.split('.').reduce((a, p) => (a == null ? a : a[p]), o);
const ponerK = (o, k, v) => { const ps = k.split('.'); let a = o; ps.slice(0, -1).forEach(p => { if (!a[p] || typeof a[p] !== 'object') a[p] = {}; a = a[p]; }); a[ps[ps.length - 1]] = v; };

function normalizar(d) {
  const def = copia(window.KYO_PRENSA_DEF || {});
  const n = Object.assign(def, copia(d || {}));
  // La comunidad guarda el valor en los dos idiomas (texto.es / texto.en)
  n.audiencia = (n.audiencia || []).map(a => { const t = a.texto || {}; return { es: a.es || '', en: a.en || '', texto: { es: t.es || a.valor || '', en: t.en || a.valor || '' }, valor: t.es || a.valor || '' }; });
  n.contacto = Object.assign({ email: '', web: '', extra: { es: '', en: '' } }, n.contacto || {});
  return n;
}

let abierto = false;
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#prensaApp');
  const enlacePublico = new URL('prensa.html', location.href).href;
  let st = normalizar(null), pendiente = false, lang = 'es';
  let borrador = null; try { borrador = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch (e) {}

  const bi = (k, etq, larga) => '<div class="f prbi"><span>' + etq + '</span><div class="prpar">' +
    ['es', 'en'].map(l => (larga ? '<textarea rows="5" data-k="' + k + '.' + l + '" placeholder="' + l.toUpperCase() + '"></textarea>' : '<input type="text" data-k="' + k + '.' + l + '" placeholder="' + l.toUpperCase() + '">') + '<em>' + l.toUpperCase() + '</em>').join('') + '</div></div>';
  const selImg = (k, etq) => '<div class="f"><span>' + etq + '</span><select data-img="' + k + '">' + IMAGENES.map(([v, t]) => '<option value="' + v + '">' + t + '</option>').join('') + '</select><input type="text" data-imgurl="' + k + '" placeholder="https://… (PNG sin fondo queda mejor)" hidden></div>';
  const bloqueLista = (k, titulo, nota) => '<div class="grupo"><h3>' + titulo + '</h3>' + (nota ? '<p class="nota">' + nota + '</p>' : '') + '<div class="prlista" data-lista="' + k + '"></div><button class="btn" type="button" data-mas="' + k + '">+ Añadir</button></div>';

  app.innerHTML =
    '<div class="ovedit">' +
      '<div class="ovcol">' +
        '<div class="card"><h2>📰 Kit de prensa</h2>' +
          '<p class="nota">Tu kit para marcas, en español e inglés. Rellénalo aquí, pulsa <b>💾 Guardar</b> y comparte el enlace o descárgalo en PDF. Lo que dejes vacío no aparece.</p>' +
          '<div class="ovestado" id="prEstado">Cargando…</div>' +
          '<div class="acciones"><button class="btn pri" type="button" id="prGuardar">💾 Guardar (en vivo)</button><button class="btn" type="button" id="prCopiar">🔗 Copiar enlace</button><button class="btn" type="button" data-pdf="es">⬇ PDF español</button><button class="btn" type="button" data-pdf="en">⬇ PDF English</button></div>' +
        '</div>' +
        '<form class="card opts" id="prForm" onsubmit="return false">' +
          '<div class="grupo"><h3>Portada</h3>' +
            '<label class="f"><span>Nombre</span><input type="text" data-k="nombre" maxlength="30"></label>' +
            bi('rol', 'Qué haces') + bi('lema', 'Frase de presentación') +
            selImg('imagen', 'Imagen de la portada') + selImg('imagen2', 'Imagen junto al contacto (hoja 2)') +
          '</div>' +
          '<div class="grupo"><h3>Sobre mí</h3>' + bi('bio', 'Tu presentación (unas 4–5 líneas)', true) + '</div>' +
          bloqueLista('datos', 'Tus números', 'Hasta 4, en grande en la portada. Actualízalos cada mes (p. ej. de las estadísticas de Twitch).') +
          bloqueLista('redes', 'Dónde te encuentran', 'Solo tus redes "para todos los públicos". Iconos propios, sin logos de las plataformas.') +
          bloqueLista('contenido', 'Tu contenido', 'Juegos y tipos de contenido (salen como etiquetas).') +
          bloqueLista('audiencia', 'Tu comunidad', 'Edad, países, idioma… (los ves en las estadísticas de Twitch y TikTok).') +
          bloqueLista('destacados', 'Destacados', 'Logros o cosas que te hacen especial (hasta 5).') +
          bloqueLista('servicios', 'Formas de colaborar', 'Debajo sale siempre "Tarifas a consultar".') +
          bloqueLista('marcas', 'Marcas con las que has colaborado', 'Opcional. Si no pones ninguna, no aparece.') +
          '<div class="grupo"><h3>Contacto</h3>' +
            '<label class="f"><span>Correo para marcas (público)</span><input type="email" data-k="contacto.email" maxlength="80" placeholder="tucorreo@ejemplo.com"></label>' +
            '<label class="f"><span>Web</span><input type="text" data-k="contacto.web" maxlength="60"></label>' +
            bi('contacto.extra', 'Nota breve (opcional, p. ej. "Respondo en 48 h")') +
          '</div>' +
          '<div class="acciones"><button class="btn" type="button" id="prReset">↺ Volver a los textos de ejemplo</button></div>' +
        '</form>' +
      '</div>' +
      '<div class="ovprev ovcol"><div class="card">' +
        '<div class="acciones"><div class="chips"><label><input type="radio" name="prLang" value="es" checked>ES</label><label><input type="radio" name="prLang" value="en">EN</label></div><span class="nota">Vista previa (2 hojas A4)</span></div>' +
        '<div class="prmarco" id="prMarco"><iframe title="Vista previa del kit de prensa" src="prensa.html?preview=1"></iframe></div>' +
      '</div></div>' +
    '</div>';

  const form = $('#prForm', app), ifr = $('#prMarco iframe', app), estado = $('#prEstado', app);
  const pintarEstado = (t, s) => { estado.className = 'ovestado ' + t; estado.textContent = s; };

  // ---------- rellenar el formulario ----------
  function pintarListas() {
    Object.keys(LISTAS).forEach(k => {
      const L = LISTAS[k], cont = $('[data-lista="' + k + '"]', form);
      cont.innerHTML = (st[k] || []).map((fila, i) => '<div class="prfila" data-i="' + i + '">' +
        L.campos.map(([c, ph, tipo]) => tipo === 'icono'
          ? '<select data-c="' + c + '" title="Icono">' + ICONOS.map(([v, t]) => '<option value="' + v + '"' + (v === fila.icono ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>'
          : '<input type="text" data-c="' + c + '" class="' + (tipo || '') + '" placeholder="' + esc(ph) + '" value="' + esc(leerK(fila, c) ?? '') + '">').join('') +
        '<button class="btn prx" type="button" data-quitar title="Quitar">✕</button></div>').join('');
      $('[data-mas="' + k + '"]', form).hidden = (st[k] || []).length >= L.max;
    });
  }
  function rellenar() {
    $$('[data-k]', form).forEach(el => { el.value = leerK(st, el.dataset.k) ?? ''; });
    ['imagen', 'imagen2'].forEach(k => {
      const v = st[k] || '', sel = $('[data-img="' + k + '"]', form), url = $('[data-imgurl="' + k + '"]', form);
      const esUrl = /^https:\/\//.test(v);
      sel.value = esUrl ? 'url' : v; url.hidden = !esUrl; url.value = esUrl ? v : '';
    });
    pintarListas();
  }

  // ---------- vista previa ----------
  let tPrev = null;
  const enviar = () => { try { ifr.contentWindow.postMessage({ tipo: 'kyo-prensa', datos: st, lang }, '*'); } catch (e) {} };
  const previa = () => { clearTimeout(tPrev); tPrev = setTimeout(enviar, 250); };
  ifr.addEventListener('load', enviar);
  function encajar() {
    const m = $('#prMarco', app), k = Math.min(1, (m.clientWidth - 4) / 830);
    ifr.style.transform = 'scale(' + k + ')'; ifr.style.width = '830px'; ifr.style.height = Math.round((m.clientHeight) / k) + 'px';
  }
  window.addEventListener('resize', encajar);
  $$('[name=prLang]', app).forEach(r => r.addEventListener('change', () => { lang = r.value; enviar(); }));

  const cambiado = () => {
    pendiente = true;
    try { localStorage.setItem(BORRADOR, JSON.stringify({ datos: st, pendiente: true })); } catch (e) {}
    pintarEstado('pend', '✏️ Cambios sin guardar · pulsa "💾 Guardar" para que el enlace y el PDF los muestren.');
    previa();
  };

  // ---------- edición ----------
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.k) { ponerK(st, el.dataset.k, el.value); return cambiado(); }
    if (el.dataset.imgurl) { st[el.dataset.imgurl] = el.value.trim(); return cambiado(); }
    const fila = el.closest('.prfila'), lista = el.closest('[data-lista]');
    if (fila && lista && el.dataset.c) {
      const o = st[lista.dataset.lista][+fila.dataset.i];
      ponerK(o, el.dataset.c, el.value);
      if (lista.dataset.lista === 'audiencia') o.valor = (o.texto && o.texto.es) || '';
      cambiado();
    }
  });
  form.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.img) {
      const k = el.dataset.img, url = $('[data-imgurl="' + k + '"]', form);
      url.hidden = el.value !== 'url';
      st[k] = el.value === 'url' ? (url.value.trim() || '') : el.value;
      if (el.value === 'url') url.focus();
      cambiado();
    }
  });
  form.addEventListener('click', e => {
    const mas = e.target.closest('[data-mas]');
    if (mas) { const k = mas.dataset.mas; st[k] = (st[k] || []).concat(LISTAS[k].nuevo()); pintarListas(); const f = $$('[data-lista="' + k + '"] .prfila', form).pop(); if (f) $('input', f).focus(); return cambiado(); }
    const q = e.target.closest('[data-quitar]');
    if (q) { const k = q.closest('[data-lista]').dataset.lista, i = +q.closest('.prfila').dataset.i; st[k].splice(i, 1); pintarListas(); return cambiado(); }
  });
  $('#prReset', app).addEventListener('click', e => {
    const b = e.currentTarget;
    if (!b.dataset.seguro) { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Se pierden tus textos (pulsa otra vez)'; setTimeout(() => { delete b.dataset.seguro; b.textContent = '↺ Volver a los textos de ejemplo'; }, 3500); return; }
    delete b.dataset.seguro; b.textContent = '↺ Volver a los textos de ejemplo';
    const correo = st.contacto && st.contacto.email;
    st = normalizar(null); if (correo) st.contacto.email = correo;
    rellenar(); cambiado();
  });

  // ---------- guardar, enlace y PDF ----------
  $('#prGuardar', app).addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; pintarEstado('pend', 'Guardando…');
    try {
      const r = await fetch(FN('prensa'), { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify({ clave: clave(), datos: st }) });
      const d = await r.json();
      if (d.ok) {
        st = normalizar(d.datos); pendiente = false; try { localStorage.removeItem(BORRADOR); } catch (er) {}
        rellenar(); enviar();
        pintarEstado('ok', '✅ Guardado. El enlace y el PDF ya muestran estos datos.' + (st.contacto.email ? '' : ' (Falta tu correo de contacto)'));
        aviso('¡Kit de prensa guardado! 📰');
      } else pintarEstado('mal', errTexto(d));
    } catch (er) { pintarEstado('mal', 'No encuentro la función prensa. ¿Está creada en Supabase?'); }
    b.disabled = false;
  });
  $('#prCopiar', app).addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(enlacePublico); } catch (er) { const t = document.createElement('textarea'); t.value = enlacePublico; document.body.appendChild(t); t.select(); document.execCommand && document.execCommand('copy'); t.remove(); }
    b.textContent = '✓ Enlace copiado'; setTimeout(() => b.textContent = '🔗 Copiar enlace', 1800);
    if (pendiente) aviso('Ojo: tienes cambios sin guardar; el enlace muestra la última versión guardada.', 5000);
  });
  $$('[data-pdf]', app).forEach(b => b.addEventListener('click', () => {
    if (pendiente) { aviso('Guarda primero: el PDF sale de la versión guardada.', 5000); return; }
    window.open(enlacePublico + '?lang=' + b.dataset.pdf + '&imprimir=1', '_blank');
  }));

  // ---------- carga ----------
  (async () => {
    let remoto = null, ok = false;
    try { const r = await fetch(FN('prensa') + '?t=' + Date.now(), { headers: HDR, cache: 'no-store' }); const d = await r.json(); ok = !!d.ok; remoto = d.datos; } catch (e) {}
    if (borrador && borrador.pendiente && borrador.datos) {
      st = normalizar(borrador.datos); pendiente = true;
      pintarEstado('pend', '✏️ Tienes cambios sin guardar de la última vez. Pulsa "💾 Guardar" cuando quieras.');
    } else {
      st = normalizar(remoto);
      pintarEstado(ok ? (remoto ? 'ok' : '') : 'mal', !ok ? 'No encuentro la función prensa. ¿Está creada en Supabase? (puedes editar igual y guardar después)'
        : remoto ? '✅ Kit guardado' + (remoto.actualizado ? ' el ' + new Date(remoto.actualizado).toLocaleDateString('es') : '') + '.'
        : 'Aún no has guardado tu kit: revisa los textos, añade tus números y tu correo, y pulsa Guardar.');
    }
    rellenar(); encajar(); enviar();
  })();
}
window.kyoPrensa = { abrir };
