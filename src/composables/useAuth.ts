import { computed, ref } from "vue";

const token = ref<string | null>(localStorage.getItem("tilt_token"));

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

  function loginWithToken(t: string) {
    token.value = t;
    localStorage.setItem("tilt_token", t);
  }

  function logout() {
    token.value = null;
    localStorage.removeItem("tilt_token");
  }

  async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    if (token.value) headers.set("Authorization", `Bearer ${token.value}`);

    return fetch(apiUrl(input), { ...init, headers });
  }

  return {
    token,
    isAuthenticated,
    loginWithToken,
    logout,
    authFetch,
  };
}
