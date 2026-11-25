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

- `2027/index.html`: portada de la temporada, con las fechas clave y el avance por stages.
- `2027/puerta.js`: la puerta de acceso de todas las páginas de 2027. Se entra con Google, con la misma sesión y la misma comprobación que el Estudio (si ya entraste en el Estudio, se abre directamente).
- `2027/marca/coral-stream.css`: colores, fuentes y piezas comunes que comparte todo lo nuevo.
- `2027/marca/logo/`: el logo nuevo (isologo e isotipo) en SVG.
- `2027/perfiles.html`: **Perfiles y banners**. Foto de perfil (Twitch, YouTube, Kick y TikTok), banners de Twitch, YouTube (con su zona segura) y Kick (tamaño editable), y banner e invitación de Discord, con el estilo nuevo. Cada pieza se ajusta (imagen, zoom y posición) y se descarga en PNG al tamaño exacto. Se pueden subir imágenes propias, que se guardan en el navegador.
- `2027/marca/personaje/`: las imágenes del personaje que usan esas piezas por defecto.

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
