// Kyo Estudio · Widgets → 💰 Meta de donaciones
// Lee los tips de StreamElements (función "meta" de Supabase) y guarda el total, así no se reinicia solo.
// Aquí ajustas la meta, sumas o corriges a mano y ves si la conexión con StreamElements está bien.

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = window.KYO || {};
const FN = (K.SUPABASE_URL || '') + '/functions/v1/meta';
const HDR = { apikey: K.SUPABASE_ANON_KEY || '', Authorization: 'Bearer ' + (K.SUPABASE_ANON_KEY || '') };
const clave = () => { try { return localStorage.getItem('kyo_codigo') || ''; } catch (e) { return ''; } };
const aviso = (t, ms = 3200) => { const el = $('#toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); };
const fmt = (n, m) => Number(n || 0).toLocaleString('es', { maximumFractionDigits: 2 }) + (m ? ' ' + m : '');
// "2026-10-08T20:00" (hora local) ⇄ ISO
const aLocal = iso => { const d = new Date(iso); if (isNaN(d)) return ''; const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); };

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
  : d.error === 'falta_sql' ? 'Falta ejecutar 08_meta.sql en el SQL Editor de Supabase.'
  : d.error === 'sin_funcion' ? 'No encuentro la función "meta" en Supabase. ¿Está creada con ese nombre y con "Verify JWT" desactivado?'
  : d.error === 'red' ? 'Sin conexión con Supabase.'
  : d.error === 'monto' ? 'Escribe un monto distinto de 0.'
  : 'Error: ' + (d.error || 'sin respuesta');
const seTexto = c => !c ? '' : !c.hayToken ? { cls: 'aviso', t: 'Sin conexión con StreamElements: falta el secreto STREAMELEMENTS_JWT en Supabase. Mientras tanto la meta funciona en modo manual.' }
  : c.ok ? { cls: 'ok', t: 'Conectado con StreamElements · última consulta ' + new Date(c.ultimo).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  : c.error === 'token_invalido' ? { cls: 'mal', t: 'StreamElements rechazó el token (caducado o incorrecto). Genera uno nuevo en StreamElements y actualiza el secreto STREAMELEMENTS_JWT.' }
  : c.error === 'falta_sql' ? { cls: 'mal', t: 'Falta ejecutar 08_meta.sql en Supabase.' }
  : { cls: 'mal', t: 'No se pudo leer StreamElements (' + (c.error || 'error') + '). Se reintenta solo.' };

async function copiar(txt, btn) {
  try { await navigator.clipboard.writeText(txt); }
  catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand && document.execCommand('copy'); t.remove(); }
  if (btn) { const v = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = v, 1600); }
}

const st = { d: null, error: '' };
let abierto = false, app, editando = false;

function pintar() {
  if (!st.d) { app.innerHTML = '<h2>💰 Meta de donaciones</h2><div class="ovestado">' + esc(st.error || 'Cargando tu meta…') + '</div>' + (st.error ? '<div class="acciones"><button class="btn" type="button" data-mt="recargar">↻ Reintentar</button></div>' : ''); return; }
  const d = st.d, c = d.cfg, se = seTexto(d.conexion), pct = c.meta > 0 ? Math.min(100, d.total / c.meta * 100) : 0;
  app.innerHTML =
    '<div class="cthead"><h2>💰 Meta de donaciones</h2><span class="nota">El total se guarda en Supabase · no se reinicia solo</span></div>' +
    '<div class="mtbarra" role="img" aria-label="' + Math.floor(pct) + ' por ciento"><i style="width:' + pct + '%"></i><b>' + fmt(d.total, c.moneda) + ' / ' + fmt(c.meta, c.moneda) + ' · ' + Math.floor(pct) + '%</b></div>' +
    (se ? '<div class="mtse ' + se.cls + '">' + esc(se.t) + '</div>' : '') +
    '<div class="mtcampos">' +
      '<label class="f"><span>Título</span><input type="text" maxlength="40" data-c="titulo" value="' + esc(c.titulo) + '"></label>' +
      '<label class="f" style="grid-column:1/-1"><span>Mensaje (opcional, aparece bajo la barra)</span><input type="text" maxlength="80" data-c="mensaje" placeholder="Ej: Cuando llegue a la meta, ¡sorteo!" value="' + esc(c.mensaje) + '"></label>' +
      '<label class="f"><span>Meta</span><input type="number" min="1" step="any" data-c="meta" value="' + c.meta + '"></label>' +
      '<label class="f"><span>Moneda</span><input type="text" maxlength="3" data-c="moneda" value="' + esc(c.moneda) + '" style="text-transform:uppercase"></label>' +
      '<label class="f"><span>Contar tips desde</span><input type="datetime-local" data-c="desde" value="' + aLocal(c.desde) + '"></label>' +
    '</div>' +
    '<p class="nota">Solo se suman los tips de la moneda indicada. El total es <b>tips de StreamElements desde esa fecha</b> + tu ajuste manual (' + fmt(c.base, c.moneda) + '). Si cambias la fecha, se recalcula.</p>' +
    '<div class="acciones">' +
      '<button class="btn pri" type="button" data-mt="guardar">💾 Guardar</button>' +
      '<span class="ctfijar"><input type="number" step="any" placeholder="± monto" data-n="sumar" aria-label="Sumar o restar"><button class="btn" type="button" data-mt="sumar">➕ Sumar a mano</button></span>' +
      '<span class="ctfijar"><input type="number" min="0" step="any" placeholder="total" data-n="fijar" aria-label="Poner el total"><button class="btn" type="button" data-mt="fijar">✏ Poner total</button></span>' +
      '<button class="btn" type="button" data-mt="sincronizar">🔄 Consultar StreamElements</button>' +
      '<button class="btn" type="button" data-mt="obs">📋 OBS</button>' +
      '<button class="btn" type="button" data-mt="reiniciar">↺ Meta nueva</button>' +
    '</div>' +
    '<p class="nota">💡 <b>Ponerlo en marcha:</b> si ya llevabas dinero en la meta de StreamElements, usa <b>✏ Poner total</b> con esa cifra. Las donaciones nuevas se irán sumando solas.</p>';
}

async function cargar(accion = 'leer') {
  const d = await pedir({ accion });
  if (!d.ok) { st.error = errTexto(d); if (!st.d) pintar(); else aviso(st.error, 5000); return false; }
  st.d = d; st.error = '';
  if (!editando) pintar(); else { const b = $('.mtbarra', app); if (b) { const pct = d.cfg.meta > 0 ? Math.min(100, d.total / d.cfg.meta * 100) : 0; $('i', b).style.width = pct + '%'; $('b', b).textContent = fmt(d.total, d.cfg.moneda) + ' / ' + fmt(d.cfg.meta, d.cfg.moneda) + ' · ' + Math.floor(pct) + '%'; } }
  window.kyoWidgetActualizar && window.kyoWidgetActualizar('meta');
  return true;
}

const confirmar = new Map();
function enlazar() {
  app.addEventListener('input', () => { editando = true; });
  app.addEventListener('click', async e => {
    const b = e.target.closest('[data-mt]'); if (!b) return;
    const a = b.dataset.mt;
    if (a === 'recargar') { st.error = ''; pintar(); return cargar(); }
    if (a === 'obs') return copiar(window.kyoWidgetUrl ? window.kyoWidgetUrl('meta') : '', b).then(() => aviso('Enlace copiado: pégalo en OBS como Fuente de navegador (' + $('[data-panel="meta"] [data-w]').textContent + ' × ' + $('[data-panel="meta"] [data-h]').textContent + ')', 5000));
    if (a === 'guardar') {
      const g = k => $('[data-c="' + k + '"]', app).value;
      const cuerpo = { accion: 'guardar', titulo: g('titulo'), mensaje: g('mensaje'), meta: Number(g('meta')), moneda: g('moneda'), desde: g('desde') ? new Date(g('desde')).toISOString() : undefined };
      if (!(cuerpo.meta > 0)) return aviso('La meta tiene que ser mayor que 0');
      const d = await pedir(cuerpo); editando = false;
      if (!d.ok) return aviso(errTexto(d), 5000);
      st.d = d; pintar(); window.kyoWidgetActualizar && window.kyoWidgetActualizar('meta'); return aviso('Meta guardada');
    }
    if (a === 'sumar' || a === 'fijar') {
      const inp = $('[data-n="' + a + '"]', app), n = Number(inp.value);
      if (inp.value === '' || !Number.isFinite(n) || (a === 'fijar' && n < 0)) { inp.focus(); return aviso('Escribe un número válido'); }
      const d = await pedir(a === 'sumar' ? { accion: 'sumar', monto: n } : { accion: 'fijar', total: n }); editando = false;
      if (!d.ok) return aviso(errTexto(d), 5000);
      st.d = d; pintar(); return window.kyoWidgetActualizar && window.kyoWidgetActualizar('meta');
    }
    if (a === 'sincronizar') {
      b.disabled = true; const ok = await cargar('sincronizar'); editando = false; if (ok) pintar();
      return aviso(st.d && st.d.conexion.ok ? 'Consultado: ' + (st.d.conexion.nuevos ? st.d.conexion.nuevos + ' donación(es) nueva(s)' : 'sin donaciones nuevas') : 'No se pudo consultar StreamElements (mira el aviso de arriba)', 4500);
    }
    if (a === 'reiniciar') {
      if (!confirmar.get(a)) { confirmar.set(a, 1); b.textContent = '¿Empezar de cero? Pulsa otra vez'; b.classList.add('peligro'); setTimeout(() => { confirmar.delete(a); if (b.isConnected) { b.textContent = '↺ Meta nueva'; b.classList.remove('peligro'); } }, 3500); return; }
      confirmar.delete(a);
      const d = await pedir({ accion: 'reiniciar' }); editando = false;
      if (!d.ok) return aviso(errTexto(d), 5000);
      st.d = d; pintar(); aviso('Meta nueva: cuenta desde ahora'); return window.kyoWidgetActualizar && window.kyoWidgetActualizar('meta');
    }
  });
  app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-n]')) { e.preventDefault(); $('[data-mt="' + e.target.dataset.n + '"]', app).click(); } });
}

// Mientras la pestaña está abierta, se refresca cada 20 s (así ves entrar los tips)
function tiempoReal() {
  setInterval(() => { if (!document.hidden && !$('[data-panel="meta"]').hidden && !editando) cargar(); }, 20000);
}

function abrir() {
  if (!abierto) { abierto = true; app = $('#mtApp'); pintar(); enlazar(); tiempoReal(); }
  editando = false; cargar();
}
window.kyoMeta = { abrir };
