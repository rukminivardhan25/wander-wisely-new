# Flight booking: end-to-end design (user + vendor + ticket)

This document describes the **full flight booking flow** on the user side and vendor side, including documents, multi-passenger details, vendor approval, seat selection, payment, and ticket generation with barcode/QR code.

---

## 1. Overview

| Role | Flow |
|------|------|
| **User** | Search flights → See available flights for date → Select flight → Add details for **all passengers** (including required documents) → Submit request → Wait for vendor approval → (When approved) Select seats → Pay → Download ticket (PDF with barcode/QR). |
| **Vendor** | Bookings → Transport → **Flight** → Select date → See **flights available that day** and **incoming requests** → For each flight: see **seat map** (available vs already booked), request details, passenger list → Accept or Reject → (After user pays) booking is confirmed. |

**Shared database:** Same as car/bus — main app writes `flight_bookings`; vendor hub reads/updates from the same DB so requests appear on both sides.

---

## 2. Data model (backend)

### 2.1 Tables (suggested)

- **`flights`** (vendor-managed)  
  `id`, `listing_id`, `flight_number`, `airline_name`, `aircraft_type`, `flight_type`, `status`, `classes_enabled` (json), `cabin_*` (json), `base_fare_cents`, `baggage_allowance`, amenities, etc.

- **`flight_routes`**  
  `id`, `flight_id`, `from_place`, `to_place`, `fare_cents`.

- **`flight_schedules`**  
  `id`, `flight_id`, `route_id`, `schedule_date` (date), `departure_time`, `arrival_time`, `status`.  
  One row = one flight on one date (e.g. 6E-201 on 2026-02-25).

- **`flight_bookings`**  
  `id`, `user_id`, `schedule_id` (or `flight_id` + `schedule_date`), `booking_ref`, `status` (`pending_vendor` | `approved_awaiting_payment` | `rejected` | `confirmed`), `total_cents`, `otp`, `paid_at`, `rejected_reason`, `created_at`, `updated_at`.

- **`flight_booking_passengers`**  
  `id`, `flight_booking_id`, `passenger_index` (1-based), `full_name`, `id_document_type` (e.g. aadhaar, passport), `id_document_number`, `id_document_url` (uploaded file URL), `seat_row`, `seat_letter` (set after vendor approval + user seat selection).

- **`flight_booking_seats`** (optional; or derive from passengers)  
  Used to mark which seats are **already booked** for a schedule: e.g. `schedule_id`, `row`, `letter`, `flight_booking_id`, so the seat map can show Available / Booked / Selected-by-me.

**Documents:**  
For each passenger the user may be required to upload one ID document (type + number + file URL). Stored in `flight_booking_passengers` or a small `flight_booking_documents` table keyed by `flight_booking_id` + `passenger_index`.

---

## 3. User side – step-by-step design

### 3.1 Search (Booking Marketplace – Flight tab)

- **UI:** Same “Search bookings” bar as today: **From**, **To**, **Date**, **Passengers** (number), **Search**.
- **API:** `GET /api/flights/search?from=XXX&to=YYY&date=YYYY-MM-DD`  
  Returns list of **available flights** for that date (from `flight_schedules` + `flight_routes` + `flights`), e.g.:
  - `scheduleId`, `flightId`, `flightNumber`, `airlineName`, `aircraftType`, `fromPlace`, `toPlace`, `departureTime`, `arrivalTime`, `fareCents`, `availableSeats` (total minus already booked).

### 3.2 Search results – list of flights

- Show cards (or table) per flight: flight number, airline, route (From → To), date, departure–arrival, fare, “View details” / “Select”.
- **View details:** Expand or open a sheet with: aircraft type, cabin classes, baggage, amenities, and a **seat map** (see 3.4).

### 3.3 Select flight → “Add passenger details & documents”

- When user clicks **Book** or **Select** for a flight:
  - If **Passengers = 2**, show **2 passenger forms** (Passenger 1, Passenger 2).  
  - Each passenger form has:
    - **Full name** (required)
    - **ID type** (dropdown: Aadhaar, Passport, etc.)
    - **ID number** (required)
    - **Upload document** (required): one file per passenger (image/PDF); upload to existing `/api/upload`, store URL in passenger row.
  - **Submit request** button: disabled until all passengers have name, ID type, ID number, and document uploaded.
- **API:** `POST /api/flight-bookings`  
  Body: `scheduleId`, `passengers: [{ fullName, idDocumentType, idDocumentNumber, idDocumentUrl }]`.  
  Backend creates `flight_bookings` row (status `pending_vendor`) and N rows in `flight_booking_passengers`. Returns `bookingId`, `bookingRef`.

### 3.4 Booking page – “My flight bookings”

- **Location:** Same place as “My Trip” / “Bookings” for transport (e.g. My Trip → Transport tab, or a dedicated “Flight bookings” section).
- **API:** `GET /api/flight-bookings` (for current user).  
  Returns list of flight bookings with: `id`, `bookingRef`, `flightNumber`, `airline`, `route`, `date`, `status`, `passengers` (count or summary).
- **Display:** Cards per booking:
  - **Pending approval** – “Waiting for vendor to approve.” No seat selection yet.
  - **Approved – Pay now** – CTA: “Select seats” then “Pay now”.
  - **Rejected** – Show reason; option to delete/remove from list.
  - **Completed** – “View ticket” (download PDF).
- So the **booking page** shows the same flight bookings and statuses; user can open “Select seats” when status is `approved_awaiting_payment`.

### 3.5 Seat selection (after vendor approval)

- **Trigger:** When status = `approved_awaiting_payment`, user clicks **Select seats**.
- **API:**  
  - `GET /api/flight-bookings/:id/seat-map` (or `GET /api/flight-schedules/:scheduleId/seat-map`)  
    Returns: flight’s cabin layout (rows, left/right per class) and for each seat: `row`, `letter`, `status`: `available` | `booked` | `yours` (current booking).  
  - Frontend shows the **same seat map** as on vendor flight detail (left | aisle | right), with:
    - Available = clickable
    - Booked = greyed out
    - Already selected by this booking = highlighted
  - User selects **one seat per passenger** (e.g. Passenger 1 → 7A, Passenger 2 → 7B).
- **API:** `PATCH /api/flight-bookings/:id/seats`  
  Body: `seats: [{ passengerIndex: 1, row: 7, letter: "A" }, { passengerIndex: 2, row: 7, letter: "B" }]`.  
  Backend updates `flight_booking_passengers.seat_row`, `seat_letter` and marks those seats as booked for this schedule.
- After saving seats, show **Pay now** (or enable it).

### 3.6 Payment

- **API:** `PATCH /api/flight-bookings/:id/pay` (or POST `.../pay`).  
  Backend: set `status = confirmed`, set `otp`, `paid_at`.  
  Same pattern as car booking “Pay now”.
- After success, show “Booking confirmed” and **Download ticket** (or redirect to ticket view).

### 3.7 Ticket (PDF + barcode / QR code)

- **Content of ticket:**  
  - Booking ref, flight number, airline, route, date, departure–arrival.  
  - For each passenger: name, seat (e.g. 7A), optional ID type/number (masked if needed).  
  - **Barcode or QR code:** Encode a string such as `FLIGHT-{bookingRef}-{otp}` (or a URL that validates the booking). Vendor/app can scan to verify.
- **Generation:**  
  - **Option A:** Backend generates PDF (e.g. with `pdfkit` or similar), uploads to storage, returns URL; frontend opens or downloads.  
  - **Option B:** Backend returns JSON (booking ref, OTP, passenger list, seat list); frontend generates PDF + QR in browser (e.g. `jspdf` + `qrcode`).
- **API:** `GET /api/flight-bookings/:id/ticket`  
  Returns: either PDF URL (Option A) or JSON for client-side PDF (Option B).  
  If Option B: include `bookingRef`, `otp`, `flight`, `passengers` (name, seat); frontend draws QR from `bookingRef` + `otp`.

---

## 4. Vendor side – design

### 4.1 Bookings → Transport → Flight

- **Navigation:** Bookings (left menu) → **Transport** tab → **Flight** sub-tab (alongside Bus, Car).
- **Date picker:** Vendor selects a **date** (e.g. 2026-02-25).
- **API:** `GET /api/listings/:listingId/flight-bookings?date=YYYY-MM-DD`  
  Returns: list of **flight schedules** for that listing on that date, and for each schedule the **booking requests** (pending, approved, rejected, confirmed).

### 4.2 Flights available that day

- List (or cards) of **flights** that have at least one schedule on the selected date:  
  Flight number, airline, route, departure–arrival, and **count of requests** (e.g. “3 pending”, “2 approved”).
- Clicking a flight opens a **detail view** (or sidebar) with:
  - **Flight details:** aircraft, cabins, baggage, etc. (same as flight detail page).
  - **Seat map:** same layout (left | aisle | right), with each seat in one of:
    - **Available** (green or white)
    - **Booked** (grey; from confirmed bookings)
    - **Pending** (e.g. orange; seat selected but not yet paid – optional)
  - **Booking requests** for this flight/date:
    - Table or list: Booking ref, user (if you store it), passengers (names), total amount, status (Pending / Approved / Rejected / Paid).
    - **Accept** / **Reject** for pending requests.
- **Accept:** Backend sets `flight_bookings.status = approved_awaiting_payment`; user can then select seats and pay.
- **Reject:** Backend sets `status = rejected`, optional `rejected_reason`; user sees “Rejected” on booking page.

### 4.3 Where requests come from

- Same as car: **main app** creates rows in `flight_bookings` (and passengers) in the **main app backend** (e.g. port 3001).  
- **Vendor hub** reads/updates the same `flight_bookings` table via **vendor hub backend** (e.g. port 3002) using the **same database** (e.g. `TRANSPORT_DATABASE_URL`).  
- So when user submits a flight booking request, it appears under Bookings → Transport → Flight for the correct listing/date.

---

## 5. API summary (to implement)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **User (main app backend)** | | |
| GET | `/api/flights/search?from=&to=&date=` | List available flights for date (schedules + routes). |
| GET | `/api/flight-schedules/:id` or `/api/flights/:id/availability?date=` | Flight detail + seat map (available/booked). |
| POST | `/api/flight-bookings` | Create booking (with passengers + documents). |
| GET | `/api/flight-bookings` | List current user’s flight bookings. |
| GET | `/api/flight-bookings/:id` | One booking detail (for “Check status” / seat selection). |
| PATCH | `/api/flight-bookings/:id/seats` | Save seat selection per passenger. |
| PATCH | `/api/flight-bookings/:id/pay` | Confirm payment; set OTP, status = confirmed. |
| GET | `/api/flight-bookings/:id/ticket` | Get ticket PDF URL or JSON for client PDF + QR. |
| DELETE | `/api/flight-bookings/:id` | User deletes own booking (optional; same as car). |
| **Vendor (vendor hub backend)** | | |
| GET | `/api/listings/:listingId/flight-bookings?date=` | List schedules + requests for date. |
| GET | `/api/listings/:listingId/flight-schedules/:scheduleId` | Schedule + seat map + requests. |
| PATCH | `/api/listings/:listingId/flight-bookings/:id/accept` | Vendor accepts request. |
| PATCH | `/api/listings/:listingId/flight-bookings/:id/reject` | Vendor rejects request. |

---

## 6. Ticket barcode / QR code (detail)

- **Recommended content:**  
  `FLIGHT-{bookingRef}-{otp}`  
  Example: `FLIGHT-FLT-A1B2C3-452901`
- **Format:**  
  - **QR code:** Encode the string above; vendor or staff scans to verify ticket.  
  - **Barcode:** If you use Code 128 or similar, same string.  
- **Place on ticket:**  
  One QR (or barcode) per booking (same for all passengers), or one per passenger (e.g. `FLIGHT-{bookingRef}-P{index}-{otp}`).  
  Single QR per booking is simpler and enough for “verify this booking”.

---

## 7. UI flow summary (user)

1. **Booking Marketplace** → Category **Flight** → From, To, Date, Passengers → **Search**.
2. **Results:** List of flights → **View details** (optional) → **Book**.
3. **Passenger form:** For each of N passengers: name, ID type, ID number, upload document → **Submit request**.
4. **Booking page (My Trip / Bookings):**  
   - Status “Pending” → wait.  
   - “Approved – Pay now” → **Select seats** → choose one seat per passenger → **Pay now** → then **Download ticket** (PDF with QR/barcode).
5. **Ticket:** Open PDF; show booking ref, flight, passengers, seats, and QR (or barcode) for verification.

---

## 8. UI flow summary (vendor)

1. **Bookings** → **Transport** → **Flight** → select **date**.
2. See **flights** that have schedules on that date; each shows request counts.
3. Click a **flight** → see **flight details**, **seat map** (available vs booked), and **list of requests** (pending / approved / rejected / paid).
4. **Accept** or **Reject** pending requests.
5. After user pays, booking shows as confirmed/paid; seat map updates to show those seats as booked.

---

## 9. Implementation checklist (phases)

- [ ] **DB:** Create `flight_schedules`, `flight_bookings`, `flight_booking_passengers` (and any `flight_booking_seats` or equivalent) in transport DB.
- [ ] **Main app – search:** `GET /api/flights/search` and Flight tab in BookingMarketplace (replace “Flight booking coming soon” with real results).
- [ ] **Main app – book:** Passenger form (N passengers, docs), `POST /api/flight-bookings`, upload documents.
- [ ] **Main app – booking page:** `GET /api/flight-bookings`, show cards with status (Pending / Approved / Rejected / Completed).
- [ ] **Main app – seat selection:** `GET` seat map, `PATCH /api/flight-bookings/:id/seats`, seat picker UI (same layout as vendor flight detail).
- [ ] **Main app – payment:** `PATCH /api/flight-bookings/:id/pay`, then ticket.
- [ ] **Main app – ticket:** `GET /api/flight-bookings/:id/ticket`, PDF generation (server or client) with QR/barcode.
- [ ] **Vendor hub – list:** Bookings → Transport → **Flight** tab, date filter, `GET /api/listings/:id/flight-bookings?date=`.
- [ ] **Vendor hub – detail:** Per-flight view: seat map (available/booked), request list, Accept/Reject.
- [ ] **Vendor hub – accept/reject:** `PATCH` accept and reject endpoints; update `flight_bookings.status`.

This design document can be used as the single source of truth for implementing the full flight booking flow on both user and vendor sides, including documents, multi-passenger details, vendor approval, seat selection, payment, and ticket with barcode/QR code.
