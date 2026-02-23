# Plan: Dynamic “My Bookings” (User Side) Using Vendor Transport Data

**Goal:** Make the “My Bookings” section on the user side dynamic by showing real bus/transport data from vendors. No UI or code changes unless you explicitly ask for them later.

---

## 1. Current state

### User app (wander-wisely-main)

- **My Trip → Bookings tab:** “My Bookings” shows a **hardcoded** list of 3 cards:
  - Train: Hyderabad → Chandigarh, Day 1, Confirmed
  - Hotel: Hotel in Manali, Day 1–5, Pending
  - Experience: Rohtang Pass Tour, Day 3, Not booked
- Each card: icon, title, sub (type · day), status, “View ticket” button.
- **Booking marketplace** (`/my-trip/book`): Bus tab uses **MOCK_BUSES** (static). No API call to vendor transport.
- **API usage:** User app talks only to **main backend** (port 3001): `/api/trips/active`, `/api/trips/:id`, `/api/trips/:id/expenses`, etc. No bookings API, no transport API.

### Vendor hub (vendor-hub-main)

- **Transport flow (already in place):** Listings (type = transport) → Buses → Routes → Drivers → Bus schedules.
- **Tables (see `vendor-hub-main/docs/TRANSPORT_FLOW_AND_DB.md`):**
  - `listings`, `buses`, `routes`, `drivers`, `bus_schedules`
  - `vendor_bookings`: generic customer bookings per listing (listing_id, customer_name, customer_email, status, payment_status, amount_cents, guests, booked_at, booked_for_date, notes). **No user_id, no bus/route/schedule link.**
- **APIs:** All under vendor auth (Bearer token for operators). Endpoints: listings, buses, routes, drivers, bus_schedules (per listing/bus). **No public or user-facing “search buses” or “my bookings” API.**

### Main backend (wander-wisely-main/backend)

- **Trips:** users, trips, itineraries, expenses. **No bookings table**, no transport or vendor data.

---

## 2. Gap

- Vendors **do** share transport data (buses, routes, schedules) in the **vendor hub DB**, but the **user app has no way to read it**.
- “My Bookings” has **no data source** today; it’s static.
- To show **dynamic** bus bookings we need:
  1. A way for the **user app** to get **transport options** (from vendors) and, later, to **create** a booking.
  2. A way for the **user app** to get **“my bookings”** (list of the logged-in user’s bookings, including bus).

---

## 3. Architecture choice

- **Single entrypoint for user app:** The user app should keep calling only the **main backend** (no direct calls to the vendor hub from the frontend). So:
  - **Main backend** exposes e.g. `GET /api/bookings` (and optionally transport search) for the user app.
  - Transport and booking data can be provided by either:
    - **Shared DB:** Main backend and vendor hub use the same database; main backend reads (and later writes) transport/bookings tables; or
    - **Backend-to-backend:** Main backend calls the vendor-hub API (new endpoints) to get transport data and bookings for a user.

---

## 4. Recommended phases (no UI/code changes in this plan)

### Phase 1 – Main backend can “see” vendor transport data

- **If shared DB:** Main backend connects to the same DB as vendor hub and has read access to `listings` (type = transport), `buses`, `routes`, `bus_schedules` (and optionally `vendor_bookings`). No new vendor-hub HTTP API needed for read.
- **If separate DBs:** Vendor hub exposes a **read-only** (or internal) API that main backend can call, e.g.:
  - `GET /api/public/transport/listings` or `GET /api/public/transport/search?from=&to=&date=` returning transport options (listings + buses + routes + schedules). Auth: service-to-service token or allowlisted main-backend IP/origin.
- **Outcome:** Main backend can implement something like `GET /api/transport/search?from=&to=&date=` that returns bus options for the user app (data sourced from vendor hub DB or vendor-hub API). **No UI change**; only backend and data wiring.

### Phase 2 – “My Bookings” data source for the user

- **Booking identity:** Today `vendor_bookings` has no `user_id` (only customer_name, customer_email). To show “my bookings” for the logged-in user you need one of:
  - Add **user_id** (or **trip_id**) to `vendor_bookings` and ensure it’s set when a booking is created from the user app; or
  - Match by **customer_email** to the user’s email (fragile if user changes email).
- **Recommended:** Add **user_id** (and optionally **trip_id**) to `vendor_bookings` (or to a separate `transport_bookings` table if you want to keep transport-specific fields separate). For bus, also store at least **listing_id**, and optionally **bus_id**, **route_id**, **schedule_id**, **seats** so “View ticket” and display can show the right bus/route.
- **Main backend:** New endpoint, e.g. **GET /api/bookings** (or **GET /api/trips/:tripId/bookings**), that:
  - Uses the logged-in user’s id (from JWT).
  - Returns list of bookings for that user (and optionally filtered by trip_id). Data from shared DB or from vendor-hub API (vendor hub would need an endpoint like “bookings by user_id” that main backend calls).
- **User app (when you implement):** Replace the hardcoded array in My Trip → Bookings with a call to this endpoint. Map API response to the **existing card layout**: icon (Train/Bus/Hotel/Experience), title (e.g. “Hyderabad → Chandigarh” or listing/bus name), sub (e.g. “Bus · Day 1”), status, “View ticket”. **No change to the card design** unless you ask for it.

### Phase 3 – Create bus booking (when user books from marketplace)

- When the user selects a bus (and optionally route/schedule/seats) and confirms (e.g. “Continue to payment” or “Book”):
  - **Option A:** User app → **main backend** → main backend writes to shared DB (`vendor_bookings` or transport_bookings) with user_id, trip_id, listing_id, bus_id, route_id, schedule_id, seats, etc.
  - **Option B:** User app → main backend → main backend calls **vendor hub** `POST /api/bookings` (or similar) with the same payload; vendor hub writes to its DB. Vendor hub would need to accept a “user_id” or “trip_id” from the main backend (trusted).
- **Vendor hub:** Today the vendor hub backend **does not mount** `/api/bookings` in its index (only auth, listings, upload). So either:
  - Mount the existing `bookings` route and extend it (e.g. create booking from user/trip and store user_id/trip_id), or
  - Keep bookings creation in the main backend only (if using shared DB).
- **Outcome:** After a user completes a bus booking, it appears in “My Bookings” via the Phase 2 endpoint. Again, **no UI change** beyond wiring to real data.

---

## 5. Data shape (for reference; no code change in this plan)

- **Existing My Bookings card (conceptual):**  
  `{ icon, title, sub, status }`  
  e.g. Bus icon, “Hyderabad → Chandigarh”, “Bus · Day 1”, “Confirmed”.

- **Suggested API response for GET /api/bookings (or /api/trips/:tripId/bookings):**  
  Array of:  
  `{ id, type: "bus"|"train"|"hotel"|"experience"|..., title, sub, status, listing_id?, bus_id?, route_id?, ... }`  
  so the existing card can render without UI change: same icon by type, same title/sub/status/“View ticket”.

- **vendor_bookings today:**  
  No `user_id`, `trip_id`, `bus_id`, `route_id`, `schedule_id`. Extend this table (or add a transport-specific table) when you implement Phase 2/3.

---

## 6. Summary table

| What | Where | Action (when you implement) |
|------|--------|-----------------------------|
| Transport data (buses, routes, schedules) | Vendor hub DB / API | Main backend reads (shared DB or HTTP to vendor hub). Expose e.g. GET /api/transport/search for user app. |
| “My Bookings” list | User app (My Trip) | Main backend exposes GET /api/bookings (or per-trip) from vendor_bookings (or transport table) filtered by user_id. User app replaces hardcoded array with API; keep same card UI. |
| Create bus booking | User app → main backend | Main backend creates row in vendor_bookings (or transport table) with user_id, trip_id, bus/route/schedule; or main backend calls vendor hub POST booking. |
| vendor_bookings schema | Vendor hub DB | Add user_id, trip_id; add bus_id, route_id, schedule_id, seats (or use a separate transport_bookings table). |
| Vendor hub API | Vendor hub backend | Optionally: public/internal “transport search” and “bookings by user_id”; mount and extend bookings route if creation goes through vendor hub. |

---

## 7. What stays unchanged (unless you say otherwise)

- **UI:** No change to the My Bookings card layout, tabs, or Booking Marketplace layout.
- **Vendor hub UI:** No change to Transport Listing, Fleet, Bus info, Driver Info, Routes and Pricing, or Bus detail.
- **User app:** No new screens or components in this plan; only backend and data wiring, then swapping static data for API data in the existing “My Bookings” block.

Once you’re ready to implement, start with Phase 1 (main backend can read transport data), then Phase 2 (GET /api/bookings + schema for user_id/trip_id and transport fields), then Phase 3 (create booking from marketplace). If you want, we can break Phase 1 into concrete steps (e.g. shared DB vs HTTP, exact endpoint shapes) before any code is written.
