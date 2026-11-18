// Kyo Estudio · pestaña 🧠 IA
// La IA de AletaBot: encenderla o pausarla, su personalidad, los límites de gasto y cuánto lleva gastado.
// Se guarda en Supabase (función "aleta-ia"); quien contesta en el chat, 24/7, es twitch-bot-events.
// La clave de Claude NO se escribe aquí: vive en Supabase → Edge Functions → Secrets (ANTHROPIC_API_KEY).

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const clave = () => { try { return localStorage.getItem('kyo_codigo') || ''; } catch (e) { return ''; } };
const pedir = cuerpo => fetch((K.SUPABASE_URL || '') + '/functions/v1/aleta-ia', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, HDR), body: JSON.stringify(Object.assign({ clave: clave() }, cuerpo)) }).then(r => r.json());

const ERR = {
  bloqueado: 'Demasiados intentos fallidos con el código. Espera unos minutos.',
  clave: 'El código de acceso no es válido. Vuelve a entrar al Estudio.',
  falta_intentos: 'Falta ejecutar 03_intentos.sql en Supabase.',
  tabla: 'Falta la tabla kyo_ajustes (ejecuta 02_anuncios.sql en Supabase).',
  sin_clave: 'Falta el secreto ANTHROPIC_API_KEY en Supabase (Edge Functions → Secrets).',
  tope_mes: 'Ya se alcanzó el tope de gasto de este mes. Súbelo en "Límites" si quieres seguir.',
  vacio: 'Escribe un mensaje para probar.',
  limite: 'Claude dice que hay demasiadas peticiones ahora mismo. Prueba en un minuto.',
  peticion: 'Claude rechazó la petición. Mira "Último error" más abajo.',
  red: 'No se pudo conectar con Claude. Prueba otra vez.',
  api: 'Claude devolvió un error. Mira "Último error" más abajo.'
};
// "clave" significa dos cosas según de dónde venga: el código del Estudio o la clave de Claude
const errTexto = (d, deClaude) => (deClaude && d.error === 'clave') ? 'Claude no aceptó la clave: revisa el secreto ANTHROPIC_API_KEY en Supabase.' : (ERR[d.error] || 'Error: ' + (d.error || 'sin respuesta'));

const usd = n => (Number(n) || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: (Number(n) || 0) < 1 ? 4 : 2 });
const num = n => (Number(n) || 0).toLocaleString('es');
const fecha = iso => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); };
const ESTADOS = { activa: ['ok', '✅ Activa: contesta cuando la nombran o le responden.'], pausada: ['pend', '⏸️ En pausa: no contesta. Tú o tus mods podéis reanudarla (aquí o con !ia sigue).'], apagada: ['mal', '🔌 Apagada del todo: no contesta. Solo tú puedes encenderla (aquí o con !ia encender).'] };
const MOTIVOS = { toxico: 'Tóxico', spam: 'Spam', no_dirigido: 'No iba para ella', ok: 'Bien' };

let abierto = false;
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#iaApp');
  const st = { d: null, sucia: false };

  app.innerHTML =
    '<div class="ovedit">' +
      '<div class="ovcol">' +
        '<div class="card"><h2>🧠 IA de AletaBot</h2>' +
          '<p class="nota">Cuando alguien escribe <code>@AletaBot</code>, su nombre, o responde a un mensaje suyo, AletaBot contesta con Claude: una o dos frases, con la personalidad de abajo. Puede seguir una conversación corta con quien le habla. No puede hacer nada más que hablar.</p>' +
          '<div class="ovestado" id="iaEstado">Cargando…</div>' +
          '<div class="acciones"><button class="btn pri" type="button" data-est="activa">▶ Activar</button><button class="btn" type="button" data-est="pausada">⏸ Pausar</button><button class="btn" type="button" data-est="apagada">🔌 Apagar del todo</button></div>' +
          '<ul class="iacheck" id="iaCheck"></ul>' +
        '</div>' +
        '<div class="card"><h2>🎭 Personalidad</h2>' +
          '<p class="nota">Describe cómo es y cómo habla, como si se lo explicaras a una actriz. También puedes contarle cosas del canal (qué juegas, cómo se llama tu comunidad, bromas internas). Las normas de seguridad (no obedecer al chat, respetar las reglas de Twitch, mensajes cortos) van aparte y no se pueden quitar desde aquí.</p>' +
          '<textarea id="iaPers" rows="14" maxlength="4000" aria-label="Personalidad de AletaBot"></textarea>' +
          '<div class="acciones"><button class="btn pri" type="button" id="iaPersGuardar">💾 Guardar personalidad</button><button class="btn" type="button" id="iaPersBase">↩ Volver a la de ejemplo</button><span class="nota" id="iaPersInfo"></span></div>' +
        '</div>' +
        '<div class="card"><h2>⚙️ Límites</h2>' +
          '<div class="bopts">' +
            '<label><span>Espera por persona (segundos)</span><input type="number" id="iaCooldown" min="5" max="600"></label>' +
            '<label><span>Respuestas por persona y directo</span><input type="number" id="iaTopePersona" min="1" max="1000"></label>' +
            '<label><span>Respuestas por directo (0 = sin tope)</span><input type="number" id="iaTopeDirecto" min="0" max="5000"></label>' +
            '<label><span>Gasto máximo al mes (USD)</span><input type="number" id="iaTopeMes" min="1" max="1000" step="1"></label>' +
          '</div>' +
          '<label class="copiaimg"><input type="checkbox" id="iaSoloDirecto"> Solo contesta en directo (fuera de directo, solo a ti y a tus mods, para probar)</label>' +
          '<details class="soopts"><summary>Más opciones</summary>' +
            '<div class="bopts">' +
              '<label><span>Espera dentro de una conversación (s)</span><input type="number" id="iaEsperaHilo" min="2" max="120"></label>' +
              '<label><span>Turnos rápidos por conversación</span><input type="number" id="iaTurnosHilo" min="1" max="20"></label>' +
            '</div>' +
            '<label class="f"><span>Palabras con las que la llaman (separadas por comas)</span><input type="text" id="iaNombres" maxlength="120"></label>' +
            '<label class="f"><span>Otros bots a los que nunca contesta</span><input type="text" id="iaIgnorar" maxlength="400"></label>' +
            '<p class="nota">La espera por persona se aplica al empezar a hablarle. Dentro de una conversación ya abierta contesta más rápido durante unos turnos y luego vuelve a la espera normal.</p>' +
          '</details>' +
          '<div class="acciones"><button class="btn pri" type="button" id="iaLimGuardar">💾 Guardar límites</button></div>' +
          '<p class="nota">Cada persona tiene su propio máximo por directo, para que nadie agote la IA de los demás. Al llegar al tope del directo (si lo hay) o al del mes, AletaBot deja de usar la IA sola. Los comandos, sorteos y encuestas siguen funcionando igual.</p>' +
        '</div>' +
        '<div class="card"><h2>👥 Memoria de viewers</h2>' +
          '<p class="nota">AletaBot guarda una ficha pequeña de cada persona del chat: su nombre, cómo prefiere que la llamen, desde cuándo viene, en cuántos directos ha estado y hasta 3 cosas que <b>ella misma le ha contado a AletaBot</b>. Lo que se dice en el chat sin hablarle a ella no se guarda, y los temas sensibles (salud, religión, política, edad, dónde vive…) se descartan.</p>' +
          '<label class="copiaimg"><input type="checkbox" id="iaMemoria"> Recordar a los viewers</label>' +
          '<label class="copiaimg"><input type="checkbox" id="iaSaludos"> Saludar a los habituales cuando llegan (una vez por directo)</label>' +
          '<div class="bopts"><label><span>Es habitual a partir de (directos)</span><input type="number" id="iaSaludarDesde" min="2" max="100"></label></div>' +
          '<div class="acciones"><button class="btn pri" type="button" id="iaMemGuardar">💾 Guardar memoria</button><button class="btn" type="button" id="iaSaludoProbar">🧪 Probar un saludo</button></div>' +
          '<div class="botres" id="iaSaludoRes" hidden></div>' +
          '<p class="nota">Si llegan varios habituales seguidos los saluda juntos en un solo mensaje, y nunca hay dos saludos con menos de medio minuto entre ellos. Las fichas de quien lleva un año sin venir se borran solas.</p>' +
          '<div class="acciones botbarra"><input type="text" id="iaVwBuscar" maxlength="25" aria-label="Buscar viewer por nombre de usuario" placeholder="🔎 Buscar por nombre de usuario…"><span class="nota" id="iaVwTotal"></span></div>' +
          '<div class="iatabla iaviewers" id="iaViewers"></div>' +
        '</div>' +
      '</div>' +
      '<div class="ovprev ovcol">' +
        '<div class="card"><h2>💸 Gasto</h2>' +
          '<div class="iagasto" id="iaGasto"></div>' +
          '<div class="iatabla" id="iaDirectos"></div>' +
          '<p class="nota">Es una estimación hecha con los tokens de cada llamada. La cifra oficial es la de la Consola de Claude (Gasto y uso).</p>' +
          '<div class="acciones"><button class="btn" type="button" id="iaRefrescar">🔄 Actualizar</button></div>' +
        '</div>' +
        '<div class="card"><h2>🧪 Probar</h2>' +
          '<p class="nota">Escribe como si fueras alguien del chat hablándole. Te enseña lo que contestaría <b>sin escribir nada en tu chat</b>, con la personalidad que tengas escrita a la izquierda aunque no esté guardada. Cada prueba gasta tokens de verdad (menos de un céntimo).</p>' +
          '<div class="acciones botbarra"><input type="text" id="iaProbarTxt" maxlength="300" aria-label="Mensaje de prueba para la IA" placeholder="Aleta, ¿me echabas de menos?"><button class="btn pri" type="button" id="iaProbar">Probar</button></div>' +
          '<div class="botres" id="iaRes" hidden></div>' +
        '</div>' +
        '<div class="card"><h2>🎮 Juegos</h2>' +
          '<p class="nota">Trivia, adivinanzas e historia colectiva. Las preguntas salen de tu banco: Claude las escribe aquí, tú las revisas y solo se usan las que apruebes. Durante una partida de trivia o adivinanzas no se gasta IA; en la historia, AletaBot escribe un trocito cada vez.</p>' +
          '<div class="ovestado" id="iaJgEstado">Cargando…</div>' +
          '<label class="copiaimg"><input type="checkbox" id="iaJuegos"> Juegos activados</label>' +
          '<div class="bopts"><label><span>Segundos por pregunta (15–60)</span><input type="number" id="iaTiempo" min="15" max="60"></label></div>' +
          '<div class="acciones"><button class="btn pri" type="button" id="iaJgGuardar">💾 Guardar juegos</button></div>' +
          '<h3 class="iasub">✨ Generar preguntas con Claude</h3>' +
          '<div class="bopts">' +
            '<label><span>Tipo</span><select id="iaGenTipo"><option value="trivia">Trivia</option><option value="adivinanza">Adivinanzas</option></select></label>' +
            '<label><span>Cuántas</span><select id="iaGenN"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></label>' +
          '</div>' +
          '<label class="f"><span>Tema (vacío = cultura general)</span><input type="text" id="iaGenTema" maxlength="80" placeholder="Zenless Zone Zero, anime, tiburones…"></label>' +
          '<div class="acciones"><button class="btn pri" type="button" id="iaGenerar">✨ Generar</button><span class="nota" id="iaGenInfo"></span></div>' +
          '<p class="nota">El tema se guarda como categoría: <code>!trivia 5 anime</code> usa solo las de «anime». Revisa siempre las respuestas antes de aprobar: Claude puede equivocarse en algún dato.</p>' +
          '<details class="soopts"><summary>✍️ Añadir una pregunta a mano</summary>' +
            '<div class="bopts">' +
              '<label><span>Tipo</span><select id="iaPgTipo"><option value="trivia">Trivia</option><option value="adivinanza">Adivinanza</option></select></label>' +
              '<label><span>Categoría (opcional)</span><input type="text" id="iaPgCat" maxlength="30"></label>' +
            '</div>' +
            '<label class="f"><span>Pregunta</span><input type="text" id="iaPgPregunta" maxlength="220" placeholder="¿Cómo se llama la mascota del canal?"></label>' +
            '<label class="f"><span>Respuestas válidas (separadas por comas; la primera es la que se anuncia)</span><input type="text" id="iaPgResp" maxlength="200" placeholder="AletaBot, Aleta"></label>' +
            '<label class="f"><span>Pista (opcional)</span><input type="text" id="iaPgPista" maxlength="120"></label>' +
            '<div class="acciones"><button class="btn" type="button" id="iaPgGuardar">Añadir al banco</button></div>' +
          '</details>' +
          '<h3 class="iasub">📚 Banco de preguntas</h3>' +
          '<div class="acciones"><select id="iaBcFiltro" aria-label="Qué preguntas ver"><option value="pendiente">Pendientes de revisar</option><option value="activa">Aprobadas</option></select><button class="btn" type="button" id="iaBcAprobar">✔ Aprobar todas</button><button class="btn" type="button" id="iaBcBorrar">🗑 Borrar pendientes</button></div>' +
          '<div class="iatabla iabanco" id="iaBanco"></div>' +
          '<h3 class="iasub">🏆 Puntos</h3>' +
          '<div class="iatabla" id="iaRanking"></div>' +
          '<div class="acciones"><button class="btn" type="button" id="iaPtsReiniciar">Poner todos los puntos a cero</button></div>' +
          '<h3 class="iasub">📖 Últimas historias</h3>' +
          '<div id="iaHistorias"></div>' +
        '</div>' +
        '<div class="card"><h2>🚩 Mensajes marcados</h2>' +
          '<p class="nota">Mensajes dirigidos a AletaBot que el filtro consideró problemáticos. No les contestó.</p>' +
          '<div class="iatabla" id="iaAvisos"></div>' +
        '</div>' +
        '<div class="card"><h2>💬 En el chat</h2><ul class="botvars">' +
          '<li><code>!ia</code><span>AletaBot dice si está activa, cuántas respuestas lleva y el gasto del mes (tú y tus mods)</span></li>' +
          '<li><code>!ia pausa</code><span>la pausa: deja de contestar (tú y tus mods)</span></li>' +
          '<li><code>!ia sigue</code><span>la reanuda después de una pausa (tú y tus mods)</span></li>' +
          '<li><code>!ia apagar</code><span>la apaga del todo (tú y tus mods)</span></li>' +
          '<li><code>!ia encender</code><span>la vuelve a encender después de apagarla (solo tú)</span></li>' +
          '<li><code>!trivia</code> · <code>!trivia 8 anime</code><span>empieza una trivia (5 preguntas, o las que digas y de la categoría que digas) (tú y tus mods)</span></li>' +
          '<li><code>!adivinanza</code><span>empieza una ronda de adivinanzas (tú y tus mods)</span></li>' +
          '<li><code>!historia tema</code><span>empieza una historia colectiva; el chat la continúa con <b>!historia y su frase</b>. <b>!historia fin</b> la termina (tú y tus mods)</span></li>' +
          '<li><code>!juego parar</code><span>para el juego en marcha (tú y tus mods)</span></li>' +
          '<li><code>!puntos</code> · <code>!top</code><span>sus puntos y los 5 primeros (cualquiera)</span></li>' +
          '<li><code>!misdatos</code><span>AletaBot le dice a esa persona lo que recuerda de ella (cualquiera)</span></li>' +
          '<li><code>!llamame Apodo</code><span>le dice cómo quiere que la llame (cualquiera)</span></li>' +
          '<li><code>!olvidame</code><span>borra todo lo que recuerda de esa persona y no guarda nada más (cualquiera)</span></li>' +
          '<li><code>!recuerdame</code><span>vuelve a recordarla después de un !olvidame (cualquiera)</span></li>' +
        '</ul></div>' +
      '</div>' +
    '</div>';

  const estado = $('#iaEstado', app), pers = $('#iaPers', app);
  const pintarEstado = (tipo, txt) => { estado.className = 'ovestado ' + tipo; estado.textContent = txt; };

  function pintar(d) {
    st.d = d;
    const a = d.ajustes || {};
    const e = ESTADOS[a.estado] || ESTADOS.apagada;
    pintarEstado(!d.clave || !d.sql ? 'mal' : e[0], !d.sql ? 'Falta ejecutar 09_ia.sql en Supabase (SQL Editor).' : !d.clave ? 'Falta el secreto ANTHROPIC_API_KEY en Supabase (Edge Functions → Secrets).' : e[1]);
    $$('[data-est]', app).forEach(b => { b.disabled = b.dataset.est === a.estado; });

    const vivo = d.directo && d.directo.enVivo;
    const er = d.error;
    $('#iaCheck', app).innerHTML =
      '<li class="' + (d.clave ? 'ok' : 'mal') + '">' + (d.clave ? 'Clave de Claude guardada en Supabase' : 'Falta la clave de Claude (secreto ANTHROPIC_API_KEY)') + '</li>' +
      '<li class="' + (d.sql ? 'ok' : 'mal') + '">' + (d.sql ? 'Tablas de la IA creadas' : 'Faltan las tablas: ejecuta 09_ia.sql') + '</li>' +
      '<li class="' + (d.directo ? 'ok' : 'pend') + '">' + (!d.directo ? 'Aún no sé si estás en directo (se comprueba con el primer mensaje)' : vivo ? 'Ahora mismo estás en directo' : 'Ahora mismo no estás en directo') + '</li>' +
      (er ? '<li class="pend">Último error (' + esc(fecha(er.ts)) + ', ' + esc(er.tarea) + '): ' + esc(errTexto(er, true)) + (er.detalle ? ' <small>' + esc(er.detalle) + '</small>' : '') + '</li>' : '');

    if (!st.sucia) pers.value = d.personalidad || d.personalidadBase || '';
    $('#iaPersInfo', app).textContent = d.personalidad ? '' : 'Estás usando la personalidad de ejemplo.';
    $('#iaCooldown', app).value = a.cooldown; $('#iaTopeDirecto', app).value = a.topeDirecto; $('#iaTopeMes', app).value = a.topeMes; $('#iaTopePersona', app).value = a.topePersona;
    $('#iaEsperaHilo', app).value = a.esperaHilo; $('#iaTurnosHilo', app).value = a.turnosHilo;
    $('#iaSoloDirecto', app).checked = a.soloEnDirecto !== false;
    $('#iaNombres', app).value = (a.nombres || []).join(', '); $('#iaIgnorar', app).value = (a.ignorar || []).join(', ');
    $('#iaJuegos', app).checked = a.juegos !== false; $('#iaTiempo', app).value = a.tiempoPregunta;
    $('#iaMemoria', app).checked = a.memoria !== false; $('#iaSaludos', app).checked = a.saludos !== false; $('#iaSaludarDesde', app).value = a.saludarDesde;

    const r = d.resumen || { mes: 0, directos: [] };
    const pct = Math.min(100, Math.round((Number(r.mes) || 0) / (Number(a.topeMes) || 1) * 100));
    $('#iaGasto', app).innerHTML = '<div class="iamonto"><b>' + usd(r.mes) + ' USD</b><span>este mes, de ' + usd(a.topeMes) + ' USD de tope (' + pct + '%)</span></div>' +
      '<div class="iabarra" role="img" aria-label="' + pct + '% del tope del mes"><i style="transform:scaleX(' + (pct / 100) + ')"></i></div>';
    const filas = (r.directos || []).map(x =>
      '<tr><td>' + esc(String(x.id).startsWith('fuera-') ? 'Fuera de directo' : x.id === 'pruebas' ? 'Pruebas del Estudio' : 'Directo') + '<small>' + esc(fecha(x.inicio)) + '</small></td>' +
      '<td>' + num(x.respuestas) + '</td><td>' + num((Number(x.entrada) || 0) + (Number(x.cache_lectura) || 0) + (Number(x.cache_escritura) || 0)) + '<small>' + num(x.cache_lectura) + ' de caché</small></td><td>' + num(x.salida) + '</td><td>' + usd(x.coste) + '</td></tr>').join('');
    $('#iaDirectos', app).innerHTML = filas
      ? '<table><thead><tr><th>Cuándo</th><th>Respuestas</th><th>Tokens leídos</th><th>Tokens escritos</th><th>USD</th></tr></thead><tbody>' + filas + '</tbody></table>'
      : '<p class="nota">Todavía no hay nada gastado.</p>';
    const av = (d.avisos || []).map(x => '<tr><td>' + esc(x.usuario) + '<small>' + esc(fecha(x.ts)) + '</small></td><td>' + esc(x.texto) + '</td><td>' + esc(MOTIVOS[x.motivo] || x.motivo) + (x.grave ? ' ⚠️' : '') + '</td></tr>').join('');
    $('#iaAvisos', app).innerHTML = av ? '<table><thead><tr><th>Quién</th><th>Mensaje</th><th>Motivo</th></tr></thead><tbody>' + av + '</tbody></table>' : '<p class="nota">Nada por ahora 🫧</p>';
  }

  async function leer() {
    try {
      const d = await pedir({ accion: 'leer' });
      if (d.ok) pintar(d); else pintarEstado('mal', errTexto(d));
    } catch (e) { pintarEstado('mal', 'No encuentro la función aleta-ia. ¿Está creada en Supabase?'); }
  }
  async function guardar(cuerpo, hecho, boton) {
    if (boton) boton.disabled = true;
    try {
      const d = await pedir(Object.assign({ accion: 'guardar' }, cuerpo));
      if (d.ok) { if (cuerpo.personalidad !== undefined) st.sucia = false; pintar(d); aviso(hecho); }
      else aviso(errTexto(d), 5000);
    } catch (e) { aviso('No encuentro la función aleta-ia.', 5000); }
    if (boton) boton.disabled = false;
  }

  $$('[data-est]', app).forEach(b => b.addEventListener('click', () => {
    if (!st.d) return;
    guardar({ ajustes: Object.assign({}, st.d.ajustes, { estado: b.dataset.est }) }, { activa: 'IA activada 🧠', pausada: 'IA en pausa ⏸', apagada: 'IA apagada 🔌' }[b.dataset.est]);
  }));
  pers.addEventListener('input', () => { st.sucia = true; $('#iaPersInfo', app).textContent = '✏️ Cambios sin guardar · ' + pers.value.length + '/4000'; });
  $('#iaPersGuardar', app).addEventListener('click', e => guardar({ personalidad: pers.value }, 'Personalidad guardada: AletaBot la usa en unos segundos 🎭', e.currentTarget));
  $('#iaPersBase', app).addEventListener('click', () => { if (!st.d) return; pers.value = st.d.personalidadBase || ''; st.sucia = true; $('#iaPersInfo', app).textContent = '✏️ Personalidad de ejemplo puesta. Pulsa "Guardar personalidad" para usarla.'; });
  $('#iaLimGuardar', app).addEventListener('click', e => {
    if (!st.d) return;
    guardar({ ajustes: Object.assign({}, st.d.ajustes, {
      cooldown: $('#iaCooldown', app).value, topeDirecto: $('#iaTopeDirecto', app).value, topeMes: $('#iaTopeMes', app).value, topePersona: $('#iaTopePersona', app).value,
      esperaHilo: $('#iaEsperaHilo', app).value, turnosHilo: $('#iaTurnosHilo', app).value, soloEnDirecto: $('#iaSoloDirecto', app).checked,
      nombres: $('#iaNombres', app).value, ignorar: $('#iaIgnorar', app).value
    }) }, 'Límites guardados ✓', e.currentTarget);
  });
  $('#iaRefrescar', app).addEventListener('click', leer);

  // ---------- Memoria de viewers ----------
  $('#iaMemGuardar', app).addEventListener('click', e => {
    if (!st.d) return;
    guardar({ ajustes: Object.assign({}, st.d.ajustes, { memoria: $('#iaMemoria', app).checked, saludos: $('#iaSaludos', app).checked, saludarDesde: $('#iaSaludarDesde', app).value }) }, 'Memoria guardada ✓', e.currentTarget);
  });
  $('#iaSaludoProbar', app).addEventListener('click', async e => {
    const b = e.currentTarget, res = $('#iaSaludoRes', app);
    b.disabled = true; res.hidden = false; res.className = 'botres'; res.innerHTML = '<span>Pensando…</span>';
    try {
      const d = await pedir({ accion: 'probarSaludo', personalidad: pers.value });
      if (d.ok) res.innerHTML = '<b>AletaBot (a Pepa, que lleva 7 directos y tiene un gato)</b><span>' + esc(d.respuesta) + '</span><small>Coste de esta prueba: ' + usd(d.coste) + ' USD</small>';
      else { res.className = 'botres mal'; res.innerHTML = '<span>' + esc(errTexto(d, true)) + '</span>'; }
    } catch (er) { res.className = 'botres mal'; res.innerHTML = '<span>No encuentro la función aleta-ia.</span>'; }
    b.disabled = false;
  });
  const vw = $('#iaViewers', app);
  async function leerViewers() {
    try {
      const d = await pedir({ accion: 'viewers', buscar: $('#iaVwBuscar', app).value });
      if (!d.ok) { vw.innerHTML = '<p class="nota">' + esc(errTexto(d)) + '</p>'; return; }
      if (d.sql === false) { vw.innerHTML = '<p class="nota">Falta ejecutar 10_viewers.sql en Supabase (SQL Editor).</p>'; $('#iaVwTotal', app).textContent = ''; return; }
      $('#iaVwTotal', app).textContent = d.total + (d.total === 1 ? ' persona' : ' personas') + (d.total > d.viewers.length ? ' (se ven las ' + d.viewers.length + ' más recientes)' : '');
      vw.innerHTML = d.viewers.length
        ? '<table><thead><tr><th>Quién</th><th>Directos</th><th>Recuerda</th><th></th></tr></thead><tbody>' + d.viewers.map(v =>
            '<tr><td>' + esc(v.apodo || v.nombre || v.login) + '<small>' + esc(v.login) + (v.apodo ? ' · le llama ' + esc(v.apodo) : '') + ' · desde ' + esc(new Date(v.primera).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })) + '</small></td>' +
            '<td>' + num(v.directos) + '</td><td>' + ((v.datos || []).map(esc).join('<br>') || '<small>—</small>') + '</td>' +
            '<td><button class="btn" type="button" data-borrar="' + esc(v.user_id) + '" aria-label="Borrar la ficha de ' + esc(v.login) + '">🗑</button></td></tr>').join('') + '</tbody></table>'
        : '<p class="nota">' + ($('#iaVwBuscar', app).value ? 'Nadie con ese nombre.' : 'Todavía no recuerda a nadie. Las fichas se crean cuando alguien escribe en el chat durante un directo.') + '</p>';
    } catch (e) { vw.innerHTML = '<p class="nota">No encuentro la función aleta-ia.</p>'; }
  }
  let tBuscar;
  $('#iaVwBuscar', app).addEventListener('input', () => { clearTimeout(tBuscar); tBuscar = setTimeout(leerViewers, 400); });
  vw.addEventListener('click', async e => {
    const b = e.target.closest('[data-borrar]'); if (!b) return;
    if (!b.dataset.seguro) { b.dataset.seguro = '1'; b.textContent = '¿Borrar?'; setTimeout(() => { delete b.dataset.seguro; b.textContent = '🗑'; }, 3000); return; }
    b.disabled = true;
    try { const d = await pedir({ accion: 'borrarViewer', user_id: b.dataset.borrar }); if (d.ok) { aviso('Ficha borrada 🫧'); leerViewers(); } else { aviso(errTexto(d), 5000); b.disabled = false; } }
    catch (er) { aviso('No encuentro la función aleta-ia.', 5000); b.disabled = false; }
  });
  leerViewers();

  // ---------- Juegos ----------
  const NOMBRE_JUEGO = { trivia: 'una trivia', adivinanza: 'una ronda de adivinanzas', historia: 'una historia colectiva' };
  let juegos = null;
  function pintarJuegos(d) {
    juegos = d;
    const je = $('#iaJgEstado', app), t = d.totales || {}, tr = t.trivia || {}, ad = t.adivinanza || {};
    if (d.sql === false) { je.className = 'ovestado mal'; je.textContent = 'Falta ejecutar 11_juegos.sql en Supabase (SQL Editor).'; }
    else {
      je.className = 'ovestado ' + (d.juego ? 'pend' : 'ok');
      je.textContent = (d.juego ? '🎮 Ahora mismo hay ' + NOMBRE_JUEGO[d.juego.tipo] + ' en marcha (' + d.juego.n + '/' + d.juego.total + '). ' : '') +
        'Trivia: ' + num(tr.activas) + ' aprobadas, ' + num(tr.pendientes) + ' pendientes · Adivinanzas: ' + num(ad.activas) + ' aprobadas, ' + num(ad.pendientes) + ' pendientes.';
    }
    const filtro = $('#iaBcFiltro', app).value, lista = (d.preguntas || []).filter(x => x.estado === filtro);
    $('#iaBcAprobar', app).hidden = $('#iaBcBorrar', app).hidden = filtro !== 'pendiente' || !lista.length;
    $('#iaBanco', app).innerHTML = lista.length
      ? '<table><thead><tr><th>Pregunta</th><th>Respuestas</th><th></th></tr></thead><tbody>' + lista.map(x =>
          '<tr><td>' + esc(x.pregunta) + '<small>' + (x.tipo === 'trivia' ? 'Trivia' : 'Adivinanza') + (x.categoria ? ' · ' + esc(x.categoria) : '') + (x.pista ? ' · pista: ' + esc(x.pista) : '') + (x.usos ? ' · usada ' + num(x.usos) + (x.usos === 1 ? ' vez' : ' veces') : '') + '</small></td>' +
          '<td>' + (x.respuestas || []).map(esc).join('<br>') + '</td>' +
          '<td>' + (x.estado === 'pendiente' ? '<button class="btn" type="button" data-aprobar="' + x.id + '" aria-label="Aprobar esta pregunta">✔</button> ' : '') + '<button class="btn" type="button" data-quitar="' + x.id + '" aria-label="Borrar esta pregunta">🗑</button></td></tr>').join('') + '</tbody></table>'
      : '<p class="nota">' + (filtro === 'pendiente' ? 'No hay preguntas pendientes de revisar.' : 'Todavía no hay preguntas aprobadas. Genera unas cuantas arriba y apruébalas.') + '</p>';
    $('#iaRanking', app).innerHTML = (d.ranking || []).length
      ? '<table><thead><tr><th>Quién</th><th>Puntos</th></tr></thead><tbody>' + d.ranking.map((x, i) => '<tr><td>' + (i + 1) + '. ' + esc(x.nombre) + '</td><td>' + num(x.puntos) + '</td></tr>').join('') + '</tbody></table>'
      : '<p class="nota">Todavía no hay puntos.</p>';
    $('#iaPtsReiniciar', app).hidden = !(d.ranking || []).length;
    $('#iaHistorias', app).innerHTML = (d.historias || []).length
      ? d.historias.map(h => '<details class="soopts"><summary>' + esc(h.tema || 'Sin tema') + ' · ' + esc(fecha(h.ts)) + '</summary><p class="nota iahistoria">' + esc(h.texto) + '</p>' + ((h.autores || []).length ? '<p class="nota">Con: ' + h.autores.map(esc).join(', ') + '</p>' : '') + '</details>').join('')
      : '<p class="nota">Aún no se ha terminado ninguna historia.</p>';
  }
  async function pedirJuegos(cuerpo, hecho, boton) {
    if (boton) boton.disabled = true;
    let d = null;
    try {
      d = await pedir(cuerpo);
      if (d.ok) { pintarJuegos(d); if (hecho) aviso(typeof hecho === 'function' ? hecho(d) : hecho); }
      else if (cuerpo.accion === 'juegos') { const je = $('#iaJgEstado', app); je.className = 'ovestado mal'; je.textContent = errTexto(d); }
      else aviso(d.error === 'pregunta' ? 'Esa pregunta no vale: necesita un texto de al menos 8 letras, una respuesta, y que la respuesta no esté dentro de la pregunta.' : errTexto(d, true), 6000);
    } catch (e) { aviso('No encuentro la función aleta-ia.', 5000); }
    if (boton) boton.disabled = false;
    return d;
  }
  $('#iaJgGuardar', app).addEventListener('click', e => {
    if (!st.d) return;
    guardar({ ajustes: Object.assign({}, st.d.ajustes, { juegos: $('#iaJuegos', app).checked, tiempoPregunta: $('#iaTiempo', app).value }) }, 'Juegos guardados ✓', e.currentTarget);
  });
  $('#iaGenerar', app).addEventListener('click', async e => {
    const info = $('#iaGenInfo', app);
    info.textContent = 'Claude está escribiendo… (puede tardar medio minuto)';
    const d = await pedirJuegos({ accion: 'generarBanco', tipo: $('#iaGenTipo', app).value, tema: $('#iaGenTema', app).value, n: $('#iaGenN', app).value }, null, e.currentTarget);
    info.textContent = d && d.ok ? (d.nuevas ? d.nuevas + (d.nuevas === 1 ? ' pregunta nueva' : ' preguntas nuevas') + ' para revisar · ' + usd(d.coste) + ' USD' : 'No salió ninguna pregunta nueva (quizá ya las tenías). Prueba con otro tema.') : '';
    if (d && d.ok && d.nuevas) { $('#iaBcFiltro', app).value = 'pendiente'; pintarJuegos(d); }
  });
  $('#iaPgGuardar', app).addEventListener('click', async e => {
    const d = await pedirJuegos({ accion: 'guardarPregunta', tipo: $('#iaPgTipo', app).value, categoria: $('#iaPgCat', app).value, pregunta: $('#iaPgPregunta', app).value, respuestas: $('#iaPgResp', app).value, pista: $('#iaPgPista', app).value }, 'Pregunta añadida y aprobada ✓', e.currentTarget);
    if (d && d.ok) ['#iaPgPregunta', '#iaPgResp', '#iaPgPista'].forEach(q => { $(q, app).value = ''; });
  });
  $('#iaBcFiltro', app).addEventListener('change', () => { if (juegos) pintarJuegos(juegos); });
  const dosVeces = (b, texto, hacer) => {
    if (!b.dataset.seguro) { b.dataset.seguro = '1'; b.dataset.antes = b.textContent; b.textContent = texto; setTimeout(() => { if (b.dataset.seguro) { delete b.dataset.seguro; b.textContent = b.dataset.antes; } }, 3000); return; }
    delete b.dataset.seguro; b.textContent = b.dataset.antes; hacer();
  };
  $('#iaBcAprobar', app).addEventListener('click', e => pedirJuegos({ accion: 'aprobarBanco', todas: true }, 'Preguntas aprobadas ✓', e.currentTarget));
  $('#iaBcBorrar', app).addEventListener('click', e => { const b = e.currentTarget; dosVeces(b, '¿Borrar todas las pendientes?', () => pedirJuegos({ accion: 'borrarBanco', pendientes: true }, 'Pendientes borradas 🫧', b)); });
  $('#iaPtsReiniciar', app).addEventListener('click', e => { const b = e.currentTarget; dosVeces(b, '¿Seguro? Se pierden todos los puntos', () => pedirJuegos({ accion: 'reiniciarPuntos' }, 'Puntos a cero ✓', b)); });
  $('#iaBanco', app).addEventListener('click', e => {
    const a = e.target.closest('[data-aprobar]'), q = e.target.closest('[data-quitar]');
    if (a) pedirJuegos({ accion: 'aprobarBanco', ids: [Number(a.dataset.aprobar)] }, null, a);
    else if (q) dosVeces(q, '¿Borrar?', () => pedirJuegos({ accion: 'borrarBanco', id: Number(q.dataset.quitar) }, null, q));
  });
  pedirJuegos({ accion: 'juegos' });

  async function probar() {
    const txt = $('#iaProbarTxt', app).value.trim(), res = $('#iaRes', app), b = $('#iaProbar', app);
    if (!txt) { aviso(ERR.vacio); return; }
    b.disabled = true; res.hidden = false; res.className = 'botres'; res.innerHTML = '<span>Pensando…</span>';
    try {
      const d = await pedir({ accion: 'probar', texto: txt, personalidad: pers.value });
      if (!d.ok) { res.className = 'botres mal'; res.innerHTML = '<span>' + esc(errTexto(d, true)) + '</span>'; }
      else if (d.respuesta) res.innerHTML = '<b>AletaBot</b><span>' + esc(d.respuesta) + '</span><small>Coste de esta prueba: ' + usd(d.coste) + ' USD</small>';
      else res.innerHTML = '<b>No contestaría</b><span>' + esc(d.filtro && d.filtro.motivo !== 'ok' ? 'El filtro lo marcó como: ' + (MOTIVOS[d.filtro.motivo] || d.filtro.motivo).toLowerCase() + '.' : 'La respuesta no pasó la limpieza de seguridad (o el modelo prefirió no contestar).') + '</span><small>Coste de esta prueba: ' + usd(d.coste) + ' USD</small>';
      leer();
    } catch (e) { res.className = 'botres mal'; res.innerHTML = '<span>No encuentro la función aleta-ia.</span>'; }
    b.disabled = false;
  }
  $('#iaProbar', app).addEventListener('click', probar);
  $('#iaProbarTxt', app).addEventListener('keydown', e => { if (e.key === 'Enter') probar(); });

  leer();
}
window.kyoIA = { abrir };
