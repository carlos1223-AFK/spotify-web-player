// Autenticación OAuth 2.0 con PKCE (sin backend ni client secret).
const Auth = (() => {
  const { clientId, scopes } = window.SPOTIFY_CONFIG;
  const redirectUri = location.origin + location.pathname;
  const K = { token: "sp_token", exp: "sp_exp", refresh: "sp_refresh", verifier: "sp_verifier", state: "sp_state" };

  const rand = (n) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % chars.length]).join("");
  };
  const b64url = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  async function login() {
    const verifier = rand(64);
    const state = rand(16);
    sessionStorage.setItem(K.verifier, verifier);
    sessionStorage.setItem(K.state, state);
    const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const url = new URL("https://accounts.spotify.com/authorize");
    url.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
    });
    location.href = url;
  }

  function store(t) {
    localStorage.setItem(K.token, t.access_token);
    localStorage.setItem(K.exp, String(Date.now() + t.expires_in * 1000 - 60000));
    if (t.refresh_token) localStorage.setItem(K.refresh, t.refresh_token);
  }

  async function tokenRequest(params) {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, ...params }),
    });
    if (!r.ok) throw new Error("Error de autenticación (" + r.status + ")");
    store(await r.json());
  }

  // Procesa el ?code= de vuelta del login. Devuelve true si hubo callback.
  async function handleCallback() {
    const q = new URLSearchParams(location.search);
    if (q.get("error")) { history.replaceState({}, "", redirectUri); throw new Error(q.get("error")); }
    const code = q.get("code");
    if (!code) return false;
    const ok = q.get("state") === sessionStorage.getItem(K.state);
    const verifier = sessionStorage.getItem(K.verifier);
    history.replaceState({}, "", redirectUri);
    if (!ok || !verifier) throw new Error("Estado de login inválido");
    await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: verifier });
    return true;
  }

  async function getToken() {
    const t = localStorage.getItem(K.token);
    if (t && Date.now() < Number(localStorage.getItem(K.exp))) return t;
    const refresh = localStorage.getItem(K.refresh);
    if (!refresh) return null;
    try {
      await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh });
      return localStorage.getItem(K.token);
    } catch { logout(); return null; }
  }

  function logout() {
    Object.values(K).forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  }

  return { login, logout, handleCallback, getToken, redirectUri };
})();
