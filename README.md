# WanderWisely
**Links**
user-dashboard=>https://wanderly-xi.vercel.app
partnerportal=>https://wanderlypartnerportal.vercel.app

**A full-stack travel and booking platform** — users can discover and book transport, hotels, experiences, and events; vendors manage listings and bookings; admins handle verification and support.

---

## Project type

**Full stack web application** — multiple frontends (user app, vendor portal, admin dashboard) and shared/separate backends with a PostgreSQL database.

---

## Project description

WanderWisely lets travellers search,plan and book **buses**, **cars**, **flights**, **hotels**, **experiences**, and **events** in one place. Vendors register, add listings (e.g. fleet, hotel branches, experiences), and manage bookings and payouts. Administrators verify listings and vehicles, view dashboard stats, manage vendor support tickets, and handle user feedback and complaints. The system supports verification workflows, support tickets with admin replies, and role-based access across user, vendor, and admin interfaces.This also enables the users to post their travel experience though community.

---

## Tech stack

| Layer | Technologies |
|--------|---------------|
| **Frontend (user app)** | React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, Recharts, React Query, React Hook Form, Zod |
| **Frontend (vendor portal)** | React 18, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui, Lucide icons |
| **Frontend (admin)** | React 18, TypeScript, Vite, React Router, Tailwind CSS |
| **Backend (main app)** | Node.js, Express, TypeScript, PostgreSQL (pg), JWT, bcrypt, Multer, Zod |
| **Backend (partner portal)** | Node.js, Express, TypeScript, PostgreSQL (pg), JWT, Multer |
| **Backend (admin)** | Node.js, Express, TypeScript, PostgreSQL (pg) |
| **Database** | PostgreSQL (schema migrations via SQL files) |
| **Other** | Git, REST APIs, CORS, dotenv, cross-env |

---

## Features

- **User side**
  -plan trips
  - Search and book transport (bus, car, flight), hotels, experiences, and events
  - User auth (register/login), profile, trip history
  - Feedback and complaints with admin reply visibility
  - Responsive UI with themes and accessible components

- **Vendor side (Partner Portal)**
  - Vendor auth and profile (Aadhar, bank details)
  - Listings: transport (bus/car/flight), hotel (branches), experiences, events
  - Fleet management: vehicles, routes, schedules, verification tokens
  - Bookings by category (transport, hotel, experience, event) with date filter and approval flows
  - Support: submit tickets, view admin replies, WhatsApp/email/phone contact
  - Payouts, promotions, reviews, dashboard metrics

- **Admin**
  - Dashboard with real metrics (total vendors, listings, pending verification, verified today)
  - Verification: listings, buses, cars, flights, hotel branches (approve/reject)
  - Vendors list, bookings, users, vendor support tickets (reply to vendors)
  - User feedback and complaints handling
  - payment handling
---

## Project structure

```
wander-wisely-main/
├── src/                    # User-facing React app (Vite)
│   ├── components/        # UI components (Navbar, Footer, shadcn/ui)
│   ├── contexts/           # Auth context
│   ├── lib/                # API helpers, utils
│   ├── pages/              # User pages (PlanTrip, MyTrip, BookingMarketplace, etc.)
│   └── main.tsx, App.tsx
├── backend/                # Main app API (port 3001)
│   ├── schema/             # PostgreSQL migrations (users, bookings, hotels, etc.)
│   ├── src/
│   │   ├── routes/         # Auth, hotels, events, experiences, flights, bookings, admin, etc.
│   │   ├── middleware/     # Auth, admin
│   │   └── index.ts
│   └── scripts/           # Schema runner, seed scripts
├── vendor-hub-main/        # Vendor portal + API
│   ├── src/                # Vendor React app (Vite)
│   │   ├── components/     # VendorLayout, TopHeader, UI
│   │   ├── contexts/       # VendorAuthContext
│   │   ├── pages/          # Dashboard, Listings, Bookings, Support, Payouts, etc.
│   │   └── lib/api.ts
│   └── backend/            # Vendor API (port 3002)
│       ├── schema/         # Vendors, listings, buses, cars, flights, hotel_branches, support_tickets, etc.
│       └── src/routes/     # Auth, listings, verification, admin vendors, support, etc.
├── admin-main/             # Admin dashboard + API
│   ├── src/                # Admin React app (Vite)
│   │   ├── pages/          # Dashboard, Verification, Vendors, Bookings, VendorSupport, etc.
│   │   └── lib/api.ts      # adminFetch, vendorHubFetch, mainAppFetch
│   └── backend/            # Admin API (port 3003)
│       └── src/routes/     # Verification (listings, buses, cars, flights, hotel branches), dashboard stats
├── docs/                   # (Optional) internal notes
├── package.json            # Root scripts: dev, dev:user, dev:vendor, dev:vendor-api, dev:all
└── README.md
```

---

## Installation steps

**Prerequisites:** Node.js (v18+), npm, PostgreSQL.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wander-wisely-main
   ```

2. **Install root and app dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd vendor-hub-main && npm install && cd vendor-hub-main/backend && npm install && cd ../..
   cd admin-main && npm install && cd admin-main/backend && npm install && cd ../..
   ```

3. **Configure environment**
   - Create `backend/.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, etc. (see `backend/.env.example` if present).
   - Create `vendor-hub-main/backend/.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT=3002`, etc.
   - Create `admin-main/backend/.env` with `DATABASE_URL`, `PORT=3003`. Point `DATABASE_URL` to the same PostgreSQL instance used by vendor-hub if they share the DB.

4. **Database**
   - Create a PostgreSQL database and run schema files from `backend/schema/` and `vendor-hub-main/backend/schema/` as needed (order by number, e.g. 001, 002, …).

5. **Run development servers**
   - From repo root:
     ```bash
     npm run dev:user        # User app (e.g. port 5173)
     npm run dev:backend     # Main backend (3001)
     npm run dev:vendor      # Vendor frontend
     npm run dev:vendor-api  # Vendor backend (3002)
     ```
   - Admin: run `admin-main` frontend and `admin-main/backend` (e.g. port 3003).
   - Or use `npm run dev:all` if configured to start user app, main backend, vendor frontend, and vendor backend together.

---

## Usage

- **Travellers:** Open the user app URL, sign up or log in, search for transport/hotels/experiences/events, and complete booking flows.
- **Vendors:** Open the vendor portal URL, register as vendor, add listings (transport/hotel/experience/event), complete verification where required, and manage bookings and support tickets from the dashboard.
- **Admins:** Open the admin dashboard URL, use Verification to approve/reject listings and vehicles, view Dashboard for counts, and use Vendor Support to reply to vendor tickets.

---

## Future improvements

- Add tests (unit and integration) for critical booking and verification flows
- Add rate limiting and security hardening on public APIs
- Optional: consolidate backends or add API gateway for simpler deployment
- Optional: add CI/CD and deployment docs for production

---

## Author

Boinapalli Rukmini Vardhan 

---

*README formatted for clarity and GitHub. Update project name, repository URL, and author as needed.*
