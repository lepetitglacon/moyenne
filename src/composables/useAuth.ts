import { computed, ref } from "vue";

const token = ref<string | null>(localStorage.getItem("tilt_token"));

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
    headers.set("Content-Type", "application/json");

    if (token.value) {
      headers.set("Authorization", `Bearer ${token.value}`);
    }

    return fetch(input, { ...init, headers });
  }

  return {
    token,
    isAuthenticated,
    loginWithToken,
    logout,
    authFetch,
  };
}
