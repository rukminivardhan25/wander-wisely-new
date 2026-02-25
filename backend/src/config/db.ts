import pg from "pg";

const { Pool } = pg;

/** Add uselibpqcompat=true to avoid pg v9 SSL mode warning when URL has sslmode=require. */
function normalizeConnectionString(url: string): string {
  const u = url.trim();
  if (!u) return u;
  if (/[?&]uselibpqcompat=true/.test(u)) return u;
  if (/[?&]sslmode=(require|prefer|verify-ca)/.test(u)) {
    return u.includes("?") ? `${u}&uselibpqcompat=true` : `${u}?uselibpqcompat=true`;
  }
  return u;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const normalizedDbUrl = normalizeConnectionString(connectionString);

export const pool = new Pool({
  connectionString: normalizedDbUrl,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** Use for transport queries (flights, buses, cars, bookings). Same DB as DATABASE_URL (single database). */
export function getTransportPool(): pg.Pool {
  return pool;
}
