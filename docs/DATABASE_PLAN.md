# Database Plan – Wander Wisely (Wanderlust)  
**PostgreSQL only (no Supabase)**

This document outlines a **PostgreSQL**-only database strategy: schema, hosting options, and what you need to build in your own backend (API + auth + storage).

---

## Why PostgreSQL

- **Relational model** fits the app: users → trips → itineraries, users → posts → comments → likes.
- **JSONB** for flexible itinerary content per day without sacrificing queryability.
- **Mature, standard SQL** – works with any host and any backend (Node, Python, Go, etc.).
- **Full control** – no vendor lock-in; you own auth, storage, and API design.

You will need to add:

1. **A backend API** (e.g. Node.js + Express, Fastify, or NestJS) that talks to PostgreSQL.
2. **Auth** – sign up / sign in yourself (e.g. JWT + bcrypt, or Passport.js).
3. **File storage** – for community post images and optional avatars (e.g. local disk, S3, Cloudinary).

---

## Hosting options (PostgreSQL)

| Provider | Notes |
|----------|--------|
| **Neon** | Serverless Postgres, generous free tier, branchable DBs. |
| **Railway** | Simple setup, Postgres add-on, good for full-stack. |
| **Render** | Managed Postgres, free tier available. |
| **AWS RDS** | Production-grade, more setup and cost. |
| **Local** | `docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres` for development. |

Use a connection string like:  
`postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require`  
(Neon/Railway/Render provide this in the dashboard.)

---

## High-level data model

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   users     │────▶│   trips     │────▶│ itineraries  │
│ (auth +     │     │ (plan form) │     │ (AI output   │
│  profile)   │     └─────────────┘     │  per day)    │
└──────┬──────┘                         └──────────────┘
       │
       │     ┌─────────────┐     ┌──────────────┐
       └────▶│   posts     │────▶│   comments   │
             │ (community) │     │              │
             └──────┬──────┘     └──────────────┘
                    │
                    │     ┌─────────────┐
                    └────▶│ post_likes  │
                          │ post_bookmarks
                          └─────────────┘

             ┌─────────────┐
             │ destinations│   (Explore – seed/curated)
             └─────────────┘
```

---

## Schema (PostgreSQL)

Run these in order in your PostgreSQL client (psql, pgAdmin, or a migration tool).

### 1. Users (auth + profile)

You own auth, so store credentials and profile in one table (or split into `users` + `profiles` if you prefer).

```sql
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_users_email on public.users(email);
```

---

### 2. Trips (Plan Trip form)

```sql
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  days int not null check (days >= 1 and days <= 30),
  budget text not null check (budget in ('Budget', 'Medium', 'Luxury')),
  travel_type text not null check (travel_type in ('Solo', 'Couple', 'Family', 'Friends')),
  interests text[] default '{}',
  transport_preference text check (transport_preference in ('Flight', 'Train', 'Bus', 'Car')),
  status text default 'draft' check (status in ('draft', 'generating', 'ready', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_trips_user_id on public.trips(user_id);
create index idx_trips_created_at on public.trips(created_at desc);
```

---

### 3. Itineraries (AI-generated, per trip)

```sql
create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  content jsonb not null default '{}',
  created_at timestamptz default now(),
  unique(trip_id, day_number)
);

create index idx_itineraries_trip_id on public.itineraries(trip_id);
```

---

### 4. Destinations (Explore page)

```sql
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  category text not null,
  image_url text not null,
  rating decimal(2,1) check (rating >= 0 and rating <= 5),
  description text,
  created_at timestamptz default now()
);

create index idx_destinations_category on public.destinations(category);
create index idx_destinations_name_trgm on public.destinations using gin(to_tsvector('english', name));
```

---

### 5. Community: posts

`image_url` can be a URL from your own storage (S3, Cloudinary, or local path served by your API).

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  location text not null,
  image_url text not null,
  caption text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_created_at on public.posts(created_at desc);
create index idx_posts_tags on public.posts using gin(tags);
```

---

### 6. Community: comments

```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index idx_comments_post_id on public.comments(post_id);
```

---

### 7. Community: likes and bookmarks

```sql
create table public.post_likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

create table public.post_bookmarks (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

create index idx_post_likes_post_id on public.post_likes(post_id);
create index idx_post_bookmarks_user_id on public.post_bookmarks(user_id);
```

---

## Auth (your responsibility)

With plain PostgreSQL you implement auth in your backend, for example:

1. **Sign up**  
   - Validate email/name/password (e.g. with Zod).  
   - Hash password with **bcrypt** (or argon2).  
   - `INSERT` into `users` (email, password_hash, full_name).  
   - Return a **JWT** (or session id) that includes `userId` (and optionally email).

2. **Sign in**  
   - Find user by email, verify password with bcrypt.  
   - Issue JWT (e.g. `{ sub: userId, email }`).

3. **Protected routes**  
   - Middleware that reads JWT, validates it, and attaches `req.userId`.  
   - Use `req.userId` in queries (e.g. `WHERE user_id = req.userId`).

Example (conceptual):

```ts
// Sign up
const hash = await bcrypt.hash(password, 10);
const { rows: [user] } = await pg.query(
  'insert into users (email, password_hash, full_name) values ($1, $2, $3) returning id, email, full_name',
  [email, hash, fullName]
);
const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
return { user: { id: user.id, email: user.email, full_name: user.full_name }, token };
```

---

## File storage (your responsibility)

Community posts need image uploads. Options:

- **Local** – Save files under `uploads/` and serve via your API (e.g. `GET /uploads/post-images/:filename`). Simple for dev.
- **S3 (or MinIO)** – Store in a bucket, save the object URL in `posts.image_url`.
- **Cloudinary** – Upload from backend, store returned URL in `posts.image_url`.

Your API would:

1. Accept `multipart/form-data` for “Create Post”.
2. Validate file type/size, then save to your chosen storage.
3. Insert into `posts` with the resulting `image_url`.

---

## How the React app talks to the DB

- **Not directly.** The browser should never have the DB connection string.
- **Flow:** React → your backend API (REST or tRPC) → PostgreSQL (using `pg`, Prisma, Drizzle, or similar).

Example stack:

- **Backend:** Node.js + Express (or Fastify) + `pg` or Prisma.
- **Auth:** JWT in `Authorization: Bearer <token>`; backend verifies and uses `userId` for `trips`, `posts`, etc.
- **DB driver:** `pg` (raw SQL), or **Prisma** / **Drizzle** for typed queries and migrations.

---

## Summary

| Item | With PostgreSQL (this plan) |
|------|------------------------------|
| **Database** | PostgreSQL (Neon, Railway, Render, or local). |
| **Schema** | `users`, `trips`, `itineraries`, `destinations`, `posts`, `comments`, `post_likes`, `post_bookmarks`. |
| **Auth** | You implement (e.g. JWT + bcrypt) in your backend. |
| **Storage** | You implement (local, S3, or Cloudinary) and store URLs in `posts.image_url`, `users.avatar_url`. |
| **API** | You build a backend that uses the connection string and runs the SQL above (or equivalent via an ORM). |

All SQL in this document is standard PostgreSQL and does not depend on Supabase. You can run it on any Postgres host and connect from any backend.
