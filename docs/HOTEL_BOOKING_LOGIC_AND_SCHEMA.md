# Hotel booking — logic, database schema, and end-to-end flow

This document describes the **database schema**, **status logic**, and **end-to-end flow** for hotel bookings.

---

## 1. Database schema

### Table: `hotel_bookings`

Hotel bookings live in a **single table** shared by the main app (user) and the vendor hub. Both backends must use the **same database** (`DATABASE_URL`).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | Primary key. |
| `user_id` | uuid | NOT NULL | — | Guest (user app). |
| `hotel_branch_id` | uuid | NOT NULL | — | Which branch (from vendor’s `hotel_branches`). |
| `listing_id` | uuid | NOT NULL | — | Vendor’s listing (from `listings`). |
| `booking_ref` | text | NOT NULL | — | Human-readable ref, e.g. `HTL-XXXX-YYYY`. |
| `check_in` | date | NOT NULL | — | Check-in date (YYYY-MM-DD). |
| `check_out` | date | NOT NULL | — | Check-out date. |
| `nights` | int | NOT NULL | 1 | Number of nights. |
| `guest_name` | text | NOT NULL | — | Guest name. |
| `guest_phone` | text | NULL | — | Guest phone. |
| `guest_email` | text | NULL | — | Guest email. |
| `requirements_text` | text | NULL | — | Special requests. |
| `document_urls` | jsonb | NULL | `'[]'` | Array of `{ label, url }` for docs. |
| `status` | text | NOT NULL | `'pending_vendor'` | See status flow below. |
| `room_number` | text | NULL | — | Set by vendor on approve (e.g. "101"). |
| `total_cents` | int | NULL | — | Bill amount in paise; **required** on vendor approve. |
| `vendor_notes` | text | NULL | — | Message from hotel (e.g. on approve). |
| `rejection_reason` | text | NULL | — | Reason given by hotel when rejecting (schema 025). |
| `room_type` | text | NULL | — | Room type name chosen by user (schema 014). |
| `trip_id` | uuid | NULL | — | Optional link to user’s trip (schema 016). |
| `created_at` | timestamptz | NOT NULL | `now()` | When request was created. |
| `updated_at` | timestamptz | NOT NULL | `now()` | Last update. |
| `paid_at` | timestamptz | NULL | — | When user paid; set with status → confirmed (schema 024). |

### Indexes

- `idx_hotel_bookings_user_id` — list by user.
- `idx_hotel_bookings_listing_id` — list by vendor listing.
- `idx_hotel_bookings_hotel_branch_id` — filter by branch.
- `idx_hotel_bookings_status` — filter by status.
- `idx_hotel_bookings_trip_id` — filter by trip (schema 016).

### Dependencies

- **Logical:** `hotel_branch_id` and `listing_id` refer to the vendor’s `hotel_branches` and `listings` (same DB). There are no DB foreign keys in 013; the app assumes those tables exist.
- **Same DB:** Main app and vendor-hub both read/write `hotel_bookings`; they must use the same `DATABASE_URL`.

### Schema files (in order)

| File | Change |
|------|--------|
| `013_hotel_bookings.sql` | Creates `hotel_bookings` and indexes. |
| `014_hotel_bookings_room_type.sql` | Adds `room_type`. |
| `016_booking_trip_id.sql` | Adds `trip_id` + index. |
| `024_hotel_bookings_paid_at.sql` | Adds `paid_at`. |
| `025_hotel_bookings_rejection_reason.sql` | Adds `rejection_reason`. Run this on the shared DB so vendor reject and user receipt can use it. |

---

## 2. Status flow and business logic

### Allowed status values

| Status | Set when | Meaning |
|--------|----------|---------|
| `pending_vendor` | On create | Request sent; waiting for hotel to approve. |
| `approved_awaiting_payment` | Vendor approve | Hotel approved and allotted room; user must pay. |
| `confirmed` | User pay | User paid; booking is final. |
| `rejected` | Vendor reject | Hotel declined the request. |

### Transitions (only these are valid)

```
pending_vendor
    ├── approved_awaiting_payment   (vendor approve)
    └── rejected                    (vendor reject)

approved_awaiting_payment
    └── confirmed                   (user pay)
```

- **Create:** Always inserts with `status = 'pending_vendor'`.
- **Approve:** Allowed only when current status is `pending_vendor`; sets `approved_awaiting_payment` and sets `room_number` (required), optionally `total_cents`, `vendor_notes`.
- **Reject:** Allowed from `pending_vendor`; sets `rejected`.
- **Pay:** Allowed only when status is `approved_awaiting_payment` or `approved`; sets `confirmed` and `paid_at = now()`.

### Validation rules

- **Create (user):**  
  `hotelBranchId`, `listingId`, `checkIn`/`checkOut` (YYYY-MM-DD), `nights` (1–90), `guestName` (non-empty). Optional: `tripId`, `guestPhone`, `guestEmail`, `requirementsText`, `documentUrls`, `roomType`, `totalCents`.
- **Approve (vendor):**  
  `roomNumber` is **required** (non-empty string). **`totalCents` is required** (non-negative integer, amount in paise). Optional: `vendorNotes` (string). Booking must belong to vendor’s listing and be in `pending_vendor`.
- **Pay (user):**  
  Booking must belong to the current user and be in **`approved_awaiting_payment`** only (legacy `approved` is no longer used).

- **Reject (vendor):**  
  Optional body: `rejectionReason` (string); stored in `rejection_reason` for the user to see.

---

## 3. Cancellation rules

- **Pending (`pending_vendor`):** No payment has been taken. The vendor can **reject** with an optional reason; the user sees “Rejected” and any `rejection_reason` on the receipt.
- **Approved awaiting payment (`approved_awaiting_payment`):** Vendor has set room and total. The user can **pay** to confirm. There is no “cancel” API in this flow; if the user does not pay, the booking remains in this state (vendor could implement a separate “withdraw approval” or timeout policy).
- **Confirmed:** Payment recorded. No cancellation or refund flow is implemented in the current schema or APIs; cancellation/refund would require new status values and/or APIs.
- **Rejected:** Final; no further action.

---

## 4. Rejection reason and polling

- **Rejection reason:** Column `rejection_reason` (schema 025) stores an optional reason when the vendor rejects. The vendor hub reject API accepts `rejectionReason` in the body. The user app receipt page shows it when status is `rejected`.
- **Polling recommendation for UI:** After the vendor approves or rejects, the user may still have the My Trip or receipt page open. To avoid “stale” state:
  - **My Trip:** Refetch runs on **window focus** (user switches back to the tab). For a smoother experience, consider polling **GET /api/hotel-bookings** every 15–30 seconds while the booking is in `pending_vendor`, and stop when status changes or the user navigates away.
  - **Receipt page:** Currently no polling; the user must refresh or go back to My Trip and return. Optionally poll **GET /api/hotel-bookings/:id** every 10–15 seconds while status is `pending_vendor`.

---

## 5. End-to-end flow

### Step 1: User sends request (main app)  

1. **User:** In `BookingMarketplace.tsx`, selects hotel branch, dates, room type, guest details, optional docs.
2. **Frontend:** POST to main backend:
   - **URL:** `POST /api/hotel-bookings`
   - **Body:** `hotelBranchId`, `listingId`, `checkIn`, `checkOut`, `nights`, `guestName`, optional `tripId`, `guestPhone`, `guestEmail`, `requirementsText`, `documentUrls`, `roomType`, `totalCents`.
3. **Backend:** `backend/src/routes/hotelBookings.ts`:
   - Validates with Zod `createSchema`.
   - Generates `booking_ref` (e.g. `HTL-XXXX-YYYY`).
   - **INSERT** into `hotel_bookings` with `status = 'pending_vendor'`.
   - Returns `201` with `id`, `bookingRef`, `status: "pending_vendor"`.
4. **DB after:** One row with `status = 'pending_vendor'`, no `room_number` / `paid_at`.

---

### Step 2: Vendor approves or rejects (vendor hub)

**Approve:**

1. **Vendor:** In Partner Portal → Bookings → Hotel, opens request, enters **room number** (required) and optionally total amount and notes; clicks Approve.
2. **Frontend:** PATCH to vendor backend:
   - **URL:** `PATCH /api/listings/:listingId/hotel-bookings/:bookingId/approve`
   - **Body:** `roomNumber` (required), optional `totalCents`, `vendorNotes`.
3. **Backend:** `vendor-hub-main/backend/src/routes/hotelBookings.ts`:
   - Ensures listing is owned by vendor.
   - Ensures booking exists and `status = 'pending_vendor'`.
   - **UPDATE** `hotel_bookings` SET `status = 'approved_awaiting_payment'`, `room_number = $1`, `total_cents = COALESCE($2, total_cents)`, `vendor_notes = $5`, `updated_at = now()` WHERE `id` and `listing_id` match.
   - Returns `200` with `ok: true`, `status: "approved_awaiting_payment"`, `roomNumber`.
4. **DB after:** Same row now has `status = 'approved_awaiting_payment'`, `room_number` set, optionally `total_cents` and `vendor_notes`.

**Reject:**

1. Vendor clicks Reject.
2. **URL:** `PATCH /api/listings/:listingId/hotel-bookings/:bookingId/reject`.
3. **UPDATE** `status = 'rejected'`, `updated_at = now()`.
4. **DB after:** `status = 'rejected'`.

---

### Step 3: User pays (main app)

1. **User:** On My Trip or Hotel Receipt page, sees “Bill ready — Pay now” when status is `approved_awaiting_payment`; clicks **Pay now**.
2. **Frontend:** PATCH to main backend:
   - **URL:** `PATCH /api/hotel-bookings/:id/pay`
   - **Headers:** `Authorization: Bearer <user token>`
   - No body.
3. **Backend:** `backend/src/routes/hotelBookings.ts`:
   - Loads booking by `id` and `user_id`.
   - If not found → 404.
   - If status is not `approved_awaiting_payment` or `approved` → 400 “Booking is not awaiting payment…”
   - **UPDATE** `hotel_bookings` SET `status = 'confirmed'`, `paid_at = now()`, `updated_at = now()` WHERE `id` and `user_id`.
   - Returns `200` with `ok: true`, `status: "confirmed"`, `bookingRef`, `totalCents`, `paidAt`.
4. **DB after:** Same row has `status = 'confirmed'`, `paid_at` set. This is the final state for a successful booking.

---

### Step 4: User sees list and receipt (main app)

- **List:** `GET /api/hotel-bookings` or `GET /api/hotel-bookings?trip_id=<uuid>` returns all columns needed for cards (including `status`, `room_number`, `total_cents`, `paid_at`). Main app filters by `user_id`; optional `trip_id` filter.
- **One booking:** `GET /api/hotel-bookings/:id` returns full detail (including branch/listing names, `vendor_notes`) for the receipt/bill page. Used by `HotelReceipt.tsx`.

---

## 6. API summary (who and where)

| Who | Method | URL | Purpose |
|-----|--------|-----|---------|
| User app | GET | `/api/hotel-bookings` | List my bookings (optional `?trip_id=`). |
| User app | POST | `/api/hotel-bookings` | Create request → `pending_vendor`. |
| User app | GET | `/api/hotel-bookings/:id` | Get one (receipt/bill). |
| User app | PATCH | `/api/hotel-bookings/:id/pay` | Pay → `confirmed` + `paid_at`. |
| Vendor hub | GET | `/api/listings/:listingId/hotel-bookings` | List requests for this listing. |
| Vendor hub | GET | `/api/listings/:listingId/hotel-bookings/:bookingId` | Get one (vendor detail). |
| Vendor hub | PATCH | `/api/listings/:listingId/hotel-bookings/:bookingId/approve` | Approve → `approved_awaiting_payment` + room/total/notes. |
| Vendor hub | PATCH | `/api/listings/:listingId/hotel-bookings/:bookingId/reject` | Reject → `rejected`. |

All of the above read or write the same **`hotel_bookings`** table. Payouts and admin reports use `status = 'confirmed'` and `paid_at IS NOT NULL` to count paid hotel bookings.

---

## 7. One-line summary

**Database:** One table `hotel_bookings` with status, guest and stay details, optional `trip_id`, and `room_number` / `total_cents` / `paid_at` set by vendor and user actions.  
**Logic:** `pending_vendor` → (vendor approve → `approved_awaiting_payment`) or (vendor reject → `rejected`); then user pay → `confirmed` + `paid_at`.  
**End-to-end:** User creates in main app → vendor approves/rejects in vendor hub → user pays in main app; both apps use the same DB.
