# KyoWidgets 🦈🎃

Widgets con datos en vivo para el stream de **KyoSumiVT**:

| Widget | Archivo | Tamaño en OBS | De dónde saca los datos |
|---|---|---|---|
| **Kyo Estudio** | `index.html` | — | Web para personalizar los widgets y copiar el enlace para OBS |
| Música (Spotify) | `overlays/spotify.html` | 720 × 180 | Tu cuenta de Spotify |
| Fortnite | `overlays/fortnite.html` | 760 × 250 | fortnite-api.com (no oficial, clave gratis) |

Cómo funciona:

```
Spotify / fortnite-api.com ──► Supabase (Edge Functions + claves guardadas) ──► overlay en OBS
```

Las claves **nunca** van en los archivos ni en el chat: se guardan en **Supabase › Edge Functions › Secrets**.

---

## 0. Antes de empezar
- Mueve esta carpeta **fuera de iCloud** (por ejemplo `Documentos\GitHub\KyoWidgets`). iCloud y Git se llevan mal y a veces restauran archivos viejos.
- Necesitas: cuenta de **GitHub** (con GitHub Desktop), cuenta de **Supabase**, **Spotify Premium** (Spotify lo exige desde febrero de 2026 para apps propias) y tu nombre de **Epic**.

## 1. Repo en GitHub
1. GitHub Desktop › *File › Add local repository* › elige la carpeta `KyoWidgets` › *create a repository* › **Publish repository** (público, para poder usar GitHub Pages gratis).
2. En github.com › tu repo › *Settings › Pages* › **Deploy from a branch** › `main` / `(root)` › Save.
3. En unos minutos tendrás: `https://TU-USUARIO.github.io/KyoWidgets/`

## 2. Proyecto de Supabase "KyoWidgets"
1. supabase.com › **New project** › nombre `KyoWidgets` › región **West EU**.
2. *SQL Editor › New query* › pega `supabase/sql/01_setup.sql` › **Run**.
3. *Project Settings › API*: copia **Project URL** y **anon public key** en `config.js` (solo esas dos; la *service_role* nunca).

## 3. Secretos (Edge Functions › Secrets)
Crea estos cuatro (los valores los pegas tú ahí, no en el chat):

| Nombre | Qué poner |
|---|---|
| `KYO_SETUP_KEY` | Una contraseña larga que inventes (sirve para conectar Spotify) |
| `SPOTIFY_CLIENT_ID` | Del paso 5 |
| `SPOTIFY_CLIENT_SECRET` | Del paso 5 |
| `FORTNITE_API_KEY` | Del paso 6 |

## 4. Funciones (Edge Functions › Deploy a new function › Via Editor)
Crea **tres** funciones con estos nombres exactos, pegando el `index.ts` de cada carpeta:

| Nombre | Archivo | Verify JWT |
|---|---|---|
| `spotify-auth` | `supabase/functions/spotify-auth/index.ts` | **Desactivado** ⚠️ (también la usa el Estudio para el código de acceso) |
| `spotify-now-playing` | `supabase/functions/spotify-now-playing/index.ts` | Activado |
| `fortnite-stats` | `supabase/functions/fortnite-stats/index.ts` | Activado |

`spotify-auth` necesita *Verify JWT* desactivado porque Spotify vuelve a ella desde el navegador. Está protegida por tu `KYO_SETUP_KEY`.

## 5. App de Spotify
1. developer.spotify.com › *Dashboard* › **Create app**.
2. **Redirect URI** (exacta): `https://TU-PROYECTO.supabase.co/functions/v1/spotify-auth`
3. API: marca **Web API**. Guarda.
4. En *Settings* copia **Client ID** y **Client secret** a los Secrets de Supabase.
5. Conecta tu cuenta desde **Kyo Estudio** (paso 7): pestaña **Conexiones › Conectar Spotify**. Solo se hace una vez.

## 6. Clave de Fortnite
1. dash.fortnite-api.com › inicia sesión › *Account* › copia tu **API key** en `FORTNITE_API_KEY`.
2. En Fortnite: *Ajustes › Cuenta y privacidad* › activa **mostrar estadísticas públicas** (si no, la API no puede leerlas).

## 7. Kyo Estudio
1. Guarda `config.js` con tus dos valores › GitHub Desktop › **Commit** › **Push**.
2. Abre `https://TU-USUARIO.github.io/KyoWidgets/`. Te pedirá un **código de acceso**: es tu `KYO_SETUP_KEY`. El navegador lo recuerda.
3. **Conexiones**: conecta Spotify y prueba Fortnite. Los puntos de arriba a la derecha se ponen en verde cuando todo va bien.
4. **Música / Fortnite**: personaliza (estilo, forma, colores, tamaño, qué se ve, textos, animación…) mirando la vista previa. Puedes probar con datos de ejemplo o con tus datos reales, y sobre distintos fondos.
5. **Copiar enlace** › OBS › Fuente › Navegador › pega el enlace y pon el ancho y alto que indica el Estudio.

El Estudio recuerda tus ajustes en este navegador. Si cambias algo, vuelve a copiar el enlace y pégalo en la fuente de OBS.

### Opciones rápidas (al final de la URL)
- Música: `?tema=octubre|marea` · `&modo=siempre|cambio` · `&segundos=12` · `&fondo=si|no` · `&demo=1`
- Fortnite: `?nombre=TuNombreEpic` · `&cuenta=epic|psn|xbl` · `&ventana=season|lifetime` · `&tema=octubre|marea` · `&codigo=KYOSUMI` · `&hoy=si|no` · `&reset=1` · `&demo=1`

## Comprobar que todo va
- En el generador (`https://TU-USUARIO.github.io/KyoWidgets/`) cambia **Vista previa** a *"Con mis datos reales"*: debe salir tu canción o tus estadísticas.
- Si no sale nada, abre la URL del widget en Chrome, pulsa **F12** › pestaña *Console* y busca un aviso que empiece por "Kyo".

| Mensaje | Qué pasa |
|---|---|
| `no_conectado` | Falta el paso 5.5 (conectar Spotify) o no se ejecutó el SQL |
| `privado` | Tus estadísticas de Fortnite no son públicas |
| `no_encontrado` | El nombre de Epic no es exacto |
| `clave_invalida` | Revisa `FORTNITE_API_KEY` |

## Notas
- La música se consulta cada 5 s (con caché de 3 s en Supabase). Fortnite cada 90 s: la API se actualiza al terminar cada partida.
- La fila **"Hoy"** de Fortnite guarda en OBS tus números del inicio del día y resta. Se reinicia sola cada día o con `&reset=1`.
- Fortnite-API es **no oficial**: si Epic cambia algo, podría dejar de funcionar un tiempo.
