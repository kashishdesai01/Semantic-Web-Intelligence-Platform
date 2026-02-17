export type AuthResponse = {
  token: string;
  user: { id: number; email: string; name: string };
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
}

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("insightlens_token", token);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("insightlens_token");
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("insightlens_token");
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
