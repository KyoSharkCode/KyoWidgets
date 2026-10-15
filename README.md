# KyoWidgets 🦈

Widgets y animaciones propias para los directos y videos de **KyoSumiVT**, con el estilo *Marea Nocturna*: mar de noche, luna, neón y pegatinas kawaii.

## Qué incluye

- **Kyo Estudio**: una web para personalizar cada widget con vista previa en vivo y copiar el enlace para OBS. Todo está ordenado en cuatro grupos (En directo, Crear, Mi canal y Ajustes) y con **Ctrl + K** (o `/`) saltas a cualquier sección escribiendo su nombre.
- **Música**: muestra la canción que está sonando, con cuatro diseños para ir rotando (vinilo, polaroid, casete y entrada).
- **Fortnite**: muestra las estadísticas de la partida con diseños tipo pegatina y celebra las victorias.
- **Contadores**: contadores personalizados (muertes, rage quits…) que se suman desde el Estudio o con un botón del Stream Deck, y se ven al momento en OBS.
- **Meta de donaciones**: barra de meta que lee los tips de StreamElements y guarda el total en Supabase, así no se reinicia sola. Se ajusta a mano desde el Estudio.
- **Animaciones**: plantillas editables (textos, colores, posición y duración) que se descargan como video con transparencia, listas para usar en el editor.
- **Guía de discos (ZZZ)**: plantilla en tres clips (título y sets, discos 4-5-6 y substats) para poner encima del gameplay en shorts y guías. Los iconos de sets y atributos se suben una vez a su galería y aparecen solos cada vez que se escribe ese nombre; los atributos sin icono propio usan uno dibujado. El retrato del personaje y las insignias de elemento y especialidad se eligen de una lista que se lee del repo de la comunidad [ZZZdle-Assets](https://github.com/Gaiiiaaa-GH/ZZZdle-Assets) (por jsDelivr y fijado a un commit, sin copiar nada aquí); también se puede subir una imagen propia, que tiene prioridad.

Todo tiene versión normal y ediciones de temporada (Halloween y Navidad).

## Hecho con

HTML, CSS y JavaScript sin frameworks, Supabase para los datos y ffmpeg.wasm para crear los videos directamente en el navegador.

---

Proyecto personal. Los diseños, personajes y logotipos son de KyoSumiVT.
