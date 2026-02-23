import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import TicketCard from "@/components/TicketCard";
import { addStoredBusBooking } from "@/lib/bookingsStorage";

type SuccessLocationState = {
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
  email?: string;
  passengerPhone?: string;
  bookingId?: string;
};

const BookingSuccessPage = () => {
  const { state } = useLocation() as { state: SuccessLocationState | null };
  useEffect(() => {
    if (state?.bookingId) {
      addStoredBusBooking({
        bookingId: state.bookingId,
        bus: state.bus,
        selectedSeats: state.selectedSeats,
        travelDate: state.travelDate,
        routeFrom: state.routeFrom,
        routeTo: state.routeTo,
        totalCents: state.totalCents,
        passengerName: state.passengerName,
        passengerPhone: state.passengerPhone,
        email: state.email,
      });
    }
  }, [state?.bookingId]);

  if (!state) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No booking data. Complete payment from the payment page.</p>
            <Button asChild variant="hero">
              <Link to="/my-trip/book">Go to Book</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const { bus, selectedSeats, travelDate, routeFrom, routeTo, totalCents, passengerName, passengerPhone, bookingId } = state;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80 pt-20 pb-16">
        <div className="container max-w-xl mx-auto px-4">
          <Link
            to="/my-trip/book"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to booking
          </Link>

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 text-center mb-6">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground mb-2">Booking confirmed</h1>
            {bookingId && (
              <p className="text-sm font-bold text-foreground mb-2">Booking ID: {bookingId}</p>
            )}
            <p className="text-muted-foreground text-sm mb-6">
              {bus.listingName} · {bus.busName}
            </p>
            <div className="text-left space-y-1 text-sm border-t border-dashed border-slate-200 pt-4">
              <p><span className="text-muted-foreground">Route</span> {routeFrom} → {routeTo}</p>
              <p><span className="text-muted-foreground">Date</span> {travelDate}</p>
              <p><span className="text-muted-foreground">Departure</span> {bus.departureTime}</p>
              <p><span className="text-muted-foreground">Seats</span> {selectedSeats.join(", ")}</p>
              {passengerName && <p><span className="text-muted-foreground">Passenger</span> {passengerName}</p>}
              {passengerPhone && <p><span className="text-muted-foreground">Phone</span> {passengerPhone}</p>}
              <p><span className="text-muted-foreground">Amount paid</span> ₹ {(totalCents / 100).toLocaleString("en-IN")}</p>
            </div>
            <Button asChild className="mt-6 rounded-xl" variant="hero">
              <Link to="/my-trip">Back to My Trip</Link>
            </Button>
          </div>

          {bookingId && (
            <TicketCard
              bookingId={bookingId}
              bus={bus}
              selectedSeats={selectedSeats}
              travelDate={travelDate}
              routeFrom={routeFrom}
              routeTo={routeTo}
              totalCents={totalCents}
              passengerName={passengerName}
              passengerPhone={passengerPhone}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BookingSuccessPage;
