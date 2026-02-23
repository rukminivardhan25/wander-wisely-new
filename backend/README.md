# Wander Wisely API (Backend)

Node.js + Express backend for the Wander Wisely app. Uses PostgreSQL (e.g. Neon).

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` – your PostgreSQL connection string (from Neon dashboard)
   - `JWT_SECRET` – a long random string for signing JWTs
   - `GROQ_API_KEY` – for Plan Trip AI ([console.groq.com](https://console.groq.com))
   - `UNSPLASH_ACCESS_KEY` – for Plan Trip images ([unsplash.com/oauth/applications](https://unsplash.com/oauth/applications))

2. Ensure the database has the schema from `docs/DATABASE_PLAN.md` applied.

3. Install and run:

```bash
cd backend
npm install
npm run dev
```

The API will be at `http://localhost:3001`.

### Bus / transport booking

**Available buses** are read **directly from the database**; the vendor hub backend does not need to be running.

- **Option A – Same DB:** If your main app and vendor hub use the same PostgreSQL database (and that DB has the vendor hub schema: `listings`, `buses`, `bus_schedules`, `routes`), no extra config is needed. The main backend uses `DATABASE_URL` for the bus query.
- **Option B – Separate DB:** If transport data lives in a different database (e.g. vendor hub’s DB), set **`TRANSPORT_DATABASE_URL`** in this backend’s `.env` to that database’s connection string. The main backend will use it only for the available-buses query.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/signup` | No | Register (email, password, full_name) |
| POST | `/api/auth/signin` | No | Login (email, password) |
| GET | `/api/trips` | Yes | List current user's trips |
| POST | `/api/trips` | Yes | Create trip |
| POST | `/api/trips/generate` | Yes | Create trip + Groq itinerary + Unsplash images |
| GET | `/api/trips/:id/itineraries` | Yes | List itineraries for a trip |
| GET | `/api/destinations` | No | List destinations (?category= & ?search=) |
| GET | `/api/posts` | No | List community posts |
| POST | `/api/posts` | Yes | Create post (location, image_url, caption, tags) |
| GET | `/api/posts/:id/comments` | No | List comments |
| POST | `/api/posts/:id/comments` | Yes | Add comment (body) |
| POST | `/api/posts/:id/like` | Yes | Like post |
| DELETE | `/api/posts/:id/like` | Yes | Unlike post |
| GET | `/api/transport/available-buses` | No | Available buses for a date (`?date=YYYY-MM-DD`). Proxies to Vendor Hub. |

Protected routes require header: `Authorization: Bearer <token>`.
