# Wander Wisely — Product Roadmap & Architecture

## Vision Shift

**From:** Simple SaaS (AI itinerary + posts)  
**To:** AI + Marketplace + Social + Travel Platform

---

## 1. Smart Blocks System (Upgrade from plain timeline)

Each activity has a **type** and becomes an interactive block:

| Block Type       | Expandable content / actions |
|------------------|-------------------------------|
| Transport        | Bus, train, car rental, taxis, ride-sharing, price comparison, seat booking |
| Stay             | Hotels, homestays, check-in/out, amenities |
| Food             | Top rated, budget, trendy, street food, map, cuisine filter, book table |
| Experience       | Adventure sports, cultural shows, tours, guided packages, entry tickets |
| Shopping         | Markets, malls, street markets, what it’s famous for, price range, best time |
| Events           | Festivals, concerts, local events, dates, tickets |
| Hidden Gems      | Local tips, offbeat spots, contributor suggestions |
| Local Services   | SIM, luggage storage, guides, insurance |
| Emergency Info   | Hospitals, police, embassy, emergency numbers |

**Implementation:** AI returns `activityType` per activity → frontend renders the right block and expansion UI.

---

## 2. Travel Data Engine (Structured data layer)

AI generates **structure** (day plan, slots). Database provides **real options**.

**Core tables:**

- `cities` — name, country, region, timezone, coords
- `attractions` — name, city_id, type, description, opening_hours, entry_fee, crowd_levels
- `restaurants` — name, city_id, cuisine, price_range, rating, booking_url
- `events` — name, city_id, type, start/end, venue, ticket_url
- `experiences` — name, city_id, type (adventure/cultural/tour), duration, price_range
- `local_transport` — city_id, mode (bus/train/taxi/rental), provider, price_estimate, booking_url
- `weather_patterns` — city_id, month, avg_temp, conditions
- `seasonal_recommendations` — city_id, season, tips
- `crowd_levels` — attraction_id, day_of_week, hour, level
- `safety_score` — city_id, score, notes

AI suggests slots; app fetches real options from these tables for each block.

---

## 3. Marketplace Model

Platform can include bookable / purchasable services:

- Local tour guides  
- Local photographers  
- Rental bikes  
- Adventure operators  
- Homestays / Airbnb-style stays  
- Travel insurance  
- SIM cards  
- Luggage storage  

**Implies:** vendor tables, listings, booking flow, commissions.

---

## 4. Community Evolution (Beyond posts)

- **Travel Stories** — itinerary → blog-style memory, photo timeline, AI-generated story, shareable page  
- **Itinerary sharing** — make trip public, copy trip, “remix” trip  
- **Local contributors** — add restaurants, hidden gems, food places; earn points; verified badges  

Creates a **data growth loop**: more UGC → better recommendations → more users.

---

## 5. Smart Differentiators

- **Weather adjuster** — forecast change → AI suggests indoor alternatives  
- **Crowd intelligence** — busy/low-crowd hours, best time to visit  
- **Dynamic budget optimizer** — user sets total budget → system splits across transport/stay/food/experiences using real data  
- **Mood-based travel** — Chill / Adventure / Romantic / Spiritual / Party → plan tone adapts  

---

## 6. Future-Level Features (2–3 years)

- Live travel map (where others are traveling now)  
- Real-time local feed (“2 travelers visited this cafe today”)  
- Short travel reels (travel-only content)  
- Packing assistant (weather + trip type + culture)  
- Visa + travel rules assistant  

---

## 7. Monetization

- Ticket / hotel / tour / restaurant booking commission  
- Sponsored places & featured destinations  
- Premium AI (Pro subscription)  
- Local vendor subscription  
- Ads (later stage)  

---

## 8. Phased Build Plan

### Phase 1 — MVP (Current + near-term)

- [x] AI-generated day-by-day plan (existing)  
- [ ] **Activity types** in AI output (transport, food, experience, stay, etc.)  
- [ ] **Smart blocks UI** — each activity as expandable block by type (start with Transport, Food, Experience)  
- [ ] **Basic data layer** — `cities`, `attractions`, `restaurants` (seed data for 1–2 destinations)  
- [x] Basic community (posts)  
- [ ] Transport block: show real options from DB or placeholder UI  

### Phase 2

- Booking system (tours, restaurants, transport)  
- Marketplace vendors (guides, rentals, stays)  
- Trip sharing (public itinerary, copy, remix)  
- Travel Stories (itinerary → shareable story)  

### Phase 3

- Crowd intelligence  
- Budget optimizer  
- Local contributor program  
- Weather-based suggestions  

### Phase 4

- Global expansion, mobile app  
- Real-time data layer  
- Live map / real-time feed  

---

## 9. Architecture Principles

- **Modular backend** — separate routes/services: `ai`, `data`, `marketplace`, `community`  
- **Scalable DB** — normalized core tables; avoid storing full AI text as only source of truth; link activities to `attractions` / `restaurants` / `experiences` where possible  
- **Clear layers:**  
  - **AI layer** — generates structure (days, activities, types, suggestions)  
  - **Data layer** — cities, attractions, restaurants, transport, etc.  
  - **Marketplace layer** — vendors, listings, bookings  
  - **Community layer** — posts, stories, sharing, contributors  

---

## Next Step (Phase 1 — first slice)

1. **Backend:** Extend Groq so each activity includes `activityType` (e.g. `transport` | `food` | `experience` | `stay` | `shopping` | `events` | `hidden_gem` | `local_service` | `emergency`).  
2. **Frontend:** Render each timeline item as a “block” with a type badge and an expandable section (placeholder content per type: Transport → “Bus / Train / Taxi / Rental”; Food → “Top rated / Budget / Street food / Book table”; etc.).  
3. **DB:** Add migrations for `cities`, `attractions`, `restaurants` and seed a small set; later, wire blocks to “real options” from these tables.

This gives you the **Smart Blocks** experience and a clear path to the data engine and marketplace.
