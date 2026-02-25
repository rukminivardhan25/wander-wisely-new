# Car booking system – databases, features, and interactions (detailed)

This document describes how car booking works end-to-end: which databases are used, which features appear where, and why the vendor might not see requests.

---

## 1. Databases involved

### 1.1 Two backends, one shared database for car data

| Backend | Port | Purpose |
|--------|------|--------|
| **Main app** (Wander Wisely) | **3001** | User app API: auth, trips, **car search**, **create car booking**, pay, cancel. |
| **Vendor hub** | **3002** | Vendor app API: listings, cars, schedules, **list car bookings**, accept/reject. |

For **car bookings to appear on the vendor side**, the **same PostgreSQL database** must be used for:

- **listings** (vendor’s transport listing)
- **cars** (vendor’s cars)
- **car_operating_areas** (cities/routes and dates)
- **car_bookings** (user booking requests)

That database is usually the **vendor hub database**. The main app must **write** car bookings into it; the vendor hub **reads** from it.

### 1.2 How each backend chooses the database

**Main app** (`backend/.env`):

- **DATABASE_URL** – main app’s own DB (users, trips, etc.).
- **TRANSPORT_DATABASE_URL** – optional. When set, this is used for:
  - **GET /api/transport/available-cars** (search cars)
  - **POST /api/car-bookings** (create booking)
  - **GET/PATCH /api/car-bookings/...** (list, pay, cancel)

If **TRANSPORT_DATABASE_URL** is **not set**, the main app uses **DATABASE_URL** for the above. So car bookings are written to whichever of these two URLs is in use (transport pool).

**Vendor hub** (`vendor-hub-main/backend/.env`):

- **DATABASE_URL** – vendor hub’s DB (listings, vendors, cars, car_operating_areas, etc.).
- **TRANSPORT_DATABASE_URL** – optional. When set, **car_bookings** are read (and accept/reject updated) from this pool. When **not set**, vendor hub uses **DATABASE_URL** for car bookings.

So:

- **Main app** writes `car_bookings` to: **TRANSPORT_DATABASE_URL** if set, else **DATABASE_URL**.
- **Vendor hub** reads `car_bookings` from: **TRANSPORT_DATABASE_URL** if set, else **DATABASE_URL**.

For the vendor to see bookings, those two must point to the **same database** (and that DB must contain `listings`, `cars`, `car_operating_areas`, and `car_bookings`).

### 1.3 Why the vendor cannot see them (typical case)

- Main app has **TRANSPORT_DATABASE_URL** unset → writes to **main app DATABASE_URL** (DB A).
- Vendor hub uses **DATABASE_URL** (DB B).
- DB A ≠ DB B → vendor hub never sees rows in DB A.

**Fix:** Set **main app** `TRANSPORT_DATABASE_URL` = **vendor hub** `DATABASE_URL` (same URL). Then the main app writes into the vendor hub’s DB, and the vendor hub (using its DATABASE_URL or the same URL in TRANSPORT_DATABASE_URL) will see the same `car_bookings` rows.

---

## 2. Database tables (car booking)

All of these must exist in the **same** database (the one used for transport / vendor hub).

| Table | Purpose |
|-------|--------|
| **listings** | Vendor’s business/listing; `type = 'transport'` for transport listings. Referenced by `car_bookings.listing_id`. |
| **cars** | Cars under a listing (name, registration, type, seats, etc.). Referenced by `car_bookings.car_id`. |
| **car_operating_areas** | Where a car runs: local (city + dates/times) or intercity (from_city → to_city + from_date, to_date). Referenced by `car_bookings.area_id`. |
| **car_bookings** | Each row = one user booking request: user_id, listing_id, car_id, area_id, booking_type (local/intercity), travel_date, passengers, status, etc. |

**car_bookings** has foreign keys to **listings**, **cars**, and **car_operating_areas**, so it must live in the same DB as them.

**car_bookings.status** values:

- `pending_vendor` – just created; vendor can Accept / Reject
- `approved_awaiting_payment` – vendor accepted; user can Pay
- `confirmed` – user paid; OTP set
- `rejected` – vendor rejected or user cancelled

---

## 3. User side: flow and features

### 3.1 Where it happens

- **App:** Main app (e.g. http://localhost:8080).
- **Page:** My Trip → Book → **Transport** → **Car Rental** (or similar).

### 3.2 Steps and interactions

1. **Choose type:** Local (one city, today + current time) or Intercity (from city → to city, date, passengers).
2. **Search:** User fills city/route and date/passengers and clicks Search.
   - **API:** **GET** `http://localhost:3001/api/transport/available-cars?type=local|intercity&...`
   - **Backend:** `backend/src/routes/transport.ts` → **getTransportPool()** → reads **cars** + **car_operating_areas** (and listings) from the transport DB.
3. **List shown:** “Available cars” (e.g. innova, sedan, 4 seats, price). User can **View details** (sidebar) or **Book**.
4. **Book:** User clicks **Book**.
   - **API:** **POST** `http://localhost:3001/api/car-bookings` with body: `listingId`, `carId`, `areaId`, `bookingType`, `travelDate`, `passengers`, optional `fromCity`/`toCity` or `city`/`pickupPoint`/`dropPoint`, etc.
   - **Backend:** `backend/src/routes/carBookings.ts` → **getTransportPool()** → **INSERT** into **car_bookings** (status `pending_vendor`).
5. **After Book:** UI shows “Booking request sent” and two actions:
   - **Check status** – **GET** `http://localhost:3001/api/car-bookings/:id` (to see if vendor accepted).
   - **Cancel booking** – **PATCH** `http://localhost:3001/api/car-bookings/:id/cancel` (only while `pending_vendor`).
6. **When vendor accepts:** UI shows “Vendor accepted – Pay now”. User clicks **Pay now**.
   - **API:** **PATCH** `http://localhost:3001/api/car-bookings/:id/pay`
   - **Backend:** Updates **car_bookings** to `status = 'confirmed'`, sets **otp**, **paid_at**.
7. **After payment:** UI shows “Booking confirmed” and the **OTP** (and ride details).

All of the above **car** APIs on the main app use **getTransportPool()** → so they all use the same DB (TRANSPORT_DATABASE_URL or DATABASE_URL).

---

## 4. Vendor side: flow and features

### 4.1 Where it happens

- **App:** Vendor hub (e.g. http://localhost:8081).
- **Page:** Left menu → **Bookings** → top tabs: **Transport** → sub-tab **Car**.

### 4.2 What the vendor sees (and which APIs)

1. **Date picker** – Vendor selects a date (e.g. 27/02/2026).
2. **Scheduled for [date]** – List of cars that have at least one operating area covering that date (local: any day in range; intercity: start date only).
   - **API:** For each transport listing: **GET** `http://localhost:3002/api/listings/:listingId/scheduled-cars?date=YYYY-MM-DD`
   - **Backend:** `vendor-hub-main/backend/src/routes/scheduledCars.ts` → **query()** (vendor hub default pool) → reads **cars** + **car_operating_areas**.
   - **UI:** Cards with car name, listing, route/city, date range, price/time, “View Details”.
3. **Booking requests** – Table of user requests for the selected date.
   - **API:** For each transport listing: **GET** `http://localhost:3002/api/listings/:listingId/car-bookings`
   - **Backend:** `vendor-hub-main/backend/src/routes/carBookings.ts` → **getCarBookingsPool()** → **SELECT** from **car_bookings** (JOIN cars) WHERE `listing_id = :listingId`. No date filter in API; frontend filters by selected date.
   - **UI:** Rows: Ref, Car, Type, Route, Date, Passengers, Amount, **Status**, **Accept** / **Reject** (for `pending_vendor`).
4. **View Details (car card or sidebar)** – Opens a right sidebar for one car/schedule.
   - **Content:** Schedule & date (viewing date, date range, route, type, time, price), **Booking status** (counts), **Pending requests** (table with Accept/Reject), **Other requests** (by status).
   - **Data:** Same **car-bookings** list as above, filtered on the frontend by that car and selected date.

### 4.3 Vendor actions

- **Accept:** **PATCH** `http://localhost:3002/api/listings/:listingId/car-bookings/:bookingId/accept` → sets **car_bookings.status** = `approved_awaiting_payment`.
- **Reject:** **PATCH** `http://localhost:3002/api/listings/:listingId/car-bookings/:bookingId/reject` → sets **car_bookings.status** = `rejected`, optional **rejected_reason**.

Accept/Reject use **getCarBookingsPool()** in the vendor hub, so they update the same DB from which the vendor hub reads **car_bookings**.

---

## 5. Summary: one DB for “transport” data

- **Vendor hub** creates: **listings** (transport), **cars**, **car_operating_areas** in its **DATABASE_URL** (and runs migrations 026, 028, 031, 032 there).
- **car_bookings** must live in that **same** DB (because of FKs to listings, cars, car_operating_areas).
- **Main app** must **write** car bookings into that same DB:
  - Set **main app** `TRANSPORT_DATABASE_URL` = **vendor hub** `DATABASE_URL`.
- **Vendor hub** already reads **car_bookings** from its default DB (or from TRANSPORT_DATABASE_URL if you set it to the same URL). No change needed on vendor hub if it uses a single DB.

After setting **main app** `TRANSPORT_DATABASE_URL` to the vendor hub DB URL and restarting the main app backend, new car booking requests will appear under **Vendor Hub → Bookings → Transport → Car** (in the “Booking requests” table and inside “View Details” for the matching car/date).

---

## 6. Quick reference: APIs and DB usage

| Who | API | Backend | DB used |
|-----|-----|---------|--------|
| User | GET /api/transport/available-cars | Main app (3001) | getTransportPool() |
| User | POST /api/car-bookings | Main app (3001) | getTransportPool() |
| User | GET/PATCH /api/car-bookings/:id, /pay, /cancel | Main app (3001) | getTransportPool() |
| Vendor | GET /api/listings/:id/scheduled-cars | Vendor hub (3002) | query() (default pool) |
| Vendor | GET /api/listings/:id/car-bookings | Vendor hub (3002) | getCarBookingsPool() |
| Vendor | PATCH .../car-bookings/:id/accept | Vendor hub (3002) | getCarBookingsPool() |
| Vendor | PATCH .../car-bookings/:id/reject | Vendor hub (3002) | getCarBookingsPool() |

So: **main app** uses **getTransportPool()** for all car booking and car search; **vendor hub** uses **getCarBookingsPool()** for all **car_bookings** read/update. For the vendor to see requests, **getTransportPool()** (main app) and **getCarBookingsPool()** (vendor hub) must point to the **same database**.
