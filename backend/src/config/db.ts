import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
});

/** Optional second pool for transport/vendor data. Set TRANSPORT_DATABASE_URL to the DB that has listings, buses, bus_schedules, routes (same as vendor hub DB) so bus search works without running the vendor hub. */
const transportConnectionString = process.env.TRANSPORT_DATABASE_URL;
export const transportPool =
  transportConnectionString &&
  transportConnectionString.trim() !== ""
    ? new Pool({
        connectionString: transportConnectionString.trim(),
        ssl: transportConnectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      })
    : null;

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

/** Use for transport queries. Uses TRANSPORT_DATABASE_URL pool if set, otherwise main pool (for single-DB setups). */
export function getTransportPool(): pg.Pool {
  return transportPool ?? pool;
}
