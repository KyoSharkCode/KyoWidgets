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
            '<label><span>Respuestas por directo</span><input type="number" id="iaTopeDirecto" min="1" max="2000"></label>' +
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
          '<p class="nota">Al llegar al tope del directo o al del mes, AletaBot deja de usar la IA sola. Los comandos, sorteos y encuestas siguen funcionando igual.</p>' +
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
    $('#iaCooldown', app).value = a.cooldown; $('#iaTopeDirecto', app).value = a.topeDirecto; $('#iaTopeMes', app).value = a.topeMes;
    $('#iaEsperaHilo', app).value = a.esperaHilo; $('#iaTurnosHilo', app).value = a.turnosHilo;
    $('#iaSoloDirecto', app).checked = a.soloEnDirecto !== false;
    $('#iaNombres', app).value = (a.nombres || []).join(', '); $('#iaIgnorar', app).value = (a.ignorar || []).join(', ');

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
      cooldown: $('#iaCooldown', app).value, topeDirecto: $('#iaTopeDirecto', app).value, topeMes: $('#iaTopeMes', app).value,
      esperaHilo: $('#iaEsperaHilo', app).value, turnosHilo: $('#iaTurnosHilo', app).value, soloEnDirecto: $('#iaSoloDirecto', app).checked,
      nombres: $('#iaNombres', app).value, ignorar: $('#iaIgnorar', app).value
    }) }, 'Límites guardados ✓', e.currentTarget);
  });
  $('#iaRefrescar', app).addEventListener('click', leer);

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
