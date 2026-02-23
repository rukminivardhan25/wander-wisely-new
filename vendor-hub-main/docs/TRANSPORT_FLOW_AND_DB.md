# Transport listing flow: from adding a listing to viewing a bus

This document describes step-by-step what happens from creating a transport listing through to viewing a single bus, and how the database tables are used.

---

## 1. Database tables involved

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **vendors** | Logged-in operator (one per account) | `id`, `email`, password hash |
| **listings** | One “business” or service offering | `id`, `vendor_id`, `type` (= `'transport'`), `name`, `status` |
| **buses** | Fleet: each row = one physical bus | `id`, `listing_id`, `name`, **`registration_number`** (unique per listing), `bus_number`, `bus_type`, `ac_type`, `manufacturer`, `model`, `layout_type`, `rows`, `left_cols`, `right_cols`, `total_seats`, **`base_price_per_seat_cents`**, `status`, amenities, `photo_url` |
| **drivers** | Drivers for this listing; linked to a bus | `id`, `listing_id`, **`bus_id`** (which bus), `name`, `phone`, `license_no` |
| **routes** | Route (from → to); linked to a bus | `id`, `listing_id`, **`bus_id`** (which bus), `from_place`, `to_place`, `distance_km`, `duration_minutes`, **`price_per_seat_cents`** |
| **bus_schedules** | When this bus runs (time, days, route) | `id`, **`bus_id`**, **`route_id`** (required at API level), `start_date`, `end_date`, `departure_time`, `arrival_time`, `mon`–`sun`, `price_override_cents`, `seat_availability`, `status` |

**Uniqueness:** Within a listing, a bus is uniquely identified by **`registration_number`** (enforced by unique index on `(listing_id, lower(trim(registration_number)))`). Drivers and routes are linked to a bus via **`bus_id`** (UUID of the bus row).

**Data integrity (enforced in backend):**
1. `registration_number` unique per listing.
2. `drivers.bus_id` references an existing bus (or null).
3. `routes.bus_id` references an existing bus (or null).
4. `bus_schedules.bus_id` required.
5. `bus_schedules.route_id` required when creating a schedule (API validation).

---

## 2. End-to-end flow

### Step A: Add a new transport listing

- **Where:** Add Listing (or similar) → choose type **Transport**.
- **API:** `POST /api/listings` with body e.g. `{ type: "transport", name: "Orange Travels", ... }`.
- **DB:** Inserts one row into **`listings`** with `vendor_id` (from JWT), `type = 'transport'`, `name`, etc. Returns `id`.
- **Next:** App navigates to **`/listings/{listingId}/transport`** (the fleet/setup page).

---

### Step B: Fleet page – Driver Info tab

- **URL:** `/listings/:listingId/transport` (no `?view=1` = edit/setup mode).
- **Load:**  
  - `GET /api/listings/:listingId` → **listings** (name, type, etc.).  
  - `GET /api/listings/:listingId/buses` → **buses** (for “Assign to bus” dropdown).  
  - `GET /api/listings/:listingId/drivers` → **drivers**.  
  - `GET /api/listings/:listingId/routes` → **routes**.
- **Add driver:** User enters name, phone, license and optionally chooses a bus (by **registration number** in the dropdown).
- **API:** `POST /api/listings/:listingId/drivers` with `name`, `phone`, `license_no`, **`bus_id`** (optional).
- **DB:** Inserts one row into **`drivers`** with `listing_id`, `bus_id` (if chosen), `name`, `phone`, `license_no`.
- **Reassign driver:** In “Saved drivers · Assign to bus”, user can change **`bus_id`** via `PATCH /api/listings/:listingId/drivers/:driverId` with `{ bus_id }`. **`drivers`** row is updated.

---

### Step C: Fleet page – Fleet tab (add bus)

- **Add bus:** User fills bus name, **registration number (required)**, bus number, type, AC, manufacturer, model, layout, amenities, base price, etc.
- **API:** `POST /api/listings/:listingId/buses` with all bus fields.
- **DB:**  
  - Backend checks no other bus in this listing has the same **registration_number** (trimmed, case-insensitive).  
  - Inserts one row into **`buses`** with `listing_id`, `name`, **`registration_number`**, `bus_number`, `bus_type`, `ac_type`, layout columns, `total_seats`, **`base_price_per_seat_cents`**, `status`, amenities, etc.  
  - Unique index on `(listing_id, lower(trim(registration_number)))` prevents duplicate registration per listing.
- **Edit bus:** `PATCH /api/listings/:listingId/buses/:busId` updates that row in **`buses`** (same duplicate check if `registration_number` is changed).

---

### Step D: Fleet page – Routes tab

- **Add route:** User enters from, to, distance, duration, price per seat and optionally assigns to a bus (by registration number).
- **API:** `POST /api/listings/:listingId/routes` with `from_place`, `to_place`, `distance_km`, `duration_minutes`, `price_per_seat_cents`, **`bus_id`** (optional).
- **DB:** Inserts one row into **`routes`** with `listing_id`, **`bus_id`**, `from_place`, `to_place`, **`price_per_seat_cents`**, etc.
- **Change route price (Pricing tab):** `PATCH /api/listings/:listingId/routes/:routeId` with `{ price_per_seat_cents }` updates that **`routes`** row.

---

### Step E: Fleet page – Pricing tab

- **Display:** Shows routes (from listing’s **`routes`**) and their **`price_per_seat_cents`** (from **`routes`** table).
- **Update price:** `PATCH /api/listings/:listingId/routes/:routeId` with `price_per_seat_cents` → updates **`routes`**.  
- Base price per seat is stored on the **bus** (**`buses.base_price_per_seat_cents`**); it is edited on the **bus detail page** (see below), not on this Pricing tab for the whole listing.

---

### Step F: My Listings → open this listing (eye icon)

- **Where:** Listings page → user clicks **eye** on a transport listing.
- **Navigation:** Goes to **`/listings/:listingId/transport?view=1`** (view-only fleet).
- **Load:** Same as Step B: `GET listing`, `GET buses`, `GET drivers`, `GET routes` (only **listings**, **buses**, **drivers**, **routes** are read; no schedules yet).
- **UI:** Fleet table: one row per **bus** (from **`buses`**): Bus Name, **Registered Number** (`registration_number`), Bus Number, Status, **Eye** (view bus), **Edit** (pencil) — both link to that bus’s detail page. No driver/route/pricing columns on this table.

---

### Step G: Click eye or edit on a bus row → Bus detail page

- **URL:** `/listings/:listingId/transport/bus/:busId`.
- **Load (single bus + only data for this bus; backend filtering, no frontend mix):**
  - `GET /api/listings/:listingId/buses/:busId` → one row from **`buses`** (name, registration_number, layout, **base_price_per_seat_cents**, amenities, status, etc.).
  - `GET /api/listings/:listingId` → listing name.
  - `GET /api/listings/:listingId/buses/:busId/drivers` → **`drivers`** where **`listing_id` and `bus_id = busId`** (backend filter).
  - `GET /api/listings/:listingId/buses/:busId/routes` → **`routes`** where **`listing_id` and `bus_id = busId`** (backend filter).
  - `GET /api/listings/:listingId/buses/:busId/schedules` → **`bus_schedules`** where **`bus_schedules.bus_id = busId** (with route join for display).
- **UI:**
  - **Bus information:** From **`buses`** (editable; PATCH same table).
  - **Drivers:** Only drivers with **`drivers.bus_id = this bus`**; add driver → `POST drivers` with **`bus_id = this bus`**; edit → `PATCH drivers/:id` (name, phone, license_no); remove → `PATCH drivers/:id` with `bus_id: null` or delete.
  - **Routes:** Only routes with **`routes.bus_id = this bus`**; add route → `POST routes` with **`bus_id = this bus`**; edit → `PATCH routes/:id`; remove → `PATCH routes/:id` with `bus_id: null`.
  - **Payment / Pricing:** **Base price** from **`buses.base_price_per_seat_cents`** (save via PATCH bus). **Route-wise price** from **`routes.price_per_seat_cents`** for each route of this bus (save via PATCH route).
  - **Schedules:** From **`bus_schedules`** for this **`bus_id`**; **`route_id`** is required when creating a schedule (dropdown of this bus’s routes). Add → `POST .../buses/:busId/schedules` (body must include **`route_id`**); delete → `DELETE .../buses/:busId/schedules/:scheduleId`.

---

## 3. Summary diagram (tables and links)

```
vendors (1) ──< listings (1 per transport “business”)
                    │
                    ├──< buses (many; unique registration_number per listing)
                    │       │
                    │       ├── drivers.bus_id  → “drivers for this bus”
                    │       ├── routes.bus_id   → “routes for this bus”
                    │       └── bus_schedules.bus_id (+ optional route_id) → “when this bus runs”
                    │
                    ├──< drivers (listing_id + optional bus_id)
                    └──< routes (listing_id + optional bus_id)
```

- **Listing** = one transport operator.
- **Bus** = one vehicle; identified by **registration_number** within the listing; has **base_price_per_seat_cents**.
- **Driver** = belongs to listing and optionally to **one bus** (**bus_id**).
- **Route** = belongs to listing and optionally to **one bus** (**bus_id**); has **price_per_seat_cents** for that bus on that route.
- **Bus schedule** = one row in **bus_schedules** for a **bus** and optionally a **route**; stores times, days, dates.

From “adding listing” to “seeing a bus”: you create the **listings** row, then add **buses** (with unique registration), then add **drivers** and **routes** and set their **bus_id** so they belong to a specific bus. When you open “My Listings” and click the listing eye you see the **buses** table; when you click a bus eye you see that bus’s row from **buses** plus all **drivers** and **routes** with that **bus_id**, plus **bus_schedules** for that bus.

---

## 4. Bus-scoped API endpoints (backend filtering)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings/:listingId/buses/:busId` | Single bus row |
| GET | `/api/listings/:listingId/buses/:busId/drivers` | Drivers where `bus_id = busId` (backend filter) |
| GET | `/api/listings/:listingId/buses/:busId/routes` | Routes where `bus_id = busId` (backend filter) |
| GET | `/api/listings/:listingId/buses/:busId/schedules` | Schedules where `bus_schedules.bus_id = busId` |
| POST | `.../buses/:busId/schedules` | Create schedule (body must include **route_id**) |
| DELETE | `.../buses/:busId/schedules/:scheduleId` | Delete schedule |

Creating/updating drivers and routes still uses listing-level endpoints (`POST/PATCH .../drivers`, `.../routes`) with **`bus_id`** in the body so they are assigned to the correct bus.
