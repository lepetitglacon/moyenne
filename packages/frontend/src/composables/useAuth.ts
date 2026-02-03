import { computed, ref } from "vue";

const token = ref<string | null>(localStorage.getItem("tilt_token"));
const refreshToken = ref<string | null>(localStorage.getItem("tilt_refresh_token"));

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Base API venant du build Vite
// Exemples :
// - dev : "http://localhost:3000/api"
// - prod : "/tilt/api" OU "https://api.domaine.tld/api"
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "/api";

function apiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") return input;

  // Déjà absolu -> ne touche pas
  if (input.startsWith("http://") || input.startsWith("https://")) return input;

  // Si tu appelles "/api/xxx", on remappe vers API_BASE
  if (input.startsWith("/api/")) {
    return `${API_BASE}${input.slice("/api".length)}`; // "/api/login" -> "{API_BASE}/login"
  }

  // Sinon, on laisse tel quel
  return input;
}

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value);

  function loginWithToken(t: string, rt?: string) {
    token.value = t;
    localStorage.setItem("tilt_token", t);
    if (rt) {
      refreshToken.value = rt;
      localStorage.setItem("tilt_refresh_token", rt);
    }
  }

  function logout() {
    token.value = null;
    refreshToken.value = null;
    localStorage.removeItem("tilt_token");
    localStorage.removeItem("tilt_refresh_token");
  }

  /**
   * Attempt to refresh the access token using the refresh token
   * Returns true if successful, false otherwise
   */
  async function tryRefreshToken(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }

    if (!refreshToken.value) {
      return false;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const res = await fetch(apiUrl("/api/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refreshToken.value }),
        });

        if (!res.ok) {
          // Refresh failed - clear tokens
          logout();
          return false;
        }

        const data = await res.json();
        if (data.token) {
          loginWithToken(data.token, data.refreshToken);
          return true;
        }
        return false;
      } catch {
        logout();
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    if (token.value) headers.set("Authorization", `Bearer ${token.value}`);

    const res = await fetch(apiUrl(input), { ...init, headers });

    // If unauthorized (401) or forbidden (403), try to refresh the token
    if ((res.status === 401 || res.status === 403) && refreshToken.value) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the original request with the new token
        const retryHeaders = new Headers(init.headers || {});
        if (!retryHeaders.has("Content-Type")) retryHeaders.set("Content-Type", "application/json");
        retryHeaders.set("Authorization", `Bearer ${token.value}`);
        return fetch(apiUrl(input), { ...init, headers: retryHeaders });
      }
      // Refresh failed - redirect to login
      window.location.href = "/login";
    }

    return res;
  }

  return {
    token,
    refreshToken,
    isAuthenticated,
    loginWithToken,
    logout,
    authFetch,
    tryRefreshToken,
  };
}
