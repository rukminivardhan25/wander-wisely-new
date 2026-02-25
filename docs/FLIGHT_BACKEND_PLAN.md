# Flight backend – implementation plan (step by step)

This plan covers the **full backend** for flights: from **vendor adding flights** through **user search → book → vendor accept/reject → payment → ticket**. Implement in the order below so each step has the data and APIs it needs.

**Reference:** Same database pattern as car/bus — main app and vendor hub both use **`DATABASE_URL`** (single database) for flight tables so bookings appear on both sides.

---

## Phase 1: Vendor – flight master data (add/manage flights)

**Goal:** Vendor can create flights, define routes, and add schedules so that “flights for a date” can be queried.

### 1.1 Database – flight tables (vendor hub schema)

Create in **vendor hub** transport DB (run in order):

| Step | File | Purpose |
|------|------|---------|
| 1 | `034_flights.sql` | **`flights`** – one row per flight (e.g. 6E-201). Columns: `id`, `listing_id`, `flight_number`, `airline_name`, `aircraft_type`, `flight_type` (domestic/international), `total_seats`, `status`, `seat_layout` (json: rows, cols, class sections), `base_fare_cents`, `baggage_allowance`, `created_at`, `updated_at`. |
| 2 | `035_flight_routes.sql` | **`flight_routes`** – routes for a flight (from → to). Columns: `id`, `flight_id`, `from_place`, `to_place`, `fare_cents`, `created_at`. |
| 3 | `036_flight_schedules.sql` | **`flight_schedules`** – one row = this flight on this date. Columns: `id`, `flight_id`, `route_id`, `schedule_date` (date), `departure_time`, `arrival_time`, `status`, `created_at`, `updated_at`. |

**Notes:**

- `flights.listing_id` → `listings(id)` (transport listing).
- `flight_routes.flight_id` → `flights(id)`.
- `flight_schedules.flight_id` → `flights(id)`, `flight_schedules.route_id` → `flight_routes(id)`.
- `flight_bookings` (existing) should reference `schedule_id` as UUID → `flight_schedules(id)`. If it’s currently `text`, add a migration to use UUID and FK to `flight_schedules(id)` (or keep text and use `flight_schedules.id::text` in APIs).

### 1.2 Vendor hub APIs – flights CRUD

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings/:listingId/flights` | List all flights for the listing. |
| POST | `/api/listings/:listingId/flights` | Create a flight (flight_number, airline_name, aircraft_type, flight_type, total_seats, seat_layout, base_fare_cents, etc.). |
| GET | `/api/listings/:listingId/flights/:flightId` | Get one flight with routes. |
| PATCH | `/api/listings/:listingId/flights/:flightId` | Update flight. |
| DELETE | `/api/listings/:listingId/flights/:flightId` | Soft-delete or hard-delete (cascade routes/schedules). |

**Vendor hub routes file:** e.g. `vendor-hub-main/backend/src/routes/flights.ts`. Register under listings or as `/api/flights` with `listingId` in query/body.

### 1.3 Vendor hub APIs – flight routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings/:listingId/flights/:flightId/routes` | List routes for a flight. |
| POST | `/api/listings/:listingId/flights/:flightId/routes` | Add route (from_place, to_place, fare_cents). |
| PATCH | `/api/listings/:listingId/flights/:flightId/routes/:routeId` | Update route. |
| DELETE | `/api/listings/:listingId/flights/:flightId/routes/:routeId` | Delete route. |

### 1.4 Vendor hub APIs – flight schedules

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings/:listingId/flights/:flightId/schedules` | List schedules (optional query `?fromDate=&toDate=`). |
| POST | `/api/listings/:listingId/flights/:flightId/schedules` | Add schedule (route_id, schedule_date, departure_time, arrival_time, status). |
| PATCH | `/api/listings/:listingId/flights/:flightId/schedules/:scheduleId` | Update (e.g. status, times). |
| DELETE | `/api/listings/:listingId/flights/:flightId/schedules/:scheduleId` | Delete schedule. |

**Vendor hub:** Register routes in `vendor-hub-main/backend/src/index.ts` (or app entry). Use same DB pool as cars/buses (transport pool).

### 1.5 Vendor hub UI – Manage Fleet → Flights (optional in Phase 1)

- **Manage Fleet** (or Transport) → **Flight** tab: list flights, “Add flight” button.
- Add flight form: flight number, airline, aircraft, flight type (domestic/international), total seats, seat layout (e.g. rows × 6, class sections), base fare, baggage.
- Per flight: add/edit routes (from → to, fare); add/edit schedules (date, departure, arrival).
- This can come right after 1.1–1.4 or in a follow-up; backend is ready once 1.1–1.4 are done.

---

## Phase 2: Main app – flight search (user sees available flights)

**Goal:** User can search by from, to, date (and passengers) and get a list of available flights from the DB.

### 2.1 Main app API – search flights

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/flights/search?from=&to=&date=YYYY-MM-DD&passengers=` | Return flights that have a **flight_schedule** on `schedule_date = date`, with route matching from/to (case-insensitive), and `available_seats >= passengers`. Join: `flight_schedules` + `flight_routes` + `flights`. Compute `available_seats = flights.total_seats - (confirmed/pending seat count for that schedule_id)` from `flight_booking_passengers` / bookings for that schedule. |

**Response shape (per flight):**  
`scheduleId`, `flightId`, `flightNumber`, `airlineName`, `aircraftType`, `flightType`, `fromPlace`, `toPlace`, `departureTime`, `arrivalTime`, `fareCents`, `availableSeats`, `totalSeats`, optional `seatLayout` for frontend seat map.

**Main app:** New route file e.g. `backend/src/routes/flights.ts` (or extend `transport.ts` with `/api/transport/flights/search`). Use **getTransportPool()** so it reads the same DB as vendor hub.

### 2.2 Wire main app frontend to search

- **BookingMarketplace** – Flight tab: on Search, call `GET /api/flights/search?...` (or `/api/transport/flights/search`). Replace static flight list with API response. Keep “View details” and “Book” flow; Book will use `scheduleId` / `flightId` from search result.

---

## Phase 3: Main app – create flight booking (user submits request)

**Goal:** User can submit a booking request with passengers and documents; it’s stored and later shown to vendor.

### 3.1 Main app API – create booking (already implemented)

- **POST /api/flight-bookings** – already in `backend/src/routes/flightBookings.ts`. Body: `listingId`, `flightId`, `scheduleId`, `routeFrom`, `routeTo`, `travelDate`, `passengers`, `totalCents`, `passengerDetails[]`, `documents[]`.
- Ensure **main app index** mounts it: `app.use("/api/flight-bookings", flightBookingsRoutes)`.
- **flight_bookings** table already has `schedule_id` (text/uuid). Prefer storing `flight_schedules.id` (UUID) so vendor can join schedule → flight → listing.

### 3.2 Align DB with schedules

- If `flight_bookings.schedule_id` is text, keep it as string representation of UUID; when creating a booking, pass `scheduleId` from search so vendor can link to `flight_schedules.id`.
- Optional: add `ALTER TABLE flight_bookings ADD CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES flight_schedules(id)` if you change `schedule_id` to UUID type.

### 3.3 Main app frontend – Book flow

- BookingMarketplace – Flight: on Book, collect passenger details + document URLs (use existing upload API), then **POST /api/flight-bookings** with `scheduleId` and `flightId` from selected flight. Show “Request submitted” and optionally redirect to “My flight bookings”.

---

## Phase 4: Vendor hub – list flight bookings and accept/reject

**Goal:** Vendor sees flight booking requests for a date and can accept or reject.

### 4.1 Vendor hub API – list flight bookings by listing + date

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/listings/:listingId/flight-bookings?date=YYYY-MM-DD` | Return: (1) **schedules** for this listing on that date (join flights, flight_schedules, flight_routes), (2) **bookings** for those schedules (flight_bookings + passengers count, status). Group bookings by schedule or list all with schedule_id. |

Response can be:  
`{ schedules: [...], bookings: [...] }` or `{ flights: [ { schedule, bookings[] } ] }` so the vendor UI can show “flights for date” and “booking requests” per flight.

### 4.2 Vendor hub API – accept / reject

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PATCH | `/api/listings/:listingId/flight-bookings/:bookingId/accept` | Set `flight_bookings.status = 'approved_awaiting_payment'`. |
| PATCH | `/api/listings/:listingId/flight-bookings/:bookingId/reject` | Set `status = 'rejected'`, optional body `rejected_reason`. |

**Vendor hub:** New file e.g. `vendor-hub-main/backend/src/routes/flightBookings.ts`. Use transport pool (same as cars). Check that `listing_id` of the booking matches `listingId` so vendors only act on their listing.

### 4.3 Vendor hub UI – Flight tab with real data

- Bookings → Transport → **Flight** tab: call **GET /api/listings/:listingId/flight-bookings?date=**.
- Show list of flights (schedules) for the date and table of booking requests; replace static cards/table with API data.
- “Accept” / “Reject” call the PATCH endpoints above; refresh list or update state.

---

## Phase 5: Seat map and seat selection (optional next)

**Goal:** Seat map shows available/booked per schedule; after vendor accepts, user can select seats; backend stores seat per passenger.

### 5.1 Seat map API (both sides)

- **GET /api/flight-schedules/:scheduleId/seat-map** (main app or vendor hub)  
  Returns: flight’s `seat_layout` (rows, cols, class sections) and for each seat: `row`, `letter`, `status`: `available` | `booked` (from confirmed bookings or approved + selected).  
  Source: `flights.seat_layout` + `flight_booking_passengers` (seat_number or seat_row/seat_letter) for that schedule’s bookings where status in (`confirmed`, `approved_awaiting_payment`).

### 5.2 Passenger seat columns

- Ensure **flight_booking_passengers** has `seat_row` and `seat_letter` (or a single `seat_number` like "7A"). Schema 033 has `seat_number`; that’s enough if you store "7A".

### 5.3 Main app API – save seat selection

- **PATCH /api/flight-bookings/:id/seats**  
  Body: `seats: [{ passengerIndex: 1, row: 7, letter: "A" }, ...]`.  
  Update `flight_booking_passengers` for that booking: set `seat_number` (or seat_row/seat_letter) per passenger. Only allow when `flight_bookings.status = 'approved_awaiting_payment'`.

### 5.4 Vendor hub – seat map in flight detail

- When opening “flight details” for a schedule, call seat-map API (or same logic in vendor hub) to show available vs booked in the horizontal seat structure already built in the static UI.

---

## Phase 6: Payment and ticket

**Goal:** User pays after seat selection; booking becomes confirmed; user can download ticket (PDF + QR/barcode).

### 6.1 Main app – payment (already implemented)

- **PATCH /api/flight-bookings/:id/pay** – in `flightBookings.ts`; sets `status = 'confirmed'`, `otp`, `paid_at`. Keep as is.

### 6.2 Main app – ticket

- **GET /api/flight-bookings/:id/ticket**  
  Returns: either PDF URL (if generated on server) or JSON for client-side PDF: `bookingRef`, `otp`, `flight`, `passengers` (name, seat), so frontend can generate PDF + QR (e.g. `FLIGHT-{bookingRef}-{otp}`).

### 6.3 Frontend – “My flight bookings” and ticket

- List: **GET /api/flight-bookings** (already exists). Show status: Pending / Approved – Pay / Rejected / Confirmed.
- After pay: show “Download ticket” and call ticket API.

---

## Summary – implementation order

| Phase | What | Where |
|-------|------|--------|
| **1** | DB: `flights`, `flight_routes`, `flight_schedules`; Vendor APIs: flights + routes + schedules CRUD | Vendor hub schema + routes |
| **2** | Main app: GET flight search; Frontend: Flight search → API | Main app routes + BookingMarketplace |
| **3** | Mount POST flight-bookings; Frontend: Book → POST with scheduleId | Main app index + BookingMarketplace |
| **4** | Vendor hub: GET flight-bookings by listing+date; PATCH accept/reject; UI: real data + Accept/Reject | Vendor hub routes + Bookings.tsx |
| **5** | Seat map API; PATCH seats; Vendor flight detail seat map from API | Both backends + both UIs |
| **6** | Ticket API; Frontend: My bookings + Download ticket | Main app + frontend |

---

## Database quick reference (existing + new)

- **Existing (033):** `flight_bookings`, `flight_booking_passengers`, `flight_booking_documents`.
- **New (034–036):** `flights`, `flight_routes`, `flight_schedules`.
- **Connection:** Main app and vendor hub both use **`DATABASE_URL`** (single database) for all flight tables so that vendor-created flights appear in search and user-created bookings appear in vendor Bookings → Flight.

---

## Next step

Start with **Phase 1**: create `034_flights.sql`, `035_flight_routes.sql`, `036_flight_schedules.sql`, then implement vendor hub routes for flights, routes, and schedules. Once that’s in place, Phase 2 (search) and Phase 3 (book) can use real data.
