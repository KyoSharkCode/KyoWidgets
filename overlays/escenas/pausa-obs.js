/* Pausa la escena mientras OBS no la muestra, sin recargarla.
   OBS avisa con el evento obsSourceVisibleChanged (visible en el programa o en la vista previa).
   Al ocultarse se congelan las animaciones CSS y el canvas deja de dibujar;
   al volver sigue desde donde estaba, sin el pico de CPU de "Apagar la fuente cuando no esté visible". */
(function(){
  var raiz=document.documentElement;
  var st=document.createElement('style');
  st.textContent='.obs-oculta *,.obs-oculta *::before,.obs-oculta *::after{animation-play-state:paused!important;transition:none!important}';
  (document.head||raiz).appendChild(st);
  window.addEventListener('obsSourceVisibleChanged',function(e){
    raiz.classList.toggle('obs-oculta',!(e.detail&&e.detail.visible));
  });
})();
