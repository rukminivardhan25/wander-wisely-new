// When running on a non-local host (e.g. Vercel), use deployed backend URLs.
function getAdminApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return "https://wander-wisely-new-2.onrender.com";
  }
  return import.meta.env.VITE_ADMIN_API_URL ?? "http://localhost:3003";
}
function getMainAppApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return "https://wander-wisely-new.onrender.com";
  }
  return import.meta.env.VITE_MAIN_APP_API_URL ?? "http://localhost:3001";
}
function getVendorHubApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return "https://wander-wisely-new-1.onrender.com";
  }
  return import.meta.env.VITE_VENDOR_HUB_API_URL ?? "http://localhost:3002";
}

const ADMIN_API_URL = getAdminApiBase();
const MAIN_APP_API_URL = getMainAppApiBase();
const VENDOR_HUB_API_URL = getVendorHubApiBase();
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? "";

function getUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Call partner portal backend for admin (e.g. list vendors). Sends X-Admin-Key if set. */
export async function vendorHubFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getUrl(VENDOR_HUB_API_URL, path);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options?.headers as Record<string, string>) };
  if (ADMIN_API_KEY) headers["X-Admin-Key"] = ADMIN_API_KEY;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getUrl(ADMIN_API_URL, path);
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  } catch (err) {
    const msg = err instanceof Error && (err.message === "Failed to fetch" || err.message?.includes("fetch"))
      ? "Cannot reach the admin API. If running locally, start the backend: cd admin-main/backend && npm run dev"
      : (err instanceof Error ? err.message : "Request failed");
    throw new Error(msg);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}

/** Call main app backend (wander-wisely) for feedback/complaints. Sends X-Admin-Key if set. */
export async function mainAppFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getUrl(MAIN_APP_API_URL, path);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(options?.headers as Record<string, string>) };
  if (ADMIN_API_KEY) headers["X-Admin-Key"] = ADMIN_API_KEY;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}
