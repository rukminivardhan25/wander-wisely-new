const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL ?? "http://localhost:3003";

function getUrl(path: string): string {
  return `${ADMIN_API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getUrl(path);
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}
