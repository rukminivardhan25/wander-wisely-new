function resolveApiBase(): string | null {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  if (import.meta.env.DEV) return "http://localhost:3001";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3001";
  }
  return null;
}
const API_BASE = resolveApiBase();
const API_TIMEOUT_MS = 15000;
let warmApiPromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getApiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error("Missing VITE_API_URL. Set VITE_API_URL to your deployed backend URL.");
  }
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: Omit<RequestInit, "body"> & {
    body?: object;
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
  } = {}
): Promise<{ data?: T; error?: string; status: number; networkError?: boolean }> {
  const { body, timeoutMs = API_TIMEOUT_MS, retries = 0, retryDelayMs = 800, ...rest } = options;
  const url = getApiUrl(path);
  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
      const shouldRetry = attempt < maxAttempts && (isAbort || isNetwork);
      if (shouldRetry) {
        await sleep(retryDelayMs);
        continue;
      }
      return {
        status: 0,
        error: isAbort
          ? "Request timed out. The server may still be waking up, please try again."
          : `Could not reach server. Is the backend running at ${API_BASE ?? "your configured VITE_API_URL"}?`,
        networkError: true,
      };
    }
  }

  return { status: 0, error: "Request failed", networkError: true };
}

export function warmApi(): Promise<void> {
  if (!warmApiPromise) {
    warmApiPromise = (async () => {
      try {
        await apiFetch("/api/health", {
          method: "GET",
          timeoutMs: 10000,
          retries: 1,
        });
      } catch {
        // best-effort warmup only
      } finally {
        warmApiPromise = null;
      }
    })();
  }
  return warmApiPromise;
}
