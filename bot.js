// Kyo Estudio · pestaña 🦈 AletaBot
// Comandos del chat (!discord, !amor, !so…). Se guardan en Supabase (función "bot-comandos")
// y quien responde en el chat, 24/7, es la función twitch-bot-events.
// Misma sintaxis que Nightbot: se pueden copiar los comandos tal cual.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const FN = n => (K.SUPABASE_URL || '') + '/functions/v1/' + n;
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const BORRADOR = 'kyo_comandos_borrador';
const clave = () => { try { return localStorage.getItem('kyo_codigo') || ''; } catch (e) { return ''; } };
const pedirA = (fn, cuerpo) => fetch(FN(fn), { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify(Object.assign({ clave: clave() }, cuerpo)) }).then(r => r.json());
const pedir = cuerpo => fetch(FN('bot-comandos'), { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify(Object.assign({ clave: clave() }, cuerpo)) }).then(r => r.json());
const errTexto = d => d.error === 'bloqueado' ? 'Demasiados intentos fallidos con el código. Espera ' + Math.ceil((d.espera || 60) / 60) + ' min.'
  : d.error === 'clave' ? 'El código de acceso no es válido. Vuelve a entrar al Estudio.'
  : d.error === 'falta_intentos' ? 'Falta ejecutar 03_intentos.sql en Supabase.'
  : d.error === 'tabla' ? 'Falta la tabla kyo_ajustes (ejecuta 02_anuncios.sql en Supabase).'
  : 'Error: ' + (d.error || 'sin respuesta');

const NIVELES = [['todos', 'Todos'], ['subs', 'Subs o más'], ['vips', 'VIP o más'], ['mods', 'Mods y tú'], ['streamer', 'Solo tú']];
const VARIABLES = [
  ['$(user)', 'quien escribe el comando'],
  ['$(touser)', 'la persona que menciona (@alguien); si no menciona a nadie, quien lo escribe'],
  ['$(count)', 'contador que sube 1 en cada uso'],
  ['$(random 0-100)', 'un número al azar entre esos dos'],
  ['$(query)', 'todo lo que escriben después del comando'],
  ['$(1) $(2)…', 'la primera, segunda… palabra después del comando'],
  ['$(channel)', 'tu canal'],
  ['$(urlfetch URL)', 'el texto que devuelve esa web (igual que en Nightbot)'],
  ['$(twitch usuario "…")', 'datos de otro canal: {{url}}, {{name}}, {{game}}, {{title}}']
];

// Lee una lista copiada de Nightbot ("!cmd: respuesta"), también cuando la respuesta va en la línea siguiente
function desdeNightbot(txt) {
  const out = []; let pendiente = null;
  for (const bruto of String(txt).split(/\r?\n/)) {
    const l = bruto.trim(); if (!l) continue;
    if (pendiente) { out.push({ nombre: pendiente, respuesta: l }); pendiente = null; continue; }
    const m = /^(!?[^\s:]+)\s*:\s*(.+)$/.exec(l);
    if (m && !/^https?$/i.test(m[1])) { out.push({ nombre: m[1].toLowerCase(), respuesta: m[2].trim() }); continue; }
    if (/^!\S+$/.test(l)) pendiente = l.toLowerCase();
  }
  // El número al azar de 2g.be pasa a $(random), que no depende de ninguna web externa
  return out.map(c => Object.assign(c, { respuesta: c.respuesta.replace(/\$\(customapi\s+https?:\/\/2g\.be\/twitch\/randomnumber\.php\?=?defstart=(-?\d+)&defend=(-?\d+)\)/gi, '$(random $1-$2)') }));
}

const nuevoCmd = (o = {}) => Object.assign({ nombre: '', respuesta: '', activo: true, nivel: 'todos', espera: 5 }, o);
const conCount = c => /\$\(count\)/i.test(c.respuesta || '');

let abierto = false;
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#botApp');
  const st = { comandos: [], contadores: {}, pendiente: false, filtro: '' };
  let borrador = null; try { borrador = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch (e) {}

  app.innerHTML =
    '<div class="ovedit">' +
      '<div class="ovcol">' +
        '<div class="card"><h2>🦈 Comandos del chat</h2>' +
          '<p class="nota">AletaBot los contesta en tu chat las 24 horas, aunque no tengas OBS abierto. Usan la misma forma de escribir que Nightbot, así que puedes pegar los tuyos tal cual. El comando se reconoce por la <b>primera palabra</b> del mensaje: <code>!discord</code>, <code>hola</code>, <code>f</code>…</p>' +
          '<div class="ovestado" id="botEstado">Cargando tus comandos…</div>' +
          '<div class="acciones botbarra"><input type="text" id="botBuscar" placeholder="🔎 Buscar comando…"><button class="btn" type="button" id="botNuevo">+ Nuevo</button><button class="btn" type="button" id="botImportarAbrir">📥 Importar de Nightbot</button><button class="btn pri" type="button" id="botGuardar">💾 Guardar (en vivo)</button></div>' +
          '<div class="botimport" id="botImport" hidden>' +
            '<p class="nota">Pega tu lista de Nightbot, un comando por línea con el formato <code>!comando: respuesta</code>. Si alguno ya existe, se reemplaza. El número al azar de 2g.be se cambia solo a <code>$(random 0-100)</code>.</p>' +
            '<textarea id="botImportTxt" rows="8" placeholder="!discord: Bienvenid@ al Arrecife de Coral✨ https://discord.gg/…&#10;!beso: /me $(user) le dió un beso a $(touser)"></textarea>' +
            '<div class="acciones"><button class="btn pri" type="button" id="botImportar">Importar</button><button class="btn" type="button" id="botImportCerrar">Cancelar</button><span class="nota" id="botImportInfo"></span></div>' +
          '</div>' +
        '</div>' +
        '<div class="botlista" id="botLista"></div>' +
      '</div>' +
      '<div class="ovprev ovcol">' +
        '<div class="card" id="sorteoCard"><h2>🎁 Sorteo</h2>' +
          '<div class="ovestado" id="soEstado">Cargando…</div>' +
          '<div class="acciones botbarra"><input type="text" id="soPremio" maxlength="60" placeholder="Premio: Peluche de Kyo"><button class="btn pri" type="button" data-so="abrir">Abrir sorteo</button></div>' +
          '<div class="acciones"><button class="btn" type="button" data-so="cerrar">🔒 Cerrar entradas</button><button class="btn pri" type="button" data-so="ganador">🎉 Elegir ganador</button><button class="btn" type="button" data-so="cancelar">✖ Quitar</button></div>' +
          '<div class="sopart" id="soPart"></div>' +
          '<details class="soopts"><summary>⚙️ Opciones</summary>' +
            '<div class="bopts">' +
              '<label><span>Palabra para entrar</span><input type="text" id="soPalabra" maxlength="30" placeholder="!participar"></label>' +
              '<label><span>Minutos abierto (0 = sin límite)</span><input type="number" id="soMin" min="0" max="120"></label>' +
            '</div>' +
            '<label class="copiaimg"><input type="checkbox" id="soSubs"> Solo pueden participar subs</label>' +
            '<label class="copiaimg"><input type="checkbox" id="soSuerte"> Suerte doble para subs</label>' +
            '<label class="copiaimg"><input type="checkbox" id="soRepetir"> Que no gane nadie de los últimos 5 ganadores</label>' +
            '<div class="acciones"><button class="btn" type="button" id="soGuardar">Guardar opciones</button></div>' +
            '<p class="nota">Se aplican al abrir el siguiente sorteo.</p>' +
          '</details>' +
          '<p class="nota">En el chat, tú y tus mods: <code>!sorteo premio</code> · <code>!sorteo cerrar</code> · <code>!ganador</code> · <code>!sorteo cancelar</code>. El overlay está en Widgets → 🎁 Sorteo.</p>' +
        '</div>' +
        '<div class="card" id="encCard"><h2>📊 Encuesta</h2>' +
          '<div class="ovestado" id="enEstado">Cargando…</div>' +
          '<label class="f"><span>Pregunta</span><input type="text" id="enPregunta" maxlength="90" placeholder="¿Qué jugamos hoy?"></label>' +
          '<div class="enops" id="enOps">' + [1, 2, 3, 4, 5, 6].map(i => '<input type="text" data-op maxlength="40" placeholder="Opción ' + i + (i > 2 ? ' (opcional)' : '') + '"' + (i > 3 ? ' hidden' : '') + '>').join('') + '</div>' +
          '<div class="acciones"><button class="btn" type="button" id="enMas">+ Otra opción</button><button class="btn pri" type="button" data-en="abrir">Abrir encuesta</button></div>' +
          '<div class="acciones"><button class="btn pri" type="button" data-en="cerrar">🏁 Cerrar y anunciar</button><button class="btn" type="button" data-en="cancelar">✖ Quitar</button></div>' +
          '<div class="enres" id="enRes"></div>' +
          '<details class="soopts"><summary>⚙️ Opciones</summary>' +
            '<div class="bopts"><label><span>Minutos abierta (0 = hasta que la cierres)</span><input type="number" id="enMin" min="0" max="120"></label></div>' +
            '<div class="acciones"><button class="btn" type="button" id="enGuardar">Guardar opciones</button></div>' +
            '<p class="nota">Con tiempo límite se cierra sola y AletaBot anuncia el resultado.</p>' +
          '</details>' +
          '<p class="nota">En el chat, tú y tus mods: <code>!encuesta ¿Pregunta? | opción 1 | opción 2</code> · <code>!encuesta cerrar</code> · <code>!encuesta cancelar</code>. Se vota escribiendo solo el número.</p>' +
        '</div>' +
        '<div class="card" id="predCard"><h2>🔮 Predicción (puntos del canal)</h2>' +
          '<div class="ovestado" id="prEstado">Cargando…</div>' +
          '<label class="f"><span>Pregunta (máx. 45)</span><input type="text" id="prTitulo" maxlength="45" placeholder="¿Ganará Kyo el game?"></label>' +
          '<div class="enops" id="prOps">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => '<input type="text" data-op maxlength="25" placeholder="Opción ' + i + (i > 2 ? ' (opcional)' : '') + '"' + (i > 2 ? ' hidden' : '') + '>').join('') + '</div>' +
          '<div class="acciones"><button class="btn" type="button" id="prMas">+ Otra opción</button>' +
            '<select id="prTiempo" aria-label="Tiempo para apostar"><option value="">Tiempo por defecto</option><option value="60">1 min</option><option value="120">2 min</option><option value="300">5 min</option><option value="600">10 min</option><option value="900">15 min</option><option value="1800">30 min</option></select>' +
            '<button class="btn pri" type="button" data-pr="abrir">Abrir predicción</button></div>' +
          '<div class="acciones"><button class="btn" type="button" data-pr="bloquear">🔒 Cerrar apuestas</button><button class="btn" type="button" data-pr="cancelar">↩ Cancelar (devuelve puntos)</button></div>' +
          '<div class="enres" id="prRes"></div>' +
          '<details class="soopts"><summary>⚙️ Opciones</summary>' +
            '<div class="bopts"><label><span>Tiempo para apostar por defecto (segundos, 30–1800)</span><input type="number" id="prSeg" min="30" max="1800" step="30"></label></div>' +
            '<div class="acciones"><button class="btn" type="button" id="prGuardar">Guardar opciones</button></div>' +
          '</details>' +
          '<p class="nota">Pulsa la opción que ganó para repartir los puntos. En el chat, tú y tus mods: <code>!prediccion ¿Pregunta? | Sí | No</code> · <code>!prediccion bloquear</code> · <code>!prediccion gana 1</code> · <code>!prediccion cancelar</code>. El overlay está en Widgets → 🔮 Predicción.</p>' +
        '</div>' +
        '<div class="card"><h2>🧪 Probar</h2>' +
          '<p class="nota">Escribe como si fueras alguien del chat. Te muestra lo que contestaría AletaBot <b>sin escribir nada en tu chat</b> ni sumar contadores. Usa también los cambios que aún no has guardado.</p>' +
          '<div class="acciones botbarra"><input type="text" id="botProbarTxt" placeholder="!beso @alguien"><button class="btn pri" type="button" id="botProbar">Probar</button></div>' +
          '<div class="botres" id="botRes" hidden></div>' +
        '</div>' +
        '<div class="card"><h2>🧩 Variables</h2><ul class="botvars">' +
          VARIABLES.map(([v, d]) => '<li><code>' + esc(v) + '</code><span>' + esc(d) + '</span></li>').join('') +
        '</ul><p class="nota">Si una respuesta empieza por <code>/me</code>, se envía como mensaje normal (Twitch no deja usar /me desde un bot).</p>' +
        '<p class="nota">Cuando todo funcione, quita a Nightbot de tu canal para que no contesten los dos a la vez.</p></div>' +
      '</div>' +
    '</div>';

  const lista = $('#botLista', app), estado = $('#botEstado', app);
  const pintarEstado = (tipo, txt) => { estado.className = 'ovestado ' + tipo; estado.textContent = txt; };
  const marcar = () => {
    st.pendiente = true;
    try { localStorage.setItem(BORRADOR, JSON.stringify({ comandos: st.comandos, pendiente: true })); } catch (e) {}
    pintarEstado('pend', '✏️ Cambios sin guardar · pulsa "💾 Guardar (en vivo)" para que AletaBot los use.');
  };

  function pintarLista() {
    const f = st.filtro.trim().toLowerCase();
    const visibles = st.comandos.map((c, i) => [c, i]).filter(([c]) => !f || c.nombre.includes(f) || c.respuesta.toLowerCase().includes(f));
    if (!st.comandos.length) { lista.innerHTML = '<div class="card"><p class="nota">Aún no hay comandos. Pulsa <b>📥 Importar de Nightbot</b> y pega tu lista, o crea uno con <b>+ Nuevo</b>.</p></div>'; return; }
    if (!visibles.length) { lista.innerHTML = '<div class="card"><p class="nota">Ningún comando coincide con la búsqueda.</p></div>'; return; }
    lista.innerHTML = '<p class="nota botcuenta">' + st.comandos.length + (st.comandos.length === 1 ? ' comando' : ' comandos') + ' · ' + st.comandos.filter(c => c.activo !== false).length + ' activos</p>' +
      visibles.map(([c, i]) => '<div class="ovad bcmd' + (c.activo === false ? ' apagado' : '') + '" data-i="' + i + '">' +
        '<div class="ovadcab"><label class="ovsw" title="Activar o desactivar"><input type="checkbox" data-k="activo"' + (c.activo !== false ? ' checked' : '') + '><span></span></label>' +
          '<input type="text" class="bnombre" data-k="nombre" value="' + esc(c.nombre) + '" placeholder="!comando" maxlength="30" spellcheck="false">' +
          '<button class="btn bborrar" type="button" data-borrar title="Borrar comando">✕</button></div>' +
        '<textarea data-k="respuesta" rows="2" maxlength="500" placeholder="Lo que contesta AletaBot…">' + esc(c.respuesta) + '</textarea>' +
        '<div class="bopts">' +
          '<label><span>Quién puede usarlo</span><select data-k="nivel">' + NIVELES.map(([v, l]) => '<option value="' + v + '"' + (v === (c.nivel || 'todos') ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
          '<label><span>Espera entre usos (s)</span><input type="number" data-k="espera" min="0" max="3600" value="' + (c.espera ?? 5) + '"></label>' +
          (conCount(c) ? '<label><span>Contador $(count)</span><input type="number" data-contador min="0" value="' + (st.contadores[c.nombre] ?? 0) + '"></label>' : '') +
        '</div></div>').join('');
  }

  // Edición sin volver a pintar (para no perder el cursor)
  lista.addEventListener('input', e => {
    const el = e.target, card = el.closest('[data-i]'); if (!card || el.hasAttribute('data-contador')) return;
    const c = st.comandos[+card.dataset.i], k = el.dataset.k; if (!c || !k) return;
    if (k === 'activo') { c.activo = el.checked; card.classList.toggle('apagado', !el.checked); }
    else if (k === 'espera') c.espera = Math.max(0, Math.min(3600, Number(el.value) || 0));
    else if (k === 'nombre') c.nombre = el.value.trim().toLowerCase().split(/\s+/)[0] || '';
    else c[k] = el.value;
    marcar();
  });
  lista.addEventListener('change', async e => {
    const el = e.target, card = el.closest('[data-i]'); if (!card) return;
    const c = st.comandos[+card.dataset.i];
    if (el.dataset.k === 'respuesta' && conCount(c) !== !!card.querySelector('[data-contador]')) pintarLista();
    if (!el.hasAttribute('data-contador') || !c) return;
    const valor = Math.max(0, Math.round(Number(el.value) || 0));
    try {
      const d = await pedir({ accion: 'contador', nombre: c.nombre, valor });
      if (d.ok) { st.contadores[c.nombre] = valor; aviso('Contador de ' + c.nombre + ' en ' + valor + ' ✓'); }
      else aviso(d.error === 'sql' ? 'Falta ejecutar 04_comandos.sql en Supabase.' : errTexto(d), 5000);
    } catch (er) { aviso('No encuentro la función bot-comandos.', 5000); }
  });
  lista.addEventListener('click', e => {
    const b = e.target.closest('[data-borrar]'); if (!b) return;
    const i = +b.closest('[data-i]').dataset.i, c = st.comandos[i];
    if (!confirmarBorrado(b, c)) return;
    st.comandos.splice(i, 1); marcar(); pintarLista();
  });
  // Borrar pide un segundo clic (sin ventanas emergentes)
  function confirmarBorrado(b, c) {
    if (b.dataset.seguro) return true;
    b.dataset.seguro = '1'; b.textContent = '¿Borrar ' + (c.nombre || 'este') + '?'; b.classList.add('pri');
    setTimeout(() => { if (b.isConnected) { delete b.dataset.seguro; b.textContent = '✕'; b.classList.remove('pri'); } }, 3000);
    return false;
  }

  $('#botBuscar', app).addEventListener('input', e => { st.filtro = e.target.value; pintarLista(); });
  $('#botNuevo', app).addEventListener('click', () => {
    st.filtro = ''; $('#botBuscar', app).value = '';
    st.comandos.unshift(nuevoCmd({ nombre: '!' })); marcar(); pintarLista();
    const n = $('.bnombre', lista); if (n) { n.focus(); n.setSelectionRange(1, 1); }
  });
  $('#botImportarAbrir', app).addEventListener('click', () => { $('#botImport', app).hidden = false; $('#botImportTxt', app).focus(); });
  $('#botImportCerrar', app).addEventListener('click', () => { $('#botImport', app).hidden = true; });
  $('#botImportar', app).addEventListener('click', () => {
    const nuevos = desdeNightbot($('#botImportTxt', app).value);
    if (!nuevos.length) { $('#botImportInfo', app).textContent = 'No encontré comandos. Usa el formato !comando: respuesta'; return; }
    let reemplazados = 0;
    nuevos.forEach(n => {
      const i = st.comandos.findIndex(c => c.nombre === n.nombre);
      if (i >= 0) { st.comandos[i] = Object.assign(st.comandos[i], { respuesta: n.respuesta, activo: true }); reemplazados++; }
      else st.comandos.push(nuevoCmd(n));
    });
    st.comandos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    $('#botImportTxt', app).value = ''; $('#botImport', app).hidden = true;
    marcar(); pintarLista();
    aviso(nuevos.length + ' comandos importados' + (reemplazados ? ' (' + reemplazados + ' reemplazados)' : '') + '. Revisa y pulsa Guardar.', 5000);
  });

  $('#botGuardar', app).addEventListener('click', async e => {
    const b = e.currentTarget;
    const vacios = st.comandos.filter(c => !c.nombre || !c.respuesta.trim() || c.nombre === '!');
    if (vacios.length) { aviso('Hay ' + vacios.length + (vacios.length === 1 ? ' comando sin nombre o sin respuesta' : ' comandos sin nombre o sin respuesta') + ': complétalos o bórralos.', 5000); return; }
    const nombres = st.comandos.map(c => c.nombre), rep = nombres.find((n, i) => nombres.indexOf(n) !== i);
    if (rep) { aviso('El comando ' + rep + ' está repetido.', 5000); return; }
    b.disabled = true; pintarEstado('pend', 'Guardando…');
    try {
      const d = await pedir({ accion: 'guardar', comandos: st.comandos });
      if (d.ok) {
        st.pendiente = false; try { localStorage.removeItem(BORRADOR); } catch (er) {}
        pintarEstado('ok', '✅ Guardado: ' + d.total + (d.total === 1 ? ' comando' : ' comandos') + '. AletaBot los usa en unos segundos.');
        aviso('¡Comandos guardados! 🦈');
      } else pintarEstado('mal', errTexto(d));
    } catch (er) { pintarEstado('mal', 'No encuentro la función bot-comandos. ¿Está creada en Supabase?'); }
    b.disabled = false;
  });

  const probar = async () => {
    const t = $('#botProbarTxt', app).value.trim(), res = $('#botRes', app);
    if (!t) return;
    res.hidden = false; res.className = 'botres'; res.textContent = 'Probando…';
    try {
      const d = await pedir({ accion: 'probar', texto: t, comandos: st.comandos });
      if (!d.ok) { res.className = 'botres mal'; res.textContent = errTexto(d); return; }
      if (!d.comando) { res.className = 'botres mal'; res.textContent = 'Ningún comando activo empieza así.'; return; }
      res.innerHTML = '<b>AletaBot</b><span>' + esc(d.respuesta || '(respuesta vacía)') + '</span>';
    } catch (er) { res.className = 'botres mal'; res.textContent = 'No encuentro la función bot-comandos.'; }
  };
  $('#botProbar', app).addEventListener('click', probar);
  $('#botProbarTxt', app).addEventListener('keydown', e => { if (e.key === 'Enter') probar(); });

  // ---------- Sorteo ----------
  const soEst = $('#soEstado', app);
  const TXT_EST = { inactivo: 'No hay ningún sorteo activo.', abierto: '🫧 Abierto: la gente puede entrar.', cerrado: '🔒 Entradas cerradas: elige ganador.', ganador: '🎉 Ganó:' };
  const ERR_SO = { vacio: 'Nadie ha participado todavía.', sin_mas: 'Ya no quedan participantes sin premio.', sin_sorteo: 'No hay ningún sorteo abierto.', ocupado: 'Ya hay un sorteo en marcha: elige ganador o quítalo antes de abrir otro.' };
  function pintarSorteo(d) {
    if (!d || !d.ok) { soEst.className = 'ovestado mal'; soEst.textContent = d && d.error === 'tabla' ? 'Falta ejecutar 05_sorteos.sql en Supabase.' : 'No encuentro la función sorteo. ¿Está creada en Supabase?'; return; }
    soEst.className = 'ovestado ' + (d.estado === 'inactivo' ? '' : 'ok');
    soEst.textContent = (d.premio && d.estado !== 'inactivo' ? '🎁 ' + d.premio + ' · ' : '') + TXT_EST[d.estado] + (d.ganador && d.estado === 'ganador' ? ' ' + d.ganador.nombre + ' 💙' : '');
    const n = d.total || 0;
    $('#soPart', app).innerHTML = d.estado === 'inactivo' ? '' : '<b>' + n + (n === 1 ? ' participante' : ' participantes') + '</b>' +
      (d.nombres && d.nombres.length ? '<span>' + d.nombres.slice(-12).reverse().map(esc).join(' · ') + (n > 12 ? ' …' : '') + '</span>' : '');
  }
  async function leerSorteo() {
    try { const r = await fetch(FN('sorteo') + '?t=' + Date.now(), { headers: HDR, cache: 'no-store' }); pintarSorteo(await r.json()); }
    catch (er) { pintarSorteo(null); }
  }
  $('#sorteoCard', app).addEventListener('click', async e => {
    const b = e.target.closest('[data-so]'); if (!b) return;
    const accion = b.dataset.so, cuerpo = { accion };
    if (accion === 'abrir') { cuerpo.premio = $('#soPremio', app).value.trim(); if (!cuerpo.premio) { aviso('Escribe el premio primero'); $('#soPremio', app).focus(); return; } }
    b.disabled = true;
    try {
      const d = await pedirA('sorteo', cuerpo);
      if (d.ok) { pintarSorteo(d); aviso({ abrir: '¡Sorteo abierto! AletaBot lo anuncia en el chat 🎁', cerrar: 'Entradas cerradas 🔒', ganador: '¡Ganador elegido! Míralo en el overlay 🎉', cancelar: 'Sorteo quitado de la pantalla' }[accion]); if (accion === 'abrir') $('#soPremio', app).value = ''; }
      else aviso(ERR_SO[d.error] || errTexto(d), 5000);
    } catch (er) { aviso('No encuentro la función sorteo.', 5000); }
    b.disabled = false;
  });
  $('#soGuardar', app).addEventListener('click', async () => {
    const ajustes = { palabra: $('#soPalabra', app).value, minutos: $('#soMin', app).value, soloSubs: $('#soSubs', app).checked, suerteSubs: $('#soSuerte', app).checked, sinRepetir: $('#soRepetir', app).checked };
    try { const d = await pedirA('sorteo', { accion: 'ajustes', ajustes }); if (d.ok) { ponerOpciones(d.ajustes); aviso('Opciones del sorteo guardadas ✓'); } else aviso(errTexto(d), 5000); }
    catch (er) { aviso('No encuentro la función sorteo.', 5000); }
  });
  function ponerOpciones(a) {
    if (!a) return;
    $('#soPalabra', app).value = a.palabra || '!participar'; $('#soMin', app).value = a.minutos || 0;
    $('#soSubs', app).checked = !!a.soloSubs; $('#soSuerte', app).checked = !!a.suerteSubs; $('#soRepetir', app).checked = !!a.sinRepetir;
  }
  pedirA('sorteo', { accion: 'ajustes' }).then(d => { if (d.ok) ponerOpciones(d.ajustes); }).catch(() => {});
  leerSorteo();
  // Mientras la pestaña está a la vista, el estado del sorteo se refresca solo
  setInterval(() => { if (document.visibilityState === 'visible' && !app.closest('[data-panel]').hidden) leerSorteo(); }, 3000);

  // ---------- Encuesta ----------
  const enEst = $('#enEstado', app);
  const ERR_EN = { faltan_opciones: 'Escribe la pregunta y al menos 2 opciones.', ocupada: 'Ya hay una encuesta abierta: ciérrala o quítala antes de abrir otra.' };
  function pintarEncuesta(e) {
    if (!e) { enEst.className = 'ovestado mal'; enEst.textContent = 'No encuentro la función encuesta. ¿Está creada en Supabase? (y ejecutado 06_encuestas.sql)'; $('#enRes', app).innerHTML = ''; return; }
    const abierta = e.estado === 'abierta' && (!e.cierra || Date.parse(e.cierra) > Date.parse(e.ahora || new Date().toISOString()));
    enEst.className = 'ovestado ' + (e.estado === 'inactivo' ? '' : 'ok');
    enEst.textContent = e.estado === 'inactivo' ? 'No hay ninguna encuesta activa.' : (abierta ? '🗳 Abierta: ' : '🏁 Cerrada: ') + e.pregunta;
    const t = e.total || 0;
    $('#enRes', app).innerHTML = e.estado === 'inactivo' ? '' : (e.opciones || []).map((o, i) => {
      const v = (e.votos || [])[i] || 0, p = t ? Math.round(v / t * 100) : 0, g = (e.ganadoras || []).includes(i);
      return '<div class="enfila' + (g ? ' gano' : '') + '"><span>' + (i + 1) + '. ' + esc(o) + (g ? ' 🏆' : '') + '</span><b>' + p + '% · ' + v + '</b><i style="width:' + p + '%"></i></div>';
    }).join('') + '<p class="nota">' + t + (t === 1 ? ' voto' : ' votos') + '</p>';
  }
  async function leerEncuesta() {
    try { const r = await fetch(FN('encuesta') + '?t=' + Date.now(), { headers: HDR, cache: 'no-store' }); const d = await r.json(); pintarEncuesta(d && d.ok ? d.encuesta : null); }
    catch (er) { pintarEncuesta(null); }
  }
  $('#enMas', app).addEventListener('click', () => { const h = $('#enOps [data-op][hidden]', app); if (h) { h.hidden = false; h.focus(); } if (!$('#enOps [data-op][hidden]', app)) $('#enMas', app).hidden = true; });
  $('#encCard', app).addEventListener('click', async e => {
    const b = e.target.closest('[data-en]'); if (!b) return;
    const accion = b.dataset.en, cuerpo = { accion };
    if (accion === 'abrir') {
      cuerpo.pregunta = $('#enPregunta', app).value.trim();
      cuerpo.opciones = $$('#enOps [data-op]', app).map(i => i.value.trim()).filter(Boolean);
      if (!cuerpo.pregunta || cuerpo.opciones.length < 2) { aviso(ERR_EN.faltan_opciones); return; }
    }
    b.disabled = true;
    try {
      const d = await pedirA('encuesta', cuerpo);
      if (d.ok) {
        pintarEncuesta(d.encuesta);
        aviso({ abrir: '¡Encuesta abierta! AletaBot la anuncia en el chat 📊', cerrar: 'Encuesta cerrada: AletaBot anuncia el resultado 🏁', cancelar: 'Encuesta quitada de la pantalla' }[accion]);
        if (accion === 'abrir') { $('#enPregunta', app).value = ''; $$('#enOps [data-op]', app).forEach((i, k) => { i.value = ''; i.hidden = k > 2; }); $('#enMas', app).hidden = false; }
      } else aviso(ERR_EN[d.error] || errTexto(d), 5000);
    } catch (er) { aviso('No encuentro la función encuesta.', 5000); }
    b.disabled = false;
  });
  $('#enGuardar', app).addEventListener('click', async () => {
    try { const d = await pedirA('encuesta', { accion: 'ajustes', ajustes: { minutos: $('#enMin', app).value } }); if (d.ok) { $('#enMin', app).value = d.ajustes.minutos; aviso('Opciones de la encuesta guardadas ✓'); } else aviso(errTexto(d), 5000); }
    catch (er) { aviso('No encuentro la función encuesta.', 5000); }
  });
  pedirA('encuesta', { accion: 'ajustes' }).then(d => { if (d.ok) $('#enMin', app).value = d.ajustes.minutos; }).catch(() => {});
  leerEncuesta();
  setInterval(() => { if (document.visibilityState === 'visible' && !app.closest('[data-panel]').hidden) leerEncuesta(); }, 3000);

  // ---------- Predicción (de Twitch, con puntos del canal) ----------
  const prEst = $('#prEstado', app);
  const ERR_PR = {
    sin_canal: 'Primero conecta tu canal: 🔌 Conexiones → "Conectar mi canal" (con tu cuenta KyoSumiVT).',
    permiso: 'Twitch no dio permiso: vuelve a conectar tu canal en 🔌 Conexiones.',
    ocupada: 'Ya hay una predicción en marcha: resuélvela o cancélala antes de abrir otra.',
    sin_prediccion: 'No hay ninguna predicción en marcha.',
    ya_bloqueada: 'Las apuestas ya estaban cerradas: ahora elige la opción ganadora.',
    opcion_mala: 'Esa opción no existe.',
    faltan_opciones: 'Escribe la pregunta y al menos 2 opciones.',
    twitch: 'Twitch no dejó hacerlo ahora mismo. ¿Eres afiliada o partner?'
  };
  const pts = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'K' : String(n || 0);
  let prActual = null;
  function pintarPrediccion(d) {
    if (!d) { prEst.className = 'ovestado mal'; prEst.textContent = 'No encuentro la función prediccion. ¿Está creada en Supabase?'; $('#prRes', app).innerHTML = ''; return; }
    if (!d.ok) { prEst.className = 'ovestado mal'; prEst.textContent = ERR_PR[d.error] || errTexto(d); $('#prRes', app).innerHTML = ''; prActual = null; return; }
    const p = d.prediccion || {}; prActual = p;
    const vivo = p.estado === 'active' || p.estado === 'locked';
    prEst.className = 'ovestado ' + (vivo ? 'ok' : '');
    prEst.textContent = p.estado === 'active' ? '🔮 Abierta: ' + p.titulo : p.estado === 'locked' ? '🔒 Apuestas cerradas: ' + p.titulo + ' · elige la ganadora'
      : p.estado === 'resolved' ? '🏆 Última: ' + p.titulo : p.estado === 'canceled' ? '↩ Última (cancelada): ' + p.titulo : 'No hay ninguna predicción en marcha.';
    const t = p.total || 0;
    $('#prRes', app).innerHTML = (p.opciones || []).map((o, i) => {
      const pc = t ? Math.round(o.puntos / t * 100) : 0, g = p.ganadora === i && p.estado === 'resolved';
      return '<div class="enfila' + (g ? ' gano' : '') + '"><span>' + (i + 1) + '. ' + esc(o.titulo) + (g ? ' 🏆' : '') + '</span><b>' + pc + '% · ' + pts(o.puntos) + ' · ' + o.gente + ' 👤</b><i style="width:' + pc + '%"></i></div>' +
        (vivo ? '<button class="btn prgana" type="button" data-pr="resolver" data-op="' + (i + 1) + '">🏆 Ganó «' + esc(o.titulo) + '»</button>' : '');
    }).join('') + (p.opciones ? '<p class="nota">' + pts(t) + ' puntos · ' + (p.gente || 0) + ' personas</p>' : '');
  }
  async function leerPrediccion() {
    try { const r = await fetch(FN('prediccion') + '?t=' + Date.now(), { headers: HDR, cache: 'no-store' }); pintarPrediccion(r.ok ? await r.json() : null); }
    catch (er) { pintarPrediccion(null); }
  }
  $('#prMas', app).addEventListener('click', () => { const h = $('#prOps [data-op][hidden]', app); if (h) { h.hidden = false; h.focus(); } if (!$('#prOps [data-op][hidden]', app)) $('#prMas', app).hidden = true; });
  $('#predCard', app).addEventListener('click', async e => {
    const b = e.target.closest('[data-pr]'); if (!b) return;
    const accion = b.dataset.pr, cuerpo = { accion };
    if (accion === 'abrir') {
      cuerpo.titulo = $('#prTitulo', app).value.trim();
      cuerpo.opciones = $$('#prOps [data-op]', app).map(i => i.value.trim()).filter(Boolean);
      if ($('#prTiempo', app).value) cuerpo.segundos = Number($('#prTiempo', app).value);
      if (!cuerpo.titulo || cuerpo.opciones.length < 2) { aviso(ERR_PR.faltan_opciones); return; }
    }
    if (accion === 'resolver') cuerpo.opcion = Number(b.dataset.op);
    if (accion === 'cancelar' && !b.dataset.seguro) { b.dataset.seguro = '1'; b.textContent = '¿Seguro? Pulsa otra vez'; setTimeout(() => { delete b.dataset.seguro; b.textContent = '↩ Cancelar (devuelve puntos)'; }, 3000); return; }
    b.disabled = true;
    try {
      const d = await pedirA('prediccion', cuerpo);
      if (d.ok) {
        pintarPrediccion(d);
        aviso({ abrir: '¡Predicción abierta en Twitch! AletaBot la anuncia 🔮', bloquear: 'Apuestas cerradas 🔒', resolver: '¡Puntos repartidos! 🏆', cancelar: 'Predicción cancelada: puntos devueltos ↩' }[accion]);
        if (accion === 'abrir') { $('#prTitulo', app).value = ''; $$('#prOps [data-op]', app).forEach((i, k) => { i.value = ''; i.hidden = k > 1; }); $('#prMas', app).hidden = false; }
      } else aviso(ERR_PR[d.error] || errTexto(d), 6000);
    } catch (er) { aviso('No encuentro la función prediccion.', 5000); }
    b.disabled = false;
    if (accion === 'cancelar') { delete b.dataset.seguro; b.textContent = '↩ Cancelar (devuelve puntos)'; }
  });
  $('#prGuardar', app).addEventListener('click', async () => {
    try { const d = await pedirA('prediccion', { accion: 'ajustes', ajustes: { segundos: $('#prSeg', app).value } }); if (d.ok) { $('#prSeg', app).value = d.ajustes.segundos; aviso('Opciones de la predicción guardadas ✓'); } else aviso(errTexto(d), 5000); }
    catch (er) { aviso('No encuentro la función prediccion.', 5000); }
  });
  pedirA('prediccion', { accion: 'ajustes' }).then(d => { if (d.ok) $('#prSeg', app).value = d.ajustes.segundos; }).catch(() => {});
  leerPrediccion();
  setInterval(() => { if (document.visibilityState === 'visible' && !app.closest('[data-panel]').hidden) leerPrediccion(); }, 3000);

  // Carga: lo guardado en Supabase, salvo que haya un borrador sin guardar en este navegador
  (async () => {
    try {
      const d = await pedir({ accion: 'leer' });
      if (!d.ok) { pintarEstado('mal', errTexto(d)); if (borrador && borrador.comandos) { st.comandos = borrador.comandos; pintarLista(); } return; }
      st.contadores = d.contadores || {};
      if (borrador && borrador.pendiente && Array.isArray(borrador.comandos)) {
        st.comandos = borrador.comandos; st.pendiente = true;
        pintarEstado('pend', '✏️ Tienes cambios sin guardar de la última vez. Pulsa "💾 Guardar (en vivo)" para que AletaBot los use.');
      } else {
        st.comandos = d.comandos || [];
        pintarEstado(d.sql === false ? 'mal' : 'ok', d.sql === false ? 'Falta ejecutar 04_comandos.sql en Supabase (contadores y espera entre usos).' : (st.comandos.length ? '✅ ' + st.comandos.length + ' comandos activos en AletaBot.' : 'Aún no hay comandos guardados.'));
      }
      pintarLista();
    } catch (er) {
      pintarEstado('mal', 'No encuentro la función bot-comandos. ¿Está creada en Supabase?');
      if (borrador && borrador.comandos) { st.comandos = borrador.comandos; pintarLista(); }
    }
  })();
}
window.kyoBot = { abrir };
