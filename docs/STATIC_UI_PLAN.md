# Static UI Build Plan (One by One)

Build each feature as **static UI first** (no backend). Then wire data later.

---

## ✅ 1. Smart Blocks (Activity blocks by type) — DONE

**Where:** Plan Trip result → each timeline activity.

**Static UI (implemented):**
- Each activity = card with **type-specific left border + tint** (Transport=blue, Food=amber, Experience=emerald, Shopping=pink, etc.) and type badge.
- **Expandable** section: click to open; chevron rotates.
- **Transport:** mock option cards (Bus ₹200·2h, Train ₹150·1.5h, Taxi, Rental).
- **Food:** mock cards (Top rated, Budget friendly, Street food, Book table).
- **Experience:** mock cards (Adventure sports, Local tour, Entry tickets).
- Other types: option pills/buttons.

**Status:** Done. Next: **2. Travel Data Engine static UI**.

---

## 2. Travel Data Engine — Static UI

**Where:** New section or page "Explore data" / "Places".

**Static UI:**
- Tabs or cards: **Attractions** | **Restaurants** | **Events** | **Transport** | **Weather**.
- Each tab shows 4–6 mock cards (image, title, subtitle, price/time).
- Filter bar (placeholder): city, date, category.

---

## 3. Marketplace — Static UI

**Where:** New page `/marketplace` or section "Book & services".

**Static UI:**
- Grid of service cards: Tour guides, Photographers, Rentals, Stays, Insurance, SIM, Luggage storage.
- Each card: icon, title, short description, "Coming soon" or "Explore" CTA.

---

## 4. Community (Stories + Sharing) — Static UI

**Where:** Community page or new "Stories" / "My trips".

**Static UI:**
- **Travel Stories:** 2–3 mock story cards (cover image, title, author, "Read").
- **Itinerary sharing:** Mock "Share" / "Copy trip" / "Remix" buttons on a sample itinerary card.

---

## 5. Smart Features — Static UI

**Where:** Plan Trip form or result.

**Static UI:**
- **Weather:** Small widget placeholder (icon, "24°C", "Partly cloudy").
- **Crowd:** "Busy 2–5 PM" / "Low crowd" badge.
- **Budget:** Progress bar (Transport 30%, Stay 40%, Food 20%, Experiences 10%).
- **Mood:** Pills (Chill, Adventure, Romantic, Spiritual, Party) on form or result.

---

## 6. Future (Live map, Reels, Packing, Visa) — Later

Static placeholders only when we reach Phase 4.

---

**Order:** 1 → 2 → 3 → 4 → 5. One at a time.
