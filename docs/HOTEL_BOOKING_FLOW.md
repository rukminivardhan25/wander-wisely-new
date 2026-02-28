# How hotel booking works

## Status flow

Hotel bookings move through these statuses. **You should never see the raw status (e.g. `approved_awaiting_payment`) in the UI** — the app shows friendly labels instead.

| Status (in DB)           | What it means                    | User sees (label)           | What the user can do                    |
|--------------------------|----------------------------------|-----------------------------|-----------------------------------------|
| `pending_vendor`         | Request sent, waiting for hotel  | **Pending approval**        | View request                            |
| `approved_awaiting_payment` | Hotel approved, room allotted | **Bill ready — Pay now**    | Pay now, View bill                      |
| `confirmed`              | User has paid                    | **Confirmed**                | View receipt                            |
| `rejected`               | Hotel declined                   | **Rejected**                 | —                                       |

## Step-by-step

1. **User sends a request**  
   User picks hotel, dates, room type, guest details → submits.  
   → Status: **pending_vendor**.  
   → User sees: “Pending approval” and “View request”.

2. **Vendor approves**  
   In the Partner Portal (Bookings → Hotel), the vendor opens the request, enters **room number** (and optionally total amount and a message), and clicks Approve.  
   → Status: **approved_awaiting_payment**.  
   → User sees: “Bill ready — Pay now” and can use **Pay now** or **View bill**.

3. **User pays (mocked)**  
   User clicks “Pay now” (on My Bookings or on the bill/receipt page).  
   → Status: **confirmed**, `paid_at` is set.  
   → User sees: “Confirmed” and “View receipt”. Receipt can be downloaded.

4. **Admin and vendor payouts**  
   Only bookings with **confirmed** status and **paid_at** set are counted as paid in admin and vendor payouts.

## Why you see “Bill ready — Pay now”

If your booking is in **approved_awaiting_payment**, that is **correct** after the hotel has approved. It means:

- The hotel has approved your request and allotted a room.
- Your bill is ready.
- You need to **pay** to confirm the booking.

**What to do:** On My Bookings, use **Pay now** or **View bill**. On the bill page you can also click **Pay now** (payment is mocked), then **View receipt** / Download receipt.

If you ever see the raw status text (e.g. `approved_awaiting_payment`) instead of “Bill ready — Pay now”, that’s a bug — the app is supposed to show only the friendly labels above.
