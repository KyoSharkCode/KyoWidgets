// Kyo Estudio · Widgets → 🔢 Contadores
// Crea tus contadores (muertes, rage quits…), súmalos o réstalos desde aquí o desde el Stream Deck,
// y copia el enlace de cada uno para OBS. Todo se guarda en Supabase (función "contador")
// y los cambios llegan al momento por Supabase Realtime.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const FN = (K.SUPABASE_URL || '') + '/functions/v1/contador';
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const clave = () => { try { return localStorage.getItem('kyo_codigo') || ''; } catch (e) { return ''; } };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const ICO = id => window.KYO_ICONO_SVG ? window.KYO_ICONO_SVG(id) : '';
const ICONOS = () => Object.keys(window.KYO_ICONOS || {});
const fmt = n => Number(n || 0).toLocaleString('es');
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const MAX = 12;

async function pedir(cuerpo) {
  let r;
  try { r = await fetch(FN, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify(Object.assign({ clave: clave() }, cuerpo)) }); }
  catch (e) { return { ok: false, error: 'red' }; }
  if (r.status === 404 && !r.headers.get('content-type')?.includes('json')) return { ok: false, error: 'sin_funcion' };
  return r.json().catch(() => ({ ok: false, error: 'sin_funcion' }));
}
const errTexto = d => d.error === 'bloqueado' ? 'Demasiados intentos fallidos con el código. Espera ' + Math.ceil((d.espera || 60) / 60) + ' min.'
  : d.error === 'clave' ? 'El código de acceso no es válido. Vuelve a entrar al Estudio.'
  : d.error === 'falta_intentos' ? 'Falta ejecutar 03_intentos.sql en Supabase.'
  : d.error === 'tabla' ? 'Falta la tabla kyo_ajustes (ejecuta 02_anuncios.sql en Supabase).'
  : d.error === 'falta_sql' ? 'Falta ejecutar 07_contadores.sql en el SQL Editor de Supabase.'
  : d.error === 'sin_funcion' ? 'No encuentro la función "contador" en Supabase. ¿Está creada con ese nombre y con "Verify JWT" desactivado?'
  : d.error === 'red' ? 'Sin conexión con Supabase.'
  : d.error === 'no_existe' ? 'Ese contador ya no existe. Recarga la lista.'
  : 'Error: ' + (d.error || 'sin respuesta');

async function copiar(txt, btn) {
  try { await navigator.clipboard.writeText(txt); }
  catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand && document.execCommand('copy'); t.remove(); }
  if (btn) { const v = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = v, 1600); }
}

const st = { lista: [], token: '', listo: false, error: '' };
let abierto = false, app;

// ---------- Vista previa del panel (el formulario de estilo vive en index.html) ----------
const cidInput = () => $('#fContador [name=cid]');
function verEnVista(id) {
  const i = cidInput(); if (!i || i.value === id) return;
  i.value = id; window.kyoWidgetActualizar && window.kyoWidgetActualizar('contador');
  if (app) $$('.ctfila', app).forEach(f => $('[data-ct="ver"]', f)?.classList.toggle('activo', f.dataset.id === id));
}
function asegurarVista() {
  const i = cidInput(); if (!i) return;
  if (!st.lista.some(c => c.id === i.value)) verEnVista(st.lista[0]?.id || '');
}
const urlObs = id => window.kyoWidgetUrl ? window.kyoWidgetUrl('contador', { id }) : '';
const urlSD = (id, accion) => FN + '?' + new URLSearchParams({ t: st.token, id, accion });

// ---------- Pintar ----------
function pintar() {
  if (!st.listo) { app.innerHTML = '<h2>🔢 Mis contadores</h2><div class="ovestado">' + esc(st.error || 'Cargando tus contadores…') + '</div>' + (st.error ? '<div class="acciones"><button class="btn" type="button" data-ct="recargar">↻ Reintentar</button></div>' : ''); return; }
  const vista = cidInput()?.value;
  app.innerHTML =
    '<div class="cthead"><h2>🔢 Mis contadores</h2><span class="nota">Se guardan solos · en vivo en OBS</span></div>' +
    '<p class="nota">Crea los que quieras (muertes, rage quits, “¿lo dijo otra vez?”…). Súmalos aquí o con un botón del Stream Deck: el widget de OBS cambia al momento. Para empezar de cero, <b>↺ Reiniciar</b>.</p>' +
    '<div class="ctlista">' + (st.lista.length ? st.lista.map(c =>
      '<div class="ctfila" data-id="' + esc(c.id) + '">' +
        '<div class="ctmain">' +
          '<button class="ctico" type="button" data-ct="iconos" title="Cambiar icono" aria-label="Cambiar icono">' + ICO(c.icono) + '</button>' +
          '<input type="text" class="ctnom" maxlength="24" value="' + esc(c.nombre) + '" aria-label="Nombre del contador">' +
          '<div class="ctval" aria-live="polite" data-v>' + fmt(c.valor) + '</div>' +
          '<div class="ctbtns">' +
            '<button class="btn ctmenos" type="button" data-ct="menos" aria-label="Restar 1">−1</button>' +
            '<button class="btn pri ctmas" type="button" data-ct="mas" aria-label="Sumar 1">+1</button>' +
          '</div>' +
        '</div>' +
        '<div class="cticonos" hidden>' + ICONOS().map(k => '<button type="button" data-ct="icono" data-i="' + k + '" title="' + esc(window.KYO_ICONOS[k].n) + '"' + (k === c.icono ? ' aria-pressed="true"' : '') + '>' + ICO(k) + '</button>').join('') + '</div>' +
        '<div class="ctmas2 acciones">' +
          '<span class="ctfijar"><input type="number" min="0" max="999999999" placeholder="nº" aria-label="Poner un número"><button class="btn" type="button" data-ct="fijar">✏ Poner</button></span>' +
          '<button class="btn" type="button" data-ct="reiniciar">↺ Reiniciar</button>' +
          '<button class="btn' + (vista === c.id ? ' activo' : '') + '" type="button" data-ct="ver">👁 Ver</button>' +
          '<button class="btn" type="button" data-ct="obs">📋 OBS</button>' +
          '<button class="btn" type="button" data-ct="sd-mas">🎛 Stream Deck +1</button>' +
          '<button class="btn" type="button" data-ct="sd-menos">🎛 −1</button>' +
          '<button class="btn ctborrar" type="button" data-ct="borrar" title="Borrar contador">🗑</button>' +
        '</div>' +
      '</div>').join('') : '<p class="nota ctvacio">Aún no tienes contadores. Crea el primero aquí abajo 👇</p>') + '</div>' +
    (st.lista.length < MAX
      ? '<form class="acciones ctnuevo" data-ct-nuevo onsubmit="return false"><input type="text" maxlength="24" placeholder="Nombre: Muertes, Rage quits…" aria-label="Nombre del contador nuevo"><button class="btn pri" type="submit">+ Crear contador</button></form>'
      : '<p class="nota">Has llegado al máximo de ' + MAX + ' contadores.</p>') +
    '<details class="ctsd"><summary>🎛 Cómo ponerlo en el Stream Deck (sin atajos de teclado)</summary>' +
      '<ol class="pasos">' +
        '<li>En tu contador, pulsa <b>🎛 Stream Deck +1</b> (o <b>−1</b>): se copia su enlace.</li>' +
        '<li>En el programa del Stream Deck arrastra a un botón la acción <b>Sistema → Sitio web</b>.</li>' +
        '<li>Pega el enlace en <b>URL</b> y marca <b>Acceder en segundo plano</b> (en inglés, <i>GET request in background</i>). Así no se abre el navegador: solo suma.</li>' +
        '<li>Ponle el icono y el título que quieras. Cada pulsación suma al momento y lo ves en OBS.</li>' +
      '</ol>' +
      '<p class="nota">El enlace lleva una <b>clave propia del Stream Deck</b>, distinta de tu código del Estudio: solo sirve para sumar o restar contadores. No lo enseñes en directo. Si se filtra, cámbiala aquí (los botones viejos dejarán de funcionar y tendrás que pegar los enlaces nuevos).</p>' +
      '<div class="acciones"><button class="btn" type="button" data-ct="token">🔑 Cambiar la clave del Stream Deck</button></div>' +
    '</details>';
}
function pintarValor(id) {
  const c = st.lista.find(x => x.id === id), fila = app.querySelector('.ctfila[data-id="' + CSS.escape(id) + '"]');
  if (!c || !fila) return;
  const v = $('[data-v]', fila); v.textContent = fmt(c.valor);
  v.classList.remove('salta'); void v.offsetWidth; v.classList.add('salta');
}

// ---------- Datos ----------
async function cargar() {
  const d = await pedir({ accion: 'leer' });
  if (!d.ok) { st.error = errTexto(d); if (!st.listo) pintar(); else aviso(st.error, 5000); return; }
  st.lista = d.lista || []; st.token = d.token || ''; st.listo = true; st.error = '';
  asegurarVista(); pintar();
}
let tGuardar = null, guardando = Promise.resolve();
function guardarLuego() { clearTimeout(tGuardar); tGuardar = setTimeout(guardar, 700); }
function guardar() {
  clearTimeout(tGuardar);
  guardando = guardando.then(async () => {
    const d = await pedir({ accion: 'guardar', lista: st.lista.map(({ id, nombre, icono }) => ({ id, nombre, icono })) });
    if (!d.ok) { aviso(errTexto(d), 5000); return; }
    // Conserva los valores que ya tenemos (pueden haber cambiado desde el Stream Deck mientras tanto)
    const v = Object.fromEntries(d.lista.map(c => [c.id, c.valor]));
    st.lista.forEach(c => { if (c.id in v) c.valor = v[c.id]; });
    window.kyoWidgetActualizar && window.kyoWidgetActualizar('contador');
  });
  return guardando;
}
async function cambiar(id, cuerpo) {
  await guardando; // si el contador es nuevo, primero tiene que estar guardado
  const d = await pedir(Object.assign({ id }, cuerpo));
  if (!d.ok) { aviso(errTexto(d), 5000); return; }
  const c = st.lista.find(x => x.id === id); if (c) { c.valor = d.valor; pintarValor(id); }
}

// ---------- Tiempo real: ves al momento lo que sumas con el Stream Deck ----------
function tiempoReal() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = () => {
    try {
      window.supabase.createClient(K.SUPABASE_URL, K.SUPABASE_ANON_KEY, { auth: { persistSession: false } })
        .channel('kyo-contadores')
        .on('broadcast', { event: 'cambio' }, ({ payload: p }) => {
          const c = p && st.lista.find(x => x.id === p.id);
          if (c && c.valor !== p.valor) { c.valor = p.valor; pintarValor(c.id); }
        }).subscribe();
    } catch (e) {}
  };
  document.head.appendChild(s);
}

// ---------- Eventos ----------
const confirmar = new Map();
function enlazar() {
  app.addEventListener('click', async e => {
    const b = e.target.closest('[data-ct]'); if (!b) return;
    const a = b.dataset.ct, fila = b.closest('.ctfila'), id = fila?.dataset.id, c = st.lista.find(x => x.id === id);
    if (a === 'recargar') { st.error = ''; pintar(); return cargar(); }
    if (a === 'token') {
      if (!confirmar.get('token')) { confirmar.set('token', 1); b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { confirmar.delete('token'); b.textContent = '🔑 Cambiar la clave del Stream Deck'; }, 3500); return; }
      confirmar.delete('token');
      const d = await pedir({ accion: 'token' });
      if (!d.ok) return aviso(errTexto(d), 5000);
      st.token = d.token; b.textContent = '🔑 Cambiar la clave del Stream Deck'; aviso('Clave nueva lista: vuelve a copiar los enlaces en tus botones del Stream Deck', 5000); return;
    }
    if (!c) return;
    if (a === 'mas') return cambiar(id, { accion: 'cambiar', delta: 1 });
    if (a === 'menos') return cambiar(id, { accion: 'cambiar', delta: -1 });
    if (a === 'fijar') {
      const inp = $('.ctfijar input', fila), n = Math.trunc(Number(inp.value));
      if (inp.value === '' || !Number.isFinite(n) || n < 0) { inp.focus(); return aviso('Escribe un número (0 o más)'); }
      inp.value = ''; return cambiar(id, { accion: 'fijar', valor: n });
    }
    if (a === 'reiniciar') {
      const k = 'r:' + id;
      if (!confirmar.get(k)) { confirmar.set(k, 1); b.textContent = '¿A cero? Pulsa otra vez'; b.classList.add('peligro'); setTimeout(() => { confirmar.delete(k); b.textContent = '↺ Reiniciar'; b.classList.remove('peligro'); }, 3500); return; }
      confirmar.delete(k); b.textContent = '↺ Reiniciar'; b.classList.remove('peligro');
      return cambiar(id, { accion: 'fijar', valor: 0 });
    }
    if (a === 'iconos') { const g = $('.cticonos', fila); g.hidden = !g.hidden; return; }
    if (a === 'icono') {
      c.icono = b.dataset.i; $('.ctico', fila).innerHTML = ICO(c.icono);
      $$('.cticonos button', fila).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      $('.cticonos', fila).hidden = true; verEnVista(id); return guardar();
    }
    if (a === 'ver') { verEnVista(id); $$('[data-ct="ver"]', app).forEach(x => x.classList.toggle('activo', x === b)); return; }
    if (a === 'obs') return copiar(urlObs(id), b).then(() => aviso('Enlace de «' + c.nombre + '» copiado: pégalo en OBS como Fuente de navegador (' + $('[data-panel="contador"] [data-w]').textContent + ' × ' + $('[data-panel="contador"] [data-h]').textContent + ')', 5000));
    if (a === 'sd-mas' || a === 'sd-menos') {
      await guardando;
      if (!st.token) return aviso('Aún no hay clave del Stream Deck: recarga la página.');
      return copiar(urlSD(id, a === 'sd-mas' ? 'sumar' : 'restar'), b).then(() => aviso('Enlace copiado: pégalo en la acción «Sitio web» del Stream Deck, con «Acceder en segundo plano» marcado', 5000));
    }
    if (a === 'borrar') {
      const k = 'b:' + id;
      if (!confirmar.get(k)) { confirmar.set(k, 1); b.textContent = '¿Borrar «' + c.nombre + '»?'; b.classList.add('peligro'); setTimeout(() => { if (b.isConnected) { confirmar.delete(k); b.textContent = '🗑'; b.classList.remove('peligro'); } }, 3500); return; }
      confirmar.delete(k);
      st.lista = st.lista.filter(x => x.id !== id); asegurarVista(); pintar(); return guardar();
    }
  });
  app.addEventListener('input', e => {
    const inp = e.target.closest('.ctnom'); if (!inp) return;
    const c = st.lista.find(x => x.id === inp.closest('.ctfila').dataset.id);
    if (c && inp.value.trim()) { c.nombre = inp.value.trim().slice(0, 24); guardarLuego(); }
  });
  app.addEventListener('change', e => { if (e.target.closest('.ctnom')) { if (!e.target.value.trim()) pintar(); else guardar(); } });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('.ctfijar input')) { e.preventDefault(); $('[data-ct="fijar"]', e.target.closest('.ctfila')).click(); } });
  app.addEventListener('submit', e => {
    const f = e.target.closest('[data-ct-nuevo]'); if (!f) return;
    e.preventDefault();
    const inp = $('input', f), nombre = inp.value.trim().slice(0, 24);
    if (!nombre) { inp.focus(); return aviso('Ponle un nombre al contador'); }
    if (st.lista.length >= MAX) return;
    let base = slug(nombre) || 'contador', id = base, n = 2;
    while (st.lista.some(x => x.id === id)) id = base.slice(0, 21) + '-' + n++;
    const icono = /muert|muer|death|dead/i.test(nombre) ? 'calavera' : /rage|ira|enfad/i.test(nombre) ? 'fuego' : /win|victor|gan/i.test(nombre) ? 'trofeo' : /kill|baja|elimin/i.test(nombre) ? 'espada' : /risa|jaja/i.test(nombre) ? 'risa' : 'estrella';
    st.lista.push({ id, nombre, icono, valor: 0 });
    verEnVista(id); pintar(); guardar().then(() => aviso('«' + nombre + '» creado. Copia su enlace con 📋 OBS'));
    setTimeout(() => $('.ctnuevo input', app)?.focus(), 0);
  });
}

function abrir() {
  if (!abierto) { abierto = true; app = $('#ctApp'); pintar(); enlazar(); tiempoReal(); }
  cargar();
}
window.kyoContadores = { abrir };
