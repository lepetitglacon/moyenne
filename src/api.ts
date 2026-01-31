// src/api.ts
export const API_BASE_URL = (import.meta.env.VITE_API_BASE as string) ?? "http://localhost:3000/api";
console.log(API_BASE_URL)

export function getToken(): string | null {
  return localStorage.getItem("tilt_token");
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...authHeaders(),
  };

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
  }

  // Certaines routes peuvent renvoyer vide, mais ici on renvoie toujours JSON
  return (await res.json()) as T;
}
