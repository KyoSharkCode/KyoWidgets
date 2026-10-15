# KyoWidgets 🦈

Widgets y animaciones propias para los directos y videos de **KyoSumiVT**, con el estilo *Marea Nocturna*: mar de noche, luna, neón y pegatinas kawaii.

## Qué incluye

- **Kyo Estudio**: una web para personalizar cada widget con vista previa en vivo y copiar el enlace para OBS. Todo está ordenado en cuatro grupos (En directo, Crear, Mi canal y Ajustes) y con **Ctrl + K** (o `/`) saltas a cualquier sección escribiendo su nombre.
- **Música**: muestra la canción que está sonando, con cuatro diseños para ir rotando (vinilo, polaroid, casete y entrada).
- **Fortnite**: muestra las estadísticas de la partida con diseños tipo pegatina y celebra las victorias.
- **Contadores**: contadores personalizados (muertes, rage quits…) que se suman desde el Estudio o con un botón del Stream Deck, y se ven al momento en OBS.
- **Meta de donaciones**: barra de meta que lee los tips de StreamElements y guarda el total en Supabase, así no se reinicia sola. Se ajusta a mano desde el Estudio.
- **Animaciones**: plantillas editables (textos, colores, posición y duración) que se descargan como video con transparencia, listas para usar en el editor.
- **Pestaña ZZZ** dentro de Animaciones, con las plantillas de Zenless Zone Zero aparte de las generales:
  - **Amplificadores (ZZZ)**: tres secciones de arriba abajo (su amplificador, rango S y rango A) con hasta 3 amplificadores cada una, del repo de assets o con imagen propia; cada sección entra en su turno para ir al ritmo de la voz.
  - **Habilidades (ZZZ)**: orden en el que subir las habilidades con su nivel, unidas con ›. Iconos dibujados con la paleta del estilo elegido, o propios desde la galería.
- **Equipo (ZZZ)**: tres agentes y un bangboo en tarjetas que caen una a una, con su rol. Se eligen del repo de assets o con imagen propia, y el nombre se puede cambiar.
- **Guía de discos (ZZZ)**: plantilla en cuatro clips (título y sets, discos 4-5-6, substats y atributos recomendados con su valor objetivo, que sube contando) para poner encima del gameplay en shorts y guías. Los iconos de sets y atributos se suben una vez a su galería y aparecen solos cada vez que se escribe ese nombre; los atributos sin icono propio usan uno dibujado. El retrato del personaje y las insignias de elemento y especialidad se eligen de una lista que se lee del repo de la comunidad [ZZZdle-Assets](https://github.com/Gaiiiaaa-GH/ZZZdle-Assets) (directo de GitHub y fijado a un commit, sin copiar nada aquí); también se puede subir una imagen propia, que tiene prioridad.

Todo tiene versión normal y ediciones de temporada (Halloween y Navidad).

## Hecho con

HTML, CSS y JavaScript sin frameworks, Supabase para los datos y ffmpeg.wasm para crear los videos directamente en el navegador.

---

Proyecto personal. Los diseños, personajes y logotipos son de KyoSumiVT.
