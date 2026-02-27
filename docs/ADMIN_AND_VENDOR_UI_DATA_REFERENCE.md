# Admin-Main & Vendor-Hub: UI Elements, Data, and Backend Reference

This document lists **all UI-related elements**, **data sources** (static vs backend), and **backend APIs** for the **admin-main** (Admin) and **vendor-hub-main** (VendorHub) apps. No code was modified; this is reference only.

---

## Part 1: Admin-Main (Admin Side)

### 1.1 App & routing

| Item | Details |
|------|--------|
| **App entry** | `admin-main/src/App.tsx` – `BrowserRouter`, `AdminLayout` wrapper |
| **Base URL** | Typically `localhost:8083` (or configured port) |
| **Layout** | `AdminLayout` – fixed left sidebar + main content area (`<Outlet />`) |

**Routes:**

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Dashboard` | Overview |
| `/verification` | `Verification` | Verification requests (company, vehicles, hotel branch) |
| `/feedback`, `/feedback-users` | `FeedbackUsers` | App user reviews/feedback |
| `/complaints`, `/complaint-users` | `ComplaintUsers` | User complaints + admin reply |
| `/users` | `Users` | Users list + Add user (static) |
| `/vendors` | `Vendors` | Vendor details table (static) |
| `/bookings` | `Bookings` | All bookings + 80/20 split (static) |
| `/payouts` | `Payouts` | Vendor payouts + Transfer UI (static) |

---

### 1.2 Sidebar (AdminLayout)

| Element | Type | Data |
|--------|------|------|
| Header | Text | "Admin", "Wander Wisely" |
| Nav links | `NavLink` | Dashboard, Verification, feedback-users, complaint-users, Users, Vendors, Bookings, Payouts |
| Icons | lucide-react | LayoutDashboard, ShieldCheck, MessageSquare, AlertCircle, Users, Building2, Calendar, IndianRupee |
| Active state | CSS | `bg-sidebar-primary text-primary-foreground` when active |

---

### 1.3 Page: Dashboard

| UI element | Data source | Notes |
|------------|-------------|--------|
| Title | Static | "Dashboard" |
| Subtitle | Static | "Overview of admin activity." |
| 4 metric cards | Static | Title, value "—", icon. Metrics: Total Vendors, Total Listings, Pending Verification, Verified Today |
| Quick actions card | Static | "Quick actions" + text about Verification page |

**Component:** `MetricCard` (title, value, icon, optional change %, iconBg).

---

### 1.4 Page: Verification

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | "Verification", "Review verification requests..." |
| Category filters | Static | Company, Vehicles, Hotel Branch (buttons) |
| Company type dropdown | Static | Transport, Restaurant, Hotel, Shop, Experience, Rental, Event, Guide, Emergency, All types |
| Vehicle type dropdown | Static | Buses, Cars, Flights, All types |
| Requests table (company) | **Backend** | `GET /api/verification/pending?type=...` (admin API) |
| Listing detail (company) | **Backend** | `GET /api/verification/listing/:id` |
| Approve/Reject (company) | **Backend** | `POST /api/verification/:id/approve`, `.../reject` |
| Bus requests table | **Backend** | `GET /api/verification/pending-buses` |
| Bus detail | **Backend** | `GET /api/verification/bus/:id` |
| Bus Approve/Reject | **Backend** | `POST /api/verification/bus/:id/approve`, `.../reject` |
| Car requests table | **Backend** | `GET /api/verification/pending-cars` |
| Car detail | **Backend** | `GET /api/verification/car/:id` |
| Car Approve/Reject | **Backend** | `POST /api/verification/car/:id/approve`, `.../reject` |
| Flight requests table | **Backend** | `GET /api/verification/pending-flights` |
| Flight detail | **Backend** | `GET /api/verification/flight/:id` |
| Flight Approve/Reject | **Backend** | `POST /api/verification/flight/:id/approve`, `.../reject` |
| Hotel branch requests | **Backend** | `GET /api/verification/pending-hotel-branches` |
| Hotel branch detail | **Backend** | `GET /api/verification/hotel-branch/:id` |
| Hotel branch Approve/Reject | **Backend** | `POST /api/verification/hotel-branch/:id/approve`, `.../reject` |
| Document links | **Backend** | Admin API serves `/api/verification/uploads/:filename` (reads from vendor-hub uploads path) |

**Modals:** View details + documents for company, bus, car, flight, hotel branch (each with Close, Approve, Reject).

---

### 1.5 Page: Feedback (feedback-users)

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | "Feedback", "Reviews and ratings from app users." |
| Error banner | State | Shown on API error |
| Table: User, Rating, Date, View | **Backend** | `GET /api/admin/feedback` (main app API) – filtered to `type === "review"` |
| View message modal | State | Opens on Eye click; shows `message` |

**API:** Main app backend `GET /api/admin/feedback` (admin-main calls via `mainAppFetch`, optional `X-Admin-Key`).

**Data shape:** `{ feedback: FeedbackRow[] }`, row: id, userId, rating, type, message, createdAt, email, fullName, adminReply, adminRepliedAt.

---

### 1.6 Page: Complaints (complaint-users)

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | "Complaints", "User complaints... Review and send replies..." |
| Error banner | State | On load or reply error |
| Table: User, Date, Status, View | **Backend** | `GET /api/admin/feedback` – filtered to `type === "complaint"` |
| Reply modal / form | State | replyingId, replyText; submit calls **Backend** |
| Send reply | **Backend** | `PATCH /api/admin/feedback/:id/reply` (main app), body `{ reply }` |

**APIs:** Main app – GET feedback, PATCH reply.

---

### 1.7 Page: Users

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | "Users", "Manage users... Add new users here." |
| "Add user" button | UI | Opens add-user modal |
| Table: Name, Email, Phone, Joined | **Static (mock)** | In-component `MOCK_USERS` array; "Add user" only updates local state |
| Add user modal | Static | Form: Full name, Email, Phone (optional); submit adds row locally |

**Data:** All static; no backend. Mock fields: id, fullName, email, phone, joinedAt.

---

### 1.8 Page: Vendors

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | "Vendors", "Vendor details only — business and contact information." |
| Table: Business name, Contact name, Email, Phone, Business type, Registered, Status | **Static (mock)** | `MOCK_VENDORS` in component |

**Mock row fields:** id, businessName, contactName, email, phone, businessType, registeredAt, status.

---

### 1.9 Page: Bookings

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | Explains: user payments → admin; 80% vendor, 20% admin |
| 3 metric cards | **Static (derived from mock)** | Total paid by users, Admin share (20%), Vendor share (80%) |
| Table: Booking ID, Type, User, Vendor, Amount, Payment, Paid at | **Static (mock)** | `MOCK_BOOKINGS` |

**Mock row fields:** id, type, user, vendor, amount, paid, paidAt.

---

### 1.10 Page: Payouts

| UI element | Data source | Backend / static |
|------------|-------------|------------------|
| Title / subtitle | Static | Explains 80% to vendor, 20% admin; "Transfer the vendor share here." |
| 3 metric cards | **Static (derived from mock)** | Total collected, Admin share (20%), Total pending to vendors (80%) |
| Table: Vendor, Vendor share (80%), Already paid, Pending, Action | **Static (mock)** | `MOCK_PAYOUTS` |
| "Transfer" button | UI only | No API; static |

**Mock row fields:** vendorId, vendorName, totalEarned, paidToVendor, pending.

---

### 1.11 Admin API (admin-main backend)

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/health` | GET | Health check |
| `/api/verification/pending` | GET | Pending listings (query: type) |
| `/api/verification/listing/:id` | GET | Listing detail + owner + documents |
| `/api/verification/:id/approve` | POST | Approve listing |
| `/api/verification/:id/reject` | POST | Reject listing |
| `/api/verification/pending-buses` | GET | Pending buses |
| `/api/verification/bus/:id` | GET | Bus detail |
| `/api/verification/bus/:id/approve` | POST | Approve bus |
| `/api/verification/bus/:id/reject` | POST | Reject bus |
| `/api/verification/pending-cars` | GET | Pending cars |
| `/api/verification/car/:id` | GET | Car detail |
| `/api/verification/car/:id/approve` | POST | Approve car |
| `/api/verification/car/:id/reject` | POST | Reject car |
| `/api/verification/pending-flights` | GET | Pending flights |
| `/api/verification/flight/:id` | GET | Flight detail |
| `/api/verification/flight/:id/approve` | POST | Approve flight |
| `/api/verification/flight/:id/reject` | POST | Reject flight |
| `/api/verification/pending-hotel-branches` | GET | Pending hotel branches |
| `/api/verification/hotel-branch/:id` | GET | Hotel branch detail |
| `/api/verification/hotel-branch/:id/approve` | POST | Approve hotel branch |
| `/api/verification/hotel-branch/:id/reject` | POST | Reject hotel branch |
| `/api/verification/uploads/:filename` | GET | Serve verification document file |

**Config:** `VITE_ADMIN_API_URL` (default localhost:3003), `VITE_MAIN_APP_API_URL` (default localhost:3001), `VITE_ADMIN_API_KEY` (optional, sent as X-Admin-Key to main app).

---

### 1.12 Main app APIs used by admin-main

| Endpoint | Method | Used by |
|----------|--------|--------|
| `/api/admin/feedback` | GET | FeedbackUsers, ComplaintUsers |
| `/api/admin/feedback/:id/reply` | PATCH | ComplaintUsers (reply) |

---

## Part 2: Vendor-Hub (Vendor Side)

### 2.1 App & routing

| Item | Details |
|------|--------|
| **App** | `vendor-hub-main/src/App.tsx` – QueryClient, TooltipProvider, Toaster, Sonner, BrowserRouter, VendorAuthProvider |
| **Public routes** | `/signin`, `/signup` |
| **Protected routes** | Wrapped in `ProtectedVendorRoute` + `VendorLayout` (sidebar + TopHeader + main) |

**Protected routes (under VendorLayout):**

| Path | Component |
|------|-----------|
| `/` | Dashboard |
| `/listings` | Listings |
| `/listings/:listingId/transport` | TransportListing |
| `/listings/:listingId/transport/bus/:busId` | BusDetail |
| `/listings/:listingId/transport/car/:carId` | CarDetail |
| `/listings/:listingId/transport/flight` | FlightListing |
| `/listings/:listingId/transport/flight/:flightId` | FlightDetail |
| `/listings/:listingId/transport/vehicle/:vehicleType` | VehiclePlaceholder |
| `/listings/:listingId` | ListingDetail |
| `/listings/:listingId/experience` | ExperienceManage |
| `/listings/:listingId/experience/edit` | EditExperience |
| `/listings/:listingId/event` | EventManage |
| `/listings/:listingId/event/edit` | EditEvent |
| `/add-listing` | AddListing |
| `/add-listing/experience` | AddExperience |
| `/add-listing/event` | AddEvent |
| `/add-listing/hotel` | AddHotel |
| `/listings/:listingId/hotel` | HotelListing |
| `/listings/:listingId/hotel/branch/:branchId` | HotelBranchDetail |
| `/listings/:listingId/hotel/add` | AddHotelBranch |
| `/bookings` | Bookings |
| `/customers` | Customers |
| `/messages` | Messages |
| `/reviews` | Reviews |
| `/analytics` | Analytics |
| `/promotions` | Promotions |
| `/verification` | Verification |
| `/payouts` | Payouts |
| `/settings` | ProfileSettings |
| `/support` | Support |

`*` → NotFound.

---

### 2.2 Layout: VendorSidebar

| Element | Data |
|--------|------|
| Logo | "V" in gold-style box, "VendorHub" text (collapsible) |
| Nav items | Dashboard, My Listings, Add New Listing, Bookings, Customers, Reviews, Analytics, Promotions, Verification, Payouts, Profile Settings, Support |
| Icons | LayoutDashboard, ListPlus, PlusCircle, CalendarCheck, Users, Star, BarChart3, Tag, ShieldCheck, Wallet, Settings, HelpCircle |
| Collapse | ChevronLeft/ChevronRight; width 260px / 72px |

---

### 2.3 Layout: TopHeader

| Element | Data |
|--------|------|
| Bell icon | Notification (UI only; no data) |
| User dropdown | Vendor name + email from `useVendorAuth()`; Sign out → logout + navigate to /signin |

---

### 2.4 Page: Dashboard

| UI element | Data source |
|------------|-------------|
| Welcome text | `vendor?.name` from `useVendorAuth()` (backend via auth) |
| 4 metric cards | **Static mock:** Total Views, Total Bookings, Revenue This Month, Average Rating (values like "12,847", "384", "$24,580", "4.8") |
| Recent Bookings table | **Static mock:** BK-7821, etc. (service, date, status, amount) |
| Quick Actions | Static links: Add New Listing, Upload Photos, Create Promotion |

---

### 2.5 Page: Listings

| UI element | Data source | Backend |
|------------|-------------|--------|
| Title / subtitle | Static | — |
| Redirect message | location.state (message, success) | — |
| Listings grid | **Backend** | `GET /api/listings` (vendor's listings) |
| Listing card | id, name, type, status, description, cover_image_url, created_at, verification_status, verification_token | — |
| Add Listing button | Link to /add-listing | — |
| Delete | **Backend** | `DELETE /api/listings/:id` |
| Verification modal | Token display, Generate token | **Backend** `POST /api/listings/:id/generate-verification-token` |

---

### 2.6 Page: TransportListing (buses, cars, flights)

| UI element | Data source | Backend |
|------------|-------------|--------|
| Listing name | **Backend** | `GET /api/listings/:listingId` |
| Buses / Cars / Flights tabs | **Backend** | buses: `GET /api/listings/:listingId/buses`, routes, drivers; cars: cars, drivers, operating-areas, cities; flights: `GET /api/listings/:listingId/flights` |
| CRUD buses | **Backend** | POST/PATCH/DELETE buses, routes, drivers; generate-verification-token |
| CRUD cars | **Backend** | POST/PATCH/DELETE cars, drivers, operating-areas; generate-verification-token |
| CRUD flights | **Backend** | POST flights, routes; DELETE flight; generate-verification-token |
| Upload | **Backend** | `POST /api/upload` (image base64) |

---

### 2.7 Page: Bookings (vendor)

| UI element | Data source | Backend |
|------------|-------------|--------|
| Tabs | Bus, Car, Flight, Hotel, Experience, Event | — |
| Bus bookings | **Backend** | `GET /api/transport-bookings` (filtered by listing); seat layout, customer bookings |
| Car bookings | **Backend** | Car bookings API (listing-scoped) |
| Flight bookings | **Backend** | Flight bookings list + detail; accept/reject |
| Hotel bookings | **Backend** | Hotel bookings list + detail; approve/reject |
| Experience / Event bookings | **Backend** | Experience/event booking APIs |
| Modals/drawers | Booking detail, seats, accept/reject, pay | Various PATCH endpoints |

---

### 2.8 Page: Customers

| UI element | Data source | Backend |
|------------|-------------|--------|
| List | **Backend** | `GET /api/customers` (with query params for listing etc.) |

---

### 2.9 Page: Reviews

| UI element | Data source | Backend |
|------------|-------------|--------|
| Companies list | **Backend** | `GET /api/listings`, `GET /api/booking-reviews` |
| Company overview | Computed | Overall rating from reviews for listing |
| Reviews by listing | **Backend** | For transport/rental: `GET /api/listings/:id/buses`, cars, flights; for hotel: hotel-branches. Then filter reviews by scope_entity_type/scope_entity_id |
| Review rows | id, user_name, rating, comment, created_at, booking_type, scope | From `/api/booking-reviews` |

---

### 2.10 Other vendor pages (summary)

| Page | Main data source |
|------|-------------------|
| AddListing, AddExperience, AddEvent, AddHotel | **Backend** POST listings, experience, event, hotel |
| HotelListing, HotelBranchDetail, AddHotelBranch | **Backend** list/GET/POST/PATCH hotel branches; verification token |
| BusDetail, CarDetail, FlightDetail, FlightListing | **Backend** GET/PATCH/DELETE buses/cars/flights, routes, drivers, schedules, seat layout |
| ListingDetail, ExperienceManage, EditExperience, EventManage, EditEvent | **Backend** GET/PATCH listing, experience, event |
| Analytics, Promotions, Verification, Payouts, ProfileSettings, Support | Mix of static UI and/or backend (verification uses vendor-hub verification APIs) |

---

### 2.11 Vendor-hub frontend API usage

All authenticated requests use `vendorFetch` with `Authorization: Bearer <token>` (token from localStorage `vendor_token`). Base URL: `VITE_VENDOR_API_URL` (default localhost:3002).

**Examples of endpoints used:**

- Auth: `POST /api/auth/signin`, `POST /api/auth/signup`
- Listings: `GET/POST/PATCH/DELETE /api/listings`, `POST /api/listings/:id/generate-verification-token`
- Nested under listing: `/api/listings/:listingId/buses`, `/cars`, `/flights`, `/routes`, `/drivers`, `/hotel-branches`, `/experience`, `/event`, `/flight-bookings`, `/hotel-bookings`, etc.
- Upload: `POST /api/upload`
- Customers: `GET /api/customers`
- Booking reviews: `GET /api/booking-reviews`
- Cities: `GET /api/cities`
- Verification: various `GET/POST` under `/api/verification` (resolve-token, documents, send-request, bus-documents, car-documents, hotel-branch-documents, flight, etc.)

---

### 2.12 Vendor-hub backend API summary

Mount points:

- `/api/auth` – auth (signin, signup)
- `/api/listings` – listings index (list, get one, create, update, delete, generate-verification-token) + nested `/:listingId/buses|cars|flights|routes|drivers|hotel-branches|experience|event|flight-bookings|hotel-bookings|...`
- `/api/upload` – image upload
- `/api/transport-bookings` – bus bookings
- `/api/customers` – customers
- `/api/verification` – verification (resolve tokens, documents, send requests for listing, bus, car, hotel branch, flight)
- `/api/cities` – cities
- `/api/booking-reviews` – GET (vendor’s reviews), POST (create – if used from hub)
- `/api/public` – public transport (e.g. available-buses)
- `/uploads` – static uploads

Nested listing routes (under `/api/listings/:listingId`) include:

- buses, drivers, routes, bus schedules
- cars, car drivers, operating areas, car bookings, scheduled cars
- flights, flight routes, flight schedules, flight bookings
- hotel-branches, hotel-bookings
- experience, event

(Exact method and path for each sub-resource are as in the route files: GET/POST/PATCH/DELETE and optional :id params.)

---

## Part 3: Data source summary

| Area | Static only | Backend only | Mixed |
|------|-------------|--------------|-------|
| Admin Dashboard | ✓ (metrics "—", quick actions text) | — | — |
| Admin Verification | — | ✓ (all tables + detail + actions) | — |
| Admin Feedback | — | ✓ (main app feedback API) | — |
| Admin Complaints | — | ✓ (main app feedback + reply) | — |
| Admin Users | ✓ (list + add user in memory) | — | — |
| Admin Vendors | ✓ (vendor details table) | — | — |
| Admin Bookings | ✓ (mock table + metrics) | — | — |
| Admin Payouts | ✓ (mock table + Transfer button) | — | — |
| Vendor Dashboard | ✓ (metrics, recent bookings, quick actions) | Vendor name from auth | Mixed |
| Vendor Listings | — | ✓ | — |
| Vendor Transport / Buses-Cars-Flights | — | ✓ | — |
| Vendor Bookings | — | ✓ | — |
| Vendor Customers | — | ✓ | — |
| Vendor Reviews | — | ✓ (listings + booking-reviews + sub-entities) | — |

---

## Part 4: UI components (shared / notable)

**Admin-main:**

- `AdminLayout` – sidebar + Outlet
- `MetricCard` – title, value, icon, optional change %, iconBg
- No separate Button/Card components (inline classes: bg-forest-600, rounded-lg, border, etc.)

**Vendor-hub:**

- `VendorLayout` – VendorSidebar + TopHeader + main
- `VendorSidebar` – nav links, collapse
- `TopHeader` – notifications bell, user dropdown (name, email, sign out)
- `MetricCard` – used on Dashboard
- Many shadcn-style components: Button, Card, Input, Tabs, Dialog, Sheet, Table, Calendar, Popover, DropdownMenu, etc.

---

*Document generated as a reference only; no code was modified.*
