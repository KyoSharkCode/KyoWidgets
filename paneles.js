// Kyo Estudio · pestaña Paneles de Twitch
// Genera paneles tipo pegatina (PNG con fondo transparente) y los descarga uno a uno o todos en un .zip.

import { UT } from './animaciones/plantillas.js';
import { fuentesListas } from './animaciones.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CLAVE = 'kyo_paneles';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { return null; } };
const guardar = v => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) {} };

const ICONOS = [['estrella', '⭐ Estrella'], ['corazon', '💙 Corazón'], ['calendario', '📅 Calendario'], ['check', '✅ Check'], ['camiseta', '👕 Camiseta'], ['bolsa', '🛍️ Bolsa'],
  ['chat', '💬 Chat'], ['regalo', '🎁 Regalo'], ['mando', '🎮 Mando'], ['nota', '🎵 Música'], ['play', '▶ Play'], ['campana', '🔔 Campana'], ['aleta', '🦈 Aleta'], ['mundo', '🌍 Mundo'], ['ninguno', 'Sin icono']];
const DEF = {
  tema: 'marea', propios: 'no', acento: '#6FE3F0', caja: '#0f1a4a', borde: '#ffffff', tam: '640', deco: 'ola', alin: 'izq',
  lista: [['Sobre mí', 'estrella'], ['Horario', 'calendario'], ['Reglas', 'check'], ['Merch', 'camiseta'], ['Código KYOSUMI', 'bolsa'], ['Redes', 'corazon']]
};

// ---------- dibujo de un panel ----------
function dibujarIcono(ctx, nombre, x, y, tam, color, fondo) {
  const p = UT.ICONOS[nombre]; if (!p) return;
  if (nombre === 'check') return UT.icono(ctx, p[0], x, y, tam, color, { trazo: true, grosor: 3.4 });
  UT.icono(ctx, p[0], x, y, tam, color);
  if (nombre === 'calendario') UT.icono(ctx, p[1], x, y, tam, fondo, { trazo: true, grosor: 2.2 });
  if (nombre === 'bolsa') UT.icono(ctx, p[1], x, y, tam, color, { trazo: true, grosor: 2.2 });
  if (nombre === 'campana') UT.icono(ctx, p[1], x, y, tam, color);
}
function dibujarPanel(ctx, W, H, txt, icono, o, t = 0) {
  const P = UT.paleta(o), u = W / 640;
  ctx.clearRect(0, 0, W, H);
  const m = 17 * u, x = m, y = m - 2 * u, w = W - 2 * m, h = H - 2 * m - 6 * u, r = 30 * u;
  UT.pegatina(ctx, x, y, w, h, r, { fill: P.c, p: P.p, o: P.o, ring: 6 * u, out: 5 * u, drop: 8 * u, suave: false });
  ctx.save(); UT.rr(ctx, x, y, w, h, r); ctx.clip();
  if (o.deco === 'ola') {
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let xx = 0; xx <= w; xx += 6 * u) ctx.lineTo(x + xx, y + h - 16 * u - 6 * u * Math.sin(xx / (48 * u) + 1));
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = P.a2; ctx.fill();
  }
  ctx.restore();
  const hayIcono = icono && icono !== 'ninguno';
  const D = h * .72, icx = x + 22 * u + D / 2, icy = y + h / 2 - (o.deco === 'ola' ? 5 * u : 0);
  if (hayIcono) {
    ctx.beginPath(); ctx.arc(icx, icy + 4 * u, D / 2 + 7 * u, 0, Math.PI * 2); ctx.fillStyle = P.o; ctx.fill();
    ctx.beginPath(); ctx.arc(icx, icy, D / 2 + 7 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(icx, icy, D / 2 + 3 * u, 0, Math.PI * 2); ctx.fillStyle = P.p; ctx.fill();
    ctx.beginPath(); ctx.arc(icx, icy, D / 2, 0, Math.PI * 2); ctx.fillStyle = P.a; ctx.fill();
    dibujarIcono(ctx, icono, icx - D * .31, icy - D * .31, D * .62, P.o, P.a);
  }
  // texto: tamaño automático para que quepa
  const x0 = hayIcono ? icx + D / 2 + 22 * u : x + 26 * u, x1 = x + w - 30 * u, disp = x1 - x0;
  let fs = 64 * u; UT.fuente(ctx, `400 ${fs}px "Cherry Bomb One"`); const tw = ctx.measureText(txt).width; if (tw > disp) fs *= disp / tw;
  UT.fuente(ctx, `400 ${fs}px "Cherry Bomb One"`);
  const cy = y + h / 2 - (o.deco === 'ola' ? 6 * u : 0) + 2 * u, centro = o.alin === 'centro';
  ctx.textAlign = centro ? 'center' : 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const tx = centro ? (x0 + x1) / 2 : x0;
  ctx.lineWidth = 10 * u * fs / (64 * u); ctx.strokeStyle = P.o; ctx.strokeText(txt, tx, cy + 3 * u); ctx.strokeText(txt, tx, cy);
  ctx.fillStyle = P.t; ctx.fillText(txt, tx, cy);
  if (o.deco !== 'nada') {
    const tw2 = .75 + .25 * Math.sin(t * 3);
    UT.destello(ctx, x + w - 34 * u, y + 20 * u, 30 * u, '#F4C542', tw2, 15 + t * 30, 1);
    UT.destello(ctx, x + w - 62 * u, y + 40 * u, 16 * u, '#ffffff', 1.3 - tw2 * .5, t * 50, .9);
  }
}

// ---------- ZIP sin compresión (para descargar todos juntos) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = d => { let c = 0xFFFFFFFF; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const FECHA = ((new Date().getFullYear() - 1980) << 9) | ((new Date().getMonth() + 1) << 5) | new Date().getDate();
function hacerZip(archivos) {
  const enc = new TextEncoder(), partes = [], central = []; let off = 0;
  for (const { nombre, datos } of archivos) {
    const nb = enc.encode(nombre), c = crc32(datos), lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(12, FECHA, true);
    lh.setUint32(14, c, true); lh.setUint32(18, datos.length, true); lh.setUint32(22, datos.length, true); lh.setUint16(26, nb.length, true);
    partes.push(new Uint8Array(lh.buffer), nb, datos);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, FECHA, true);
    ch.setUint32(16, c, true); ch.setUint32(20, datos.length, true); ch.setUint32(24, datos.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nb);
    off += 30 + nb.length + datos.length;
  }
  const tamC = central.reduce((a, b) => a + b.length, 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamC, true); fin.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
}
const bajar = (blob, nombre) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); };
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'panel';

// ---------- interfaz ----------
let abierto = false;
function chips(nombre, opciones, valor) {
  return '<div class="chips">' + opciones.map(([v, l]) => '<label><input type="radio" name="' + nombre + '" value="' + v + '"' + (v === valor ? ' checked' : '') + '>' + l + '</label>').join('') + '</div>';
}
function abrir() {
  if (abierto) return; abierto = true;
  const app = $('#panelesApp');
  let st = Object.assign({}, DEF, leer() || {}); st.lista = (st.lista || DEF.lista).map(x => x.slice());
  const pintar = () => {
    app.innerHTML = '<form class="panelesform" onsubmit="return false">' +
      '<div class="panopts">' +
      '<div class="f"><span>Estilo</span>' + chips('tema', [['marea', '🌊 Normal'], ['octubre', '🎃 Halloween'], ['navidad', '🎄 Navidad']], st.tema) + '</div>' +
      '<div class="f"><span>Colores</span>' + chips('propios', [['no', 'Los del estilo'], ['si', 'Mis colores']], st.propios) + '</div>' +
      '<div class="f fila3" data-si="si"' + (st.propios === 'si' ? '' : ' hidden') + '><label class="fcolor"><span>Acento</span><input type="color" name="acento" value="' + st.acento + '"></label><label class="fcolor"><span>Caja</span><input type="color" name="caja" value="' + st.caja + '"></label><label class="fcolor"><span>Borde</span><input type="color" name="borde" value="' + st.borde + '"></label></div>' +
      '<div class="f"><span>Tamaño</span>' + chips('tam', [['640', '640×200 (nítido)'], ['320', '320×100']], st.tam) + '</div>' +
      '<div class="f"><span>Decoración</span>' + chips('deco', [['ola', '🌊 Ola + destellos'], ['destellos', '✨ Solo destellos'], ['nada', 'Nada']], st.deco) + '</div>' +
      '<div class="f"><span>Texto</span>' + chips('alin', [['izq', 'Junto al icono'], ['centro', 'Centrado']], st.alin) + '</div>' +
      '</div>' +
      '<div class="panlista">' + st.lista.map(([txt, ic], i) =>
        '<div class="panfila" data-i="' + i + '"><canvas></canvas><div class="panctl">' +
        '<input type="text" data-txt maxlength="28" value="' + esc(txt) + '">' +
        '<select data-ic>' + ICONOS.map(([v, l]) => '<option value="' + v + '"' + (v === ic ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>' +
        '<button class="btn" type="button" data-png>⬇ PNG</button>' +
        '<button class="btn" type="button" data-sube title="Subir">↑</button><button class="btn" type="button" data-quita title="Quitar">✕</button></div></div>').join('') + '</div>' +
      '<div class="acciones"><button class="btn" type="button" data-nuevo>＋ Añadir panel</button><button class="btn pri" type="button" data-zip>⬇ Descargar todos (.zip)</button></div>' +
      '</form>';
    dibujarTodos();
  };
  const opciones = () => ({ tema: st.tema, propios: st.propios, acento: st.acento, caja: st.caja, borde: st.borde, deco: st.deco, alin: st.alin });
  const tam = () => st.tam === '320' ? [320, 100] : [640, 200];
  const dibujarTodos = () => {
    const [W, H] = tam();
    $$('.panfila', app).forEach(f => { const i = +f.dataset.i, cv = $('canvas', f); cv.width = W; cv.height = H; dibujarPanel(cv.getContext('2d'), W, H, st.lista[i][0], st.lista[i][1], opciones(), 0); });
    guardar(st);
  };
  const png = i => new Promise(res => { const [W, H] = tam(), cv = document.createElement('canvas'); cv.width = W; cv.height = H; dibujarPanel(cv.getContext('2d'), W, H, st.lista[i][0], st.lista[i][1], opciones(), 0); cv.toBlob(res, 'image/png'); });
  app.addEventListener('input', e => {
    const el = e.target, f = el.closest('.panfila');
    if (f) { const i = +f.dataset.i; if (el.matches('[data-txt]')) st.lista[i][0] = el.value; if (el.matches('[data-ic]')) st.lista[i][1] = el.value; }
    else if (el.name) { st[el.name] = el.value; const c = $('[data-si]', app); if (c) c.hidden = st.propios !== 'si'; }
    dibujarTodos();
  });
  app.addEventListener('change', e => { if (e.target.matches('[data-ic]')) { const i = +e.target.closest('.panfila').dataset.i; st.lista[i][1] = e.target.value; dibujarTodos(); } });
  app.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const f = b.closest('.panfila'), i = f ? +f.dataset.i : -1;
    if (b.matches('[data-png]')) bajar(await png(i), 'panel-' + slug(st.lista[i][0]) + '.png');
    else if (b.matches('[data-quita]')) { st.lista.splice(i, 1); pintar(); }
    else if (b.matches('[data-sube]') && i > 0) { [st.lista[i - 1], st.lista[i]] = [st.lista[i], st.lista[i - 1]]; pintar(); }
    else if (b.matches('[data-nuevo]')) { st.lista.push(['Nuevo panel', 'estrella']); pintar(); }
    else if (b.matches('[data-zip]')) {
      const arch = [];
      for (let k = 0; k < st.lista.length; k++) arch.push({ nombre: String(k + 1).padStart(2, '0') + '-' + slug(st.lista[k][0]) + '.png', datos: new Uint8Array(await (await png(k)).arrayBuffer()) });
      bajar(hacerZip(arch), 'paneles-kyosumi.zip');
    }
  });
  fuentesListas.then(pintar);
}
window.kyoPaneles = { abrir, dibujarPanel };
