# Listings (Vendor Side) and Bookings (User Side) – Detailed Overview

This document describes how **listings** work on the **vendor side** (Vendor Hub) and how **bookings** work (or are intended to work) on the **user side** (Wander Wisely app).

---

# Part 1: Listings on the Vendor Side

## 1.1 Overview

- **Vendor Hub** is the operator dashboard (frontend: typically `http://localhost:8080` or `http://localhost:8081`; backend: `http://localhost:3002`).
- Vendors sign up / sign in via Vendor Hub and create **listings**. A listing is one business or service (e.g. a transport company, hotel, restaurant).
- For **transport** listings, the vendor then sets up **buses**, **routes**, **drivers**, and **schedules** for that listing.
- All listing data lives in the **Vendor Hub backend** database. The user app does **not** call the Vendor Hub API directly; it only talks to the main backend (port 3001).

---

## 1.2 Database Tables (Vendor Side)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **vendors** | Vendor (operator) account | `id`, `email`, `name`, `phone`, password hash |
| **listings** | One business / service | `id`, `vendor_id`, `type`, `name`, `status`, `tagline`, `description`, `address`, `city`, `cover_image_url`, etc. |
| **buses** | One physical bus per listing | `id`, `listing_id`, `name`, `registration_number` (unique per listing), `bus_number`, `bus_type`, `ac_type`, `total_seats`, `base_price_per_seat_cents`, `status`, amenities, etc. |
| **drivers** | Drivers; can be assigned to a bus | `id`, `listing_id`, `bus_id` (optional), `name`, `phone`, `license_no` |
| **routes** | Route (from → to); can be assigned to a bus | `id`, `listing_id`, `bus_id` (optional), `from_place`, `to_place`, `distance_km`, `duration_minutes`, `price_per_seat_cents` |
| **bus_schedules** | When a bus runs (time, days, route) | `id`, `bus_id`, `route_id`, `departure_time`, `arrival_time`, `start_date`, `end_date`, days of week, `price_override_cents`, `status` |
| **vendor_listings** (optional) | Links vendors to listings | `vendor_id`, `listing_id` – used if listings table has no `vendor_id` |
| **vendor_bookings** | Customer bookings for a listing | `id`, `listing_id`, `customer_name`, `customer_email`, `status`, `payment_status`, `amount_cents`, `guests`, `booked_at`, `booked_for_date`, `notes` |

**Note:** The listings route in code uses `listings.vendor_id`. Some schemas use `vendor_listings` as a join table instead; the bookings route expects `vendor_listings` to resolve which listings belong to a vendor.

---

## 1.3 Vendor UI Flow: From Sign-Up to Transport Setup

### Step 1: Vendor account

- **Sign up:** `POST /api/auth/signup` (name, email, phone, password) → creates row in **vendors**, returns JWT.
- **Sign in:** `POST /api/auth/signin` (email, password) → returns JWT. Frontend stores token and sends `Authorization: Bearer <token>` on all API calls.

### Step 2: My Listings

- **Page:** Vendor Hub → **My Listings** (e.g. `/listings`).
- **API:** `GET /api/listings` → returns all listings where `vendor_id = <from JWT>`.
- **UI:** Cards for each listing (name, type, status). For each **transport** listing there is a **“Manage Fleet”** button and a **“View”** button.
- **Actions:**
  - **+ Add Listing** → goes to Add Listing flow.
  - **Manage Fleet** → `/listings/:listingId/transport` (transport setup).
  - **View** → `/listings/:listingId/transport?view=1` (view-only fleet) or listing detail for non-transport.
  - **Delete** → `DELETE /api/listings/:id`.

### Step 3: Add Listing

- **Page:** **Add Listing** (`/add-listing`). Multi-step: Business Type → Basic Info → Location → Photos → Publish.
- **Business types:** restaurant, hotel, shop, **transport**, experience, rental, event, guide, emergency.
- **On submit (Save as Draft or Submit for Review):**
  - **API:** `POST /api/listings` with body: `{ name, type, status: "draft" | "pending_approval", description?, ... }`.
  - **DB:** Inserts one row into **listings** with `vendor_id` from JWT, `type`, `name`, `status`, etc.
  - **Response:** `{ id, name, type, status }`.
  - **If type is transport:** frontend navigates to **`/listings/:id/transport`** so the vendor can set up fleet immediately.
  - **Otherwise:** navigates to `/listings`.

### Step 4: Transport listing – Fleet / Bus info / Driver Info / Routes and Pricing

- **URL:** `/listings/:listingId/transport` (tabs: Fleet, Bus info, Driver Info, Routes and Pricing).
- **Data loading (on load):**
  - `GET /api/listings/:listingId` → single listing (name, type).
  - `GET /api/listings/:listingId/buses` → all buses for this listing.
  - `GET /api/listings/:listingId/drivers` → all drivers.
  - `GET /api/listings/:listingId/routes` → all routes.

**Fleet tab**

- Table: one row per **bus** (name, registration number, bus number, status). Actions: **Eye** (view bus detail), **Delete** (red trash).
- **Add bus / Add another bus** → opens Bus info tab with empty form; after save, goes to Driver Info (or Fleet).
- **Delete bus:** `DELETE /api/listings/:listingId/buses/:busId`.

**Bus info tab**

- Form: bus name, **registration number** (required), bus number, type, AC, manufacturer, model, layout (rows/cols), total seats, base price per seat, amenities, etc.
- **Save:** If editing → `PATCH /api/listings/:listingId/buses/:busId`. If new → `POST /api/listings/:listingId/buses`. Backend enforces unique `registration_number` per listing.

**Driver Info tab**

- No list of all drivers; only an **Add driver** form (name, phone, license, assign to bus dropdown).
- **Add driver:** `POST /api/listings/:listingId/drivers` with `name`, `phone`, `license_no`, `bus_id` (optional). After save, UI switches to Routes and Pricing.

**Routes and Pricing tab**

- Add route: from, to, distance, duration, **price per seat**, assign to bus (dropdown).
- **Save route:** `POST /api/listings/:listingId/routes` with `from_place`, `to_place`, `distance_km`, `duration_minutes`, `price_per_seat_cents`, `bus_id` (optional).
- When the flow is “complete” (e.g. at least one route), a **“Back to Fleet”** button sends the vendor back to the Fleet tab.

### Step 5: Bus detail page

- **URL:** `/listings/:listingId/transport/bus/:busId` (opened from Fleet table via Eye or from edit).
- **Load:**
  - `GET /api/listings/:listingId/buses/:busId` → one bus.
  - `GET /api/listings/:listingId` → listing name.
  - `GET /api/listings/:listingId/buses/:busId/drivers` → drivers for this bus only.
  - `GET /api/listings/:listingId/buses/:busId/routes` → routes for this bus only.
  - `GET /api/listings/:listingId/buses/:busId/schedules` → schedules for this bus.
- **UI:** Bus info card, drivers section, routes section, amenities, schedules (add/edit/delete). Add schedule requires selecting a **route** and can override price.

---

## 1.4 Vendor Hub API Endpoints (Listings and Transport)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/listings` | Vendor JWT | List my listings |
| GET | `/api/listings/:id` | Vendor JWT | Get one listing |
| POST | `/api/listings` | Vendor JWT | Create listing |
| PATCH | `/api/listings/:id` | Vendor JWT | Update listing |
| DELETE | `/api/listings/:id` | Vendor JWT | Delete listing |
| GET | `/api/listings/:listingId/buses` | Vendor JWT | List buses |
| GET | `/api/listings/:listingId/buses/:busId` | Vendor JWT | Get one bus |
| POST | `/api/listings/:listingId/buses` | Vendor JWT | Create bus |
| PATCH | `/api/listings/:listingId/buses/:busId` | Vendor JWT | Update bus |
| DELETE | `/api/listings/:listingId/buses/:busId` | Vendor JWT | Delete bus |
| GET | `/api/listings/:listingId/buses/:busId/drivers` | Vendor JWT | Drivers for this bus |
| GET | `/api/listings/:listingId/buses/:busId/routes` | Vendor JWT | Routes for this bus |
| GET | `/api/listings/:listingId/buses/:busId/schedules` | Vendor JWT | Schedules for this bus |
| POST | `/api/listings/:listingId/buses/:busId/schedules` | Vendor JWT | Create schedule (body: route_id, times, days, etc.) |
| DELETE | `.../schedules/:scheduleId` | Vendor JWT | Delete schedule |
| GET | `/api/listings/:listingId/drivers` | Vendor JWT | List drivers |
| POST | `/api/listings/:listingId/drivers` | Vendor JWT | Create driver |
| PATCH | `/api/listings/:listingId/drivers/:driverId` | Vendor JWT | Update driver (e.g. bus_id) |
| DELETE | `/api/listings/:listingId/drivers/:driverId` | Vendor JWT | Delete driver |
| GET | `/api/listings/:listingId/routes` | Vendor JWT | List routes |
| POST | `/api/listings/:listingId/routes` | Vendor JWT | Create route |
| PATCH | `/api/listings/:listingId/routes/:routeId` | Vendor JWT | Update route (e.g. price_per_seat_cents) |

---

## 1.5 Vendor Bookings (Vendor View)

- **Table:** `vendor_bookings` stores customer bookings per listing (customer_name, customer_email, status, payment_status, amount_cents, guests, booked_at, booked_for_date, notes). There is **no user_id** or **trip_id** in the current schema; no link to bus/route/schedule.
- **Backend route:** `vendor-hub-main/backend/src/routes/bookings.ts` implements:
  - `GET /api/bookings` – list bookings for the vendor’s listings (joins `vendor_bookings` with `vendor_listings` so only this vendor’s listings are included).
  - `GET /api/bookings/:id` – get one booking.
- **Mounting:** The Vendor Hub **backend index does not mount** `/api/bookings`; only `/api/auth`, `/api/listings`, and `/api/upload` are mounted. So the bookings API exists in code but is **not currently exposed** unless added to `app.use()` in `index.ts`.
- **Vendor Hub frontend:** The Bookings page (`/bookings`) uses **static/mock data** (e.g. a hardcoded `bookings` array), not the API.

---

# Part 2: Bookings on the User Side

## 2.1 Overview

- **User app** (Wander Wisely, e.g. `http://localhost:8081`) is used by travellers. They sign in with the **main backend** (port 3001), plan trips, and see **My Trip** with tabs: Bookings, Restaurants, Shopping, Emergency, Nearby.
- **“My Bookings”** is the section where the user expects to see their transport, stay, and experience bookings. Today it is **fully static**: a hardcoded array of three example cards (Train, Hotel, Experience). There is **no API** for user bookings and **no database table** for user-side bookings in the main backend.
- **Booking marketplace** (`/my-trip/book`) lets the user choose a category (Bus, Flight, Train, Hotel, etc.). For **Bus**, a “Search bookings” form (from, to, date, passengers) appears and a list of buses is shown – but the list is **MOCK_BUSES** (static). No call to Vendor Hub or main backend for real bus data.

---

## 2.2 User App Backend (Main Backend, Port 3001)

- **Database:** Used for **users**, **trips**, **itineraries**, **expenses**. No **bookings** table.
- **Trips:**
  - **List trips:** `GET /api/trips` → all trips for the logged-in user.
  - **Create trip:** `POST /api/trips` (origin, destination, days, budget, etc.).
  - **Generate plan:** `POST /api/trips/generate` → creates trip + AI-generated itineraries.
  - **Active trip:** `GET /api/trips/active` → the one trip with `status = 'active'` (one per user). Returns trip + itineraries. Used by My Trip and Booking Marketplace to get origin/destination.
  - **Activate trip:** `POST /api/trips/:id/activate` → sets that trip as active (and clears previous active).
- **Expenses:** `GET/POST /api/trips/:tripId/expenses` for the active (or selected) trip.
- **Auth:** User JWT (from main backend signin/signup). No vendor JWT on the user app.

---

## 2.3 User UI Flow: Trips and “Bookings”

### My Trip page

- **URL:** `/my-trip` (or similar). Shown when the user has an **active trip**.
- **Data:** `GET /api/trips/active` → trip (id, origin, destination, days, status, budget, etc.) + itineraries. Optional: `GET /api/trips/:tripId/expenses` for expenses.
- **Tabs:** Bookings, Restaurants, Shopping, Emergency, Nearby.
- **Bookings tab:**
  - **“My Bookings”** heading and button **“+ Book transport, stay & more”** → links to `/my-trip/book` (Booking Marketplace).
  - **Content:** Three **static** cards:
    - Train: “Hyderabad → Chandigarh”, “Train · Day 1”, “Confirmed”
    - Hotel: “Hotel in Manali”, “Stay · Day 1–5”, “Pending”
    - Experience: “Rohtang Pass Tour”, “Experience · Day 3”, “Not booked”
  - Each card: icon, title, sub, status, “View ticket” button. **No API call; no real data.**

### Booking Marketplace

- **URL:** `/my-trip/book`. Requires user to be signed in (main backend token).
- **Data:** `GET /api/trips/active` to pre-fill **from / to** with trip origin and destination.
- **Flow:**
  1. **“What do you want to book?”** – Category cards: Bus, Flight, Train, Hotel, Experiences, Car Rental, Bike Rental, Local Tours.
  2. When a **transport** type is selected (Bus, Flight, Train, Car, Bike), a **“Search bookings”** form appears (From, To, Date, Passengers, Search).
  3. For **Bus**, the list below is **MOCK_BUSES** (Orange Travels, SRM Transport, KPN Travels – static). No request to any backend for real buses.
  4. User can click “View seats” → seat picker modal (static layout). “Continue to payment” closes the modal; no booking is created.
- **Other categories** (Hotel, Experiences, etc.): placeholder “coming soon” message.

---

## 2.4 Gap: User Bookings vs Vendor Data

| Aspect | Current state |
|--------|----------------|
| **My Bookings data** | Static array in frontend. No GET /api/bookings or similar. |
| **Booking creation** | No flow that creates a row in any database. |
| **Bus list in marketplace** | MOCK_BUSES. No call to Vendor Hub or main backend for listings/buses/routes/schedules. |
| **Vendor transport data** | Lives in Vendor Hub DB (listings, buses, routes, bus_schedules). Not exposed to the user app. |
| **vendor_bookings** | Exists in Vendor Hub DB; used by vendor-side bookings route (not mounted). No user_id/trip_id; no bus/route/schedule link. |

To make user-side bookings **dynamic** and tied to vendor transport data, you need (as in `docs/USER_BOOKINGS_DYNAMIC_PLAN.md`):

1. A way for the **main backend** (or user app via main backend) to **read** transport data (listings/buses/routes/schedules) – e.g. shared DB or Vendor Hub API.
2. A **user bookings** concept: e.g. extend `vendor_bookings` (or add a table) with **user_id**, **trip_id**, and transport keys (bus_id, route_id, schedule_id, seats).
3. **Main backend** endpoint(s) such as `GET /api/bookings` (or `GET /api/trips/:tripId/bookings`) returning the logged-in user’s bookings.
4. **Create booking** when the user completes a bus (or other) booking – main backend or Vendor Hub writes the booking row.
5. **User app:** Replace the static “My Bookings” array with the API response; keep the same card UI (icon, title, sub, status, “View ticket”).

---

# Part 3: Summary Diagram

```
VENDOR SIDE (Vendor Hub, port 8080/8081 → API 3002)
────────────────────────────────────────────────────
Vendor signup/signin → JWT
     ↓
My Listings → GET /api/listings
     ↓
Add Listing → POST /api/listings (type: transport, etc.)
     ↓
Transport listing → /listings/:id/transport
     ↓
Fleet tab: buses table, add/delete bus
Bus info tab: POST/PATCH buses
Driver Info tab: POST drivers (optional bus_id)
Routes and Pricing tab: POST routes (optional bus_id), Back to Fleet
     ↓
Bus detail → /listings/:id/transport/bus/:busId
     ↓
Drivers, routes, schedules per bus (GET/POST/PATCH/DELETE)

Vendor bookings: vendor_bookings table; GET /api/bookings (code exists, route not mounted in index).


USER SIDE (Wander Wisely, port 8081 → API 3001)
───────────────────────────────────────────────
User signup/signin → JWT (main backend)
     ↓
Plan Trip → POST /api/trips/generate → trip + itineraries
     ↓
Activate trip → POST /api/trips/:id/activate
     ↓
My Trip → GET /api/trips/active → trip + itineraries
     ↓
Bookings tab: "My Bookings" = STATIC 3 cards (no API)
     ↓
"+ Book transport, stay & more" → /my-trip/book (Booking Marketplace)
     ↓
Choose category (e.g. Bus) → Search form (from, to, date, passengers)
     ↓
Bus list = MOCK_BUSES (no API). View seats / Continue to payment = no booking created.

No GET /api/bookings, no bookings table, no link to vendor transport data today.
```

---

For the **detailed transport flow** (tables, uniqueness, bus-scoped APIs), see **`vendor-hub-main/docs/TRANSPORT_FLOW_AND_DB.md`**.  
For **how to make user bookings dynamic** using vendor data, see **`docs/USER_BOOKINGS_DYNAMIC_PLAN.md`**.
