# Deployment Plan: Wander Wisely (User App + Partner Portal + Admin)

This project has **three separate apps** that share one **PostgreSQL database**:

| App | Frontend | Backend | Purpose |
|-----|----------|---------|---------|
| **1. User app** | Root `src/` (Vite) | `backend/` (Express, port 3001) | Travellers: explore, book, community |
| **2. Partner portal** | `vendor-hub-main/` (Vite) | `vendor-hub-main/backend/` (Express, port 3002) | Vendors: listings, bookings, payouts |
| **3. Admin** | `admin-main/` (Vite) | `admin-main/backend/` (Express, port 3003) | Admins: verification, vendors, payouts, support |

All three backends must use the **same** `DATABASE_URL` so data is shared.

---

## Recommended: Vercel (frontends) + Render (backends + DB)

- **Vercel**: Host the 3 React/Vite frontends (great DX, free tier, fast CDN).
- **Render**: Host PostgreSQL + the 3 Node/Express backends (free tier for DB and web services).

### Why this split?

- Vercel is optimized for static/React apps and gives each app a URL.
- Render runs long-lived Node servers and Postgres on one platform, so one dashboard and one DB URL for all backends.
- Alternative **all-Render** (see below): put frontends as Static Sites and backends as Web Services on Render if you prefer a single platform.

---

## Part 1: Render (Database + 3 backends)

### 1.1 Create PostgreSQL on Render

1. Go to [render.com](https://render.com) → Dashboard → **New +** → **PostgreSQL**.
2. Name: `wander-wisely-db`.
3. Region: choose closest to you.
4. Create. Copy the **Internal Database URL** (use this for all three backends).

### 1.2 Deploy main app backend (User API)

1. **New +** → **Web Service**.
2. Connect your repo; set:
   - **Name:** `wander-wisely-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node.
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = (Internal Database URL from 1.1)
   - `JWT_SECRET` = (long random string, e.g. from `openssl rand -base64 32`)
   - `PORT` = `3001`
   - `NODE_ENV` = `production`
4. Create Web Service. Note the URL, e.g. `https://wander-wisely-api.onrender.com`.

### 1.3 Deploy Partner Portal backend

1. **New +** → **Web Service**.
2. Same repo; set:
   - **Name:** `wander-wisely-partner-api`
   - **Root Directory:** `vendor-hub-main/backend`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = same as 1.1
   - `JWT_SECRET` = (can match main or use another secret)
   - `PORT` = `3002`
   - `CORS_ORIGIN` = your frontend URLs (see Part 2), e.g. `https://partner-portal.vercel.app,https://wander-wisely.vercel.app`
4. Note URL, e.g. `https://wander-wisely-partner-api.onrender.com`.

### 1.4 Deploy Admin backend

1. **New +** → **Web Service**.
2. Same repo; set:
   - **Name:** `wander-wisely-admin-api`
   - **Root Directory:** `admin-main/backend`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = same as 1.1
   - `PORT` = `3003`
   - `CORS_ORIGIN` = admin frontend URL
4. Note URL, e.g. `https://wander-wisely-admin-api.onrender.com`.

### 1.5 Run database migrations

After the first backend deploy (e.g. main API):

- Use **Render Shell** for the main backend service, or run locally with `DATABASE_URL` set to the Render Internal Database URL:
  - From repo root: `cd backend && npm run db:init` (runs main app schema).
- Partner portal schema: run SQL files in `vendor-hub-main/backend/schema/` in order (001, 002, …) against the same database (e.g. via Render PostgreSQL → Connect → psql, or a one-off script).
- Optional: seed demo data: `cd backend && npm run db:seed-demo` (with same `DATABASE_URL`).

---

## Part 2: Vercel (3 frontends)

Use **three separate Vercel projects** (or three projects in one Vercel team), each pointing at the **same repo** with a different **Root Directory** and env vars.

### 2.1 User app (main)

1. [vercel.com](https://vercel.com) → Add New → Project → Import your repo.
2. **Project name:** e.g. `wander-wisely`.
3. **Root Directory:** leave as `.` (repo root).
4. **Framework Preset:** Vite.
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Environment variables:**
   - `VITE_API_URL` = `https://wander-wisely-api.onrender.com` (no trailing slash)
8. Deploy. Note URL, e.g. `https://wander-wisely.vercel.app`.

### 2.2 Partner portal

1. Add New → Project → same repo.
2. **Project name:** e.g. `wander-wisely-partner`.
3. **Root Directory:** `vendor-hub-main`
4. **Framework Preset:** Vite.
5. **Build:** `npm run build` | **Output:** `dist`
6. **Environment:**
   - `VITE_VENDOR_API_URL` = `https://wander-wisely-partner-api.onrender.com`
7. Deploy. Note URL, e.g. `https://wander-wisely-partner.vercel.app`.

### 2.3 Admin dashboard

1. Add New → Project → same repo.
2. **Project name:** e.g. `wander-wisely-admin`.
3. **Root Directory:** `admin-main`
4. **Framework Preset:** Vite.
5. **Build:** `npm run build` | **Output:** `dist`
6. **Environment:**
   - `VITE_ADMIN_API_URL` = `https://wander-wisely-admin-api.onrender.com`
   - `VITE_MAIN_APP_API_URL` = `https://wander-wisely-api.onrender.com`
   - `VITE_VENDOR_HUB_API_URL` = `https://wander-wisely-partner-api.onrender.com`
   - `VITE_ADMIN_API_KEY` = (optional; set if you protect admin API with a key)
7. Deploy. Note URL, e.g. `https://wander-wisely-admin.vercel.app`.

---

## Part 3: CORS

Each backend must allow its frontend origin(s).

- **Main backend** (`backend/`): In code or env, set CORS to allow `https://wander-wisely.vercel.app` (and preview URLs if needed).
- **Partner backend** (`vendor-hub-main/backend/`): `CORS_ORIGIN` = `https://wander-wisely-partner.vercel.app,https://wander-wisely.vercel.app` (partner + user app if they call partner API).
- **Admin backend** (`admin-main/backend/`): Allow `https://wander-wisely-admin.vercel.app`.

If your backends already read `CORS_ORIGIN` from env, set these in Render; otherwise add CORS middleware using `process.env.CORS_ORIGIN`.

---

## Part 4: Summary checklist

| Step | Where | What |
|------|--------|------|
| 1 | Render | Create PostgreSQL; note Internal Database URL |
| 2 | Render | Deploy `backend` (main API); set `DATABASE_URL`, `JWT_SECRET`, `PORT` |
| 3 | Render | Deploy `vendor-hub-main/backend` (partner API); set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` |
| 4 | Render | Deploy `admin-main/backend` (admin API); set `DATABASE_URL`, `CORS_ORIGIN` |
| 5 | Render / Shell | Run migrations (and optional seed) on the shared DB |
| 6 | Vercel | Deploy user app (root); set `VITE_API_URL` |
| 7 | Vercel | Deploy partner app (root `vendor-hub-main`); set `VITE_VENDOR_API_URL` |
| 8 | Vercel | Deploy admin app (root `admin-main`); set all `VITE_*` API URLs |
| 9 | All | Confirm CORS allows the deployed frontend URLs |

---

## Alternative: All on Render

If you prefer one platform:

- **Render PostgreSQL**: same as above.
- **3 Web Services**: same root directories and start commands as in Part 1.
- **3 Static Sites**:  
  - **New +** → **Static Site**; connect repo; set **Root Directory** to `.`, `vendor-hub-main`, or `admin-main`; set **Build Command** to `npm run build` and **Publish Directory** to `dist`.  
  - Add the same `VITE_*` env vars so the built app points at the Render backend URLs.

Render free tier: Web Services spin down after inactivity (cold start on first request); Static Sites and PostgreSQL have free limits. For always-on backends without cold starts, use Render paid plan or keep backends on Railway/Fly.io.

---

## Other options

- **Railway**: One project; add PostgreSQL + 3 services (each with root dir `backend`, `vendor-hub-main/backend`, `admin-main/backend`) + 3 frontends (static or served). Simple billing.
- **Fly.io**: Postgres + multiple Node apps; more control, steeper learning curve.
- **Netlify**: Similar to Vercel for frontends; backends would still need to run elsewhere (e.g. Render).

---

## Env vars reference

| App | Env var | Description |
|-----|---------|-------------|
| Main backend | `DATABASE_URL` | PostgreSQL URL (shared) |
| | `JWT_SECRET` | Secret for user tokens |
| | `PORT` | 3001 |
| Partner backend | `DATABASE_URL` | Same as above |
| | `JWT_SECRET` | Secret for vendor tokens |
| | `PORT` | 3002 |
| | `CORS_ORIGIN` | Partner + user frontend URLs |
| Admin backend | `DATABASE_URL` | Same as above |
| | `PORT` | 3003 |
| | `CORS_ORIGIN` | Admin frontend URL |
| User frontend | `VITE_API_URL` | Main backend URL |
| Partner frontend | `VITE_VENDOR_API_URL` | Partner backend URL |
| Admin frontend | `VITE_ADMIN_API_URL` | Admin backend URL |
| | `VITE_MAIN_APP_API_URL` | Main backend URL |
| | `VITE_VENDOR_HUB_API_URL` | Partner backend URL |
| | `VITE_ADMIN_API_KEY` | Optional admin API key |

After deployment, open the three frontend URLs and test login, bookings, and admin flows to confirm everything works end-to-end.
