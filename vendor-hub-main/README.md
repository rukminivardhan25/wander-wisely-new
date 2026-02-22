# Vendor Hub

Vendor dashboard for Wander Wisely — manage listings, bookings, customers, analytics, and payouts.

## Setup

**1. Backend (required for Sign in / Sign up)**

```sh
cd vendor-hub-main/backend
cp .env.example .env   # edit .env: set DATABASE_URL and JWT_SECRET
npm install
npm run db:init
npm run dev
```

Backend runs at [http://localhost:3002](http://localhost:3002). If it’s not running, you’ll see “Failed to fetch” or “Cannot reach the API” on sign in/up.

**2. Frontend**

```sh
cd vendor-hub-main
npm install
npm run dev
```

Runs at [http://localhost:8080](http://localhost:8080).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Stack

Vite, React, TypeScript, shadcn/ui, Tailwind CSS, React Router, React Query.
