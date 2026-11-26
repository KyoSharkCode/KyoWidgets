# KyoWidgets 🦈

Widgets y animaciones propias para los directos y videos de **KyoSumiVT**, con el estilo *Marea Nocturna*: mar de noche, luna, neón y pegatinas kawaii.

## Qué incluye

- **Kyo Estudio**: una web para personalizar cada widget con vista previa en vivo y copiar el enlace para OBS. Todo está ordenado en cuatro grupos (En directo, Crear, Mi canal y Ajustes) y con **Ctrl + K** (o `/`) saltas a cualquier sección escribiendo su nombre.
- **Acceso con Google**: al Estudio se entra con tu cuenta de Google (Supabase Auth); cada función comprueba la sesión y que el correo sea el permitido, sin consultas extra (ver `LEEME-acceso.txt`).
- **Música**: muestra la canción que está sonando, con cuatro diseños para ir rotando (vinilo, polaroid, casete y entrada).
- **Fortnite**: muestra las estadísticas de la partida con diseños tipo pegatina y celebra las victorias.
- **Contadores**: contadores personalizados (muertes, rage quits…) que se suman desde el Estudio o con un botón del Stream Deck, y se ven al momento en OBS.
- **Overlay combinado**: junta varios widgets (predicción, sorteo y encuesta, timer, contador, anuncios… y opcionalmente música, Fortnite, meta y chat) en una sola fuente de navegador de OBS, con una distribución para la escena vertical (1080×1920) y otra para la horizontal (1920×1080). Se colocan arrastrándolos en la vista previa del Estudio y se guardan como versiones con nombre (una por escena de OBS). Cada versión tiene un enlace fijo: al pulsar **Guardar (en vivo)** todo se guarda en Supabase y OBS se actualiza solo, y el Estudio se ve igual en cualquier navegador (ver `LEEME-combo.txt`); cada widget mantiene el estilo de su pestaña.
- **AletaBot con IA**: cuando alguien nombra a AletaBot en el chat (o le responde), contesta con Claude en una o dos frases, con su propia personalidad, y sigue conversaciones cortas. Lleva espera por persona, tope de respuestas por directo, tope de gasto al mes y registro de tokens por directo; se controla desde la pestaña **🧠 IA** del Estudio o con `!ia` en el chat (ver `LEEME-ia.txt`). También recuerda a los habituales (cómo prefieren que los llame, cuántos directos llevan y dos o tres cosas que le han contado) y los saluda al llegar, una vez por directo; cualquiera puede ver lo suyo con `!misdatos` y borrarlo con `!olvidame`. Y juega con el chat: `!trivia`, `!adivinanza` (con un banco de preguntas que Claude escribe y tú apruebas en el Estudio) e `!historia`, un cuento que el chat y AletaBot escriben por turnos; con puntos (`!puntos`, `!top`).
- **Anuncios sobre el juego**: los anuncios rotativos de "Ya regreso" y "Terminando" también como widget, en tarjeta grande o cinta pequeña, con descanso configurable entre vueltas.
- **Meta de donaciones**: barra de meta que lee los tips de StreamElements y guarda el total en Supabase, así no se reinicia sola. Se ajusta a mano desde el Estudio.
- **Animaciones**: plantillas editables (textos, colores, posición y duración) que se descargan como video con transparencia, listas para usar en el editor.
- **Pestaña ZZZ** dentro de Animaciones, con las plantillas de Zenless Zone Zero aparte de las generales:
  - **Exportar imágenes**: desde la Guía de mejora se exporta la *guía de build* (discos, atributos, habilidades, amplificadores y equipo) o la *guía de frameo* (materiales y resumen) como carrusel 4:5 para Instagram o imagen 16:9, sobre el fondo Marea Nocturna, con portada (splash art del personaje) y tu firma.
  - **Guía de mejora**: arriba de la pestaña se elige el personaje (nombre, retrato, elemento y especialidad) y todas las plantillas ZZZ lo usan a la vez. Cada guía se guarda con su nombre y se recupera entera (discos, habilidades, amplificadores y equipo).
  - **Amplificadores (ZZZ)**: tres secciones de arriba abajo (su amplificador, rango S y rango A) con hasta 3 amplificadores cada una, del repo de assets o con imagen propia; cada sección entra en su turno para ir al ritmo de la voz.
  - **Explicando amplificador (ZZZ)**: para los videos "Explicando amplificadores", en 4 clips que llevan siempre la imagen del amplificador: 1) presentación, 2) tarjeta con el atributo principal y el avanzado (los números suben contando), 3) el efecto a pantalla completa (se abre desde el centro, la carta pasa a la esquina y la descripción se escribe palabra a palabra; `*palabra*` sale en color clave y `[90]` en color de número) y 4) la pregunta final para los comentarios.
  - **Guía de frameo (ZZZ)**: lo que hay que farmear para llevar al personaje al máximo, en 4 clips (promoción, habilidades, amplificador y resumen con el total de deniques y los jefes). Las cantidades se guardan como plantillas reutilizables y los iconos de materiales y jefes se suben una vez a la galería.
  - **Habilidades (ZZZ)**: orden en el que subir las habilidades con su nivel, unidas con ›. Iconos dibujados con la paleta del estilo elegido, o propios desde la galería.
- **Equipo (ZZZ)**: tres agentes y un bangboo en tarjetas que caen una a una, con su rol. Se eligen del repo de assets o con imagen propia, y el nombre se puede cambiar.
- **Guía de discos (ZZZ)**: plantilla en cuatro clips (título y sets, discos 4-5-6, substats y atributos recomendados con su valor objetivo, que sube contando) para poner encima del gameplay en shorts y guías. Los iconos de sets y atributos se suben una vez a su galería y aparecen solos cada vez que se escribe ese nombre; los atributos sin icono propio usan uno dibujado. El retrato del personaje y las insignias de elemento y especialidad se eligen de una lista que se lee del repo de la comunidad [ZZZdle-Assets](https://github.com/Gaiiiaaa-GH/ZZZdle-Assets) (directo de GitHub y fijado a un commit, sin copiar nada aquí); también se puede subir una imagen propia, que tiene prioridad.

Todo tiene versión normal y ediciones de temporada (Halloween y Navidad).

## Temporada 2027

Lo nuevo de 2027 (estilo interno *Coral Stream*: arrecife vivo, kawaii, tech y gamer) se construye en `2027/` sin tocar lo que se usa en los directos de 2026. Se entra con el botón flotante **2027** del Estudio. El 11 de enero de 2027 esa sección pasa a ser la principal.

- `2027/index.html`: **panel de la temporada**, con menú lateral por secciones (Inicio, Perfiles y banners, Videos, Escenas, Widgets, Alertas y Marca). El inicio muestra las cuentas atrás a las fechas clave, el avance de cada stage con sus tareas (se marcan a mano y se guardan en el navegador), accesos directos y la marca a mano (copiar colores y descargar logos). Las herramientas de cada stage se abren dentro del panel.
- `2027/miniaturas.js` (sección *Videos* del panel): **Miniaturas**. Compone la miniatura de YouTube (1920×1080) y la portada vertical de Shorts y TikTok (1080×1920) con el arte del juego, el personaje, el título en nube pegatina, la etiqueta de episodio y el marco del color de la categoría (Historia coral, Gacha oro, LoL aleta, Multijugador bioluz, Varios perla). Las verticales llevan el isotipo abajo. Se descarga en PNG o en JPG de menos de 2 MB, el límite de YouTube.
- Sección *Videos* del panel: **Marca de agua de YouTube**. Descarga el isotipo en un PNG cuadrado y transparente de 800 × 800 (YouTube la pide cuadrada), con los pasos para subirla en YouTube Studio.
- Sección *Animaciones* del panel (Stage 5): las animaciones del Estudio en versión 2027, con los mismos campos que las de 2026 y efectos de sonido opcionales. Comparten las piezas de `animaciones/generales/tarjetas-2027.js` (pegatina con borde de ola, esquinas HUD, botón, cursor de píxel, burbujas y la aleta del isotipo nadando por la ola). Por ahora: **¡Sígueme! 2027** (`animaciones/generales/sigueme-2027.js`) y **¡Suscríbete! en barra 2027** (`suscribete-barra-2027.js`: el aviso de la campanita se escribe en HUD en lugar de la línea del canal) y **Barra del código 2027** (`codigo-barra-2027.js`: el código se escribe en un campo HUD y el mensaje final aparece debajo al guardar) y **Pegatina del código 2027** (`codigo-pegatina-2027.js`: cae al agua con salpicadura, el código va con el degradado y el contorno del logo y la aleta asoma por detrás) y **¡Nueva merch! 2027** (`merch-2027.js`: la foto cae llevando la tarjeta escondida detrás y, al aterrizar, la tarjeta sale deslizándose; el precio, si lo hay, cuelga en coral). También aparecen en Crear → Animaciones del Estudio. Las alertas siguen en Twitch y StreamElements.
- `overlays/escenas/2027/`: **escenas de OBS 2027** (públicas, como las de 2026), cada una en horizontal y vertical: Comenzando, Just Chatting, Gameplay, Ya regreso y Terminando. Comparten `escena.css` y `escena.js` (arrecife, corrientes, burbujas, corales de píxel, cuenta atrás y frases que rotan) y se pausan solas mientras OBS no las muestra. Ya regreso y Terminando muestran los anuncios rotativos del Estudio en el sitio de Kyo (`overlays/escenas/anuncios.js`, tema `2027`). En Just Chatting el chat va en otra fuente, dentro del marco. Se copian desde la sección *Escenas* del panel 2027 (`2027/escenas.js`).
- `overlays/2027/`: **widgets de OBS 2027** (públicos, como los de 2026; usan los mismos datos y controles del Estudio). Se copian desde la sección *Widgets* del panel 2027 (`2027/widgets.js`), con su vista previa y sus opciones. Por ahora: `spotify.html`, la «Entrada» con bordes en olitas, portada pegatina, barra de píxel y un código de barras que es el ecualizador (`estilo` normal | octubre | navidad, `modo` siempre | cambio, `segundos`, `etiqueta`, `escala`, `demo=1`).
  `anuncios.html`: los anuncios del Estudio (todos los activos) en `diseno=tarjeta` (640×190, uno cada vez sobre el juego, con `cada` minutos de descanso) o `diseno=cinta` (alto 74, en bucle continuo abajo en Just Chatting; sin anuncios muestra las redes, `redes=`).
  `prediccion.html`: la predicción de Twitch compacta (540×330, `lado` izq | der): abierta con reloj, píldora al cerrar las apuestas, resultado en oro con chispas y cancelada; hasta 10 opciones.
  `sorteo.html`: sorteo y encuesta compactos (540×340), con la misma lógica de 2026 (función «encuesta», o «sorteo» si no existe): burbujas con los nombres, ganador tras la ola con chispas, encuesta con votos que llenan las barras y ganadora o empate en oro; si hay los dos se turnan cada 10 s.
  `meta.html`: meta de donaciones kawaii (640×200, solo texto y barra): corazón, título, cifra, tubito de agua con la aleta nadando y estrellitas; mismos datos que 2026 (función «meta» cada 15 s + Supabase Realtime; un fallo no toca lo que se ve). `ultimo` si | no.
  Chat 2027: es el chat de siempre (`overlays/chat.html`) con `tema=2027`: burbujas pegatina, colores por rol de la paleta 2027 e insignias KYO, MOD, VIP y SUB; los temas de 2026 no cambian.
  Contador 2027: el contador de siempre (`overlays/contador.html`) con `tema=2027`, la píldora pegatina aprobada (icono en círculo índigo, nombre en HUD, número en Fredoka) con todas sus animaciones.
  Cuenta atrás 2027: la cuenta atrás de siempre (`overlays/cuenta.html`) con `tema=2027`: caja HUD con esquinas cian, dígitos en Chakra, los últimos 10 segundos en coral y, en modo duración, una barra de progreso menta. El título, la fecha o la duración y el texto final se escriben en la tarjeta del panel.
- Transición 2027 (stinger de OBS): plantilla `animaciones/generales/transicion-2027.js`, que se descarga en .mov o .webm con transparencia desde *Escenas* del panel 2027 (o desde Animaciones del Estudio). En OBS: transición Stinger con el punto de transición en 600 ms.
- `2027/panel.js`: la lógica del panel: navegación, fechas, plan por stages y tareas, y marca.
- `2027/puerta.js`: la puerta de acceso de todas las páginas de 2027. Se entra con Google, con la misma sesión y la misma comprobación que el Estudio (si ya entraste en el Estudio, se abre directamente).
- `2027/marca/coral-stream.css`: colores, fuentes y piezas comunes que comparte todo lo nuevo.
- `2027/marca/logo/`: el logo nuevo (isologo e isotipo) en SVG.
- `2027/perfiles.js` (sección *Perfiles y banners* del panel; la antigua `2027/perfiles.html` lleva allí): **Perfiles y banners**. Foto de perfil (Twitch, YouTube, Kick y TikTok), banners de Twitch, YouTube (con su zona segura) y Kick (tamaño editable), y banner e invitación de Discord, con el estilo nuevo. Cada pieza se ajusta (imagen, zoom y posición) y se descarga en PNG al tamaño exacto. Se pueden subir imágenes propias, que se guardan en el navegador.
- `2027/marca/personaje/`: las imágenes del personaje que usan esas piezas por defecto.
- Sección *Videos* del panel: la **Intro 2027 «Aleta al acecho»** y el **Outro 2027** (pantalla final de YouTube con 1 vídeo + suscribirse, mensaje, redes, aleta nadando y música propia). Son las mismas plantillas que están en Crear → Animaciones del Estudio (`animaciones/generales/intro-2027.js` y `outro-2027.js`). Comparten el logo, el agua y el fondo a través de `animaciones/generales/coral-2027.js`, y el logo se dibuja desde `2027/marca/logo-piezas.js`.

## Hecho con

HTML, CSS y JavaScript sin frameworks, Supabase para los datos y ffmpeg.wasm para crear los videos directamente en el navegador.

Las animaciones están en `animaciones/`, una por archivo: `generales/`, `zzz/` y `anuncios/` (con las piezas compartidas en `base/`), y `animaciones/plantillas.js` las junta. Antes de un cambio grande, la *foto de las plantillas* comprueba que no se rompe nada sin querer (ver `LEEME-pruebas.txt`).

---

Proyecto personal. Los diseños, personajes y logotipos son de KyoSumiVT.

## Ahorro de invocaciones (plan gratis de Supabase: 500.000 al mes)

Los overlays consultan Supabase con `overlays/sondeo.js`, que:

- no consulta nada mientras OBS no muestra la fuente (ni con la pestaña oculta) y consulta al momento al volver a verse;
- va rápido solo cuando hay algo en marcha (predicción, sorteo o encuesta: cada 3 s) y en reposo cada 15 s;
- comparte la respuesta entre fuentes de OBS (varias escenas con anuncios = una sola consulta);
- pide sin cabeceras para que el navegador no mande antes un `OPTIONS` (que también cuenta como invocación).

Para aprovechar lo último, desactiva **"Verify JWT"** en `prediccion`, `encuesta`, `sorteo`,
`spotify-now-playing`, `anuncios`, `combo` y `fortnite-stats` (Edge Functions → la función → Details).
Si se queda activado sigue funcionando: los overlays lo detectan y mandan la anon key.
