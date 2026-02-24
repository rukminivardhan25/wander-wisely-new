# Transport & Bus System – Features and Workflow

This document describes how transport and the bus system work on the **vendor side**, **admin side**, and **user (booking) side**, and how **other vehicle types** (Car, Bike, Cycle, Train, Flight) are handled. No code changes—documentation only.

---

## 1. Vendor side

### 1.1 Listings and access to transport

- **My Listings**: Vendor sees all their listings. Each listing has a type (e.g. Transport, Restaurant, Hotel).
- **Transport listing**: Only listings with type **Transport** support fleet management.
- **Manage Fleet**: The **Manage Fleet** button (bus icon) is shown only when the listing’s **company verification** is **approved** (or **verified**). If not verified, the button is disabled and shows “Manage Fleet (verify first)” and the user is directed to **Verification** to submit the company request.
- **Add Listing**: When adding a listing, the vendor is told that fleet, routes, schedules and pricing are set up later in **My Listings → Manage Fleet** for that listing.

### 1.2 Company verification (required before Manage Fleet)

- **Verification** page: Two top-level categories — **Company** and **Vehicles**.
- **Company**:
  - Vendor selects company type (e.g. Transport, Restaurant, Hotel).
  - **Generate token** is done from **My Listings → open listing →** (for transport, after company is verified, **Manage Fleet** exists; token generation for company is from listing/verification flow). In practice, vendor goes to Verification → Company → selects type → pastes **company verification token** (generated from My Listings for that listing).
  - **Resolve token**: API validates token and returns listing name, type, and `verification_status` (no_request | pending | approved | rejected).
  - Vendor uploads **documents** (Business License, Owner ID, Tax Document, Health & Safety). Documents are sent with the verification request.
  - **Send verification request**: Sets listing’s `verification_status` to **pending**. If status was **rejected**, vendor can re-request (add/change docs and send again).
  - **Status**: no_request → pending (after send) → admin approves → **approved**, or admin rejects → **rejected**.
  - Only when listing is **approved** can the vendor use **Manage Fleet** for a Transport listing.

### 1.3 Transport → Fleet (Manage Fleet) – initial view

- **URL**: `/listings/:listingId/transport`
- **First view**: Only the **Fleet** section is shown (no stepper tabs).
- **Fleet section**:
  - **Vehicle type filter**: Dropdown with **All**, **Bus**, **Car**, **Bike**, **Cycle**, **Train**, **Flight**. Default: **Bus**. “All” shows all vehicle types (currently only buses have data).
  - **Status filter** (when Bus or All and there are buses): **All** | **Active** | **Inactive**.
  - **Sort** (when Bus or All and there are buses): **Name A–Z** | **Status** | **Seats**.
  - **Add Vehicle** button: In the header row next to the filters (not below the table).
- **Table** (when Bus or All and buses exist): Columns — **Bus Name**, **Registered Number**, **Bus Number**, **Status**. Each row has actions: **View** (eye) → bus detail page, **Verify** (shield) → bus verification modal, **Delete** (trash).
- **Empty state** (Bus or All, no buses): Message to add first bus using **Add Vehicle** above; no duplicate button below.

### 1.4 Add Vehicle and vehicle types

- **Add Vehicle** opens a modal: **Select Vehicle Type** with options — **Bus**, **Car**, **Bike**, **Cycle**, **Train**, **Flight**.
- **If user selects Bus**:
  - Modal closes and the **bus setup flow** is shown: stepper with **Bus info**, **Driver Info**, **Routes and Pricing** (no Fleet tab in this flow).
  - Vendor fills Bus info (name, bus number, registration, type, AC/Non-AC, manufacturer, model, amenities, seat layout, photo), then can add Driver info and Routes & pricing. **Save bus** adds the bus to the fleet.
  - After save (new bus), flow can continue to Driver Info / Routes; after edit, vendor is taken back to the main Fleet-only view.
  - **Back to Fleet** (on Routes step) closes the bus setup flow and returns to the Fleet-only page.
- **If user selects Car, Bike, Cycle, Train, or Flight**:
  - Modal closes and the app navigates to **Vehicle placeholder** page: `/listings/:listingId/transport/vehicle/:vehicleType`.
  - Placeholder page shows same header and a stepper-style layout but content is: **“[Type] setup coming soon.”** and a **Back to Fleet** link. No actual vehicle creation or data for these types yet.

### 1.5 Bus detail page (per-bus management)

- **URL**: `/listings/:listingId/transport/bus/:busId` (opened via **View** / eye icon from Fleet table).
- **Back arrow**: Goes to **My Listings** (`/listings`), not back to Transport.
- **Sections**:
  - **Bus information**: Name, registration, bus number, type, manufacturer/model, seat layout (visual), **Edit**.
  - **Quick actions** (only when bus is **verified** — `verification_status === 'approved'`):
    - **Add Schedule**: Add a bus schedule (route, date range, departure/arrival, days, price override, seat availability).
    - **Set Inactive** / **Set Active**: Toggle `status` between inactive and active. **Set Active** is only allowed if the bus is verified; otherwise the button is disabled and API returns an error.
    - **Delete bus**.
  - If bus is **not verified**, Quick actions are disabled and a message says: “Verify this bus to use quick actions (Verification → Vehicles → Buses).”
- **Drivers**: List of drivers assigned to this bus; assign/unassign; add driver (listing-level) and assign to this bus.
- **Routes**: List of routes for this bus (from_place, to_place, distance, duration, price per seat); add/edit routes; assign route to this bus.
- **Amenities**: WiFi, Charging, Entertainment, Toilet; **Edit** to change.
- **Schedules**: List of bus schedules; add schedule (route, dates, time, days, price, seats); delete schedule.

### 1.6 Bus verification (per-bus)

- **Verification** page → **Vehicles** → **Buses**:
  - Vendor pastes **bus verification token** (generated from **Manage Fleet** → bus row → **Verify** → Generate token). Token format e.g. `BUS-XXXX-XXXX`.
  - **Validate token**: Resolves token to bus name, registration, listing name, and current `verification_status` (no_request | pending | approved | rejected).
  - **Bus documents** (when status is no_request or rejected): Upload **Insurance** and **Other document** (driver/route data is already from fleet). Then **Send verification request** to set bus to **pending**. If **rejected**, vendor can add/change docs and re-request.
- **Verify** modal on Fleet table (shield icon): **Generate token**, **Copy token**, and display **status** (No request | Pending | Approved | Rejected). No “Send verification request” in the modal; sending is done on Verification → Vehicles → Buses.

### 1.7 Verification status and re-verification on edit

- **Company**: If admin **rejects**, vendor can upload documents again and **re-request**; status goes back to pending.
- **Bus**: Same — if **rejected**, vendor can add/change bus documents and **Send verification request** again.
- **Any edit to bus or drivers/routes**:
  - Editing **bus info** (name, layout, amenities, etc.) or **amenities**: On save, that bus’s `verification_status` is set to **no_request**, `verified_at` cleared, and bus **status** set to **inactive**. Bus must be re-verified before it can be set **Active** again.
  - Editing or assigning **drivers** (for a bus): That bus’s verification is reset (no_request, inactive) as above.
  - Adding/editing **routes** for a bus or assigning a route to a bus: That bus’s verification is reset (no_request, inactive).
- **Set Active** (Quick action): Allowed only when bus is **approved**. Set Inactive does not change verification.

### 1.8 Vendor Bookings page

- Vendor sees **transport bookings** by date. Data is filtered to buses that have **status = 'active'** (and schedules, etc.). If no buses have a schedule on the selected date, message: “No buses have a schedule on this date. Try another date or add schedules in Manage Fleet → Bus detail → Schedules.”

---

## 2. Admin side

### 2.1 Verification – categories

- **Verification** page has two categories: **Company** and **Vehicles**.
- **Company**:
  - **Company type** filter: e.g. Transport, Restaurant, Hotel, etc.
  - Lists **pending** listing verification requests (listings with `verification_status = 'pending'`).
  - Admin can **View** a listing to see company details, owner, and **documents** (with **Open** links served from admin backend).
  - **Approve** sets listing `verification_status = 'approved'`, **Reject** sets `rejected`.
- **Vehicles**:
  - **Vehicle type** filter: **All types** | **Buses** | **Cars**.
  - When **Buses** (or All): Lists **pending buses** — buses that have a `verification_token` and status `no_request` or `pending` (not yet approved/rejected).
  - Table: bus name, registration, bus number, listing name, token, status, requested date. **View** opens bus detail modal; **Approve** / **Reject** actions.

### 2.2 Company verification detail (admin)

- **GET** listing by id returns: name, type, token, status, address, owner name/email, and **documents** (type, file name, URL). Document URLs use admin base so “Open” works (admin serves uploads from vendor uploads path).

### 2.3 Bus verification detail (admin)

- **GET** bus by id returns: bus info, listing name, owner name/email, and:
  - **Drivers**: All drivers for that bus (name, phone, license_no).
  - **Routes**: All routes for that bus (from_place, to_place, distance_km, duration_minutes, price_per_seat_cents).
  - **Documents**: All entries from `verification_bus_documents` (e.g. Insurance, Other) with **Open** links (admin upload URL).
- **Approve bus**: Sets bus `verification_status = 'approved'`, `verified_at = now()`, and **status = 'active'** so the bus appears in user booking and vendor Bookings.
- **Reject bus**: Sets bus `verification_status = 'rejected'` (status unchanged).

---

## 3. User (booking) side

### 3.1 How buses are chosen for booking

- **Available buses** are fetched from the **main app** API: `GET /api/transport/available-buses?date=YYYY-MM-DD&from=&to=&passengers=`.
  - Main app backend uses the **transport DB** (vendor hub DB or shared DB) to query buses.
- **Filters applied** (all must be true for a bus to appear):
  - Listing type = **transport**.
  - Bus **status = 'active'**.
  - Bus **verification_status = 'approved'** (coalesced to `no_request` treated as not approved).
  - Schedule: `start_date` = requested date, schedule **status** active, and (for capacity) `seat_availability` or `total_seats` ≥ requested passengers.
  - Optional: route **from_place** / **to_place** match query params (case-insensitive).
- **Booked seats**: Main app gets booked seat count per bus from `transport_bookings` for that date and subtracts from total seats to compute **available seats**.
- **Result**: User sees only **active** and **verified** buses with a schedule on that date and enough capacity; from/to filter is optional.

### 3.2 User booking flow (high level)

- User selects **date**, optional **from** / **to**, **passengers**.
- Frontend calls **available-buses**; response includes listing name, bus name, registration, bus number, total/available seats, layout (rows, left_cols, right_cols, has_aisle), amenities, driver name/phone, schedule id, departure/arrival, route from/to, price per seat.
- User picks a bus/schedule, selects seats (already-booked seats are excluded), and completes booking (payment, etc.). Booking is stored in main app `transport_bookings` (bus_id, listing_id, travel_date, selected_seats, etc.).

---

## 4. Other vehicle types (Car, Bike, Cycle, Train, Flight)

### 4.1 Fleet UI (vendor)

- **Vehicle type filter**: **All** | **Bus** | **Car** | **Bike** | **Cycle** | **Train** | **Flight**.
- **Bus** or **All**: Shows bus table (and Status/Sort). “All” currently shows the same buses (no other vehicle types stored yet).
- **Car, Bike, Cycle, Train, Flight**: Empty state message: “No [type]s yet. Vehicle setup coming soon.” No table, no data.

### 4.2 Add Vehicle modal

- **Bus**: Opens bus setup flow (Bus info → Driver Info → Routes and Pricing) on the same page; bus is created and stored in `buses` table.
- **Car, Bike, Cycle, Train, Flight**: Navigate to **placeholder** page: `/listings/:listingId/transport/vehicle/:vehicleType`. No vehicle record is created; page shows “[Type] setup coming soon.” and **Back to Fleet**. Same layout idea as bus (header, stepper-style) but no real flow.

### 4.3 Data and backend

- **Buses**: Stored in `buses`; have drivers, routes, bus_schedules, verification_token, verification_status, status (active/inactive). Full flow implemented.
- **Other types**: No tables or APIs for Car/Bike/Cycle/Train/Flight yet. No creation, no listing in Fleet table, no booking. Only UI placeholders and filter options exist.

---

## 5. Summary table

| Area | What | Key points |
|------|------|------------|
| **Vendor – Company** | Verification | Token → upload docs → send request → pending. Approved → Manage Fleet enabled. Rejected → can re-request. |
| **Vendor – Fleet** | Transport page | Fleet-only view first. Vehicle type: All, Bus, Car, Bike, Cycle, Train, Flight. Add Vehicle in header. Bus table with View / Verify / Delete. |
| **Vendor – Add Vehicle** | Bus | Bus info → Driver → Routes; save bus; re-verification if bus/driver/route edited. |
| **Vendor – Add Vehicle** | Other types | Redirect to placeholder “setup coming soon.” |
| **Vendor – Bus detail** | Per-bus | Info, Quick actions (only if verified), Drivers, Routes, Amenities, Schedules. Set Active only when approved. Edit → verification reset. |
| **Vendor – Bus verification** | Verification → Vehicles → Buses | Paste token → validate → upload Insurance/Other docs → send request. Re-request if rejected. |
| **Admin – Company** | Verification | Pending listings by type → View (docs, owner) → Approve / Reject. |
| **Admin – Vehicles** | Verification | Pending buses → View (bus, drivers, routes, docs) → Approve (sets active) / Reject. |
| **User – Booking** | Available buses | Only buses with **status = active** and **verification_status = approved**, with schedule on date and capacity. |
| **Other vehicles** | Car, Bike, etc. | Filter and Add Vehicle option only; placeholder page; no data or booking. |

---

*End of document.*
