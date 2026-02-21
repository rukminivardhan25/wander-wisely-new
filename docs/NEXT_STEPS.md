# What to Do Next – Wander Wisely

You have the **frontend** and a **PostgreSQL database plan**. Here’s a concrete order of steps to get a full app running.

---

## Quick overview

1. Get PostgreSQL running and create the tables.
2. Add a backend API (Node + Express) that uses the DB and handles auth.
3. Wire the React app to the backend (auth, then trips, then community).
4. Fix the frontend so it runs (add missing assets or placeholders).

---

## Step 1: Set up PostgreSQL

**Option A – Cloud (easiest to start)**  
- Go to [Neon](https://neon.tech) or [Railway](https://railway.app) and create a free PostgreSQL database.  
- Copy the **connection string** (e.g. `postgresql://user:pass@host/db?sslmode=require`).  
- Save it somewhere safe; you’ll use it in the backend as `DATABASE_URL`.

**Option B – Local**  
- Install PostgreSQL, or run it with Docker:  
  `docker run -d -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`  
- Create a database (e.g. `wander_wisely`) and use a connection string like:  
  `postgresql://postgres:postgres@localhost:5432/wander_wisely`

**Create the schema**  
- Open the SQL editor in your host’s dashboard (or use `psql` / pgAdmin).  
- Copy all the `CREATE TABLE` (and `CREATE INDEX`) statements from **`docs/DATABASE_PLAN.md`** and run them in order.  
- Confirm that the tables exist: `users`, `trips`, `itineraries`, `destinations`, `posts`, `comments`, `post_likes`, `post_bookmarks`.

---

## Step 2: Create the backend API

The **Node.js backend** lives in the **`backend/`** folder. It:

1. **Connects to PostgreSQL**  
   - Use the connection string in an env variable (e.g. `DATABASE_URL`).  
   - Use a driver: **`pg`** (raw SQL) or **Prisma** / **Drizzle** (ORM with migrations).

2. **Implements auth**  
   - **POST /api/auth/signup** – validate body (email, password, fullName), hash password (e.g. bcrypt), insert into `users`, return a JWT (include `userId` in the payload).  
   - **POST /api/auth/signin** – find user by email, verify password, return JWT.  
   - **Middleware** – for protected routes: read `Authorization: Bearer <token>`, verify JWT, attach `userId` to the request.

3. **Exposes API routes** (all under something like `/api`)  
   - **Trips:** `POST /api/trips` (create), `GET /api/trips` (list for current user).  
   - **Itineraries:** `GET /api/trips/:id/itineraries` (later you can add a route that calls AI and inserts rows).  
   - **Destinations:** `GET /api/destinations` (for Explore; you can seed a few rows in the DB).  
   - **Community:** `GET /api/posts`, `POST /api/posts`, `GET /api/posts/:id/comments`, `POST /api/posts/:id/comments`, `POST /api/posts/:id/like`, `DELETE /api/posts/:id/like`, and optionally bookmarks.

4. **Environment**  
   - Use a `.env` file (and add `.env` to `.gitignore`):  
     - `DATABASE_URL`  
     - `JWT_SECRET` (a long random string for signing JWTs)  
     - Optionally `PORT` (e.g. 3001) so the API doesn’t clash with Vite (8080).

5. **CORS**  
   - Enable CORS for your frontend origin (e.g. `http://localhost:8080`) so the React app can call the API.

Once this is done, you can test with Postman or curl (sign up, sign in, create a trip, list trips, etc.) before touching the frontend.

---

## Step 3: Wire the React app to the backend

1. **Base URL**  
   - In the frontend, set the API base URL (e.g. `http://localhost:3001/api`) via an env variable (e.g. `VITE_API_URL`) so you can change it for production.

2. **Auth**  
   - **Sign up page** – on submit, `POST /api/auth/signup` with email, password, full name; store the returned JWT (e.g. in `localStorage` or memory + cookie).  
   - **Sign in page** – on submit, `POST /api/auth/signin`; store JWT the same way.  
   - **Auth context** – create a small context that holds `user` and `token`, and provides a function to pass the token in `Authorization` for API calls.  
   - **Navbar** – if there’s a token, show “Sign out” and maybe the user’s name; otherwise show “Sign in” / “Get started”.

3. **Plan Trip**  
   - On “Generate My Itinerary”, send the form data to `POST /api/trips`.  
   - Optionally redirect to a “My trips” page or a trip detail page where you can later show itineraries (e.g. from `GET /api/trips/:id/itineraries`).

4. **Explore**  
   - Load destinations from `GET /api/destinations` and render them (replace or back the current hardcoded list).

5. **Community**  
   - Load posts from `GET /api/posts` (with author info if your API returns it).  
   - “Create Post” → upload image (to your backend or storage), then `POST /api/posts`.  
   - Wire like and comment buttons to the corresponding API endpoints.

Do auth first, then trips, then destinations and community, so you always have a logged-in user for protected routes.

---

## Step 4: Fix frontend so it runs (assets)

The app imports images from `@/assets/` (e.g. `hero-travel.jpg`, `dest-beach.jpg`), but that folder is missing, so the dev server can fail.

- **Either:** Create `src/assets/` and add placeholder images with those names (any JPG for now).  
- **Or:** Temporarily replace those imports with a placeholder (e.g. `placeholder.svg` from `public/`) or an external URL so the app runs. You can switch back to real assets later.

---

## Suggested order (checklist)

- [ ] **1** – Create a PostgreSQL database (Neon / Railway / local) and run the schema from `DATABASE_PLAN.md`.
- [ ] **2** – In `backend/`: copy `.env.example` to `.env`, set `DATABASE_URL` and `JWT_SECRET`, run `npm install` and `npm run dev`.
- [ ] **3** – Implement auth: signup, signin, JWT middleware.
- [ ] **4** – Implement trips and itineraries API (create trip, list my trips, get itineraries for a trip).
- [ ] **5** – Seed a few `destinations` and implement `GET /api/destinations`.
- [ ] **6** – Implement posts, comments, likes (and optionally bookmarks) and image upload if needed.
- [ ] **7** – In React: add `VITE_API_URL`, auth context, and wire Sign up / Sign in to the backend.
- [ ] **8** – Wire Plan Trip form to `POST /api/trips`.
- [ ] **9** – Wire Explore to `GET /api/destinations`.
- [ ] **10** – Wire Community to posts API and fix assets so the app runs.

---

## If you want help with code next

You can ask for:

- **“Set up the backend folder with Express and PostgreSQL”** – project structure, `package.json`, DB connection, and a health route.  
- **“Implement auth endpoints and JWT middleware”** – signup, signin, and a protected route example.  
- **“Add API routes for trips and itineraries”** – create/list trips, get itineraries.  
- **“Wire React Sign up and Sign in to the API”** – fetch calls and auth context.

Starting with **Step 1 (PostgreSQL)** and **Step 2 (backend with auth)** will give you a solid base; then you can connect the frontend step by step.
