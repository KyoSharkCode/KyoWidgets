// Temporada 2027 · panel
// Navegación por secciones (#inicio, #perfiles, #videos…), cuentas atrás, plan por stages con tareas
// que se pueden marcar, y la marca a mano (copiar colores, descargar logos).
// Las tareas marcadas se guardan en este navegador (kyo2027_plan) y entran en la copia de seguridad del Estudio.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- datos ----------
  const FECHAS = [
    { d: '2026-12-18', t: 'Último directo de 2026', sub: 'Termina la temporada de streams' },
    { d: '2027-01-01', t: 'Estreno en videos y redes', sub: 'Perfiles, banners y videos con el estilo nuevo', clave: true },
    { d: '2027-01-11', t: 'Regreso de los directos', sub: 'Vuelven los streams con todo lo nuevo', clave: true }
  ];
  // tareas: [id, texto, hecha de serie]
  const STAGES = [
    { n: 0, titulo: 'Base técnica', desc: 'Esta sección, el botón 2027 del Estudio, el logo nuevo y los colores compartidos.', tareas: [
      ['s0-seccion', 'Sección 2027 con entrada por Google', 1], ['s0-boton', 'Botón 2027 en el Estudio', 1],
      ['s0-logo', 'Logo nuevo: isologo e isotipo', 1], ['s0-colores', 'Colores y fuentes compartidos', 1]] },
    { n: 1, vista: 'perfiles', titulo: 'Identidad en redes', desc: 'Fotos de perfil y banners para Twitch, YouTube, Kick, TikTok y Discord. Cambio el 1 de enero.', tareas: [
      ['s1-avatar', 'Foto de perfil', 1], ['s1-twitch', 'Banner de Twitch', 1], ['s1-youtube', 'Banner de YouTube (TV, PC y móvil)', 1],
      ['s1-offline', 'Pantalla Off Stream', 1], ['s1-discord', 'Banner e invitación de Discord', 1],
      ['s1-kick', 'Confirmar el tamaño del banner de Kick', 0], ['s1-google', 'Probar la entrada con Google', 0],
      ['s1-subir', 'Subir todas las piezas el 1 de enero', 0]] },
    { n: 2, vista: 'videos', titulo: 'Videos', desc: 'Intro, outro, miniaturas y marca de agua. Antes del 1 de enero.', tareas: [
      ['s2-intro', 'Intro «Aleta al acecho»', 1], ['s2-outro', 'Outro (pantalla final)', 1], ['s2-miniaturas', 'Plantilla de miniaturas', 1],
      ['s2-agua', 'Marca de agua', 1]] },
    { n: 3, vista: 'escenas', titulo: 'Escenas de stream', desc: 'Las escenas de OBS con el estilo nuevo.', tareas: [
      ['s3-chatting', 'Just Chatting', 1], ['s3-comenzando', 'Comenzando', 1], ['s3-gameplay', 'Gameplay', 1],
      ['s3-volvemos', 'Ya regreso', 1], ['s3-terminando', 'Terminando', 1], ['s3-transicion', 'Transición', 1]] },
    { n: 4, vista: 'widgets', titulo: 'Widgets', desc: 'Los widgets del directo, más compactos y con el estilo nuevo.', tareas: [
      ['s4-spotify', 'Spotify: entrada y 3 estilos', 1], ['s4-anuncios', 'Anuncios: tarjeta y cinta', 1], ['s4-prediccion', 'Predicción compacta', 1],
      ['s4-encuesta', 'Encuesta compacta', 1], ['s4-sorteo', 'Sorteo compacto', 1], ['s4-metas', 'Meta de donaciones kawaii', 1],
      ['s4-chat', 'Chat', 1], ['s4-contador', 'Contador', 1], ['s4-cuenta', 'Cuenta atrás', 1]] },
    { n: 5, vista: 'animaciones', titulo: 'Animaciones', desc: 'Las animaciones del Estudio en versión 2027 y ensayo completo en OBS.', tareas: [
      ['s5-sigueme', '¡Sígueme!', 1], ['s5-sub-barra', '¡Suscríbete! en barra', 1], ['s5-barra-codigo', 'Barra del código', 1], ['s5-pegatina-codigo', 'Pegatina del código', 0],
      ['s5-merch', '¡Nueva merch!', 0], ['s5-anuncio-cuenta', 'Anuncio con cuenta atrás', 0], ['s5-anuncio-directo', '¡Directo especial!', 0], ['s5-anuncio-hoy', '¡Hoy hay directo!', 0],
      ['s5-ensayo', 'Ensayo en OBS (9 o 10 de enero)', 0]] },
    { n: 6, titulo: 'El cambio', desc: 'El 11 de enero esta sección pasa a ser el Estudio principal.', tareas: [
      ['s6-principal', 'El Estudio 2027 pasa a ser el principal', 0], ['s6-archivar', 'Archivar la sección de 2026', 0]] },
    { n: 7, titulo: 'Después del regreso', desc: 'Lo que llega con la temporada ya en marcha.', tareas: [
      ['s7-paneles', 'Paneles', 0], ['s7-emotes', 'Emotes e insignias', 0], ['s7-discord', 'Discord', 0],
      ['s7-tematicas', 'Ediciones temáticas', 0], ['s7-merch', 'Merch', 0]] }
  ];
  const COLORES = [
    ['Abisal', '#0A1030', 'Fondo y contornos'], ['Índigo Kyo', '#2B2F7A', 'Paneles y aleta'], ['Aleta', '#3A7BD5', 'Color principal'],
    ['Azul claro', '#A9D3F0', 'Final del degradado del logo'], ['Bioluz', '#6FE3F0', 'Bordes, líneas y HUD'], ['Espuma', '#C9E6F2', 'Textos secundarios'],
    ['Perla', '#F5F3FB', 'Texto principal y borde pegatina'], ['Coral', '#FF6F61', 'Lo importante (5% como máximo)'], ['Coral Pastel', '#FFB4A8', 'Coral suave'],
    ['Menta Byte', '#5EF2B8', 'Datos de juego, progreso y mods'], ['Oro Premio', '#F4C542', 'VIP, metas cumplidas y combos']
  ];
  const VISTAS = ['inicio', 'perfiles', 'videos', 'escenas', 'widgets', 'animaciones', 'marca'];

  // ---------- tareas hechas ----------
  const CLAVE = 'kyo2027_plan';
  let marcas = {};
  try { marcas = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
  const hecha = (t) => (t[0] in marcas ? !!marcas[t[0]] : !!t[2]);
  const cuenta = (st) => { const h = st.tareas.filter(hecha).length; return { h, total: st.tareas.length }; };
  const estado = (st) => { const { h, total } = cuenta(st); return h === total ? 'listo' : h ? 'curso' : 'pendiente'; };
  const ESTADO_TXT = { listo: 'Listo', curso: 'En curso', pendiente: 'Pendiente' };

  // ---------- fechas ----------
  const hoy = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const dia = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
  const faltan = (iso) => Math.round((dia(iso) - hoy()) / 86400000);
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const textoFalta = (n) => (n > 1 ? 'Faltan ' + n + ' días' : n === 1 ? 'Mañana' : n === 0 ? '¡Hoy!' : 'Ya pasó');

  // ---------- piezas de interfaz ----------
  function listaTareas(st) {
    return '<ul class="tareas">' + st.tareas.map((t) => '<li><label><input type="checkbox" data-tarea="' + t[0] + '"' + (hecha(t) ? ' checked' : '') + '><span>' + esc(t[1]) + '</span></label></li>').join('') + '</ul>';
  }
  function progreso(st) {
    return '<div class="prog"><div class="barra-prog"><i data-prog="' + st.n + '"></i></div><span class="prog-n" data-cuenta="' + st.n + '"></span></div>';
  }
  function tarjetaStage(st) {
    const e = estado(st);
    return '<article class="st">' +
      '<div class="st-top"><span class="n" data-n="' + st.n + '">' + st.n + '</span><div><h3>' + esc(st.titulo) + '</h3><p>' + esc(st.desc) + '</p></div></div>' +
      '<div class="st-linea"><span class="estado" data-estado="' + st.n + '"></span>' + progreso(st) + '</div>' +
      '<details class="tareas-caja"' + (e === 'curso' ? ' open' : '') + '><summary>Tareas</summary>' + listaTareas(st) + '</details>' +
      (st.vista ? '<a class="st-ir" href="#' + st.vista + '">Abrir ' + esc(st.titulo) + ' →</a>' : '') +
      '</article>';
  }
  function resumenStage(st, abierta) {
    return '<div class="resumen">' +
      '<div class="st-linea"><span class="estado" data-estado="' + st.n + '"></span>' + progreso(st) + '</div>' +
      '<details class="tareas-caja"' + (abierta ? ' open' : '') + '><summary>Tareas de este stage</summary>' + listaTareas(st) + '</details>' +
      '</div>';
  }
  const muestra = (c) => '<button type="button" class="sw" data-copiar="' + c[1] + '" title="Copiar ' + c[1] + '"><i style="background:' + c[1] + '"></i><span><b>' + esc(c[0]) + '</b><code>' + c[1] + '</code></span></button>';

  function pintarFechas() {
    const prox = FECHAS.find((f) => faltan(f.d) >= 0) || FECHAS[FECHAS.length - 1];
    const regreso = FECHAS[2], nReg = Math.max(0, faltan(regreso.d));
    $('#tRegreso').textContent = nReg;
    $('#tRegresoSub').textContent = nReg ? (nReg === 1 ? 'día' : 'días') : '¡ya!';
    $('#cuentaChip').innerHTML = nReg ? 'Regreso en <b>' + nReg + '</b> ' + (nReg === 1 ? 'día' : 'días') : '<b>¡Ya estamos de vuelta!</b>';
    $('#fechas').innerHTML = FECHAS.map((f) => {
      const n = faltan(f.d), d = dia(f.d);
      return '<li class="fecha' + (f.clave ? ' clave' : '') + (n < 0 ? ' pasada' : '') + (f === prox && n >= 0 ? ' proxima' : '') + '">' +
        '<span class="cal"><b>' + d.getDate() + '</b>' + MES[d.getMonth()] + '</span>' +
        '<span class="que"><b>' + esc(f.t) + '</b><span>' + esc(f.sub) + '</span></span>' +
        '<span class="falta">' + textoFalta(n) + '</span></li>';
    }).join('');
  }

  function pintar() {
    pintarFechas();
    $('#plan').innerHTML = STAGES.map(tarjetaStage).join('');
    $$('[data-resumen]').forEach((el) => { const st = STAGES[+el.dataset.resumen]; el.innerHTML = resumenStage(st, el.dataset.abierta != null); });
    // marca a mano
    const mini = COLORES.filter((c) => ['#0A1030', '#2B2F7A', '#3A7BD5', '#6FE3F0', '#F5F3FB', '#FF6F61', '#5EF2B8', '#F4C542'].includes(c[1]));
    $('#paletaMini').innerHTML = mini.map(muestra).join('');
    $('#paleta').innerHTML = COLORES.map((c) => muestra(c).replace('</code></span>', '</code><small>' + esc(c[2]) + '</small></span>')).join('');
    actualizar();
  }

  // números, barras y estados (sin volver a dibujar las listas, para no perder lo abierto ni el foco)
  function actualizar() {
    let h = 0, total = 0, listos = 0;
    STAGES.forEach((st) => {
      const c = cuenta(st), e = estado(st);
      h += c.h; total += c.total; if (e === 'listo') listos++;
      $$('[data-prog="' + st.n + '"]').forEach((i) => { i.style.width = (c.h / c.total * 100) + '%'; });
      $$('[data-cuenta="' + st.n + '"]').forEach((s) => { s.textContent = c.h + ' / ' + c.total; });
      $$('[data-estado="' + st.n + '"]').forEach((s) => { s.className = 'estado ' + e; s.textContent = ESTADO_TXT[e]; });
      $$('[data-n="' + st.n + '"]').forEach((s) => { s.className = 'n ' + e; });
      $$('[data-punto="' + st.n + '"]').forEach((s) => { s.className = 'punto ' + e; s.title = ESTADO_TXT[e]; });
    });
    $('#tStages').textContent = listos;
    $('#tStagesTotal').textContent = '/ ' + STAGES.length;
    const enCurso = STAGES.filter((st) => estado(st) === 'curso').map((st) => st.n);
    $('#tStagesSub').textContent = enCurso.length ? 'En curso: ' + (enCurso.length > 1 ? 'stages ' + enCurso.slice(0, -1).join(', ') + ' y ' + enCurso[enCurso.length - 1] : 'stage ' + enCurso[0]) : 'Ninguno en curso';
    const pct = Math.round(h / total * 100);
    $('#tTareas').textContent = pct;
    $('#tTareasSub').textContent = h + ' de ' + total + ' tareas hechas';
    $('#tTareasBarra').style.width = pct + '%';
  }

  // ---------- navegación ----------
  const abiertas = {};
  function ir() {
    let v = location.hash.slice(1);
    if (!VISTAS.includes(v)) v = 'inicio';
    $$('[data-vista]').forEach((s) => { s.hidden = s.dataset.vista !== v; });
    $$('.nav a').forEach((a) => { if (a.getAttribute('href') === '#' + v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    // en el móvil el menú es una fila que se desliza: se centra la sección abierta
    const nav = $('.nav'), act = $('.nav a[aria-current]');
    if (act && nav.scrollWidth > nav.clientWidth) { const rn = nav.getBoundingClientRect(), ra = act.getBoundingClientRect(); nav.scrollLeft += ra.left - rn.left - (rn.width - ra.width) / 2; }
    const tit = $('[data-vista="' + v + '"] h1');
    document.title = (v === 'inicio' ? '' : (tit ? tit.textContent + ' · ' : '')) + 'Kyo Estudio 2027';
    if (!abiertas[v]) { abiertas[v] = true; abrir(v); }
    return v;
  }
  function abrir(v) {
    if (v === 'perfiles' && window.kyoPerfiles) window.kyoPerfiles.abrir();
    if (v === 'escenas' && window.kyoEscenas) window.kyoEscenas.abrir($('#escenas'));
    if (v === 'widgets' && window.kyoWidgets) window.kyoWidgets.abrir($('#widgets'));
    if (v === 'videos') {
      if (window.kyoMiniaturas) window.kyoMiniaturas.abrir($('#miniaturas'));
      const caja = $('#herrVideos');
      // el motor de animaciones del Estudio: monta aquí solo las tarjetas 2027 (intro y outro)
      import('../animaciones.js')
        .then(() => window.kyoAnim.montar(caja, ['intro-2027', 'outro-2027']))
        .catch((e) => { console.error(e); caja.innerHTML = '<p class="nota">No se pudo cargar la herramienta de animaciones. Recarga la página.</p>'; });
    }
    if (v === 'animaciones') {
      const caja = $('#herrAnim');
      // las animaciones 2027 del Stage 5 (se añaden aquí según se terminan)
      import('../animaciones.js')
        .then(() => window.kyoAnim.montar(caja, ['sigueme-2027', 'suscribete-barra-2027', 'barra-codigo-2027']))
        .catch((e) => { console.error(e); caja.innerHTML = '<p class="nota">No se pudo cargar la herramienta de animaciones. Recarga la página.</p>'; });
    }
  }

  function aviso(t) { const el = $('#aviso'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 2600); }

  function iniciar() {
    pintar();
    document.addEventListener('change', (e) => {
      const c = e.target.closest('[data-tarea]'); if (!c) return;
      const t = STAGES.flatMap((st) => st.tareas).find((x) => x[0] === c.dataset.tarea); if (!t) return;
      if (c.checked === !!t[2]) delete marcas[t[0]]; else marcas[t[0]] = c.checked;
      try { localStorage.setItem(CLAVE, JSON.stringify(marcas)); } catch (err) {}
      $$('[data-tarea="' + t[0] + '"]').forEach((o) => { o.checked = c.checked; });
      actualizar();
    });
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-copiar]'); if (!b) return;
      const hex = b.dataset.copiar;
      try { await navigator.clipboard.writeText(hex); aviso('Copiado ' + hex); } catch (err) { aviso('No se pudo copiar. El color es ' + hex); }
    });
    // marca de agua de YouTube: el isotipo centrado en un PNG cuadrado y transparente (YouTube la pide cuadrada)
    document.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-agua]'); if (!b) return;
      b.disabled = true;
      try {
        const im = new Image(); im.src = 'marca/logo/kyosumi-isotipo-color.svg'; await im.decode();
        const L = 800, m = L * .06, k = Math.min((L - 2 * m) / im.width, (L - 2 * m) / im.height), w = im.width * k, h = im.height * k;
        const cv = document.createElement('canvas'); cv.width = L; cv.height = L;
        cv.getContext('2d').drawImage(im, (L - w) / 2, (L - h) / 2, w, h);
        const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
        const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'KyoSumi_marca_de_agua_YouTube_800x800.png';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        aviso('Descargada la marca de agua (' + Math.max(1, Math.round(blob.size / 1024)) + ' KB).');
      } catch (err) { console.error(err); aviso('No se pudo crear la imagen.'); }
      b.disabled = false;
    });
    window.addEventListener('hashchange', () => { ir(); const h = $('[data-vista]:not([hidden]) h1'); window.scrollTo(0, 0); if (h) h.focus({ preventScroll: true }); });
    ir();
    // al pasar la medianoche cambian las cuentas atrás
    setInterval(pintarFechas, 10 * 60 * 1000);
  }
  // el contenido solo existe tras pasar la puerta (puerta.js avisa con kyo:dentro)
  document.addEventListener('kyo:dentro', iniciar, { once: true });
})();
