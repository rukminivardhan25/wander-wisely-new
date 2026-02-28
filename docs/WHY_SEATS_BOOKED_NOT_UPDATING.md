# Why "Number of people booked" (Seats Booked) does not update

## How it works now (single source of truth)

- **Main app:** When a user books, it inserts a row into **`transport_bookings`** in the database.
- **Vendor-hub:** Reads bus bookings **directly from the same `transport_bookings` table** (no HTTP call to the main app). So as soon as a booking is in the DB, the vendor sees it on the next load.
- **Requirement:** Main app and vendor-hub must use the **same DATABASE_URL**. Then "Seats Booked" and the seat map stay in sync.

---

## Where the number comes from (detail)
   - **Vendor-hub:** `GET /api/transport-bookings?date=YYYY-MM-DD`
2. Vendor-hub loads **buses** (and schedules) for that date from **its own database**.
3. For **each bus**, vendor-hub then calls the **main app**:
   - **Main app:** `GET /api/bookings/for-bus?bus_id=<bus_uuid>&date=YYYY-MM-DD&listing_name=...&bus_name=...`
4. The **main app** reads from the **main app’s** `transport_bookings` table and returns all bookings for that bus on that date.
5. Vendor-hub counts:
   - **Number of people booked** = sum of (each booking’s number of seats)  
   - i.e. `seatsBooked = bookings.reduce((sum, b) => sum + b.seats.length, 0)`
6. That **seatsBooked** is what you see as “Seats Booked: X / Y” in the Partner Portal.

So: **the number only updates when the main app returns those bookings.** If the main app returns an empty list, the number stays **0**.

---

## When does the main app return 0 bookings?

The main app returns bookings only for rows in **its** `transport_bookings` table that match:

- **Same date** as the one you selected (`travel_date`).
- **Same bus**, in one of two ways:
  - **By bus id:** `bus_id` in the row = the bus uuid vendor-hub asked for, **or**
  - **By names (fallback):** `bus_id` is null but `listing_name` and `bus_name` match (case-insensitive) what vendor-hub sent.

So the count stays 0 when **no such row exists** or **no row matches**. That happens in these cases:

---

### 1. Booking was never saved in the main app

- User completed payment on the **user app**, but **POST /api/bookings** was never called or failed.
- **Typical case:** user was **not logged in** when they paid. The success page only calls the main app when the user has a token; if not, the booking stays only in the browser (localStorage) and is **never written** to `transport_bookings`.
- **Result:** Main app has no row → for-bus returns [] → **Seats Booked: 0**.

**What to do:** Ensure the user is logged in when they complete bus payment, or change the flow so the booking is sent to the main app even when not logged in (e.g. after login).

---

### 2. Wrong or missing `bus_id` in the saved row

- When the user books, the main app saves a row with **`bus_id`** = the bus they selected (and optionally `listing_name`, `bus_name`).
- If the **user app** never sent **`bus.busId`** (e.g. bus came from a different API or missing in state), the row is stored with **`bus_id = null`**.
- Then the main app’s **for-bus** can still find it **only** if vendor-hub sends **listing_name** and **bus_name** and they **match exactly** (after trim/lowercase) the values stored in that row. If names differ (spaces, spelling, different source), no row matches → **Seats Booked: 0**.

**What to do:** Ensure the bus selection flow always sends **busId** (and ideally listingId) to the success page and to **POST /api/bookings**, so every booking is stored with a non-null **bus_id**. Then the count will match by bus id.

---

### 3. Date mismatch

- Vendor picks a date (e.g. `2025-03-01`). The main app filters by **`travel_date = that date`**.
- If the user’s booking was stored with a **different** `travel_date` (e.g. different format or timezone), the main app won’t find it.
- **Result:** for-bus returns [] → **Seats Booked: 0**.

**What to do:** Use the same date format (YYYY-MM-DD) on user app and vendor-hub and store `travel_date` as a plain date.

---

### 4. Main app and vendor-hub use different data

- **Vendor-hub** calls the main app API (**MAIN_APP_API_URL**). The **main app** then queries **its own** database (`transport_bookings`).
- If the **user** submitted the booking to a **different** main app URL (e.g. different server or port), that request wrote to **another** database. When vendor-hub calls **your** main app, it queries **your** DB and finds no row.
- **Result:** **Seats Booked: 0**.

**What to do:** Use one main app backend and one database for both:
- The same **MAIN_APP_API_URL** that the user’s browser uses for **POST /api/bookings**.
- The main app and vendor-hub should use the **same DATABASE_URL** for `transport_bookings` (or the main app is the only one writing/reading that table, but it must be the same DB the user’s POST writes to).

---

### 5. Vendor-hub cannot reach the main app

- If the request from vendor-hub to **GET /api/bookings/for-bus** fails (wrong **MAIN_APP_API_URL**, main app down, network, CORS, etc.), vendor-hub catches the error and uses an **empty list**.
- **Result:** **Seats Booked: 0** even when there are bookings in the main app DB.

**What to do:** Check **MAIN_APP_API_URL** in vendor-hub’s env, ensure the main app is running and reachable from the server running vendor-hub, and check server logs if the fetch fails (vendor-hub logs a warning when the fetch fails).

---

## Summary

| Cause | Why the number doesn’t update |
|-------|-------------------------------|
| User not logged in at payment | Booking never saved in main app → for-bus returns [] → 0. |
| `bus_id` not sent or null + names don’t match | Main app can’t match the row to the bus → 0. |
| Date mismatch | No row with that travel_date → 0. |
| Different main app / DB | User’s booking is in another DB; your main app has no row → 0. |
| for-bus request fails | Vendor-hub uses [] → 0. |

The number **will** update when:

- The user is logged in when they pay, so **POST /api/bookings** runs and inserts a row.
- That row has the correct **bus_id** (or matching listing_name + bus_name) and **travel_date**.
- Vendor-hub calls the **same** main app that received the POST, and that main app uses the **same** database where the row was stored.
- The **GET /api/bookings/for-bus** request succeeds.

So: **fix the chain from “user pays” → “main app has one row per booking with correct bus_id and date” → “vendor-hub calls that main app and gets that row”**, and the number of people booked will update correctly.
