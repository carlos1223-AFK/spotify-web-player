const $ = (id) => document.getElementById(id);
let deviceId = null;
let player = null;
let sdkReady = false;
let state = null;
let tick = null;

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const showError = (e) => { $("status").textContent = e ? e.message || String(e) : ""; };

// Crea un elemento con hijos; los textos se insertan con textContent (sin innerHTML).
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  children.flat().forEach((c) => c != null && node.append(c));
  return node;
}
const img = (images, cls) => el("img", { src: images?.at(-1)?.url || images?.[0]?.url || "", alt: "", className: cls || "" });

// ---------- Reproducción ----------
async function play(body) {
  showError();
  if (!deviceId) return showError("El reproductor aún no está listo (¿tienes Premium?)");
  player.activateElement(); // el navegador exige un clic del usuario para permitir audio
  try { await Api.play(deviceId, body); } catch (e) { showError(e); }
}

function trackRow(track, onClick) {
  return el("li", { className: "track", onclick: onClick },
    img(track.album?.images),
    el("div", { className: "meta" }, track.name, el("span", {}, track.artists.map((a) => a.name).join(", "))),
    el("span", { className: "t" }, fmt(track.duration_ms)));
}

// ---------- Búsqueda ----------
async function search(q) {
  showError();
  const res = $("results");
  if (!q.trim()) return res.replaceChildren();
  try {
    const { tracks, artists, albums } = await Api.search(q);
    const t = tracks.items.filter(Boolean);
    res.replaceChildren(
      el("h3", {}, "Canciones"),
      el("ul", {}, t.map((tr) => trackRow(tr, () => play({ uris: [tr.uri] })))),
      el("h3", {}, "Artistas"),
      el("div", { className: "cards" }, artists.items.filter(Boolean).map((a) =>
        el("div", { className: "card artist", onclick: () => play({ context_uri: a.uri }) }, img(a.images), el("p", {}, a.name)))),
      el("h3", {}, "Álbumes"),
      el("div", { className: "cards" }, albums.items.filter(Boolean).map((a) =>
        el("div", { className: "card", onclick: () => play({ context_uri: a.uri }) }, img(a.images), el("p", {}, a.name)))),
    );
  } catch (e) { showError(e); }
}

// ---------- Playlists ----------
async function loadPlaylists() {
  try {
    const { items } = await Api.playlists();
    $("playlists").replaceChildren(...items.filter(Boolean).map((p) =>
      el("li", { title: p.name, onclick: (ev) => openPlaylist(p, ev.currentTarget) }, p.name)));
  } catch (e) { showError(e); }
}

async function openPlaylist(p, li) {
  showError();
  document.querySelectorAll("aside li.active").forEach((x) => x.classList.remove("active"));
  li.classList.add("active");
  $("search-input").value = "";
  try {
    const { items } = await Api.playlistItems(p.id);
    const tracks = items.map((i) => i.item || i.track).filter((t) => t && t.uri && t.artists);
    $("results").replaceChildren(
      el("div", { className: "now" }, img(p.images), el("h2", {}, p.name),
        el("button", { onclick: () => play({ context_uri: p.uri }) }, "▶ Reproducir")),
      el("ul", {}, tracks.map((t, i) => trackRow(t, () => play({ context_uri: p.uri, offset: { position: i } })))),
    );
  } catch (e) {
    showError(/403|404/.test(e.message)
      ? new Error("Spotify no deja leer esta playlist desde apps en modo desarrollo (solo las tuyas o colaborativas). Puedes reproducirla igualmente.")
      : e);
    $("results").replaceChildren(el("button", { onclick: () => play({ context_uri: p.uri }) }, "▶ Reproducir " + p.name));
  }
}

// ---------- Web Playback SDK ----------
function renderState(s) {
  state = s;
  clearInterval(tick);
  if (!s) return;
  const t = s.track_window.current_track;
  $("title").textContent = t.name;
  $("artist").textContent = t.artists.map((a) => a.name).join(", ");
  $("cover").src = t.album.images[0]?.url || "";
  $("cover").hidden = !t.album.images.length;
  $("toggle").textContent = s.paused ? "▶" : "⏸";
  $("seek").max = s.duration;
  $("dur").textContent = fmt(s.duration);
  const start = Date.now();
  const update = () => {
    const pos = Math.min(s.position + (s.paused ? 0 : Date.now() - start), s.duration);
    $("seek").value = pos;
    $("pos").textContent = fmt(pos);
  };
  update();
  if (!s.paused) tick = setInterval(update, 500);
}

function initPlayer() {
  if (!sdkReady || player) return;
  player = new Spotify.Player({
    name: "Spotify Web Player (navegador)",
    getOAuthToken: async (cb) => cb(await Auth.getToken()),
    volume: 0.5,
  });
  player.addListener("ready", ({ device_id }) => { deviceId = device_id; Api.transfer(device_id).catch(() => {}); });
  player.addListener("not_ready", () => { deviceId = null; });
  player.addListener("player_state_changed", renderState);
  player.addListener("initialization_error", ({ message }) => showError(message));
  player.addListener("authentication_error", ({ message }) => showError(message));
  player.addListener("account_error", () => showError("Se necesita Spotify Premium para reproducir."));
  player.addListener("playback_error", ({ message }) => showError(message));
  player.connect();

  // Para reanudar usamos la Web API: si el SDK no tiene cola cargada,
  // togglePlay() falla con "no list was loaded".
  $("toggle").onclick = () => (!state || state.paused ? play() : player.pause());
  $("prev").onclick = () => { player.activateElement(); player.previousTrack(); };
  $("next").onclick = () => { player.activateElement(); player.nextTrack(); };
  $("seek").onchange = (e) => player.seek(Number(e.target.value));
  $("volume").oninput = (e) => player.setVolume(e.target.value / 100);
}

window.onSpotifyWebPlaybackSDKReady = () => { sdkReady = true; if (loggedIn) initPlayer(); };

// ---------- Arranque ----------
let loggedIn = false;

async function start() {
  $("redirect").textContent = Auth.redirectUri;
  $("login-btn").onclick = () => {
    if (window.SPOTIFY_CONFIG.clientId === "TU_CLIENT_ID")
      return ($("login-error").textContent = "Configura tu Client ID en config.js");
    Auth.login();
  };
  $("logout-btn").onclick = () => { Auth.logout(); player?.disconnect(); location.reload(); };

  try { await Auth.handleCallback(); } catch (e) { $("login-error").textContent = e.message; }

  if (!(await Auth.getToken())) { $("login").hidden = false; return; }

  loggedIn = true;
  $("app").hidden = false;
  let timer;
  $("search-input").oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => search(e.target.value), 350); };
  $("search-form").onsubmit = (e) => { e.preventDefault(); search($("search-input").value); };
  Api.me().then((u) => ($("user").textContent = u.display_name || u.id)).catch(showError);
  loadPlaylists();
  initPlayer();
}

start();
