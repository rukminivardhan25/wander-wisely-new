# Car booking request: where it is sent and where it appears (vendor side)

## 1. Where the request is sent (user side)

When the user clicks **Book** on a car (e.g. innova, Mumbai → Kolkata):

| Step | What happens |
|------|----------------|
| **Frontend** | User app (e.g. `http://localhost:8080`) → **BookingMarketplace** sends a **POST** request. |
| **API URL** | `http://localhost:3001/api/car-bookings` (main app backend). |
| **Backend** | **Main app** backend (`backend/`, runs on port **3001**) receives the request. |
| **Route** | `backend/src/routes/carBookings.ts` → **POST /** (create car booking). |
| **Database** | Backend uses **DATABASE_URL** (single database) and inserts a row into the **`car_bookings`** table. |

So the booking request is sent to the **main app backend** and stored in the **database** (same as `DATABASE_URL`).

---

## 2. Where it appears on the vendor side

| Step | What happens |
|------|----------------|
| **Vendor Hub** | Vendor opens **Vendor Hub** (e.g. `http://localhost:8081`) → **Bookings** in the left menu. |
| **Page** | **Bookings** → **Transport** tab → **Car** sub-tab. |
| **Data** | Vendor Hub frontend calls the **Vendor Hub backend** (port **3002**): **GET /api/listings/:listingId/car-bookings** for each transport listing. |
| **Backend** | **Vendor Hub** backend (`vendor-hub-main/backend/`) → `routes/carBookings.ts` → **GET /** (list car bookings). It reads from the same database (**DATABASE_URL**). |
| **Where it shows** | Same bookings appear in: (1) **“Booking requests”** table (all requests for the selected date), and (2) **“View Details”** sidebar for a car (filtered by that car and date). Vendors can **Accept** or **Reject** from the table or from the sidebar. |

So the request **appears on the vendor side** only if the **vendor hub reads from the same database** where the main app wrote the row.

---

## 3. One database for both (required)

- **Main app** writes to the database given by **`DATABASE_URL`** in **main app** `backend/.env`.
- **Vendor hub** reads from the database given by **`DATABASE_URL`** in **vendor-hub** `vendor-hub-main/backend/.env`.

For the vendor to see the request, **both must use the same database**: set **`DATABASE_URL`** to the **same URL** in both backends.

See **docs/CAR_BOOKINGS_SETUP.md** for step-by-step setup.

---

## 4. Quick reference

| Role | App | Backend port | Where request goes / comes from |
|------|-----|--------------|---------------------------------|
| **User clicks Book** | Main app (8080) | Main app API (3001) | **POST** `http://localhost:3001/api/car-bookings` → row inserted into **car_bookings** (transport DB). |
| **Vendor sees request** | Vendor Hub (8081) | Vendor Hub API (3002) | **GET** `http://localhost:3002/api/listings/<id>/car-bookings` → reads **car_bookings** from same DB. |
| **Vendor accepts/rejects** | Vendor Hub (8081) | Vendor Hub API (3002) | **PATCH** `.../car-bookings/:id/accept` or **.../reject** → updates same **car_bookings** row. |

**Vendor UI:** **Bookings** (left menu) → **Transport** → **Car** → date picker → **“Booking requests”** table and **“View Details”** on each scheduled car.
