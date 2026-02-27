/**
 * Static mock data for Payouts drill-down UI:
 * Payouts → Vendor (eye) → Listings (total share) → Listing detail (cards + fleets or bookings) → Fleet detail (cards + bookings).
 * Replace with API data when making dynamic.
 */

export const MOCK_PAYOUT_VENDORS = [
  { vendorId: "v1", vendorName: "Fairytales Travels", totalEarned: 9600, paidToVendor: 6000, pending: 3600 },
  { vendorId: "v2", vendorName: "Orange Cabs", totalEarned: 3200, paidToVendor: 3200, pending: 0 },
  { vendorId: "v3", vendorName: "Skyline Hotels", totalEarned: 2560, paidToVendor: 0, pending: 2560 },
  { vendorId: "v4", vendorName: "23198 Airlines", totalEarned: 3600, paidToVendor: 0, pending: 3600 },
] as const;

/** Per-vendor list of companies/listings; each listing shows total share only on vendor page. */
export const MOCK_PAYOUT_LISTINGS: Record<
  string,
  { listingId: string; listingName: string; totalShare: number }[]
> = {
  v1: [
    { listingId: "L1a", listingName: "Premium Coaches", totalShare: 6000 },
    { listingId: "L1b", listingName: "Standard Buses", totalShare: 3600 },
  ],
  v2: [{ listingId: "L2a", listingName: "City Cabs", totalShare: 3200 }],
  v3: [
    { listingId: "L3a", listingName: "Deluxe Rooms", totalShare: 1600 },
    { listingId: "L3b", listingName: "Suites", totalShare: 960 },
  ],
  v4: [{ listingId: "L4a", listingName: "Domestic Routes", totalShare: 3600 }],
};

/** Fleets under each listing. If a listing has no entry or empty array, show bookings under listing (no fleet). */
export const MOCK_PAYOUT_FLEETS: Record<
  string,
  { fleetId: string; fleetName: string; totalEarned: number; paidToVendor: number; pending: number }[]
> = {
  L1a: [
    { fleetId: "f1a", fleetName: "Premium Coaches Fleet", totalEarned: 6000, paidToVendor: 6000, pending: 0 },
  ],
  L1b: [
    { fleetId: "f1b", fleetName: "Standard Buses Fleet", totalEarned: 3600, paidToVendor: 0, pending: 3600 },
  ],
  L2a: [
    { fleetId: "f2a", fleetName: "City Cabs Fleet", totalEarned: 3200, paidToVendor: 3200, pending: 0 },
  ],
  L3a: [
    { fleetId: "f3a", fleetName: "Deluxe Rooms Fleet", totalEarned: 1600, paidToVendor: 0, pending: 1600 },
  ],
  // L3b has no fleet – bookings under listing
  L4a: [
    { fleetId: "f4a", fleetName: "Domestic Routes Fleet", totalEarned: 3600, paidToVendor: 0, pending: 3600 },
  ],
};

/** Bookings per fleet (fleetId). */
export const MOCK_PAYOUT_BOOKINGS: Record<
  string,
  { id: string; bookingRef: string; userName: string; amount: number; paidAt: string; status: string }[]
> = {
  f1a: [
    { id: "b1", bookingRef: "B001", userName: "Priya Sharma", amount: 1200, paidAt: "2025-02-20", status: "Paid" },
    { id: "b2", bookingRef: "B002", userName: "Rahul Kumar", amount: 2400, paidAt: "2025-02-21", status: "Paid" },
    { id: "b3", bookingRef: "B003", userName: "Anita Reddy", amount: 2400, paidAt: "2025-02-19", status: "Paid" },
  ],
  f1b: [
    { id: "b4", bookingRef: "B004", userName: "Vikram Singh", amount: 1800, paidAt: "—", status: "Pending" },
    { id: "b5", bookingRef: "B005", userName: "Meera Patel", amount: 1800, paidAt: "—", status: "Pending" },
  ],
  f2a: [
    { id: "b6", bookingRef: "B006", userName: "Priya Sharma", amount: 800, paidAt: "2025-02-20", status: "Paid" },
    { id: "b7", bookingRef: "B007", userName: "Alex K.", amount: 1200, paidAt: "2025-02-21", status: "Paid" },
    { id: "b8", bookingRef: "B008", userName: "Sarah M.", amount: 1200, paidAt: "2025-02-22", status: "Paid" },
  ],
  f3a: [
    { id: "b9", bookingRef: "B009", userName: "Anita Reddy", amount: 3200, paidAt: "—", status: "Pending" },
  ],
  f4a: [
    { id: "b11", bookingRef: "B011", userName: "Rahul Kumar", amount: 3600, paidAt: "—", status: "Pending" },
  ],
};

/** Bookings under a listing when it has no fleet (e.g. L3b Suites). */
export const MOCK_PAYOUT_BOOKINGS_BY_LISTING: Record<
  string,
  { id: string; bookingRef: string; userName: string; amount: number; paidAt: string; status: string }[]
> = {
  L3b: [
    { id: "b10", bookingRef: "B010", userName: "Rahul Kumar", amount: 960, paidAt: "—", status: "Pending" },
  ],
};
