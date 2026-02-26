# Plan Generation & My Trip – Clear Explanation

This document explains **how plan generation works** (user inputs, outputs, database, flow) and lists **all user-side features** in Plan Generation and My Trip. No code is modified.

---

## Part 1: Plan Generation (Plan Trip)

### 1.1 What the user gives as input

The user fills the **Plan Your Perfect Trip** form with:

| Input | Required? | Description | Allowed values / rules |
|-------|-----------|-------------|-------------------------|
| **From** | Yes | Origin city/place | Text (e.g. Hyderabad) |
| **To** | Yes | Destination city/place | Text (e.g. Manali) |
| **Number of Days** | Yes | Trip length | 1–30 (integer) |
| **Budget** | Yes | Budget tier | One of: **Budget**, **Medium**, **Luxury** |
| **Total budget (amount)** | No | Optional total trip budget | e.g. ₹50000 or $1200; used to tailor cost estimates |
| **Travel Type** | Yes | Who is travelling | One of: **Solo**, **Couple**, **Family**, **Friends** |
| **Interests** | No | What they want to do | Multi-select: Food, Adventure, Culture, Shopping, Nature, Spiritual, Nightlife, Beach |
| **Transport Preference** | No | Preferred transport | One of: **Flight**, **Train**, **Bus**, **Car** (or none) |

User must be **signed in**. If not, they are prompted to sign in before generating.

---

### 1.2 What the user gets as output

After clicking **“Generate My Itinerary”** and a successful run:

1. **Trip summary**
   - **Origin → Destination** (e.g. Hyderabad → Manali)
   - **Number of days**

2. **Per-day itinerary**
   - For each day (1 to N):
     - **Day hero**: background image (from Unsplash), day number, destination name, **one-sentence summary** for that day.
     - **Time-wise plan**: list of **activities** with:
       - **Time** (e.g. 09:00)
       - **Title** (e.g. “Check out from hotel”)
       - **Description**
       - **Duration** (e.g. 2 hours)
       - **Cost estimate** (e.g. ₹500 or Free)
       - **Activity type** (transport, stay, food, experience, shopping, events, hidden_gem, local_service, emergency)

3. **Day navigation**
   - **Day X of Y** with Previous/Next (and arrows in header).
   - User can switch between days and see that day’s activities and summary.

4. **Actions**
   - **Modify Plan**: Clears the result and goes back to the form (same page).
   - **Make This My Trip**: Sets this plan as the **active trip** (stored in DB) and redirects to **My Trip** page.

5. **Activity interaction**
   - User can **click an activity** → opens **Activity Detail** page (`/plan-trip/activity`) with full description, type-specific “Smart Block” options (e.g. for Transport: Bus options, Train options, Car rentals, etc.), and links to book or explore.
   - User can **remove an activity** from the plan (trash icon); change is **in-memory only** until they click “Make This My Trip” (then the saved trip has the itinerary as stored in DB at activation time).

6. **Photos**
   - Each day can have **1–2 images** from Unsplash (based on main place/destination). Shown as day hero background.

---

### 1.3 How it works (backend & DB)

**API used:** `POST /api/trips/generate`  
**Auth:** Bearer token required.

**Flow:**

1. **Validation**
   - Backend validates body with Zod: `origin`, `destination`, `days` (1–30), `budget` (Budget/Medium/Luxury), `travel_type`, `interests` (array), `transport_preference` (optional), `budget_amount` (optional number).

2. **Database – create trip row**
   - Insert into **`trips`** table:
     - `user_id`, `origin`, `destination`, `days`, `budget`, `travel_type`, `interests`, `transport_preference`, `budget_amount`, `status = 'generating'`.
   - Returns `trip.id`.

3. **AI generation (Groq)**
   - For **each day** (1 to N):
     - Backend calls **Groq API** (Llama 3.1 8B) with a system prompt that asks for **one JSON object per day** with: `day`, `summary`, `mainPlace`, `activities[]`.
     - Each activity must have: `time`, `title`, `description`, `duration`, `costEstimate`, `activityType`.
     - `activityType` is one of: transport, stay, food, experience, shopping, events, hidden_gem, local_service, emergency.
   - If Groq fails: trip `status` is set to `'failed'` and API returns 502.

4. **Day images (Unsplash)**
   - For each day, backend calls **Unsplash** with `mainPlace` and destination to get up to 2 image URLs for that day.

5. **Database – save itineraries**
   - For each day, insert into **`itineraries`** table:
     - `trip_id`, `day_number`, `content` (JSONB: `summary`, `activities[]`, `imageUrl`, `imageUrls[]`).

6. **Mark trip ready**
   - Update **`trips`** set `status = 'ready'` for this `trip.id`.

7. **Response to client**
   - Return:
     - `trip`: `{ id, origin, destination, days, status: 'ready' }`
     - `itineraries`: array of `{ id, trip_id, day_number, content }` ordered by `day_number`.

**Database tables involved:**

- **`trips`**  
  - Stores: `id`, `user_id`, `origin`, `destination`, `days`, `budget`, `travel_type`, `interests`, `transport_preference`, `budget_amount`, `status` (draft | generating | ready | failed | active), `start_date`, `selected_at`, `created_at`, `updated_at`.

- **`itineraries`**  
  - One row per day per trip: `id`, `trip_id`, `day_number`, `content` (JSONB with summary, activities, imageUrl/imageUrls).

---

## Part 2: My Trip (My Plan) – User-side features

My Trip is the **active trip** view: one trip per user with `status = 'active'`. Data comes from **GET /api/trips/active** (trip + itineraries). If there is no active trip, the page shows a message and link to Plan Trip or Book.

---

### 2.1 Top section – Trip overview & calendar

- **Trip title**: Origin → Destination, X-day trip.
- **Calendar**
  - If **no start date** set: user can pick a date in the calendar and click **“Start trip from &lt;date&gt;”** → **PATCH /api/trips/:id** with `start_date` (YYYY-MM-DD). Trip is then “started” on that date.
  - If **start date** is set: calendar shows that date and is disabled; text shows “Started &lt;date&gt;”.
- **Day selector**: Dropdown to choose Day 1, Day 2, … Day N.
- **Activities list** for selected day:
  - Each activity shows: icon (by type), title, time, place (if any), cost estimate, “Upcoming”.
  - **Click activity** → navigate to **Activity Detail** (`/plan-trip/activity`) with trip + day + activity in state (same as from Plan Trip).

---

### 2.2 Trip summary card (right column)

- **Trip summary** text (day summary or fallback to “X-day trip from A to B”).
- **Day** dropdown (same as main day selector).
- **Show/Hide activities** – expand/collapse list of activity titles for current day.
- **Budget by category**: Bar breakdown of **estimated costs by activity type** (Transport, Food, Shopping, Stay, Experience, etc.) derived from itinerary `costEstimate` (e.g. ₹500) parsed per activity. Shows amount and percentage bar per category.

---

### 2.3 Tabs

**Bookings**
- **Filter by date**: “Show for date” – filter all bookings by a chosen date (events: that date; others: travel/slot date).
- **“Book transport, stay & more”** button → links to **/my-trip/book** (Booking Marketplace).
- **Booking cards** (by type):
  - **Bus**: Stored bus bookings (from `/api/bookings` or local storage); route, date, “View ticket” link.
  - **Car**: Car bookings from `/api/car-bookings`; status (Pending approval / Pay now / Completed / Rejected); View details / Pay / Cancel / Delete as applicable.
  - **Flight**: Flight bookings from `/api/flight-bookings`; route, date, passengers, status; Pay (if pending), View boarding pass, Download PDF.
  - **Experience**: From `/api/experience-bookings`; name, city, slot, status; Pay or View ticket.
  - **Event**: From `/api/event-bookings`; name, city, venue, dates; Pay or View ticket.
  - **Hotel**: From `/api/hotel-bookings`; check-in/out, status; “View request” (pending) or “View receipt” (approved) with room number and download receipt.
- If no bookings: message “No bookings yet. Book transport, hotel, experiences, or events to see your tickets here.” (or filtered-date message).

**Restaurants**
- Embeds **Nearby Restaurants** UI (location input, “Use my location”, Search).
- Location pre-filled with **trip destination**.
- Shows OSM-based restaurant results (cards + detail modal with “Open in Google Maps”, “Get directions from current location”). No vendor list; discovery only.

**Shopping**
- Embeds **Nearby Shopping** UI (location input, “Use my location”, Search).
- **Where to shop** dropdown (e.g. Mall, Street shopping, Local market, …).
- **What to buy** dropdown (e.g. Clothes, Shoes, Electronics, …).
- Results from OSM; discovery only.

**Nearby**
- Embeds **Nearby Utilities & essentials** UI (location input, “Use my location”).
- **Category selection**: ATM, Hospital, Pharmacy, Police Station, Petrol Pump, EV Charging, Bus Stop, Railway Station, Airport, Public Restroom, Parking.
- One category at a time; results from OSM; “View on Map” / “Get directions from current location”. No restaurants or shopping here (they have their own tabs).

---

### 2.4 Add Expense (modal)

- **Button** “Add expense” (or similar) opens a modal.
- **Fields**: Amount, **Category** (Transport, Food, Shopping, Stay, Experience, Other), optional **Day** (1 to trip days), optional **Note**.
- **Submit** → **POST /api/trips/:id/expenses**.
- **Expenses** are listed (e.g. in a list or summary); **GET /api/trips/:id/expenses** loads them.
- Used to track **actual spending** vs itinerary cost estimates.

---

### 2.5 Other My Trip behaviour

- **Data loading**
  - On load (when user is signed in): **GET /api/trips/active** → sets current trip + itineraries.
  - **GET /api/trips/:id/expenses** for that trip.
  - **Bookings**: multiple GETs (bookings, car-bookings, flight-bookings, experience-bookings, event-bookings, hotel-bookings); refetched on window focus.
- **No active trip**
  - If **GET /api/trips/active** returns 404: show message and link to Plan Trip or Book.

---

## Part 3: Database summary (for Plan & My Trip)

| Table | Purpose |
|-------|---------|
| **users** | Auth; referenced by `trips.user_id`, `expenses.user_id`. |
| **trips** | One row per generated plan: origin, destination, days, budget, travel_type, interests, transport_preference, budget_amount, status (draft / generating / ready / failed / active), start_date, selected_at. |
| **itineraries** | One row per day per trip: trip_id, day_number, content (JSONB: summary, activities[], imageUrl, imageUrls[]). |
| **expenses** | User-added expenses per trip: trip_id, user_id, amount, category, day_number, note. |

**Plan generation** writes: 1 row in `trips` (status generating → ready) + N rows in `itineraries`.  
**Make This My Trip** updates that trip to `status = 'active'` and clears any previous active trip for the user.  
**My Trip** reads: the active trip + its itineraries + expenses (+ bookings from other APIs).

---

## Part 4: Feature list (quick reference)

**Plan Generation (Plan Trip page)**  
- Inputs: From, To, Days (1–30), Budget (tier), optional total budget amount, Travel type, optional Interests (multi), optional Transport preference.  
- Outputs: Day-by-day itinerary with time, title, description, duration, cost estimate, activity type; day summary; day images (Unsplash).  
- Actions: Modify Plan (back to form), Make This My Trip (set active, go to My Trip), remove activity (in-memory), open Activity Detail.  
- Backend: POST /api/trips/generate → DB (trips + itineraries), Groq (per-day), Unsplash (per-day images).

**My Trip (My Plan)**  
- **Overview**: Trip title, calendar, set start date, day selector, activities list for selected day, open Activity Detail.  
- **Summary card**: Day summary, day dropdown, show/hide activities list, budget by category (from itinerary cost estimates).  
- **Bookings tab**: Date filter, link to Book; list of Bus, Car, Flight, Experience, Event, Hotel bookings with status and actions (Pay, View ticket/receipt, Cancel, etc.).  
- **Restaurants tab**: Nearby Restaurants (location, search, OSM results, Google Maps/directions).  
- **Shopping tab**: Nearby Shopping (location, area type & category dropdowns, OSM results).  
- **Nearby tab**: Nearby Utilities (location, category: ATM, Hospital, Pharmacy, Police, Fuel, EV, Bus, Railway, Airport, Restroom, Parking).  
- **Expenses**: Add expense (amount, category, day, note); list of expenses for the trip (GET/POST /api/trips/:id/expenses).

All of the above are **user-side features**; this document does not modify any code.
