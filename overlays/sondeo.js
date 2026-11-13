/* KyoWidgets · sondeo.js
   Consultas a las funciones de Supabase gastando el mínimo de invocaciones.

   1. GET "simple" (sin cabeceras propias): así el navegador NO manda antes la petición OPTIONS
      (preflight CORS), que en Supabase también cuenta como invocación. Si la función todavía
      tiene "Verify JWT" activado, se pasa sola a enviar la anon key y lo recuerda unas horas.
   2. Sin "?t=Date.now()": una URL fija deja que el navegador reutilice el preflight cuando
      no queda más remedio que mandar cabeceras.
   3. Caché compartida entre fuentes de OBS (localStorage): si otra fuente acaba de pedir lo
      mismo, se usa su respuesta en vez de volver a llamar a Supabase.
   4. Mientras OBS no muestra la fuente (o la pestaña está oculta) no se consulta nada;
      al volver a verse, se consulta al momento.

   API:
     KyoSondeo.pedir(funcion, parametros?, frescoMs?) → Promise<json | null>
     KyoSondeo.bucle(tarea, cadaMs) → { ya() }   (cadaMs es una función: el ritmo puede cambiar)
     KyoSondeo.oculta() → true si OBS/la pestaña no la muestran
     KyoSondeo.alVolver(fn) → fn se llama cuando vuelve a verse */
(function () {
  if (window.KyoSondeo) return;

  // Dentro de un iframe del combo: OBS avisa solo a la página principal, así que usamos su estado
  try {
    if (window.top !== window && window.top.KyoSondeo) {
      var arriba = window.top.KyoSondeo, propio = crear(window.KYO || window.top.KYO || {});
      window.KyoSondeo = {
        pedir: propio.pedir,
        bucle: propio.bucle,
        oculta: function () { return propio.oculta() || arriba.oculta(); },
        alVolver: function (fn) { propio.alVolver(fn); arriba.alVolver(fn); }
      };
      propio.enlazar(window.KyoSondeo);
      return;
    }
  } catch (e) { /* otro origen: seguimos por nuestra cuenta */ }
  window.KyoSondeo = crear(window.KYO || {});

  function crear(K) {
    var obsOculta = false, docOculta = !!document.hidden, avisos = [], yo = null;
    function oculta() { return obsOculta || docOculta; }
    function avisar() { avisos.slice().forEach(function (f) { try { f(); } catch (e) {} }); }
    function cambiar(obs, doc) {
      var antes = oculta(); obsOculta = obs; docOculta = doc;
      if (antes && !oculta()) avisar();
    }
    window.addEventListener('obsSourceVisibleChanged', function (e) { cambiar(!(e.detail && e.detail.visible), docOculta); });
    document.addEventListener('visibilitychange', function () { cambiar(obsOculta, !!document.hidden); });
    window.addEventListener('online', avisar);

    function ls(k, v) {
      try {
        if (v === undefined) return localStorage.getItem(k);
        if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
      } catch (e) {}
      return null;
    }
    function leerJSON(k) { try { return JSON.parse(ls(k) || 'null'); } catch (e) { return null; } }

    var CAB = 'kyo_sondeo_cab:', CACHE = 'kyo_sondeo:', RECUERDA_CAB = 6 * 3600 * 1000;
    var listo = !!K.SUPABASE_URL && !/TU-PROYECTO/.test(K.SUPABASE_URL);

    function bajar(u, cab) {
      var op = { cache: 'no-store' };
      if (cab) op.headers = { apikey: K.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + K.SUPABASE_ANON_KEY };
      if (window.AbortSignal && AbortSignal.timeout) op.signal = AbortSignal.timeout(12000);
      return fetch(u, op);
    }
    // La respuesta guardada por otra fuente es un poco más vieja: su "ahora" se adelanta lo que lleva guardada
    function adelantar(d, ms) {
      if (!d || typeof d !== 'object' || ms <= 0) return d;
      var mover = function (o) { if (o && typeof o.ahora === 'string' && !isNaN(Date.parse(o.ahora))) o.ahora = new Date(Date.parse(o.ahora) + ms).toISOString(); };
      mover(d); Object.keys(d).forEach(function (k) { if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) mover(d[k]); });
      return d;
    }

    async function pedir(fn, params, fresco) {
      if (!listo) return null;
      var q = params ? new URLSearchParams(params).toString() : '';
      var u = K.SUPABASE_URL + '/functions/v1/' + fn + (q ? '?' + q : '');
      var ck = CACHE + fn + (q ? '?' + q : '');
      if (fresco > 0) {
        var c = leerJSON(ck);
        if (c && c.at && Date.now() - c.at < fresco && Date.now() >= c.at) return adelantar(c.d, Date.now() - c.at);
      }
      var cab = Date.now() - (Number(ls(CAB + fn)) || 0) < RECUERDA_CAB, probada = false, r = null;
      if (!cab) {
        try { r = await bajar(u, false); } catch (e) { r = null; }
        if (!r || r.status === 401 || r.status === 403) cab = probada = true;   // la función aún pide la anon key
      }
      if (cab) {
        r = await bajar(u, true);
        if (r.ok && probada) ls(CAB + fn, String(Date.now()));
      }
      if (!r.ok) return null;
      var d = await r.json();
      ls(ck, JSON.stringify({ at: Date.now(), d: d }));
      return d;
    }

    function bucle(tarea, cada) {
      var t = 0, enCurso = false;
      async function vuelta() {
        clearTimeout(t); t = 0;
        var api = yo || window.KyoSondeo;
        if (api.oculta()) return;            // se reanuda sola al volver a verse
        if (enCurso) return;
        enCurso = true;
        try { await tarea(); } catch (e) { /* sin conexión: se reintenta */ }
        enCurso = false;
        clearTimeout(t);
        t = setTimeout(vuelta, Math.max(1000, Number(cada()) || 10000));
      }
      (yo || window.KyoSondeo).alVolver(vuelta);
      setTimeout(vuelta, 0);
      return { ya: vuelta };
    }

    return {
      pedir: pedir,
      bucle: bucle,
      oculta: oculta,
      alVolver: function (fn) { avisos.push(fn); },
      enlazar: function (api) { yo = api; }
    };
  }
})();
