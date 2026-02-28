// Use VITE_API_URL if set; in production build default to deployed backend so Vercel works without env.
// Also use production API when running on a non-local host (e.g. wanderly-xi.vercel.app) so it works even if build cache or env is wrong.
function getDefaultApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return "https://wander-wisely-new.onrender.com";
  }
  return import.meta.env.PROD ? "https://wander-wisely-new.onrender.com" : "http://localhost:3001";
}
const API_BASE = import.meta.env.VITE_API_URL ?? getDefaultApiBase();
const API_TIMEOUT_MS = 15000;

export function getApiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: object; timeoutMs?: number } = {}
): Promise<{ data?: T; error?: string; status: number; networkError?: boolean }> {
  const { body, timeoutMs = API_TIMEOUT_MS, ...rest } = options;
  const url = getApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const init: RequestInit = {
    ...rest,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
  };
  if (body && typeof body === "object") {
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, init);
    clearTimeout(timeoutId);
    const text = await res.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // non-JSON response
      }
    }
    const error = data && typeof data === "object" && "error" in data ? (data as { error: string }).error : undefined;
    return { data, error: error ?? (res.ok ? undefined : text || res.statusText), status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const isNetwork = err instanceof TypeError && err.message?.includes("fetch");
    return {
      status: 0,
      error: isAbort
        ? "Request timed out. Is the backend running?"
        : "Could not reach server. Is the backend running at " + API_BASE + "?",
      networkError: true,
    };
  }
}
