# spotify-web-player

Reproductor web de Spotify en HTML/JS vanilla (sin build ni backend):

- **Login con Spotify** mediante OAuth 2.0 Authorization Code + PKCE (con refresco de token).
- **Reproductor** con el [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk): play/pausa, anterior/siguiente, barra de progreso con seek y volumen. *Requiere Spotify Premium.*
- **Búsqueda** de canciones, artistas y álbumes (clic para reproducir).
- **Playlists**: lista tus playlists, muestra sus canciones y las reproduce desde cualquier posición.

## Puesta en marcha

1. Crea una app en el [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) y marca *Web API* y *Web Playback SDK*.
2. Añade como Redirect URI la URL donde sirvas la app, p. ej. `http://127.0.0.1:8080/` (Spotify no acepta `localhost`; usa `127.0.0.1`).
3. Pon tu Client ID en `config.js`.
4. Sirve la carpeta con cualquier servidor estático:
   ```sh
   python3 -m http.server 8080 --bind 127.0.0.1
   ```
5. Abre `http://127.0.0.1:8080/` e inicia sesión. La URI exacta a registrar se muestra en la pantalla de login.

> En modo desarrollo, Spotify solo permite el acceso a los usuarios que añadas en *User Management* de la app.

## Estructura

```
index.html      maquetación
config.js       Client ID y scopes
css/style.css   estilos
js/auth.js      OAuth PKCE y gestión de tokens
js/api.js       cliente de la Web API
js/app.js       UI: búsqueda, playlists y reproductor SDK
```
