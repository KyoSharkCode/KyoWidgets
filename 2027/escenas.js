// Temporada 2027 · Escenas de OBS (sección Escenas del panel 2027)
// Una tarjeta por escena: vista previa en vivo, horizontal o vertical, y el enlace para la fuente de navegador de OBS.
// En la vista previa, las escenas con chat lo muestran de ejemplo (?demo=1); el enlace para OBS va limpio.
// Las escenas viven en overlays/escenas/2027/ (públicas, sin entrar con Google, como las de 2026).
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ESCENAS = [
    { id: 'comenzando', n: 'Comenzando', d: 'Antes de empezar: tu mensaje con las frases que van cambiando, la cuenta atrás de 5 minutos y tu personaje.', lista: true },
    { id: 'just-chatting', n: 'Just Chatting', d: 'Para charlar: el fondo del arrecife, el logo y el marco del chat a la izquierda. El chat, la meta, la música y la cinta de anuncios van encima como fuentes aparte.', lista: true, demo: true,
      extra: (v) => 'El chat va en otra fuente de navegador (el chat del Estudio) de ' + (v ? '960 × 570 en x 60, y 1080' : '520 × 770 en x 62, y 176') + '.' },
    { id: 'gameplay', n: 'Gameplay', d: 'El fondo del arrecife para poner debajo de la captura del juego, con el logo pequeño en la esquina. En la vista previa, la guía marca dónde suele ir el juego.', lista: true, guias: true },
    { id: 'ya-regreso', n: 'Ya regreso', d: 'La pausa: tu mensaje con frases que van cambiando, la cuenta atrás de 5 minutos para volver y la chibi con palomitas.', lista: true,
      extra: () => 'Los anuncios rotativos que actives en el Estudio actual (Overlays) salen en el sitio de la chibi.' },
    { id: 'terminando', n: 'Terminando', d: 'El cierre: el agradecimiento con tus redes, frases que van cambiando y tu personaje guiñando el ojo.', lista: true,
      extra: () => 'Los anuncios rotativos que actives en el Estudio actual (Overlays) salen en el sitio de Kyo.' },
    { id: 'transicion', n: 'Transición', d: 'El stinger de OBS: la ola sube, aparece la aleta y al bajar ya estás en la otra escena.' }
  ];
  const CLAVE = 'kyo2027_escenas_fmt';
  let fmts = {}; try { fmts = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
  const url = (id, v) => new URL('../overlays/escenas/2027/' + id + (v ? '-vertical' : '') + '.html', location.href).href;
  const aviso = (t) => { const el = $('#aviso'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => { el.hidden = true; }, 2600); };

  function tarjeta(e) {
    const el = document.createElement('article');
    el.className = 'esc' + (e.lista ? ' lista' : ' pronto-esc');
    if (!e.lista) {
      el.innerHTML = '<div class="esc-cab"><h3>' + e.n + '</h3><span class="estado">Pendiente</span></div><p class="nota">' + e.d + '</p>';
      return el;
    }
    el.innerHTML =
      '<div class="esc-prev"><iframe title="Vista previa de ' + e.n + '" loading="lazy" tabindex="-1"></iframe></div>' +
      '<div class="esc-lado"><div class="esc-cab"><h3>' + e.n + '</h3><span class="estado listo">Lista</span></div><p class="nota">' + e.d + '</p>' +
      '<div class="mchips" role="radiogroup" aria-label="Formato"><label><input type="radio" name="fmt-' + e.id + '" value="h">Horizontal 1920 × 1080</label><label><input type="radio" name="fmt-' + e.id + '" value="v">Vertical 1080 × 1920</label></div>' +
      '<label class="esc-url">Enlace para OBS (fuente de navegador)<input type="text" readonly></label>' +
      '<p class="nota esc-tam"></p>' +
      '<div class="esc-acc"><button type="button" class="boton coral" data-copiar>Copiar enlace</button><a class="boton" target="_blank" rel="noopener" data-abrir>Abrir</a></div></div>';
    const caja = $('.esc-prev', el), fr = $('iframe', caja), inp = $('.esc-url input', el), tam = $('.esc-tam', el), abrir = $('[data-abrir]', el);
    const escala = () => { const v = caja.classList.contains('v'), w = v ? 1080 : 1920; fr.style.transform = 'scale(' + (caja.clientWidth / w) + ')'; };
    new ResizeObserver(escala).observe(caja);
    const poner = (fmt) => {
      const v = fmt === 'v', u = url(e.id, v);
      caja.classList.toggle('v', v); fr.src = u + (e.demo ? '?demo=1' : e.guias ? '?guias=1' : ''); inp.value = u; abrir.href = u;
      tam.textContent = 'En OBS: fuente de navegador de ' + (v ? '1080 × 1920' : '1920 × 1080') + '.' + (e.extra ? ' ' + e.extra(v) : '');
      $$('input[type=radio]', el).forEach((r) => { r.checked = r.value === fmt; });
      fmts[e.id] = fmt; try { localStorage.setItem(CLAVE, JSON.stringify(fmts)); } catch (err) {}
      escala();
    };
    el.addEventListener('change', (ev) => { if (ev.target.name === 'fmt-' + e.id) poner(ev.target.value); });
    $('[data-copiar]', el).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(inp.value); aviso('Enlace de ' + e.n + ' copiado'); }
      catch (err) { inp.select(); aviso('Selecciona el enlace y cópialo'); }
    });
    poner(fmts[e.id] || 'h');
    return el;
  }

  let abierto = false;
  window.kyoEscenas = {
    abrir(caja) {
      if (abierto || !caja) return; abierto = true;
      caja.innerHTML = '';
      ESCENAS.forEach((e) => caja.appendChild(tarjeta(e)));
    }
  };
})();
