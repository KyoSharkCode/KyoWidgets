// Escenas de OBS 2027 · comportamiento común
// escena2027(stage, { min, ya, lineas }):
//   - dibuja los corales de píxel del fondo (nacen en el borde inferior) y crea las burbujas;
//   - min: cuenta atrás en minutos (en .hud). Al llegar a cero muestra «ya» 5 s y vuelve a empezar;
//   - lineas: frases que rotan cada 4,2 s bajo el título (en .subt .linea).
// Mientras OBS no muestra la escena (pausa-obs.js), la cuenta y las frases se detienen.
(function () {
  function semilla(s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  var oculta = function () { return document.documentElement.classList.contains('obs-oculta'); };

  function arrecife(cv) {
    var c = cv.getContext('2d'), w = cv.width, P = 12, r = semilla(7), cols = ['#FF6F61', '#FFB4A8', '#2B2F7A', '#3A7BD5', '#5EF2B8'];
    c.fillStyle = '#0A1030';
    for (var x = 0; x < w; x += P) { var h = P * (3 + Math.floor(r() * 3)); c.fillRect(x, 260 - h, P, h); }
    for (var x2 = 24; x2 < w; x2 += 60 + Math.floor(r() * 70)) {
      var col = cols[Math.floor(r() * cols.length)], len = 5 + Math.floor(r() * 8), x0 = x2 - x2 % P; c.fillStyle = col;
      for (var i = 0; i < len; i++) {
        c.fillRect(x0, 260 - P - i * P, P, P);
        if (r() < .28) { var d = r() < .5 ? -1 : 1, l = 2 + Math.floor(r() * 3); for (var j = 1; j <= l; j++) c.fillRect(x0 + d * j * P, 260 - P - i * P - j * P, P, P); }
      }
    }
  }
  function burbujas(caja, W, H, n) {
    var r = semilla(11), html = '';
    for (var i = 0; i < n; i++) {
      var s = 10 + Math.round(r() * 26);
      html += '<div class="bubble" style="width:' + s + 'px;height:' + s + 'px;left:' + Math.round(r() * (W - 40)) + 'px;top:' + (H - 200 + Math.round(r() * 160)) + 'px;animation-duration:' + (7 + r() * 7).toFixed(1) + 's;animation-delay:' + (-r() * 10).toFixed(1) + 's"></div>';
    }
    caja.innerHTML = html;
  }

  window.escena2027 = function (stage, o) {
    o = o || {};
    var vert = stage.classList.contains('v'), W = vert ? 1080 : 1920, H = vert ? 1920 : 1080;
    var cv = stage.querySelector('canvas.reef'); if (cv) { cv.width = W; cv.height = 260; cv.style.width = W + 'px'; arrecife(cv); }
    var bb = stage.querySelector('.bubbles'); if (bb) burbujas(bb, W, H, vert ? 12 : 16);

    var n = stage.querySelector('.hud .n'), barra = stage.querySelector('.hud .b i');
    if (n && o.min) {
      var total = Math.round(o.min * 60), queda = total;
      var pinta = function () { var m = Math.floor(queda / 60), s = queda % 60; n.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; barra.style.width = ((total - queda) / total * 100) + '%'; };
      (function tic() {
        if (oculta()) return setTimeout(tic, 500);
        if (queda <= 0) {
          n.textContent = o.ya || '¡Ya empezamos!'; n.classList.add('ya'); barra.style.width = '100%';
          return setTimeout(function () { queda = total; n.classList.remove('ya'); tic(); }, 5000);
        }
        pinta(); queda--; setTimeout(tic, 1000);
      })();
    }

    var linea = stage.querySelector('.subt .linea');
    if (linea && o.lineas && o.lineas.length > 1) {
      var k = 0;
      setInterval(function () {
        if (oculta()) return;
        linea.classList.add('fuera');
        setTimeout(function () { k = (k + 1) % o.lineas.length; linea.textContent = o.lineas[k]; linea.classList.remove('fuera'); }, 420);
      }, 4200);
    }
  };
})();
