const VENDOR_API_URL = import.meta.env.VITE_VENDOR_API_URL ?? "http://localhost:3002";

export function getVendorApiUrl(path: string): string {
  return `${VENDOR_API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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
