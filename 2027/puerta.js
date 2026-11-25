// Temporada 2027 · puerta de acceso
// Las páginas de 2027 se ven solo después de entrar con Google, igual que el Estudio.
// Usa la misma sesión (acceso.js) y la misma comprobación (función spotify-auth, acción "verificar"):
// si ya entraste en el Estudio desde este navegador, aquí se abre directamente.
// Cada página necesita: config.js, acceso.js, este archivo, un #puerta y el contenido en #contenido (hidden).
(function () {
  const K = window.KYO || {};
  const A = window.kyoAcceso;
  const FN = (n) => (K.SUPABASE_URL || '') + '/functions/v1/' + n;
  const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
  const $ = (s) => document.querySelector(s);

  const ERR = {
    bloqueado: 'Demasiados intentos fallidos. Espera unos minutos y vuelve a probar.',
    google: 'Entra con tu cuenta de Google.',
    no_permitido: 'Esa cuenta de Google no tiene acceso al Estudio.',
    sesion: 'Tu sesión caducó. Vuelve a entrar con Google.'
  };
  const ERR_VUELTA = {
    google: 'Google no completó el inicio de sesión. Inténtalo otra vez.',
    navegador: 'Empieza de nuevo: pulsa "Entrar con Google" en esta misma pestaña.',
    red: 'No se pudo conectar con Supabase. Inténtalo otra vez.'
  };

  async function verificar(clave) {
    try {
      const r = await fetch(FN('spotify-auth'), {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, HDR),
        body: JSON.stringify({ accion: 'verificar', clave: clave || '' })
      });
      const d = await r.json();
      return { ok: !!d.ok, d };
    } catch (e) { return { ok: false, d: { error: 'red' } }; }
  }

  function mostrarPuerta(info, msg) {
    const google = !!(info && info.googleListo);
    $('#btnGoogle').hidden = !google;
    $('#puertaTexto').textContent = google ? 'Entra con tu cuenta de Google.' : 'Entra primero en el Estudio; después vuelve aquí.';
    $('#errPuerta').textContent = msg || '';
    $('#puerta').hidden = false;
  }

  function entrar() {
    $('#puerta').hidden = true;
    $('#contenido').hidden = false;
    document.dispatchEvent(new CustomEvent('kyo:dentro'));
  }

  async function iniciar() {
    if (!A || !K.SUPABASE_URL) return mostrarPuerta({}, 'Falta config.js o acceso.js.');
    $('#btnGoogle').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await A.entrarConGoogle(); } catch (err) { b.disabled = false; $('#errPuerta').textContent = 'No se pudo abrir Google en este navegador.'; }
    });

    const vuelta = await A.alVolver();
    const msg = vuelta.error ? ERR_VUELTA[vuelta.error] || 'No se pudo entrar con Google.' : '';

    // 1) Con sesión de Google (se renueva sola si hace falta)
    if (A.haySesion() && await A.token()) {
      const r = await verificar('');
      if (r.ok) return entrar();
      if (r.d.error === 'no_permitido' || r.d.error === 'sesion') await A.salir();
      return mostrarPuerta(r.d, ERR[r.d.error] || 'No se pudo comprobar el acceso.');
    }
    // 2) Con el código de acceso recordado por el Estudio, mientras siga valiendo
    let guardado = null;
    try { guardado = localStorage.getItem('kyo_codigo'); } catch (e) {}
    if (guardado) {
      const r = await verificar(guardado);
      if (r.ok) return entrar();
    }
    // 3) Sin sesión: se pregunta qué puertas hay (lectura pública, no cuenta como intento)
    let info = {};
    try { info = await fetch(FN('spotify-auth') + '?acceso=1').then((r) => r.json()); } catch (e) {}
    mostrarPuerta(info, msg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
