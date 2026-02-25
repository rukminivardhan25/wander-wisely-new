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

/** Use for car_bookings so vendor hub sees bookings created by the main app. Set TRANSPORT_DATABASE_URL to the same DB URL the main app uses for car bookings (main app TRANSPORT_DATABASE_URL or DATABASE_URL). */
const transportConnectionString = process.env.TRANSPORT_DATABASE_URL;
export const transportPool =
  transportConnectionString && transportConnectionString.trim() !== ""
    ? new Pool({
        connectionString: transportConnectionString.trim(),
        ssl: transportConnectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      })
    : null;

/** Pool to use for car_bookings: TRANSPORT_DATABASE_URL if set (same DB as main app), else default pool. */
export function getCarBookingsPool(): pg.Pool {
  return transportPool ?? pool;
}

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
