# Hotel "Pay Now" not visible after vendor approval — checklist

Use this checklist when the user does not see **Pay Now** after the vendor has approved a hotel booking. The button appears **only** when `status === "approved_awaiting_payment"` (or the legacy `"approved"`) and the user app has fresh data.

---

## 1. Booking status is NOT `approved_awaiting_payment`

**What the UI depends on:** Pay Now is shown only when:

- `status === "approved_awaiting_payment"` (or `"approved"` or string contains both "awaiting" and "payment").

**In this codebase:**

- **Vendor approval** (`vendor-hub-main/backend/src/routes/hotelBookings.ts`):  
  `PATCH /api/listings/:listingId/hotel-bookings/:bookingId/approve` sets  
  `status = 'approved_awaiting_payment'` in the DB. ✅

- **User pay** (`backend/src/routes/hotelBookings.ts`):  
  `PATCH /api/hotel-bookings/:id/pay` accepts both `approved_awaiting_payment` and `approved`. ✅

**Verify:**  
`SELECT status FROM hotel_bookings WHERE id = '<booking_id>';`  
Must be exactly `approved_awaiting_payment` (or `approved`).

---

## 2. Vendor approval API did not persist

**In this codebase:**

- Route: **PATCH** (not POST) `/api/listings/:listingId/hotel-bookings/:bookingId/approve`.
- **Required body:** `roomNumber` (string, non-empty). If missing → **400** "roomNumber is required" and status is **not** updated.
- Vendor UI (`vendor-hub-main/src/pages/Bookings.tsx`) validates: "Room number is required." before calling the API.

**Verify:**

- Network tab: PATCH to `.../approve` returns **200**.
- Server logs for that request (no 500 / validation error).

---

## 3. User app using cached / old booking data

**In this codebase:**

- **My Trip** (`src/pages/MyTrip.tsx`):  
  - Fetches hotel bookings in `loadBookings()` (GET `/api/hotel-bookings`).  
  - `loadBookings()` runs on mount and on **window `focus`**. So refetch happens when the user returns to the tab.  
  - If the user never leaves the My Trip tab and never refocuses, they can still see old data until refresh.

- **Hotel receipt page** (`src/pages/HotelReceipt.tsx`):  
  - Fetches once in `useEffect([id, token])`.  
  - **No** refetch on focus or polling. If the user had the receipt open while the vendor approved, they will not see Pay Now until they refresh or navigate away and back.

**Verify:**  
Hard refresh or refetch (e.g. go to My Trip and back). If Pay Now appears → caching was the cause.

---

## 4. UI logic checking the wrong condition

**In this codebase:**

- **My Trip** and **HotelReceipt** use the **raw** `booking.status`:
  - `canPay` / `isAwaitingPayment` = `status === "approved_awaiting_payment"` OR `status === "approved"` OR `(status.includes("awaiting") && status.includes("payment"))`.
- Pay Now is shown when `canPay` / `isAwaitingPayment` is true. No label-based condition. ✅

---

## 5. Booking already `confirmed`

If `status = 'confirmed'` and `paid_at IS NOT NULL`, Pay Now is correctly hidden.

**Verify:**  
`SELECT status, paid_at FROM hotel_bookings WHERE id = '<id>';`

---

## 6. Wrong booking / environment

- User and vendor must see the **same** booking (same ID, same user).
- **Main app** and **vendor-hub** must use the **same** database for `hotel_bookings`.  
  - Main app: `backend` uses `DATABASE_URL`.  
  - Vendor-hub: `vendor-hub-main/backend` uses `DATABASE_URL` (and optionally `TRANSPORT_DATABASE_URL` for transport; hotel uses default pool).  
  If they point to different DBs, vendor approval updates one DB and the user app reads from the other → Pay Now never appears.

**Verify:**  
Same `DATABASE_URL` in both backends (see `.env.example` in both).

---

## 7. Raw status vs label (button uses label)

**In this codebase:**  
Button visibility is driven by **raw** `booking.status` (`canPay` / `isAwaitingPayment`), not by the displayed label. ✅

---

## Extra cause found and fixed in this repo

**Pay Now hidden on receipt when vendor does not set total**

- On **HotelReceipt**, the Pay now button was inside a block that rendered only when `booking.totalCents != null`.
- If the vendor approved with **room number only** (no total), `totalCents` stayed null and the Pay now button was **never shown** on the receipt page, even though status was `approved_awaiting_payment`.
- **Fix:** Show a separate “Pay now” block when `isAwaitingPayment && booking.totalCents == null` so the button is visible even when the hotel has not set the amount yet.

---

## Single-page debug order

1. DB: `status === approved_awaiting_payment`.
2. Vendor approval PATCH returned 200; server logs clean.
3. User app refetched (refresh or focus on My Trip; refresh on receipt page if needed).
4. Frontend uses exact status string (confirmed above).
5. `paid_at` is NULL.
6. Same booking, same user, same DB for main app and vendor-hub.
7. Button logic uses raw status (confirmed above).

**One-line truth:**  
Pay Now appears only when the booking status is exactly `approved_awaiting_payment` (or `approved`), the user app has fetched that status, and the booking is not already paid. In this repo, also ensure the receipt page shows Pay now when approved even if `totalCents` is null (fix applied).
