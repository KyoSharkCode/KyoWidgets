// Temporada 2027 · Miniaturas (sección Videos del panel 2027)
// Compone miniaturas de YouTube (1920×1080) y portadas verticales de Shorts/TikTok (1080×1920):
// arte del juego de fondo, personaje, título en nube pegatina, etiqueta de episodio y marco del color
// de la categoría (Historia coral, Gacha oro, LoL aleta, Multijugador bioluz, Varios perla).
// Descarga en PNG o en JPG de menos de 2 MB (el límite de YouTube para miniaturas).
// Los ajustes se guardan en este navegador; el arte y el personaje subidos, en IndexedDB.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const C = { abisal: '#0A1030', indigo: '#2B2F7A', aleta: '#3A7BD5', bioluz: '#6FE3F0', espuma: '#C9E6F2', perla: '#F5F3FB', coral: '#FF6F61', oro: '#F4C542' };

  // marco = color de la categoría; l1 / l2 = colores de las dos líneas del título (legibles sobre la nube blanca)
  const CATS = {
    historia: { n: 'Historia', marco: C.coral, l1: C.coral, l2: C.aleta },
    gacha: { n: 'Gacha', marco: C.oro, l1: C.oro, l2: C.coral },
    lol: { n: 'LoL', marco: C.aleta, l1: C.aleta, l2: C.coral },
    multi: { n: 'Multijugador', marco: C.bioluz, l1: C.bioluz, l2: C.coral },
    varios: { n: 'Varios', marco: C.perla, l1: C.indigo, l2: C.coral }
  };
  const FMT = { h: { W: 1920, H: 1080, n: 'Horizontal · YouTube' }, v: { W: 1080, H: 1920, n: 'Vertical · Shorts y TikTok' } };
  const POS = { h: [['izq', 'Izquierda'], ['centro', 'Centro'], ['der', 'Derecha']], v: [['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']] };
  const PERSONAJES = {
    banner: { n: '3D · para banner', src: 'marca/personaje/kyo-3d-banner.webp', cortada: true },
    sonrisa: { n: '3D · sonrisa', src: 'marca/personaje/kyo-3d-sonrisa.webp', cortada: true },
    guino: { n: '3D · guiño', src: 'marca/personaje/kyo-3d-guino.webp', cortada: true },
    piruleta: { n: 'Dibujo · piruleta', src: 'marca/personaje/kyo-piruleta.webp' },
    chibi: { n: 'Chibi palomitas', src: 'marca/personaje/kyo-chibi-palomitas.webp' }
  };

  // ---------- ajustes ----------
  const CLAVE = 'kyo2027_miniaturas';
  // cada versión (horizontal y vertical) tiene todo por separado: textos, categoría, episodio, arte y personaje
  const TEXTOS = ['cat', 'l1', 'l2', 'ep'];
  const textos = () => ({ cat: 'historia', l1: 'Nuevo vídeo', l2: '¡Ya está aquí!', ep: '', tam: 1 });
  const inicial = () => ({
    fmt: 'h',
    h: Object.assign(textos(), { pos: 'izq', fondo: { zoom: 1, dx: 0, dy: 0 }, pers: { img: 'banner', lado: 'izq', zoom: 1, dx: 0, dy: 0 } }),
    v: Object.assign(textos(), { pos: 'centro', fondo: { zoom: 1, dx: 0, dy: 0 }, pers: { img: 'ninguno', lado: 'centro', zoom: 1, dx: 0, dy: 0 } })
  });
  let S = inicial();
  try { const g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (g && g.h && g.v && g.h.cat && g.v.cat) S = Object.assign(inicial(), g); } catch (e) {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {} };

  // ---------- imágenes ----------
  const cargar = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const img = {}; // fondo, logo y personajes cargados
  const bd = () => new Promise((res) => { try { const r = indexedDB.open('kyo_2027', 1); r.onupgradeneeded = () => r.result.createObjectStore('imagenes'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  async function bdLeer(k) { const db = await bd(); if (!db) return null; return new Promise((res) => { try { const q = db.transaction('imagenes').objectStore('imagenes').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  async function bdPoner(k, v) { const db = await bd(); if (!db) return; await new Promise((res) => { try { const tx = db.transaction('imagenes', 'readwrite'); tx.objectStore('imagenes').put(v, k); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); }
  async function desdeBlob(blob) { return cargar(URL.createObjectURL(blob)); }
  async function personaje(k) {
    if (k === 'ninguno') return null;
    if (img['p-' + k]) return img['p-' + k];
    const p = PERSONAJES[k]; if (!p) return null;
    try { img['p-' + k] = await cargar(p.src); } catch (e) { return null; }
    return img['p-' + k];
  }

  // ---------- dibujo ----------
  function mar(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16246a'); g.addColorStop(.6, '#0d1748'); g.addColorStop(1, C.abisal);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const m = Math.max(W, H), r = ctx.createRadialGradient(W * .8, H * .1, 0, W * .8, H * .1, m * .6);
    r.addColorStop(0, 'rgba(58,123,213,.35)'); r.addColorStop(1, 'rgba(58,123,213,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
  // la imagen cubre todo el lienzo (como background-size: cover), con zoom y desplazamiento
  function cubrir(ctx, im, W, H, a) {
    const k = Math.max(W / im.width, H / im.height) * a.zoom, w = im.width * k, h = im.height * k;
    ctx.drawImage(im, (W - w) / 2 + a.dx * W, (H - h) / 2 + a.dy * H, w, h);
  }
  function dibujarPersonaje(ctx, im, W, H, a, cortada) {
    const h = H * 1.05 * a.zoom, w = im.width * h / im.height;
    const cx = (a.lado === 'izq' ? W * .26 : a.lado === 'der' ? W * .74 : W * .5) + a.dx * W, y = H - h + H * .04 + a.dy * H;
    if (cortada && y > 0) {
      // las renders 3D terminan en recto por arriba: ese borde se funde para que no se vea el corte
      const o = document.createElement('canvas'); o.width = Math.ceil(w); o.height = Math.ceil(h);
      const c = o.getContext('2d'); c.drawImage(im, 0, 0, w, h);
      c.globalCompositeOperation = 'destination-out';
      const g = c.createLinearGradient(0, 0, 0, h * .14); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h * .14);
      ctx.drawImage(o, cx - w / 2, y);
    } else ctx.drawImage(im, cx - w / 2, y, w, h);
  }
  function titulo(ctx, W, H, f) {
    const A = S[S.fmt], cat = CATS[A.cat], lineas = [[A.l1, cat.l1], [A.l2, cat.l2]].filter(([t]) => t && t.trim()).map(([t, c]) => [t.trim().toUpperCase(), c]);
    if (!lineas.length) return;
    const v = S.fmt === 'v', pos = A.pos;
    let tam = (v ? 200 : 170) * A.tam;
    const maxW = v ? W - 150 : (pos === 'centro' ? W - 260 : W * .7);
    ctx.font = '400 ' + tam + 'px "Cherry Bomb One", sans-serif'; ctx.letterSpacing = '0px';
    const ancho = Math.max(...lineas.map(([t]) => ctx.measureText(t).width)) + tam * .7;
    if (ancho > maxW) { tam *= maxW / ancho; ctx.font = '400 ' + tam + 'px "Cherry Bomb One", sans-serif'; }
    const pad = tam * .36, alto = tam * 1.22, paso = tam * 1.02, bloque = alto + paso * (lineas.length - 1);
    const margen = f + 44;
    let y0 = v ? (pos === 'arriba' ? margen + 150 : pos === 'abajo' ? H - 470 - bloque : (H - bloque) / 2) : H - margen - 26 - bloque;
    const ax = v || pos === 'centro' ? W / 2 : pos === 'izq' ? margen + 20 : W - margen - 20;
    const pills = lineas.map(([t, col], i) => {
      const w = ctx.measureText(t).width + pad * 2, x = (v || pos === 'centro') ? ax - w / 2 : pos === 'izq' ? ax : ax - w;
      return { t, col, x, y: y0 + i * paso, w };
    });
    const camino = (dy) => { const p = new Path2D(); pills.forEach((q) => p.roundRect(q.x, q.y + dy, q.w, alto, alto / 2)); return p; };
    // nube pegatina: sombra sólida, contorno Abisal y relleno blanco (las píldoras se funden en una)
    ctx.save(); ctx.lineJoin = 'round';
    ctx.fillStyle = C.abisal; ctx.strokeStyle = C.abisal; ctx.lineWidth = tam * .2;
    const sombra = camino(tam * .1); ctx.stroke(sombra); ctx.fill(sombra);
    const nube = camino(0); ctx.stroke(nube); ctx.fillStyle = '#fff'; ctx.fill(nube);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    pills.forEach((q) => {
      const tx = q.x + q.w / 2, ty = q.y + alto / 2 + tam * .04;
      ctx.lineWidth = tam * .13; ctx.strokeStyle = C.abisal; ctx.strokeText(q.t, tx, ty);
      ctx.fillStyle = q.col; ctx.fillText(q.t, tx, ty);
    });
    ctx.restore();
  }
  function marco(ctx, W, H, f) {
    const A = S[S.fmt], cat = CATS[A.cat], l = Math.max(4, Math.round(f * .3)), ep = (A.ep || '').trim().toUpperCase(), s = Math.min(W, H) * .3;
    // el marco es una sola pieza: con episodio, la esquina de arriba a la derecha se rellena en diagonal
    // y la línea Abisal interior sigue esa diagonal, sin cortes en las uniones
    const dentro = new Path2D(); dentro.moveTo(f, f);
    if (ep) { dentro.lineTo(W - s + f, f); dentro.lineTo(W - f, s - f); } else dentro.lineTo(W - f, f);
    dentro.lineTo(W - f, H - f); dentro.lineTo(f, H - f); dentro.closePath();
    const pieza = new Path2D(); pieza.rect(0, 0, W, H); pieza.addPath(dentro);
    ctx.fillStyle = cat.marco; ctx.fill(pieza, 'evenodd');
    ctx.lineJoin = 'miter'; ctx.lineWidth = l; ctx.strokeStyle = C.abisal; ctx.stroke(dentro);
    if (!ep) return;
    ctx.save(); ctx.translate(W - s * .34, s * .34); ctx.rotate(Math.PI / 4);
    let t = s * .26; ctx.font = '400 ' + t + 'px "Cherry Bomb One", sans-serif'; ctx.letterSpacing = '0px';
    const mw = s * .78, w = ctx.measureText(ep).width; if (w > mw) { t *= mw / w; ctx.font = '400 ' + t + 'px "Cherry Bomb One", sans-serif'; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = t * .42; ctx.strokeStyle = C.abisal; ctx.strokeText(ep, 0, 0);
    ctx.lineWidth = t * .22; ctx.strokeStyle = '#fff'; ctx.strokeText(ep, 0, 0);
    ctx.fillStyle = A.cat === 'historia' ? C.aleta : C.coral; ctx.fillText(ep, 0, 0);
    ctx.restore();
  }
  async function dibujar(cv) {
    const F = FMT[S.fmt], W = F.W, H = F.H, A = S[S.fmt];
    cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
    const f = Math.round(Math.min(W, H) * .016), fondo = img['fondo-' + S.fmt];
    if (fondo) cubrir(ctx, fondo, W, H, A.fondo); else mar(ctx, W, H);
    const p = await personaje(A.pers.img); if (A.pers.img === 'propio' && img.propio) dibujarPersonaje(ctx, img.propio, W, H, A.pers, false); else if (p) dibujarPersonaje(ctx, p, W, H, A.pers, PERSONAJES[A.pers.img].cortada);
    titulo(ctx, W, H, f);
    if (S.fmt === 'v' && img.logo) { const w = 250, h = w * img.logo.height / img.logo.width; ctx.drawImage(img.logo, (W - w) / 2, H - f - 70 - h, w, h); }
    marco(ctx, W, H, f);
  }

  // ---------- interfaz ----------
  let caja, cv, pend = 0;
  const repintar = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(() => { dibujar(cv).catch((e) => console.error(e)); }); };
  const chipsHtml = (nombre, ops, sel, extra) => '<div class="mchips" role="radiogroup">' + ops.map(([v, l]) => '<label><input type="radio" name="' + nombre + '" value="' + v + '"' + (v === sel ? ' checked' : '') + '>' + (extra ? extra(v) : '') + esc(l) + '</label>').join('') + '</div>';
  function opcionesPers(sel) {
    return '<option value="ninguno">Sin personaje</option>' + Object.entries(PERSONAJES).map(([k, p]) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(p.n) + '</option>').join('') +
      (img.propio ? '<option value="propio"' + (sel === 'propio' ? ' selected' : '') + '>Mi imagen subida</option>' : '');
  }
  function pintarUI() {
    const A = S[S.fmt], v = S.fmt === 'v';
    caja.innerHTML =
      '<div class="mini-ctrl ctrl">' +
      '<div class="ancho"><span class="mlbl">Formato</span>' + chipsHtml('m-fmt', Object.entries(FMT).map(([k, f]) => [k, f.n]), S.fmt) + '</div>' +
      '<div class="ancho mnota"><span class="nota">Cada versión se edita por separado.</span><button type="button" class="boton" data-copiar-textos>Traer los textos de la ' + (v ? 'horizontal' : 'vertical') + '</button></div>' +
      '<div class="ancho"><span class="mlbl">Categoría (color del marco)</span>' + chipsHtml('m-cat', Object.entries(CATS).map(([k, c]) => [k, c.n]), A.cat, (k) => '<i class="mpunto" style="background:' + CATS[k].marco + '"></i>') + '</div>' +
      '<label class="ancho">Título · línea 1<input type="text" data-k="l1" maxlength="28" value="' + esc(A.l1) + '"></label>' +
      '<label class="ancho">Título · línea 2 (vacía para quitarla)<input type="text" data-k="l2" maxlength="28" value="' + esc(A.l2) + '"></label>' +
      '<label>Episodio (vacío para quitarlo)<input type="text" data-k="ep" maxlength="8" placeholder="EP 13" value="' + esc(A.ep) + '"></label>' +
      '<label>Tamaño del título<input type="range" data-k="tam" min="0.6" max="1.4" step="0.01" value="' + A.tam + '"></label>' +
      '<div class="ancho"><span class="mlbl">Posición del título</span>' + chipsHtml('m-pos', POS[S.fmt], A.pos) + '</div>' +
      '<div class="ancho msep"><span class="mlbl">Arte del juego (fondo)</span><label class="boton">Subir imagen<input type="file" accept="image/*" data-subir="fondo-' + S.fmt + '" hidden></label>' + (img['fondo-' + S.fmt] ? '' : ' <span class="nota">Sin imagen: se ve el fondo de mar.</span>') + '</div>' +
      '<label>Zoom<input type="range" data-a="fondo.zoom" min="1" max="2.5" step="0.01" value="' + A.fondo.zoom + '"></label>' +
      '<label>Horizontal<input type="range" data-a="fondo.dx" min="-0.5" max="0.5" step="0.01" value="' + A.fondo.dx + '"></label>' +
      '<label>Vertical<input type="range" data-a="fondo.dy" min="-0.5" max="0.5" step="0.01" value="' + A.fondo.dy + '"></label>' +
      '<div class="ancho msep"><span class="mlbl">Personaje</span></div>' +
      '<label>Imagen<select data-a="pers.img">' + opcionesPers(A.pers.img) + '</select></label>' +
      '<div><span class="mlbl">&nbsp;</span><label class="boton">Subir otra<input type="file" accept="image/png,image/webp" data-subir="propio" hidden></label></div>' +
      (v ? '' : '<div class="ancho"><span class="mlbl">Lado</span>' + chipsHtml('m-lado', [['izq', 'Izquierda'], ['der', 'Derecha']], A.pers.lado) + '</div>') +
      '<label>Zoom<input type="range" data-a="pers.zoom" min="0.5" max="2" step="0.01" value="' + A.pers.zoom + '"></label>' +
      '<label>Horizontal<input type="range" data-a="pers.dx" min="-0.5" max="0.5" step="0.01" value="' + A.pers.dx + '"></label>' +
      '<label>Vertical<input type="range" data-a="pers.dy" min="-0.5" max="0.5" step="0.01" value="' + A.pers.dy + '"></label>' +
      '</div>' +
      '<div class="mini-prev"><div class="mlienzo' + (v ? ' vert' : '') + '"><canvas></canvas></div>' +
      '<div class="acciones"><button type="button" class="bajar" data-bajar="jpg">' + (v ? 'Descargar JPG' : 'Descargar JPG para YouTube') + '</button><button type="button" data-bajar="png">Descargar PNG</button><button type="button" data-reset>Restablecer</button></div>' +
      '<p class="nota">' + (v ? 'Portada 1080 × 1920 para Shorts y TikTok.' : 'Miniatura 1920 × 1080. El JPG pesa menos de 2 MB, el límite de YouTube.') + ' Los ajustes se guardan en este navegador.</p></div>';
    cv = $('canvas', caja);
    repintar();
  }
  const fijar = (ruta, val) => { const [a, b] = ruta.split('.'); S[S.fmt][a][b] = val; };

  function enlazar() {
    caja.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.k) { S[S.fmt][el.dataset.k] = el.type === 'range' ? Number(el.value) : el.value; }
      else if (el.dataset.a && el.tagName !== 'SELECT') fijar(el.dataset.a, Number(el.value));
      else return;
      guardar(); repintar();
    });
    caja.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.name === 'm-fmt') { S.fmt = el.value; guardar(); pintarUI(); return; }
      if (el.name === 'm-cat') S[S.fmt].cat = el.value;
      else if (el.name === 'm-pos') S[S.fmt].pos = el.value;
      else if (el.name === 'm-lado') S[S.fmt].pers.lado = el.value;
      else if (el.dataset.a === 'pers.img') fijar('pers.img', el.value);
      else if (el.dataset.subir) {
        const f = el.files && el.files[0]; if (!f) return;
        try { img[el.dataset.subir] = await desdeBlob(f); await bdPoner('mini-' + el.dataset.subir, f); } catch (err) { return aviso('No se pudo leer esa imagen.'); }
        if (el.dataset.subir === 'propio') fijar('pers.img', 'propio');
        guardar(); pintarUI(); aviso(el.dataset.subir !== 'propio' ? 'Arte del juego puesto de fondo.' : 'Imagen añadida al personaje.');
        return;
      } else return;
      guardar(); repintar();
    });
    caja.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-bajar],[data-reset],[data-copiar-textos]'); if (!b) return;
      if (b.dataset.copiarTextos != null) { const otra = S[S.fmt === 'h' ? 'v' : 'h']; TEXTOS.forEach((k) => { S[S.fmt][k] = otra[k]; }); guardar(); pintarUI(); aviso('Textos traídos de la otra versión.'); return; }
      if (b.dataset.reset != null) { const fmt = S.fmt; S[fmt] = inicial()[fmt]; guardar(); pintarUI(); return; }
      b.disabled = true;
      try {
        const out = document.createElement('canvas'); await dibujar(out);
        let blob, tipo = b.dataset.bajar;
        if (tipo === 'png') blob = await new Promise((r) => out.toBlob(r, 'image/png'));
        else for (let q = .92; q >= .5; q -= .06) { blob = await new Promise((r) => out.toBlob(r, 'image/jpeg', q)); if (blob && blob.size < 2e6) break; }
        if (!blob) throw new Error('sin imagen');
        const nombre = 'KyoSumi_miniatura_' + S[S.fmt].cat + '_' + (S.fmt === 'h' ? '1920x1080' : '1080x1920') + '.' + tipo;
        const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        aviso('Descargada: ' + nombre + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
      } catch (err) { console.error(err); aviso('No se pudo crear la imagen.'); }
      b.disabled = false;
    });
  }
  function aviso(t) { const el = $('#aviso'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 3200); }

  let abierto = false;
  window.kyoMiniaturas = {
    async abrir(el) {
      if (abierto) return; abierto = true; caja = el;
      try { await document.fonts.load('400 100px "Cherry Bomb One"'); } catch (e) {}
      try { img.logo = await cargar('marca/logo/kyosumi-isotipo-color.svg'); } catch (e) {}
      for (const k of ['fondo-h', 'fondo-v', 'propio']) { const b = await bdLeer('mini-' + k); if (b) { try { img[k] = await desdeBlob(b); } catch (e) {} } }
      pintarUI(); enlazar();
    },
    // para pruebas: dibuja con unos ajustes dados sin tocar los guardados
    async dibujarCon(cv, ajustes) { const antes = S; S = Object.assign(inicial(), ajustes); try { await dibujar(cv); } finally { S = antes; } }
  };
})();
