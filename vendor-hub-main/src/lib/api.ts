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
  const token = localStorage.getItem("vendor_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function vendorFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getVendorApiUrl(path);
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...options?.headers } });
  const data = await res.json().catch(() => ({})) as { error?: string; details?: unknown };
  if (!res.ok) {
    const msg = data.error ?? "Request failed";
    const details = data.details != null ? ` ${JSON.stringify(data.details)}` : "";
    throw new Error(msg + details);
  }
  return data as T;
}
