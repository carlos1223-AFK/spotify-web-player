// Cliente mínimo de la Web API de Spotify.
const Api = (() => {
  async function call(path, opts = {}) {
    const token = await Auth.getToken();
    if (!token) throw new Error("Sesión expirada");
    const r = await fetch("https://api.spotify.com/v1" + path, {
      ...opts,
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    if (r.status === 204) return null;
    if (!r.ok) {
      let msg = r.statusText;
      try { msg = (await r.json()).error.message || msg; } catch {}
      throw new Error(msg + " (" + r.status + ")");
    }
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    me: () => call("/me"),
    search: (q) => call("/search?" + new URLSearchParams({ q, type: "track,artist,album", limit: 12 })),
    playlists: () => call("/me/playlists?limit=50"),
    playlistTracks: (id) =>
      call(`/playlists/${id}/tracks?limit=100&fields=items(track(uri,name,duration_ms,artists(name),album(images)))`),
    play: (deviceId, body) =>
      call("/me/player/play?device_id=" + deviceId, { method: "PUT", body: JSON.stringify(body) }),
    transfer: (deviceId) =>
      call("/me/player", { method: "PUT", body: JSON.stringify({ device_ids: [deviceId], play: false }) }),
  };
})();
