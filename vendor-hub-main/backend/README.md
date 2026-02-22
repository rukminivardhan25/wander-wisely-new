# Vendor Hub Backend

API for the Vendor Hub frontend: vendor auth, listings, and bookings.

## Stack

- Node.js, Express, TypeScript
- PostgreSQL (same DB as Wander Wisely or a separate one)
- JWT auth, bcrypt, zod

## Setup

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — secret for signing JWTs
   - `PORT` — default `3002`
   - `CORS_ORIGIN` — e.g. `http://localhost:8080` (Vendor Hub frontend)

2. Install and run schema:

   ```sh
   npm install
   npm run db:init
   ```

3. Start the server:

   ```sh
   npm run dev
   ```

API base: `http://localhost:3002`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/signup` | No | Vendor signup (email, password, business_name, plan?) |
| POST | `/api/auth/signin` | No | Vendor signin (email, password) |
| GET | `/api/listings` | Bearer | List my listings |
| GET | `/api/listings/:id` | Bearer | Get one listing |
| POST | `/api/listings` | Bearer | Create listing (name, type, status?, description?, cover_image_url?) |
| PATCH | `/api/listings/:id` | Bearer | Update listing |
| DELETE | `/api/listings/:id` | Bearer | Delete listing |
| GET | `/api/bookings` | Bearer | List bookings for my listings |
| GET | `/api/bookings/:id` | Bearer | Get one booking |

Listing `type`: `restaurant` \| `event` \| `experience` \| `hotel` \| `transport` \| `other`  
Listing `status`: `draft` \| `pending_approval` \| `live`

## Schema

- **vendors** — id, email, password_hash, business_name, plan, verified, created_at, updated_at
- **listings** — id, vendor_id, name, type, status, description, cover_image_url, created_at, updated_at
- **vendor_bookings** — id, listing_id, customer_name, customer_email, status, payment_status, amount_cents, guests, booked_at, booked_for_date, notes

Run `npm run db:init` to create tables (uses `schema/*.sql`).

## Database: connection and tables

- **Nothing is ever deleted.** All schema files use `create table if not exists` and `create index if not exists` only. No `DROP`, `TRUNCATE`, or `DELETE` in migrations.

### Check connection and existing tables (read-only)

```sh
npm run db:check
```

This connects to the DB, lists all tables in `public`, and reports which Vendor Hub tables exist or are missing. It does not create or change anything.

### If you use the same database as Wander Wisely

Existing Wander Wisely tables (unchanged by Vendor Hub):

| Table         | Purpose                    |
|--------------|----------------------------|
| `users`      | Traveller signup/signin    |
| `trips`      | Plan Trip / My Trip        |
| `itineraries`| Day-by-day itinerary       |
| `expenses`   | Add Expense on My Trip     |

Vendor Hub adds only these new tables (no name overlap):

| Table            | Purpose                          |
|-----------------|----------------------------------|
| `vendors`       | Vendor signup/signin             |
| `listings`      | Vendor’s services/experiences    |
| `vendor_bookings` | Bookings for vendor listings   |

Running `npm run db:init` in this backend will create only the three Vendor Hub tables if they don’t exist; it will not modify or remove any existing tables or data.
