# Car booking with a single database

Car bookings now use the **same single database** as bus bookings (`transport_bookings`). No second DB or `TRANSPORT_DATABASE_URL` is used for car bookings.

- **Main app:** writes `car_bookings` with the same pool as `transport_bookings` (DATABASE_URL only).
- **Vendor hub:** reads `car_bookings` with the same pool as `listings` (DATABASE_URL only).

For the vendor to see car requests, **both backends must use the exact same DATABASE_URL**.

## Required setup

1. **Same DATABASE_URL in both backends**
   - **Main app:** `backend/.env` → `DATABASE_URL=postgresql://...`
   - **Vendor hub:** `vendor-hub-main/backend/.env` → `DATABASE_URL=postgresql://...`
   - These two values must be **identical** (same host, port, database name, user).

2. **Single database only**
   - Car booking create/list/accept/reject use only **DATABASE_URL** in both apps. There is no second DB URL.

3. **Schema**
   - The database must have the vendor-hub schema applied (including `listings`, `cars`, `car_operating_areas`, `car_bookings`). Run vendor-hub migrations (e.g. 002, 026, 028, 031, 032) on that DB.

## Verify on startup

When you start each backend, check the logs:

- **Main app** (port 3001): you should see  
  `[DB] Main app DATABASE_URL ...`  
  and  
  `[DB] Single database (DATABASE_URL) used for app and transport ...`

- **Vendor hub** (port 3002): you should see  
  `[DB] Vendor hub DATABASE_URL ...`

The two DATABASE_URL lines (with password redacted) must refer to the **same** database (same host and database name). If they differ, the vendor will not see bookings.

## Debug endpoint

**Vendor hub** exposes:

- **GET** `http://localhost:3002/api/debug/all-car-bookings`

This returns up to 50 `car_bookings` rows with **no filters** (no listing_id, no vendor). Use it to confirm:

- If the table is empty → the main app is writing to a **different** database, or the create-booking API is failing.
- If rows appear here but not on the Bookings → Car page → the issue is **filtering** (e.g. listing_id or vendor ownership).

## After changing .env

Restart **both** backends after changing `DATABASE_URL`.
