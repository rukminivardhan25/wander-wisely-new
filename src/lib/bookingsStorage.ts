/**
 * Client-side storage for bus bookings (mock).
 * Used so "My Bookings" shows tickets the user has booked and "View ticket" works.
 */

const STORAGE_KEY = "wander_bus_bookings";

export type StoredBusBooking = {
  bookingId: string;
  bus: {
    listingName: string;
    busName: string;
    registrationNumber?: string | null;
    busNumber?: string | null;
    departureTime: string;
    driverName?: string | null;
    driverPhone?: string | null;
  };
  selectedSeats: number[];
  travelDate: string;
  routeFrom: string;
  routeTo: string;
  totalCents: number;
  passengerName?: string;
  passengerPhone?: string;
  email?: string;
  bookedAt: number; // timestamp
};

export function getStoredBusBookings(): StoredBusBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addStoredBusBooking(booking: Omit<StoredBusBooking, "bookedAt">): void {
  const list = getStoredBusBookings();
  if (list.some((b) => b.bookingId === booking.bookingId)) return;
  const withTime: StoredBusBooking = { ...booking, bookedAt: Date.now() };
  list.unshift(withTime);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}
