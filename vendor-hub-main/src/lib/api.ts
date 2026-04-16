function getVendorApiBaseUrl(): string {
  if (import.meta.env.VITE_VENDOR_API_URL) return import.meta.env.VITE_VENDOR_API_URL;
  if (import.meta.env.DEV) return "http://localhost:3002";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3002";
  }
  throw new Error("Missing VITE_VENDOR_API_URL. Set VITE_VENDOR_API_URL to your deployed backend URL.");
}

export function getVendorApiUrl(path: string): string {
  const base = getVendorApiBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem("vendor_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type VendorFetchOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

const VENDOR_API_TIMEOUT_MS = 15000;
let warmVendorApiPromise: Promise<void> | null = null;

export async function vendorFetch<T>(path: string, options?: VendorFetchOptions): Promise<T> {
  const url = getVendorApiUrl(path);
  const { timeoutMs = VENDOR_API_TIMEOUT_MS, retries = 0, retryDelayMs = 800, ...rest } = options ?? {};
  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...rest,
        signal: controller.signal,
        headers: { ...getAuthHeaders(), ...rest.headers },
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({})) as { error?: string; details?: unknown };
      if (!res.ok) {
        const msg = data.error ?? "Request failed";
        const details = data.details != null ? ` ${JSON.stringify(data.details)}` : "";
        throw new Error(msg + details);
      }
      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const isNetwork = err instanceof TypeError && err.message?.includes("fetch");
      const isConnectivityIssue =
        err instanceof Error &&
        (err.message === "Failed to fetch" || err.message.includes("fetch") || err.message.includes("NetworkError"));
      const shouldRetry = attempt < maxAttempts && (isAbort || isNetwork || isConnectivityIssue);
      if (shouldRetry) {
        await sleep(retryDelayMs);
        continue;
      }
      if (isAbort) {
        throw new Error("Request timed out. The Partner Portal API may still be waking up.");
      }
      if (isNetwork || isConnectivityIssue) {
        throw new Error("Cannot reach the API. Start the Partner Portal backend: cd vendor-hub-main/backend then npm run dev");
      }
      throw err;
    }
  }

  throw new Error("Request failed");
}

export function warmVendorApi(): Promise<void> {
  if (!warmVendorApiPromise) {
    warmVendorApiPromise = (async () => {
      try {
        await vendorFetch("/api/health", {
          method: "GET",
          timeoutMs: 10000,
          retries: 1,
        });
      } catch {
        // best-effort warmup only
      } finally {
        warmVendorApiPromise = null;
      }
    })();
  }
  return warmVendorApiPromise;
}
