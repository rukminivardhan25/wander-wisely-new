# Flight search on the user side (Wanderlust)

When users search for flights on the main app (Wanderlust), the frontend calls **`/api/flights/search`** on the **main app backend** (e.g. `backend` in this repo). That endpoint queries the database for `flight_schedules`, `flight_routes`, `flights`, `listings`, and `flight_bookings`.

## Why you see 503 / 500 on user side

- The main app backend uses **`DATABASE_URL`** only (single database) for flight search.
- If that database does **not** have the flight tables (`flights`, `flight_routes`, `flight_schedules`, and optionally `flight_bookings`), the query fails and the API returns **503** or **500**, so the user side shows errors and no results.

## Fix: use one database and run flight schema

The app uses **one database URL** (`DATABASE_URL`) for everything (app data, flights, buses, cars, bookings).

1. **Use the same `DATABASE_URL` everywhere**  
   Set **`DATABASE_URL`** in both the main app backend (`backend/.env`) and vendor-hub backend (`vendor-hub-main/backend/.env`) to the **same** PostgreSQL URL (same host, database, user).

2. **Run the flight schema on that database**  
   From vendor-hub: `npm run db:flight` (or run the flight schema migrations on that DB). This creates `flights`, `flight_routes`, `flight_schedules`, and related tables.

3. **Restart both backends** after changing `.env`.

Then **flight search on the user side** uses that same DB; 503/500 from missing tables should stop.
