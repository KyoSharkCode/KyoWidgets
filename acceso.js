// Kyo Estudio · entrar con Google
// La sesión la da Supabase Auth (proveedor Google). Este archivo:
//   - lleva a Google y, a la vuelta, cambia el código de un solo uso por la sesión (flujo PKCE);
//   - guarda la sesión en este navegador y la renueva sola antes de que caduque (dura 1 hora);
//   - añade la sesión a las peticiones que el Estudio hace a sus funciones de Supabase.
// Quién puede entrar lo deciden las funciones (secreto KYO_ADMIN_EMAILS), no este archivo:
// aunque alguien cambiara este código en su navegador, sin una sesión de Google permitida no pasa.
// Los overlays de OBS no cargan este archivo: siguen siendo públicos y sin sesión.
(function () {
  const K = window.KYO || {};
  const AUTH = (K.SUPABASE_URL || '') + '/auth/v1';
  const FUNCIONES = (K.SUPABASE_URL || '') + '/functions/v1/';
  const ANON = K.SUPABASE_ANON_KEY || '';
  const SESION = 'kyo_sesion', PKCE = 'kyo_pkce';

  const leer = (donde, k) => { try { return JSON.parse(donde.getItem(k) || 'null'); } catch (e) { return null; } };
  const guardar = (donde, k, v) => { try { v == null ? donde.removeItem(k) : donde.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // { access_token, refresh_token, expires_at (segundos), correo }
  let sesion = leer(localStorage, SESION);
  if (sesion && (!sesion.access_token || !sesion.refresh_token)) sesion = null;
  const ponerSesion = (s) => { sesion = s; guardar(localStorage, SESION, s); };
  const deRespuesta = (d) => ({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    correo: (d.user && d.user.email) || (sesion && sesion.correo) || ''
  });
  const pedirAuth = (ruta, cuerpo, token) => fetchOriginal(AUTH + ruta, {
    method: 'POST',
    headers: Object.assign({ apikey: ANON, 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
    body: JSON.stringify(cuerpo || {})
  });

  const b64url = (bytes) => btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // Lleva a Google. Al terminar, Supabase devuelve a esta misma página con ?code=…
  async function entrarConGoogle() {
    const verificador = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const reto = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
    guardar(sessionStorage, PKCE, verificador);
    const volver = location.origin + location.pathname;
    location.assign(AUTH + '/authorize?provider=google&redirect_to=' + encodeURIComponent(volver) +
      '&code_challenge=' + reto + '&code_challenge_method=s256');
  }

  // Al cargar la página: si se vuelve de Google, termina de entrar. Devuelve {ok} o {ok:false, error}.
  async function alVolver() {
    const p = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fallo = p.get('error_description') || h.get('error_description') || p.get('error') || h.get('error');
    const code = p.get('code');
    if (!code && !fallo) return { ok: !!sesion };
    // La dirección se limpia enseguida: el código es de un solo uso y no debe quedarse en el historial
    history.replaceState(null, '', location.pathname);
    if (fallo) return { ok: false, error: 'google', detalle: fallo };
    const verificador = leer(sessionStorage, PKCE);
    guardar(sessionStorage, PKCE, null);
    if (!verificador) return { ok: false, error: 'navegador' };
    try {
      const r = await pedirAuth('/token?grant_type=pkce', { auth_code: code, code_verifier: verificador });
      const d = await r.json();
      if (!r.ok || !d.access_token) return { ok: false, error: 'google', detalle: d.msg || d.error_description || '' };
      ponerSesion(deRespuesta(d));
      return { ok: true };
    } catch (e) { return { ok: false, error: 'red' }; }
  }

  // Renueva la sesión (una sola petición aunque la pidan varias partes del Estudio a la vez)
  let renovando = null;
  function renovar() {
    if (!sesion) return Promise.resolve(false);
    if (!renovando) {
      const refresco = sesion.refresh_token;
      renovando = pedirAuth('/token?grant_type=refresh_token', { refresh_token: refresco })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (r.ok && d.access_token) { ponerSesion(deRespuesta(d)); return true; }
          // 400/401: la sesión ya no existe (se cerró o caducó del todo). Otros errores (red, 5xx): se conserva.
          if (r.status === 400 || r.status === 401) ponerSesion(null);
          return false;
        })
        .catch(() => false)
        .finally(() => { renovando = null; });
    }
    return renovando;
  }

  // La sesión vigente (la renueva si le queda menos de un minuto). '' si no hay.
  async function token() {
    if (!sesion) return '';
    if (sesion.expires_at - 60 < Date.now() / 1000) await renovar();
    return sesion ? sesion.access_token : '';
  }

  async function salir() {
    const t = sesion && sesion.access_token;
    ponerSesion(null);
    if (t) { try { await pedirAuth('/logout?scope=local', {}, t); } catch (e) {} }
  }

  // Las peticiones del Estudio a sus funciones llevan "Authorization: Bearer <anon key>". Con sesión de
  // Google, esa cabecera se cambia por la sesión. Las peticiones sin cabecera (lecturas públicas) no se tocan.
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async function (entrada, opciones) {
    const url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
    const cab = opciones && opciones.headers;
    const lleva = cab && (cab instanceof Headers ? cab.has('Authorization') : ('Authorization' in cab || 'authorization' in cab));
    if (!sesion || !lleva || !FUNCIONES || url.indexOf(FUNCIONES) !== 0) return fetchOriginal(entrada, opciones);
    const conSesion = async () => {
      const t = await token();
      if (!t) return fetchOriginal(entrada, opciones);
      const h = new Headers(cab);
      h.set('Authorization', 'Bearer ' + t);
      return fetchOriginal(entrada, Object.assign({}, opciones, { headers: h }));
    };
    let r = await conSesion();
    // 401 con sesión: puede haber caducado justo ahora. Se renueva una vez y se repite.
    if (r.status === 401 && sesion && await renovar()) r = await conSesion();
    return r;
  };

  window.kyoAcceso = { entrarConGoogle, alVolver, salir, token, haySesion: () => !!sesion, correo: () => (sesion && sesion.correo) || '' };
})();
