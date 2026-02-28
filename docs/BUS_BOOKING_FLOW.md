# Bus booking flow – user status and vendor seats

This document explains how bus booking works end-to-end and why **user-side status** and **vendor-side seats / bus structure** may not show or update as expected.

---

## 1. End-to-end flow

1. **User selects bus and seats**  
   `src/pages/BookingMarketplace.tsx` → user picks bus, seats, travel date, passenger details.

2. **Payment (mock)**  
   `src/pages/PaymentPage.tsx` → user completes payment → redirects to **BookingSuccessPage** with `state` (bookingId, bus, selectedSeats, travelDate, routeFrom, routeTo, totals, passenger info).  
   The `bus` object should include **`busId`** and **`listingId`** from the listing/bus the user selected.

3. **Success page**  
   `src/pages/BookingSuccessPage.tsx`:
   - Always calls **`addStoredBusBooking(payload)`** → stores the booking in **localStorage** (so “View ticket” works even offline).
   - If the user is **logged in** (`token`), it then:
     - Fetches **GET /api/trips/active** to get the current trip id.
     - Sends **POST /api/bookings** with the same payload plus **tripId** (or undefined).  
   The main app **backend** inserts into **`transport_bookings`** (see `backend/src/routes/bookings.ts`).  
   The insert uses **`bus.busId`** and **`bus.listingId`** when provided; they can be null if the client did not send them.

4. **User sees bookings (My Trip)**  
   `src/pages/MyTrip.tsx` calls **GET /api/bookings** (with optional **?trip_id=...**).  
   - **Before fix:** When the user had **no active trip**, the app never called the API and showed **no bus bookings** from the server (only car/flight/etc. were cleared).  
   - **After fix:** When logged in, bus bookings are always loaded: **GET /api/bookings** is called **with** `?trip_id=...` when there is an active trip, and **without** `trip_id` when there is no active trip, so all of the user’s bus bookings are shown.

5. **Vendor sees seats (Partner Portal)**  
   Vendor-hub **GET /api/transport-bookings?date=YYYY-MM-DD** loads buses (and schedules) from the vendor DB, then for each bus calls the **main app**:
   - **GET /api/bookings/for-bus?bus_id=...&date=...&listing_name=...&bus_name=...**  
     → Returns bookings for that bus on that date (by `bus_id` + date; if `listing_name` and `bus_name` are sent, also rows where `bus_id` is null but names + date match).
   - **GET /api/bookings/booked-seats?bus_id=...&date=...**  
     → Returns which seat numbers are already booked (for the seat map).  
   Vendor-hub computes **“Seats Booked”** from the `for-bus` response and marks those seats as booked in the UI.

---

## 2. Why status doesn’t show on the user side

- The **`transport_bookings`** table has **no `status` (or `payment_status`) column**.  
  So **GET /api/bookings** only returns: bookingId, bus, selectedSeats, travelDate, routeFrom, routeTo, totalCents, passenger info, **bookedAt**. It does **not** return a status.
- In **My Trip**, bus cards currently show a **hardcoded** “Confirmed” label. So the user always sees “Confirmed” for bus; there is no real status from the DB.
- If a booking **does not appear at all** in My Trip, common causes are:
  1. **No active trip (fixed):** Previously, when the user had no active trip, the app did not call GET /api/bookings and showed zero bus bookings. Now bus bookings are loaded even when there is no active trip (all user’s bus bookings).
  2. **User not logged in at payment:** If the user was not logged in when they completed payment, **POST /api/bookings** is never sent, so the booking exists only in localStorage. When they later open My Trip, the list is filled from the API, so that booking is missing (unless we later add merging of localStorage + API).
  3. **Trip filter:** When there *is* an active trip, only bookings with that **trip_id** are shown. If the booking was created with a different trip_id or null, it won’t appear when that trip is selected.

To show a real status on the user side you would:
- Add a **`status`** (or `payment_status`) column to **`transport_bookings`**, set it on POST (e.g. `'confirmed'` or `'paid'`), and include it in **GET /api/bookings**, then use it in My Trip and optionally in **TicketCard**.

---

## 3. Why vendor side doesn’t show seats / booked count / bus structure

- **Bus structure** (rows, left_cols, right_cols, etc.) comes from the **vendor-hub DB** (buses and listings). It is **not** updated by the main app when a user books; the main app only writes to **`transport_bookings`**. So the bus layout itself is correct as long as the vendor has set it; “not getting updated” here usually means **which seats are booked** or **how many seats are booked**, not the physical layout.
- **Booked seats** and **seats count** come from the **main app**:
  - **for-bus** and **booked-seats** both filter by **`bus_id`** and **`travel_date`**.
- So the vendor will see **0 or wrong seats** when:

  1. **Different databases**  
     Main app and vendor-hub use different **DATABASE_URL** (or vendor-hub uses a different DB for transport). Then `transport_bookings` in the main app is not the same as what vendor-hub’s main-app client sees. **Fix:** Use the same **DATABASE_URL** for both apps so they share the same `transport_bookings` table.

  2. **`bus_id` (or listing_id) not stored**  
     If the user’s **POST /api/bookings** did not receive or store **bus_id** (e.g. missing from `state.bus.busId` on success page), the row is saved with **bus_id = null**.  
     - **for-bus** can still find it if vendor-hub passes **listing_name** and **bus_name** (fallback match by travel_date + names).  
     - **booked-seats** has **no** such fallback; it only filters by `bus_id` and date, so those seats will **not** show as booked on the seat map.  
     **Fix:** Ensure the booking flow always sends **busId** (and ideally **listingId**) from the selected bus into **BookingSuccessPage** and into **POST /api/bookings**, so every row has a non-null **bus_id**.

  3. **MAIN_APP_API_URL**  
     Vendor-hub must call the same main app that the user’s browser uses. If **MAIN_APP_API_URL** is wrong or the main app is down, **for-bus** and **booked-seats** fail and the vendor sees empty data.

  4. **Date mismatch**  
     **for-bus** and **booked-seats** use **travel_date**. If the vendor’s calendar date or the stored **travel_date** format/timezone differs, rows may not match.

---

## 4. Summary of fixes and recommendations

| Issue | Cause | Fix / recommendation |
|-------|--------|----------------------|
| Bus bookings not showing in My Trip when user has no active trip | My Trip only called GET /api/bookings when `activeTripId` was set | **Done:** My Trip now loads bus bookings when logged in even without an active trip (GET /api/bookings without trip_id). |
| No real “status” for bus in Bookings | No status column in `transport_bookings`; API doesn’t return status | Add `status` (or `payment_status`) to DB and API; show it in My Trip and TicketCard. |
| Vendor sees “Seats Booked: 0” or wrong seats | Different DB, or bus_id null, or MAIN_APP_API_URL wrong | Same DATABASE_URL for both apps; always send/store busId (and listingId); verify MAIN_APP_API_URL; optionally extend booked-seats with listing_name/bus_name fallback. |
| Bus structure “not updated” | Bus layout is in vendor DB; main app only writes bookings | Clarify: layout is vendor-defined; only booked-seats come from main app. Ensure bus_id is stored so booked-seats and for-bus both return data. |

---

## 5. Relevant files

- **Main app:**  
  `backend/src/routes/bookings.ts` (GET /, POST /, GET /for-bus, GET /booked-seats),  
  `backend/schema/007_transport_bookings.sql`, `008_transport_bookings_bus_id.sql`
- **User app:**  
  `src/pages/BookingSuccessPage.tsx`, `src/pages/MyTrip.tsx`, `src/pages/BookingMarketplace.tsx`, `src/lib/bookingsStorage.ts`
- **Vendor-hub:**  
  `vendor-hub-main/backend/src/routes/transportBookings.ts`,  
  `vendor-hub-main/src/pages/Bookings.tsx`
