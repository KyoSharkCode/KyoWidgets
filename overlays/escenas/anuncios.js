/* Kyo Estudio · anuncios rotativos para las escenas "Ya regreso" y "Terminando"
 * Se carga desde cada escena:  <script src="../anuncios.js" data-escena="ya-regreso" data-tema="marea"></script>
 * Lee los anuncios de Supabase (función "anuncios") cada 30 s: lo que guardes en el Estudio aparece solo en OBS.
 * Con ?preview=1 no lee Supabase: espera los anuncios por postMessage (vista previa del Estudio).
 */
(function () {
  var yo = document.currentScript, ESC = yo.dataset.escena || 'ya-regreso', TEMA = yo.dataset.tema || 'marea';
  var sc = document.querySelector('.scene'); if (!sc) return;
  var VERT = sc.classList.contains('v');
  var q = new URLSearchParams(location.search), PREVIEW = q.get('preview') === '1';
  var T = {
    marea: { acc: '#6FE3F0', glow: 'rgba(111,227,240,.6)', ring: 'rgba(111,227,240,.55)', halo: 'rgba(111,227,240,.25)', ins: 'rgba(58,123,213,.25)', bg: 'rgba(10,16,48,.74)', bar: 'linear-gradient(90deg,#3A7BD5,#6FE3F0 70%,#ADF63C)', main: '#F5F3FB' },
    octubre: { acc: '#FF8A2B', glow: 'rgba(255,138,43,.6)', ring: 'rgba(155,107,255,.7)', halo: 'rgba(155,107,255,.3)', ins: 'rgba(155,107,255,.18)', bg: 'rgba(14,10,36,.8)', bar: 'linear-gradient(90deg,#9B6BFF,#FF8A2B)', main: '#F5F3FB' },
    navidad: { acc: '#F4C542', glow: 'rgba(244,197,66,.6)', ring: 'rgba(244,197,66,.7)', halo: 'rgba(244,197,66,.22)', ins: 'rgba(226,58,82,.18)', bg: 'rgba(10,16,48,.74)', bar: 'linear-gradient(90deg,#E23A52,#F4C542 55%,#5BD99A)', main: '#F5F3FB' }
  }[TEMA] || {};
  var ICON = {
    bolsa: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.6 2" fill="none" stroke="#0a1030" stroke-width="2.2" stroke-linecap="round"/><path d="M9 2.5h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    aleta: '<path d="M3 20c5-1 8-7 9-17 2 7 5 13 9 17z"/>',
    estrella: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    corazon: '<path d="M12 20.5S3 15 3 8.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 9 2.2C21 15 12 20.5 12 20.5z"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    regalo: '<rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><rect x="2.5" y="6.5" width="19" height="4" rx="1"/><path d="M12 6.5v14" stroke="#0a1030" stroke-width="2"/><path d="M12 6.5C10 2.5 6 3.5 8 6.5M12 6.5c2-4 6-3 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    play: '<path d="M8 4.5v15l12-7.5z"/>',
    camiseta: '<path d="M8 3l-5 3 2 5 2.5-1V21h9V10l2.5 1 2-5-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3z"/>',
    mando: '<path d="M7 7h10a5 5 0 0 1 4.9 6l-.8 4a2.5 2.5 0 0 1-4.4 1.1L15 16H9l-1.7 2.1a2.5 2.5 0 0 1-4.4-1.1l-.8-4A5 5 0 0 1 7 7z"/>',
    campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><circle cx="12" cy="20.5" r="2"/>'
  };
  var css = '' +
    '.kad{position:absolute;z-index:5;font-family:"Fredoka","M PLUS Rounded 1c",system-ui,sans-serif;pointer-events:none}' +
    '.kad[hidden]{display:none}' +
    '.kad-in{display:flex;align-items:center;gap:26px;padding:22px 34px 26px 24px;border-radius:34px;background:' + T.bg + ';box-shadow:0 0 0 3px ' + T.ring + ',0 0 30px ' + T.halo + ',inset 0 0 30px ' + T.ins + ';transform-origin:20% 50%}' +
    '.kad-in.sale{animation:kadSale .38s ease-in forwards}.kad-in.entra{animation:kadEntra .62s cubic-bezier(.34,1.56,.64,1) both}' +
    '@keyframes kadSale{to{opacity:0;transform:scale(.86) translateY(14px)}}@keyframes kadEntra{from{opacity:0;transform:scale(.7) translateY(20px) rotate(-3deg)}}' +
    '.kad-ic{flex:none;width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.06);box-shadow:0 0 0 3px ' + T.ring + ',0 0 22px ' + T.halo + ';color:' + T.acc + ';animation:kadFlota 3.4s ease-in-out infinite}' +
    '.kad-ic svg{width:58px;height:58px;fill:currentColor;filter:drop-shadow(0 0 10px ' + T.glow + ')}' +
    '@keyframes kadFlota{50%{transform:translateY(-6px) rotate(-4deg)}}' +
    '.kad-tx{display:grid;gap:6px;min-width:0}' +
    '.kad-lbl{font-family:"Chakra Petch",ui-monospace,monospace;font-weight:600;font-size:22px;letter-spacing:.22em;text-transform:uppercase;color:#9aa3cf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.kad-main{font-family:"Cherry Bomb One","Fredoka",sans-serif;font-size:58px;line-height:1.02;color:' + T.main + ';-webkit-text-stroke:10px #0A1030;paint-order:stroke fill;filter:drop-shadow(0 6px 0 rgba(10,16,48,.55));white-space:nowrap}' +
    '.kad-main.num{font-family:"Chakra Petch",ui-monospace,monospace;font-weight:600;font-size:66px;-webkit-text-stroke:0;color:' + T.acc + ';font-variant-numeric:tabular-nums;text-shadow:0 0 22px ' + T.glow + ';filter:none}' +
    '.kad-main.fecha{font-family:"Fredoka",sans-serif;font-weight:700;font-size:50px;-webkit-text-stroke:0;color:' + T.acc + ';text-shadow:0 0 18px ' + T.glow + ';filter:none}' +
    '.kad-sub{justify-self:start;font-family:"Chakra Petch",ui-monospace,monospace;font-weight:600;font-size:24px;letter-spacing:.05em;color:#fff;background:rgba(255,255,255,.08);border:2px solid ' + T.ring + ';padding:3px 16px;border-radius:999px;white-space:nowrap}' +
    '.kad-bar{height:6px;margin:12px 30px 0;border-radius:999px;background:rgba(201,230,242,.12);overflow:hidden}.kad-bar span{display:block;height:100%;width:0;border-radius:999px;background:' + T.bar + '}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement('div'); box.className = 'kad'; box.hidden = true;
  box.innerHTML = '<div class="kad-in"><div class="kad-ic"><svg viewBox="0 0 24 24"></svg></div><div class="kad-tx"><div class="kad-lbl"></div><div class="kad-main"></div><div class="kad-sub"></div></div></div><div class="kad-bar"><span></span></div>';
  sc.appendChild(box);
  var inn = box.querySelector('.kad-in'), ic = box.querySelector('svg'), lbl = box.querySelector('.kad-lbl'), main = box.querySelector('.kad-main'), sub = box.querySelector('.kad-sub'), bar = box.querySelector('.kad-bar'), barS = bar.querySelector('span');

  // Colocación: debajo del bloque de texto de la escena (o donde digan data-x / data-y / data-w)
  function colocar() {
    var left = sc.querySelector('.left'), sr = sc.getBoundingClientRect(), k = sr.width / sc.offsetWidth || 1;
    var x = +yo.dataset.x, y = +yo.dataset.y, w = +yo.dataset.w;
    if (left && (isNaN(x) || isNaN(y))) { var r = left.getBoundingClientRect(); if (isNaN(x)) x = (r.left - sr.left) / k; if (isNaN(y)) y = (r.bottom - sr.top) / k + 26; }
    box.style.left = (x || 110) + 'px'; box.style.top = (y || 700) + 'px'; box.style.maxWidth = (w || (VERT ? 920 : 820)) + 'px';
    ajustar();
  }
  // Si no cabe hasta el borde de abajo (la espuma), se encoge un poco
  function ajustar() {
    box.style.transform = ''; box.style.transformOrigin = '0 0';
    var h = box.offsetHeight, top = parseFloat(box.style.top) || 0, lim = sc.offsetHeight - (VERT ? 60 : 56);
    if (h && top + h > lim) box.style.transform = 'scale(' + Math.max(.72, (lim - top) / h).toFixed(3) + ')';
  }

  // Formato de la cuenta atrás
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  function textoCuenta(a) {
    var fin = Date.parse(a.objetivo || ''); if (isNaN(fin)) return { t: a.textoFin || '¡Ya disponible!', cls: '' };
    if (a.modo === 'fecha') {
      var d = new Date(fin), dia = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
      return { t: dia.charAt(0).toUpperCase() + dia.slice(1) + ' · ' + dos(d.getHours()) + ':' + dos(d.getMinutes()) + ' h', cls: 'fecha' };
    }
    var s = Math.floor((fin - Date.now()) / 1000);
    if (s <= 0) return { t: a.textoFin || '¡Ya disponible!', cls: '' };
    var dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    return { t: (dd ? dd + 'd ' : '') + dos(hh) + ':' + dos(mm) + ':' + dos(ss), cls: 'num' };
  }
  function pintar(a) {
    ic.innerHTML = ICON[a.icono] || ICON.estrella;
    lbl.textContent = a.etiqueta || '';
    lbl.style.display = a.etiqueta ? '' : 'none';
    sub.textContent = a.enlace || ''; sub.style.display = a.enlace ? '' : 'none';
    refrescar(a); ajustar();
  }
  function refrescar(a) {
    var r = a.tipo === 'cuenta' ? textoCuenta(a) : { t: a.texto || '', cls: '' };
    if (main.textContent !== r.t) main.textContent = r.t;
    main.className = 'kad-main' + (r.cls ? ' ' + r.cls : '');
    main.style.fontSize = '';
    var maxW = box.getBoundingClientRect().width ? parseFloat(box.style.maxWidth) - 200 : 600;
    if (main.scrollWidth > maxW && maxW > 0) main.style.fontSize = Math.max(30, parseFloat(getComputedStyle(main).fontSize) * maxW / main.scrollWidth) + 'px';
  }

  // Rotación
  var lista = [], idx = -1, tRot = null, tTick = null, firma = '';
  function mostrar(i) {
    clearTimeout(tRot);
    if (!lista.length) { box.hidden = true; return; }
    var a = lista[i % lista.length], dur = Math.max(4, Math.min(120, +a.seg || 10)) * 1000;
    var cambiar = function () {
      pintar(a); inn.classList.remove('sale'); void inn.offsetWidth; inn.classList.add('entra');
      bar.style.display = lista.length > 1 ? '' : 'none';
      barS.style.transition = 'none'; barS.style.width = '0'; void barS.offsetWidth; barS.style.transition = 'width ' + dur + 'ms linear'; barS.style.width = '100%';
    };
    if (box.hidden) { box.hidden = false; colocar(); cambiar(); }
    else if (lista.length === 1 && idx === i) cambiar();
    else { inn.classList.remove('entra'); inn.classList.add('sale'); setTimeout(cambiar, 380); }
    idx = i;
    tRot = setTimeout(function () { mostrar((idx + 1) % lista.length); }, dur);
  }
  function usar(datos) {
    var todos = (datos && Array.isArray(datos.anuncios)) ? datos.anuncios : [];
    var nuevos = todos.filter(function (a) { return a && a.activo !== false && (!a.donde || a.donde === 'ambos' || a.donde === ESC); });
    var f = JSON.stringify(nuevos); if (f === firma) return; firma = f;
    lista = nuevos; idx = -1; mostrar(0);
  }
  tTick = setInterval(function () { if (!box.hidden && lista[idx] && lista[idx].tipo === 'cuenta') refrescar(lista[idx]); }, 1000);

  // Datos: Supabase (OBS) o postMessage (vista previa del Estudio)
  var CACHE = 'kyo_anuncios_cache';
  if (PREVIEW) {
    window.addEventListener('message', function (e) { if (e.data && e.data.tipo === 'kyo-anuncios') { firma = ''; usar(e.data.datos); } });
  } else {
    try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c) usar(c); } catch (e) {}
    var K = window.KYO || {};
    var leer = function () {
      if (!K.SUPABASE_URL) return;
      fetch(K.SUPABASE_URL + '/functions/v1/anuncios?t=' + Date.now(), { headers: { apikey: K.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + K.SUPABASE_ANON_KEY } })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ok && d.datos) { usar(d.datos); try { localStorage.setItem(CACHE, JSON.stringify(d.datos)); } catch (e) {} } })
        .catch(function () {});
    };
    leer(); setInterval(leer, 30000);
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(colocar);
})();
