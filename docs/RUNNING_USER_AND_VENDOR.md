# Running User App and Vendor Hub Together

Use **different ports** so all four processes can run at once.

## Ports

| Service            | Port | URL                      |
|--------------------|------|--------------------------|
| User frontend      | 8080 | http://localhost:8080    |
| User backend (API) | 3001 | http://localhost:3001     |
| Vendor frontend    | 8081 | http://localhost:8081     |
| Vendor backend     | 3002 | http://localhost:3002     |

## Option 1: Run all four from the project root

From the **project root** (`wander-wisely-main`):

```bash
npm install
cd backend && npm install && cd ..
cd vendor-hub-main && npm install && cd ..
cd vendor-hub-main/backend && npm install && cd ..
npm run dev:all
```

This starts user frontend, user backend, vendor frontend, and vendor backend in one terminal (with `concurrently`).

## Option 2: Run each in its own terminal

**Terminal 1 – User frontend**

```bash
npm run dev
```

**Terminal 2 – User backend**

```bash
cd backend
npm run dev
```

**Terminal 3 – Vendor frontend**

```bash
cd vendor-hub-main
npm run dev
```

**Terminal 4 – Vendor backend**

```bash
cd vendor-hub-main/backend
npm run dev
```

## First-time setup

- **User backend:** `backend/.env` with `DATABASE_URL`, `JWT_SECRET`, optional `PORT=3001`. Run `npm run db:init` in `backend/` to apply schema.
- **Vendor backend:** `vendor-hub-main/backend/.env` with `DATABASE_URL`, `JWT_SECRET`, optional `PORT=3002`. Run schema from `vendor-hub-main/backend/` if needed.

Backend dev scripts use `cross-env` so `PORT` is set correctly on Windows (3001 for user API, 3002 for vendor API) even if `.env` is missing.

## Vendor Bookings: user bookings visible to vendor

When a user books bus seats in the main app, the vendor’s **Bookings** page should show updated **Seats Booked** and seat layout (booked vs available). This requires:

1. **Main backend:** Schema `008_transport_bookings_bus_id.sql` adds `bus_id` and `listing_id` to `transport_bookings`. Run `npm run db:init` in `backend/` (or apply `008_transport_bookings_bus_id.sql` manually) so new bookings can store `bus_id`.
2. **User app:** The booking flow passes `busId` (and `listingId`) from the bus search to the success page and into `POST /api/bookings`, so each booking is linked to a bus.
3. **Vendor backend:** To show bookings per bus, the vendor API calls the main app’s **GET /api/bookings/for-bus?bus_id=...&date=...**. Set **`MAIN_APP_API_URL`** in `vendor-hub-main/backend/.env` to the user API base URL (e.g. `http://localhost:3001`). If unset, it defaults to `http://localhost:3001`.

4. **User seat picker:** The “Select seats” modal loads already‑booked seats from **GET /api/bookings/booked-seats?bus_id=...&date=...** so those seats appear greyed out (unavailable). Bookings must have `bus_id` set (new bookings do; older ones may need a backfill).

5. **Backfilling old bookings:** If you have rows in `transport_bookings` that were created before the `bus_id` column existed, run from `backend/`:  
   `npx tsx scripts/backfill-transport-booking-bus-ids.ts`  
   (Requires `DATABASE_URL` and `TRANSPORT_DATABASE_URL`.) This matches by `listing_name` + `bus_name` and sets `bus_id` and `listing_id` so those bookings show on the vendor Bookings page and in the user seat picker.
