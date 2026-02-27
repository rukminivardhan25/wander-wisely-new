# Deployment steps – Wander Wisely

Follow these steps **in order**. Use **Render** for database + backends and **Vercel** for the 3 frontends.

---

## Before you start

- Have a **GitHub** (or GitLab) repo with your code pushed.
- Have accounts: [Render](https://render.com), [Vercel](https://vercel.com).
- Generate a **JWT secret** once (e.g. run locally: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Use the **same** value for main and partner backends, or use two different ones.

---

## Part A: Render – Database

### Step 1: Create the database

1. Go to **https://dashboard.render.com** → **New +** → **PostgreSQL**.
2. **Name:** `wander-wisely-db`.
3. **Region:** Pick one close to you.
4. Click **Create Database**.
5. When it’s ready, open the database → **Info** tab.
6. Copy the **Internal Database URL** (starts with `postgres://`).  
   You will use this **same URL** for all three backends.  
   (Keep it secret; don’t commit it.)

---

## Part B: Render – Backends (all use the same DB URL)

### Step 2: Deploy main app backend (user API)

1. Render Dashboard → **New +** → **Web Service**.
2. Connect your **GitHub** repo (grant access if asked).
3. Set:
   - **Name:** `wander-wisely-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. **Environment** (Add Environment Variable):
   - `DATABASE_URL` = (paste the Internal Database URL from Step 1)
   - `JWT_SECRET` = (your long random secret from “Before you start”)
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - Optional (for itinerary generation): `GROQ_API_KEY` = (from https://console.groq.com), `UNSPLASH_ACCESS_KEY` = (from https://unsplash.com/oauth/applications)
5. Click **Create Web Service**.
6. Wait for deploy. Copy the service URL, e.g. `https://wander-wisely-api.onrender.com` (no trailing slash). You’ll need it for the user frontend and CORS.

### Step 3: Deploy partner portal backend (vendor API)

1. **New +** → **Web Service** → same repo.
2. Set:
   - **Name:** `wander-wisely-partner-api`
   - **Root Directory:** `vendor-hub-main/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = (same as Step 1)
   - `JWT_SECRET` = (same or another secret)
   - `NODE_ENV` = `production`
   - `PORT` = `3002`
   - `CORS_ORIGIN` = leave empty for now; after Part C you’ll set it to your partner + user frontend URLs, e.g. `https://wander-wisely-partner.vercel.app,https://wander-wisely.vercel.app`
4. **Create Web Service**. Copy the URL, e.g. `https://wander-wisely-partner-api.onrender.com`.

### Step 4: Deploy admin backend

1. **New +** → **Web Service** → same repo.
2. Set:
   - **Name:** `wander-wisely-admin-api`
   - **Root Directory:** `admin-main/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. **Environment:**
   - `DATABASE_URL` = (same as Step 1)
   - `NODE_ENV` = `production`
   - `PORT` = `3003`
   - `CORS_ORIGIN` = leave empty for now; after Part C set to admin frontend URL, e.g. `https://wander-wisely-admin.vercel.app`
4. **Create Web Service**. Copy the URL, e.g. `https://wander-wisely-admin-api.onrender.com`.

---

## Part C: Run database migrations and seed (optional)

You must run schema migrations so tables exist. Do this **once** after the first backend is deployed.

**Option A – Render Shell (recommended)**  
1. Open the **main backend** service (`wander-wisely-api`) on Render.  
2. **Shell** tab → open a shell.  
3. Run:
   - `npm run db:init`  
   (This runs the main app schema from `backend/schema/`.)  
4. Then run partner schema **from your machine** (see Option B) or run the SQL files in order (001, 002, …) from `vendor-hub-main/backend/schema/` against the same DB (e.g. via Render Postgres **Connect** → psql, or a small script).

**Option B – From your computer**  
1. In repo root, create a `.env` file in `backend/` (or set env in the shell) with **only**:
   - `DATABASE_URL` = (the same Render Internal Database URL).
2. In terminal:
   - `cd backend`
   - `npm run db:init`
3. Then run vendor-hub schema. From repo root:
   - `cd vendor-hub-main/backend`
   - Set `DATABASE_URL` in `.env` to the same URL.
   - Run the schema scripts (e.g. `npm run db:init` if present, or run the SQL files in `vendor-hub-main/backend/schema/` in numeric order against that DB).
4. Optional – seed demo data (from repo root):
   - `cd backend`
   - `npm run db:seed-demo`  
   (Uses the same `DATABASE_URL`.)

---

## Part D: Vercel – Frontends

Create **three separate Vercel projects**, all from the **same repo**, with different root directories and env vars.

### Step 5: Deploy user app (main frontend)

1. Go to **https://vercel.com** → **Add New** → **Project** → import your repo.
2. **Project Name:** e.g. `wander-wisely`.
3. **Root Directory:** `.` (repo root).
4. **Framework Preset:** Vite.
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. **Environment Variables:**
   - **Key:** `VITE_API_URL`  
     **Value:** `https://wander-wisely-api.onrender.com` (your main backend URL from Step 2; no trailing slash).
8. Deploy. Copy the URL, e.g. `https://wander-wisely.vercel.app`.

### Step 6: Deploy partner portal frontend

1. **Add New** → **Project** → same repo.
2. **Project Name:** e.g. `wander-wisely-partner`.
3. **Root Directory:** `vendor-hub-main`
4. **Framework Preset:** Vite.
5. **Build Command:** `npm run build` | **Output Directory:** `dist`
6. **Environment Variables:**
   - `VITE_VENDOR_API_URL` = `https://wander-wisely-partner-api.onrender.com` (partner backend URL from Step 3).
7. Deploy. Copy the URL, e.g. `https://wander-wisely-partner.vercel.app`.

### Step 7: Deploy admin dashboard frontend

1. **Add New** → **Project** → same repo.
2. **Project Name:** e.g. `wander-wisely-admin`.
3. **Root Directory:** `admin-main`
4. **Framework Preset:** Vite.
5. **Build Command:** `npm run build` | **Output Directory:** `dist`
6. **Environment Variables:**
   - `VITE_ADMIN_API_URL` = `https://wander-wisely-admin-api.onrender.com`
   - `VITE_MAIN_APP_API_URL` = `https://wander-wisely-api.onrender.com`
   - `VITE_VENDOR_HUB_API_URL` = `https://wander-wisely-partner-api.onrender.com`
   (Replace with your actual Render backend URLs if different.)
   - Optional: `VITE_ADMIN_API_KEY` if you protect the admin API with a key.
7. Deploy. Copy the URL, e.g. `https://wander-wisely-admin.vercel.app`.

---

## Part E: CORS (required for login and API calls)

Each backend must allow its frontend origin(s).

### Step 8: Set CORS on Render

1. **Main backend** (`wander-wisely-api`):  
   - **Environment** → add or edit:  
   - `CORS_ORIGIN` = `https://wander-wisely.vercel.app`  
   (Use your real user app URL; add comma-separated if you have multiple, e.g. preview URLs.)
2. **Partner backend** (`wander-wisely-partner-api`):  
   - `CORS_ORIGIN` = `https://wander-wisely-partner.vercel.app,https://wander-wisely.vercel.app`
3. **Admin backend** (`wander-wisely-admin-api`):  
   - `CORS_ORIGIN` = `https://wander-wisely-admin.vercel.app`
4. **Save** each; Render will redeploy. Wait for deploys to finish.

---

## Part F: Verify

### Step 9: Test the apps

1. **User app:** Open the user frontend URL → Sign up / Log in → try search and a booking flow.
2. **Partner portal:** Open partner URL → Vendor login → add a listing, check bookings.
3. **Admin:** Open admin URL → check dashboard, verification, vendor support.

If anything fails, check:
- Browser **Network** tab for 4xx/5xx and CORS errors.
- **Render** logs for each backend (Logs tab).
- **Vercel** build logs if the frontend doesn’t load.

---

## Quick checklist

| # | What to do |
|---|------------|
| 1 | Render: Create PostgreSQL; copy Internal Database URL |
| 2 | Render: Deploy main backend (`backend/`); set `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV` |
| 3 | Render: Deploy partner backend (`vendor-hub-main/backend/`); set `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN` (can add after Step 8) |
| 4 | Render: Deploy admin backend (`admin-main/backend/`); set `DATABASE_URL`, `PORT`, `CORS_ORIGIN` (can add after Step 8) |
| 5 | Run DB migrations (and optional seed) once |
| 6 | Vercel: Deploy user app (root); set `VITE_API_URL` |
| 7 | Vercel: Deploy partner app (root `vendor-hub-main`); set `VITE_VENDOR_API_URL` |
| 8 | Vercel: Deploy admin app (root `admin-main`); set all `VITE_*` API URLs |
| 9 | Render: Set `CORS_ORIGIN` on all three backends to your Vercel frontend URLs |
| 10 | Test all three apps and fix any errors from logs/Network tab |

---

For more detail (env reference, alternatives like all-Render or Railway), see **DEPLOYMENT.md** in the repo.
