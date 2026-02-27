# Vendors → Listings → Fleets hierarchy

This document describes how to get **all vendors**, **listings under each vendor**, and **fleets under each listing**.

## API

**GET** `/api/admin/payouts/hierarchy`

- **Backend:** Main app (e.g. `http://localhost:3001`)
- **Auth:** Optional `X-Admin-Key` header if `ADMIN_API_KEY` is set.

### Example request

```bash
curl -s "http://localhost:3001/api/admin/payouts/hierarchy" | jq
```

With admin key:

```bash
curl -s -H "X-Admin-Key: YOUR_KEY" "http://localhost:3001/api/admin/payouts/hierarchy" | jq
```

### Response shape

```json
{
  "vendors": [
    {
      "vendorId": "uuid",
      "vendorName": "Vendor display name",
      "listings": [
        {
          "listingId": "uuid",
          "listingName": "Company / listing name",
          "fleets": [
            { "fleetId": "bus", "fleetName": "Bus bookings" },
            { "fleetId": "car", "fleetName": "Car bookings" },
            { "fleetId": "flight", "fleetName": "Flight bookings" },
            { "fleetId": "hotel", "fleetName": "Hotel bookings" }
          ]
        }
      ]
    }
  ]
}
```

- **Vendors** come from the `vendors` table (same as vendor-hub).
- **Listings** per vendor come from `vendor_listings` (and `listings` for the name) — i.e. companies under each vendor in vendor-hub.
- **Fleets** per listing are only **bus, car, flight, hotel** (from `buses`, `cars`, `flights`, `hotel_branches` in vendor-hub). **Experiences and events are listing types with no fleet** — they are companies/listings, not fleets. If a listing has no rows in any of those four tables, it has **no fleet** (empty `fleets` array).

## From the Admin UI

You can also walk the same hierarchy in the app:

1. **Payouts** → table shows all vendors (Vendor ID, Vendor name).
2. Click the **eye** on a vendor → that vendor’s **Companies / Listings**.
3. Click a listing → **Fleets** for that listing (and then “View bookings” for a fleet to see bookings).

The **GET /api/admin/payouts/hierarchy** response is the same tree in one JSON payload for export or integration.
