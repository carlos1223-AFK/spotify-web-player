// Pega aquí tu Client ID de https://developer.spotify.com/dashboard
// y añade en la app la Redirect URI que se muestra en la pantalla de login.
window.SPOTIFY_CONFIG = {
  clientId: "682c9e630d404b0583be6996b38fea7a",
  scopes: [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative",
  ],
};
