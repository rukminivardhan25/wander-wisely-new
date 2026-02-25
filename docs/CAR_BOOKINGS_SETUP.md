# Car booking requests: make them visible on Vendor Hub

When a user books a car on the main app, the request is stored in the **database** (same as `DATABASE_URL`). For that request to show on the **Vendor Hub → Bookings → Car** page, both apps must use the **same database**.

## One-time setup

1. **Use one PostgreSQL database** for app data, listings, cars, `car_bookings`, flights, buses, etc.  
   Set **`DATABASE_URL`** to that DB in **both** backends.

2. **Main app backend** (`backend/.env`): set **`DATABASE_URL`** to your PostgreSQL URL.

3. **Vendor hub backend** (`vendor-hub-main/backend/.env`): set **`DATABASE_URL`** to the **same URL** as the main app (same host, database, user).

4. **Restart** both backends after changing `.env`.

After this, new car booking requests from the main app will appear under **Vendor Hub → Bookings → Car** (and in the car schedule detail sidebar).
