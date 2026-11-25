// Temporada 2027 · Perfiles y banners
// Dibuja la foto de perfil y los banners de cada plataforma con el estilo Coral Stream
// y los descarga en PNG al tamaño exacto. Los ajustes (imagen, zoom, posición) se guardan
// en este navegador; las imágenes subidas también (IndexedDB), así no hay que volver a subirlas.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const C = { abisal: '#0A1030', indigo: '#2B2F7A', aleta: '#3A7BD5', bioluz: '#6FE3F0', espuma: '#C9E6F2', perla: '#F5F3FB', coral: '#FF6F61', coralP: '#FFB4A8', menta: '#5EF2B8', oro: '#F4C542' };

  // Imágenes de serie. foco = dónde está la cara (0–1), para centrarla en la foto de perfil.
  const BIBLIO = {
    sonrisa: { nombre: '3D · sonrisa', src: 'marca/personaje/kyo-3d-sonrisa.webp', foco: [0.66, 0.40] },
    guino: { nombre: '3D · guiño', src: 'marca/personaje/kyo-3d-guino.webp', foco: [0.47, 0.30] },
    banner: { nombre: '3D · para banner', src: 'marca/personaje/kyo-3d-banner.webp', foco: [0.50, 0.34] },
    chibi: { nombre: 'Chibi palomitas', src: 'marca/personaje/kyo-chibi-palomitas.webp', foco: [0.52, 0.30] }
  };

  // seguro = zona que se ve en todos los dispositivos (YouTube recorta el resto en móvil y escritorio)
  const PIEZAS = [
    { id: 'avatar', nombre: 'Foto de perfil', donde: 'Twitch · YouTube · Kick · TikTok', W: 800, H: 800, tipo: 'avatar', img: 'sonrisa', zoom: 0.92 },
    { id: 'twitch', nombre: 'Banner de Twitch', donde: 'Perfil del canal', W: 1200, H: 480, tipo: 'banner', img: 'banner' },
    { id: 'youtube', nombre: 'Banner de YouTube', donde: 'Lo importante va en la zona segura central', W: 2560, H: 1440, seguro: [1546, 423], tipo: 'banner', img: 'banner' },
    { id: 'kick', nombre: 'Banner de Kick', donde: 'Tamaño editable: confírmalo en la pantalla de subida de Kick', W: 1920, H: 480, editable: true, tipo: 'banner', img: 'banner' },
    { id: 'discord', nombre: 'Banner del servidor de Discord', donde: 'Discord · 16:9', W: 960, H: 540, tipo: 'banner', img: 'chibi' },
    { id: 'invitacion', nombre: 'Fondo de invitación de Discord', donde: 'Discord · 16:9', W: 1920, H: 1080, tipo: 'banner', img: 'chibi' }
  ];

  const CLAVE = 'kyo2027_perfiles';
  let ajustes = {};
  try { ajustes = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch (e) {} };
  const aj = (p) => (ajustes[p.id] = Object.assign({ img: p.img, zoom: p.zoom || 1, dx: 0, dy: 0, W: p.W, H: p.H }, ajustes[p.id] || {}));

  // ---------- imágenes ----------
  const cargadas = {};
  const cargar = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function imagen(clave) {
    if (cargadas[clave]) return cargadas[clave];
    const b = BIBLIO[clave];
    if (!b) return null;
    cargadas[clave] = await cargar(b.src);
    return cargadas[clave];
  }

  // Imágenes subidas: se guardan en IndexedDB para la próxima vez
  const bd = () => new Promise((res) => { try { const r = indexedDB.open('kyo_2027', 1); r.onupgradeneeded = () => r.result.createObjectStore('imagenes'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  async function bdTodo() {
    const db = await bd(); if (!db) return [];
    return new Promise((res) => { const out = []; try { const rq = db.transaction('imagenes').objectStore('imagenes').openCursor(); rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); }; rq.onerror = () => res(out); } catch (e) { res(out); } });
  }
  async function bdPoner(k, v) { const db = await bd(); if (!db) return; await new Promise((res) => { try { const tx = db.transaction('imagenes', 'readwrite'); tx.objectStore('imagenes').put(v, k); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }
  async function anadirPropia(k, blob) {
    const url = URL.createObjectURL(blob);
    const i = await cargar(url);
    BIBLIO[k] = { nombre: k.replace(/^propia-/, '').replace(/\.[a-z0-9]+$/i, ''), src: url, foco: [0.5, 0.33], propia: true };
    cargadas[k] = i;
  }

  // ---------- dibujo ----------
  function azar(semilla) { let s = semilla; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function fondo(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#152264'); g.addColorStop(0.55, '#0d1748'); g.addColorStop(1, C.abisal);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const m = Math.max(W, H);
    let r = ctx.createRadialGradient(W * 0.9, -H * 0.1, 0, W * 0.9, -H * 0.1, m * 0.6);
    r.addColorStop(0, 'rgba(255,111,97,.22)'); r.addColorStop(1, 'rgba(255,111,97,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    r = ctx.createRadialGradient(W * 0.35, H * 0.35, 0, W * 0.35, H * 0.35, m * 0.55);
    r.addColorStop(0, 'rgba(58,123,213,.32)'); r.addColorStop(1, 'rgba(58,123,213,0)');
    ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    // rayos de luz
    ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = C.espuma;
    for (const [a, b] of [[0.22, 0.30], [0.38, 0.43], [0.55, 0.62]]) { ctx.beginPath(); ctx.moveTo(W * a, 0); ctx.lineTo(W * b, 0); ctx.lineTo(W * (b + 0.12), H * 0.75); ctx.lineTo(W * (a + 0.02), H * 0.75); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // corrientes
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, H * 0.004); ctx.setLineDash([H * 0.02, H * 0.015]);
    for (const [y, col] of [[0.62, 'rgba(111,227,240,.35)'], [0.70, 'rgba(255,111,97,.28)']]) {
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(-20, H * y);
      ctx.bezierCurveTo(W * 0.3, H * (y - 0.05), W * 0.6, H * (y + 0.06), W + 20, H * (y - 0.01)); ctx.stroke();
    }
    ctx.restore();
    // arrecife de píxel
    const rnd = azar(7), P = Math.max(6, Math.round(H / 60)), base = H;
    ctx.fillStyle = C.abisal;
    for (let x = 0; x < W; x += P) { const h = P * (3 + Math.floor(rnd() * 3)); ctx.fillRect(x, base - h, P, h); }
    const cols = [C.coral, C.coralP, C.indigo, C.aleta, C.menta];
    // el arrecife no pasa del 13% del alto, para no tapar textos en los banners bajos
    const maxLen = Math.max(2, Math.floor(H * 0.13 / P) - 4);
    for (let x = P * 2; x < W; x += P * (5 + Math.floor(rnd() * 6))) {
      const col = cols[Math.floor(rnd() * cols.length)], len = Math.min(maxLen, 4 + Math.floor(rnd() * 8)), x0 = x - (x % P), y0 = base - 4 * P;
      ctx.fillStyle = col;
      for (let i = 0; i < len; i++) {
        ctx.fillRect(x0, y0 - i * P, P, P);
        if (rnd() < 0.28) { const d = rnd() < 0.5 ? -1 : 1, l = 2 + Math.floor(rnd() * 3); for (let j = 1; j <= l; j++) ctx.fillRect(x0 + d * j * P, y0 - i * P - j * P, P, P); }
      }
    }
    // burbujas
    ctx.save(); ctx.strokeStyle = 'rgba(201,230,242,.75)'; ctx.lineWidth = Math.max(1.5, H * 0.0025);
    for (let i = 0; i < 18; i++) { const x = rnd() * W, y = H * (0.35 + rnd() * 0.5), rr = H * (0.006 + rnd() * 0.014); ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  function texto(ctx, t, x, y, size, fam, color, borde) {
    ctx.font = fam.replace('$', Math.round(size) + 'px');
    ctx.lineJoin = 'round';
    if (borde) { ctx.strokeStyle = C.abisal; ctx.lineWidth = size * borde; ctx.strokeText(t, x, y); }
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }

  async function dibujar(p, cv) {
    const a = aj(p), W = a.W, H = a.H;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    fondo(ctx, W, H);
    const im = await imagen(a.img) || await imagen(p.img);
    const foco = (BIBLIO[a.img] || BIBLIO[p.img]).foco;

    if (p.tipo === 'avatar') {
      const h = H * a.zoom, w = h * im.width / im.height;
      ctx.drawImage(im, W / 2 - foco[0] * w + a.dx * W, H / 2 - foco[1] * h + a.dy * H, w, h);
      // aro tipo pegatina, dentro del círculo que recortan las plataformas
      ctx.lineWidth = W * 0.024; ctx.strokeStyle = C.abisal; ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - W * 0.012, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = W * 0.018; ctx.strokeStyle = C.perla; ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - W * 0.033, 0, Math.PI * 2); ctx.stroke();
      return;
    }

    // banner: logo + @KyoSumiVT a la izquierda, personaje a la derecha, todo dentro de la zona segura
    const sw = p.seguro ? p.seguro[0] : W, sh = p.seguro ? p.seguro[1] : H;
    const S = { x: (W - sw) / 2, y: (H - sh) / 2, w: sw, h: sh };
    const esChibi = a.img === 'chibi';
    // el personaje baja siempre hasta el borde inferior, para que no quede cortado en el aire
    const top = S.y - S.h * (esChibi ? -0.02 : 0.06) + a.dy * S.h;
    const ch = Math.max(S.h * (esChibi ? 1.0 : 1.32) * a.zoom, H - top), cw = ch * im.width / im.height;
    ctx.drawImage(im, S.x + S.w * 0.98 - cw + a.dx * S.w, top, cw, ch);

    const logo = await imagen('_logo');
    const ts = S.h * 0.085, ps = S.h * 0.042;
    // si la zona segura llega al borde inferior, el bloque se centra por encima del arrecife
    const alto = S.y + S.h >= H - 1 ? S.h * 0.86 : S.h;
    const lh = Math.min(S.h * 0.56, alto - ts * 1.25 - ps * 1.8), lw = lh * logo.width / logo.height;
    const bloque = lh + ts * 1.25 + ps * 1.6;
    const lx = S.x + S.w * 0.05, ly = S.y + (alto - bloque) / 2;
    ctx.drawImage(logo, lx, ly, lw, lh);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    // el texto más ancho (las plataformas) no puede salirse por la izquierda
    ctx.font = '700 ' + Math.round(ps) + 'px "Chakra Petch", monospace';
    const anchoPlat = ctx.measureText('TWITCH · KICK · YOUTUBE · TIKTOK').width * 1.2;
    const cx = Math.max(lx + lw / 2, S.x + S.w * 0.03 + anchoPlat / 2);
    texto(ctx, '@KyoSumiVT', cx, ly + lh + ts * 0.15, ts, '700 $ Fredoka, sans-serif', C.perla, 0.32);
    ctx.save(); ctx.font = '700 ' + Math.round(ps) + 'px "Chakra Petch", monospace';
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(ps * 0.14) + 'px';
    texto(ctx, 'TWITCH · KICK · YOUTUBE · TIKTOK', cx, ly + lh + ts * 1.35, ps, '700 $ "Chakra Petch", monospace', C.bioluz, 0.3);
    ctx.restore();
  }

  // ---------- interfaz ----------
  const lista = $('#piezas');
  function opcionesImg(sel) {
    return Object.entries(BIBLIO).map(([k, b]) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + b.nombre.replace(/</g, '&lt;') + '</option>').join('');
  }
  function tarjeta(p) {
    const a = aj(p);
    const el = document.createElement('article');
    el.className = 'pieza'; el.dataset.id = p.id;
    el.innerHTML =
      '<div class="lienzo' + (p.tipo === 'avatar' ? ' redondo' : '') + '"><canvas></canvas>' + (p.seguro ? '<div class="seguro" style="left:' + ((p.W - p.seguro[0]) / 2 / p.W * 100) + '%;top:' + ((p.H - p.seguro[1]) / 2 / p.H * 100) + '%;width:' + (p.seguro[0] / p.W * 100) + '%;height:' + (p.seguro[1] / p.H * 100) + '%"><span>Zona segura</span></div>' : '') + '</div>' +
      '<div class="info"><h3>' + p.nombre + '</h3><p class="donde">' + p.donde + '</p><p class="tam">' + a.W + ' × ' + a.H + ' px</p></div>' +
      '<div class="ctrl">' +
      '<label>Imagen<select id="img-' + p.id + '">' + opcionesImg(a.img) + '</select></label>' +
      '<label>Zoom<input type="range" id="zoom-' + p.id + '" min="0.5" max="2.5" step="0.01" value="' + a.zoom + '"></label>' +
      '<label>Horizontal<input type="range" id="dx-' + p.id + '" min="-0.5" max="0.5" step="0.01" value="' + a.dx + '"></label>' +
      '<label>Vertical<input type="range" id="dy-' + p.id + '" min="-0.5" max="0.5" step="0.01" value="' + a.dy + '"></label>' +
      (p.editable ? '<div class="medidas"><label>Ancho<input type="number" id="w-' + p.id + '" min="200" max="4000" value="' + a.W + '"></label><label>Alto<input type="number" id="h-' + p.id + '" min="100" max="4000" value="' + a.H + '"></label></div>' : '') +
      '<div class="acciones"><button type="button" class="bajar">Descargar PNG</button><button type="button" class="reset">Restablecer</button></div>' +
      '</div>';
    lista.appendChild(el);
    const cv = $('canvas', el);
    let pend = 0;
    const repintar = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(() => { dibujar(p, cv).catch(() => {}); $('.tam', el).textContent = aj(p).W + ' × ' + aj(p).H + ' px'; }); };
    const enlazar = (id, campo, num) => { const i = $('#' + id + '-' + p.id, el); if (!i) return; i.addEventListener('input', () => { const v = num ? Number(i.value) : i.value; if (num && !(v > 0) && campo !== 'dx' && campo !== 'dy') return; aj(p)[campo] = v; guardar(); repintar(); }); };
    enlazar('img', 'img', false); enlazar('zoom', 'zoom', true); enlazar('dx', 'dx', true); enlazar('dy', 'dy', true); enlazar('w', 'W', true); enlazar('h', 'H', true);
    $('.reset', el).addEventListener('click', () => { const sig = el.nextSibling; delete ajustes[p.id]; guardar(); el.remove(); tarjetaEn(p, sig); });
    $('.bajar', el).addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true;
      const out = document.createElement('canvas'); await dibujar(p, out);
      out.toBlob((blob) => {
        b.disabled = false;
        if (!blob) return aviso('No se pudo crear la imagen.');
        const a2 = aj(p), url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'KyoSumi_2027_' + p.id + '_' + a2.W + 'x' + a2.H + '.png';
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      }, 'image/png');
    });
    el.repintar = repintar;
    repintar();
    return el;
  }
  function tarjetaEn(p, antes) { const el = tarjeta(p); if (antes) lista.insertBefore(el, antes); el.querySelector('.bajar').focus(); }

  function aviso(t) { const el = $('#aviso'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3500); }

  $('#subir').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const k = 'propia-' + f.name;
    try { await anadirPropia(k, f); await bdPoner(k, f); } catch (err) { return aviso('No se pudo leer esa imagen.'); }
    document.querySelectorAll('.pieza select').forEach((s) => { const v = s.value; s.innerHTML = opcionesImg(v); });
    aviso('Imagen añadida: ya puedes elegirla en cualquier pieza.');
    e.target.value = '';
  });

  async function iniciar() {
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('700 40px "Chakra Petch"'); } catch (e) {}
    cargadas._logo = await cargar('marca/logo/kyosumi-isologo-decorado.svg');
    for (const [k, blob] of await bdTodo()) { try { await anadirPropia(k, blob); } catch (e) {} }
    PIEZAS.forEach(tarjeta);
  }
  iniciar();
})();
