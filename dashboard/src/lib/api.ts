export type AuthResponse = {
  token: string;
  user: { id: number; email: string; name: string };
};

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
}

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("swip_token", token);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("swip_token");
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("swip_token");
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Abort the request if it hangs so the UI never spins forever.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Cannot reach the server. Check your connection.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    // Expired/invalid session: drop the token and bounce to login.
    // Skip auth routes so a failed login still surfaces its own error.
    if (res.status === 401 && !path.startsWith("/api/auth")) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    const err = await res.json().catch(() => ({}));
    const message = err?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
