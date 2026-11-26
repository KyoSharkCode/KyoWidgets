// Temporada 2027 · Widgets de OBS (sección Widgets del panel 2027)
// Una tarjeta por widget: vista previa en vivo (con datos de ejemplo), sus opciones y el enlace para la
// fuente de navegador de OBS. Los widgets viven en overlays/2027/ (públicos, como los de 2026) y usan los
// mismos datos y controles del Estudio actual.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // opciones: [clave, etiqueta, [[valor, texto], …]] — la primera es la de por defecto (no va en el enlace)
  const WIDGETS = [
    { id: 'spotify', n: 'Música · Entrada', archivo: 'spotify.html', tam: [660, 220], lista: true,
      d: 'La canción que suena en tu Spotify, en la entrada nueva. Octubre y Navidad son ediciones especiales y llevan la luna.',
      opciones: [['estilo', 'Estilo', [['normal', 'Normal'], ['octubre', 'Octubre'], ['navidad', 'Navidad']]],
                 ['modo', 'Cuándo se ve', [['siempre', 'Siempre que suena'], ['cambio', 'Solo al cambiar de canción']]]] },
    { id: 'anuncios', n: 'Anuncios', archivo: 'anuncios.html', lista: true,
      tam: (v) => v.diseno === 'cinta' ? [1834, 74] : [640, 190],
      nota: (v) => v.diseno === 'cinta' ? 'En OBS: fuente de navegador de 1834 × 74 abajo en Just Chatting, en x 43, y 984. En la vertical, 1018 × 74 en x 31, y 1820.' : 'En OBS: fuente de navegador de 640 × 190, sobre el juego.',
      d: 'Los anuncios que editas en el Estudio actual (Overlays → Anuncios), todos los activos. La tarjeta los muestra de uno en uno sobre el juego; la cinta los recorre en bucle continuo abajo en Just Chatting.',
      opciones: [['diseno', 'Diseño', [['tarjeta', 'Tarjeta compacta'], ['cinta', 'Cinta de Just Chatting']]],
                 ['cada', 'Descanso entre vueltas', [['0', 'Siempre en pantalla'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min']], (v) => v.diseno !== 'cinta']] },
    { id: 'prediccion', n: 'Predicción compacta', archivo: 'prediccion.html', lista: true, tam: [540, 330],
      d: 'La predicción de Twitch con tus puntos del canal: entra por su lado, se encoge a una píldora al cerrar las apuestas y la ganadora brilla en oro. Solo se ve mientras hay una predicción.',
      opciones: [['lado', 'Lado', [['izq', 'Izquierda'], ['der', 'Derecha']]]],
      acciones: [['Abrir', 'abrir'], ['Apuestas', 'apuestas'], ['Cerrar apuestas', 'bloquear'], ['Resultado', 'resolver'], ['Cancelar', 'cancelar'], ['Seis opciones', 'muchas']] },
    { id: 'encuesta', n: 'Encuesta compacta', d: 'Las opciones se llenan con los votos y la ganadora pasa a oro.' },
    { id: 'sorteo', n: 'Sorteo compacto', d: 'El premio, la gente como burbujas y el nombre ganador en oro.' },
    { id: 'meta', n: 'Meta de donaciones', d: 'Kawaii, solo texto y barra: el tubito de agua y tu aleta nadando.' },
    { id: 'chat', n: 'Chat', d: 'Burbujas con el color de cada rol, para el marco de Just Chatting.' },
    { id: 'contador', n: 'Contador', d: 'Píldora pegatina con icono, nombre y número que rebota.' },
    { id: 'cuenta', n: 'Cuenta atrás', d: 'El contador HUD de las escenas con tu texto final.' }
  ];
  const CLAVE = 'kyo2027_widgets';
  let elegido = {}; try { elegido = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(elegido)); } catch (e) {} };
  const aviso = (t) => { const el = $('#aviso'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 2600); };

  const tamDe = (w) => typeof w.tam === 'function' ? w.tam(elegido[w.id] || {}) : w.tam;
  function enlace(w) {
    const v = elegido[w.id] || {}, p = new URLSearchParams();
    (w.opciones || []).forEach(([k, , vals, si]) => { if (si && !si(v)) return; if (v[k] && v[k] !== vals[0][0]) p.set(k, v[k]); });
    const qs = p.toString();
    return new URL('../overlays/2027/' + w.archivo + (qs ? '?' + qs : ''), location.href).href;
  }

  function tarjeta(w) {
    const el = document.createElement('article');
    el.className = 'esc' + (w.lista ? ' lista' : ' pronto-esc');
    if (!w.lista) { el.innerHTML = '<div class="esc-cab"><h3>' + esc(w.n) + '</h3><span class="estado">Pendiente</span></div><p class="nota">' + esc(w.d) + '</p>'; return el; }
    const v = elegido[w.id] = Object.assign({}, elegido[w.id]);
    el.innerHTML =
      '<div class="wid-prev"><iframe title="Vista previa de ' + esc(w.n) + '" tabindex="-1"></iframe></div>' +
      '<div class="esc-lado"><div class="esc-cab"><h3>' + esc(w.n) + '</h3><span class="estado listo">Listo</span></div><p class="nota">' + esc(w.d) + '</p>' +
      (w.opciones || []).map(([k, l, vals]) => '<div class="wid-op" data-op="' + k + '"><span class="mlbl">' + esc(l) + '</span><div class="mchips" role="radiogroup" aria-label="' + esc(l) + '">' +
        vals.map(([val, txt]) => '<label><input type="radio" name="' + w.id + '-' + k + '" value="' + val + '"' + ((v[k] || vals[0][0]) === val ? ' checked' : '') + '>' + esc(txt) + '</label>').join('') + '</div></div>').join('') +
      (w.acciones ? '<div class="wid-op"><span class="mlbl">Probar en la vista previa</span><div class="esc-acc">' + w.acciones.map(([l, a]) => '<button type="button" class="boton" data-probar="' + a + '">' + esc(l) + '</button>').join('') + '</div></div>' : '') +
      '<label class="esc-url">Enlace para OBS (fuente de navegador)<input type="text" readonly></label>' +
      '<p class="nota"><span data-tam></span> Para hacerlo más grande o más pequeño, añade <b>&amp;escala=1.5</b> (de 0.5 a 2) y multiplica el tamaño.</p>' +
      '<div class="esc-acc"><button type="button" class="boton coral" data-copiar>Copiar enlace</button><a class="boton" target="_blank" rel="noopener" data-abrir>Abrir</a></div></div>';
    const caja = $('.wid-prev', el), fr = $('iframe', caja), inp = $('.esc-url input', el), abrir = $('[data-abrir]', el);
    const escala = () => { fr.style.transform = 'scale(' + (caja.clientWidth / tamDe(w)[0]) + ')'; };
    new ResizeObserver(escala).observe(caja);
    const poner = () => {
      const u = enlace(w), [tw, th] = tamDe(w);
      inp.value = u; abrir.href = u;
      caja.style.aspectRatio = tw + '/' + th; fr.style.width = tw + 'px'; fr.style.height = th + 'px';
      const src = u + (u.includes('?') ? '&' : '?') + 'demo=1'; if (fr.src !== src) fr.src = src;
      $('[data-tam]', el).textContent = w.nota ? w.nota(v) : 'En OBS: fuente de navegador de ' + tw + ' × ' + th + '.';
      (w.opciones || []).forEach(([k, , , si]) => { const op = $('[data-op="' + k + '"]', el); if (op) op.hidden = !!si && !si(v); });
      escala();
    };
    el.addEventListener('change', (e) => { const m = e.target.name && e.target.name.match(new RegExp('^' + w.id + '-(.+)$')); if (!m) return; v[m[1]] = e.target.value; guardar(); poner(); });
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-probar]'); if (b && fr.contentWindow) fr.contentWindow.postMessage({ type: 'kyo-test', accion: b.dataset.probar }, '*'); });
    $('[data-copiar]', el).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(inp.value); aviso('Enlace de ' + w.n + ' copiado'); } catch (err) { inp.select(); aviso('Selecciona el enlace y cópialo'); }
    });
    poner();
    return el;
  }

  let abierto = false;
  window.kyoWidgets = { abrir(caja) { if (abierto || !caja) return; abierto = true; caja.innerHTML = ''; WIDGETS.forEach((w) => caja.appendChild(tarjeta(w))); } };
})();
