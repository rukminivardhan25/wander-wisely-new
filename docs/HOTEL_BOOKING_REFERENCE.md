# Hotel booking process — reference

Single reference for the hotel booking flow: statuses, steps, **all files involved**, and Pay Now debugging.

---

## Status flow

| Status (in DB)              | Meaning                         | User sees (label)        | User can do              |
|-----------------------------|---------------------------------|--------------------------|---------------------------|
| `pending_vendor`            | Request sent, waiting for hotel | **Pending approval**     | View request              |
| `approved_awaiting_payment` | Hotel approved, room allotted   | **Bill ready — Pay now** | Pay now, View bill        |
| `confirmed`                 | User has paid                   | **Confirmed**            | View receipt              |
| `rejected`                  | Hotel declined                  | **Rejected**             | —                         |

**Steps:** User requests → Vendor approves (room + optional total) → User pays → Confirmed. Admin/vendor payouts use only `confirmed` + `paid_at`.

---

## All files involved in the hotel booking process

### User app (main frontend)

| File | Role |
|------|------|
| `src/pages/BookingMarketplace.tsx` | User selects hotel, dates, room, guest details; submits request (POST hotel booking). |
| `src/pages/MyTrip.tsx` | Lists hotel bookings, shows status and Pay now / View request / View bill / View receipt; calls pay API and refetches. |
| `src/pages/HotelReceipt.tsx` | Single booking view (bill/receipt): status, Pay now when approved, download receipt. |
| `src/lib/api.ts` | `apiFetch` used for all user-app API calls (including hotel-bookings). |

### Main app backend (user API + DB)

| File | Role |
|------|------|
| `backend/src/routes/hotelBookings.ts` | User API: GET list, POST create, GET by id, PATCH pay. Reads/writes `hotel_bookings`. |
| `backend/src/index.ts` | Mounts `/api/hotel-bookings` routes. |
| `backend/schema/013_hotel_bookings.sql` | Creates `hotel_bookings` table. |
| `backend/schema/014_hotel_bookings_room_type.sql` | Adds room_type (and related) to hotel bookings. |
| `backend/schema/016_booking_trip_id.sql` | Adds `trip_id` to hotel_bookings. |
| `backend/schema/024_hotel_bookings_paid_at.sql` | Adds `paid_at` for confirmed payments. |
| `backend/scripts/run-schema.ts` | Runs schema (includes 013, 014, 016, 024). |

### Vendor hub (partner portal frontend)

| File | Role |
|------|------|
| `vendor-hub-main/src/pages/Bookings.tsx` | Hotel section: list by listing/date, “Approved (await payment)” etc., approve/reject dialogs, calls vendor hotel-bookings API. |

### Vendor hub backend (vendor API)

| File | Role |
|------|------|
| `vendor-hub-main/backend/src/routes/hotelBookings.ts` | Vendor API: GET list by listing, GET one, PATCH approve (sets `approved_awaiting_payment` + room/total), PATCH reject. |
| `vendor-hub-main/backend/src/routes/listingsIndex.ts` | Mounts nested routes under listings, including `hotel-bookings`. |
| `vendor-hub-main/backend/src/index.ts` | Registers listing routes (which include hotel-bookings). |

### Admin / other (read-only or side effects)

| File | Role |
|------|------|
| `backend/src/routes/adminBookings.ts` | Admin view of bookings (reads hotel_bookings). |
| `backend/src/routes/adminPayouts.ts` | Payouts use hotel_bookings (e.g. confirmed + paid_at). |
| `backend/src/routes/adminUsers.ts` | Links users to hotel_bookings for admin. |
| `backend/src/routes/bookingReviews.ts` | Can resolve hotel booking for reviews. |
| `vendor-hub-main/backend/src/routes/payouts.ts` | Vendor payouts use hotel_bookings (e.g. listing revenue). |
| `vendor-hub-main/backend/src/routes/dashboard.ts` | Dashboard stats can use hotel bookings. |
| `vendor-hub-main/src/pages/Payouts.tsx` | Shows revenue; can show hotel in listing/payout context. |

### Docs

| File | Role |
|------|------|
| `docs/HOTEL_BOOKING_FLOW.md` | Status flow and user-facing labels. |
| `docs/HOTEL_PAY_NOW_DEBUG_CHECKLIST.md` | Checklist when Pay Now doesn’t show (DB, API, cache, UI). |
| `docs/HOTEL_BOOKING_REFERENCE.md` | This file — single reference for flow + all files. |

---

## Core flow (minimal set)

1. **User:** `BookingMarketplace.tsx` → **Backend:** `backend/src/routes/hotelBookings.ts` (POST).
2. **Vendor:** `vendor-hub-main/src/pages/Bookings.tsx` → **Vendor backend:** `vendor-hub-main/backend/src/routes/hotelBookings.ts` (PATCH approve).
3. **User:** `MyTrip.tsx` or `HotelReceipt.tsx` → **Backend:** `backend/src/routes/hotelBookings.ts` (GET, PATCH pay).

All read/write the same **`hotel_bookings`** table; main app and vendor-hub must use the **same database** for this to work.

---

## Pay Now not visible — quick checklist

1. **DB:** `status = approved_awaiting_payment` for that booking.
2. **Vendor API:** PATCH approve returned 200; `roomNumber` sent.
3. **User app:** Refetch (refresh or focus My Trip tab); receipt page has no auto-refresh.
4. **UI:** Button uses raw status (`approved_awaiting_payment` / `approved`), not label.
5. **Not already paid:** `paid_at` is NULL.
6. **Same env:** Same DB and same user for user app and vendor portal.

See **`docs/HOTEL_PAY_NOW_DEBUG_CHECKLIST.md`** for the full checklist and code references.
