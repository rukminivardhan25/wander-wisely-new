import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";

/** Booking state passed from seat modal (BookingMarketplace). */
export type PaymentLocationState = {
  bus: {
    listingName: string;
    busName: string;
    registrationNumber: string | null;
    busNumber: string | null;
    routeFrom: string | null;
    routeTo: string | null;
    departureTime: string;
    pricePerSeatCents: number | null;
    driverName: string | null;
    driverPhone: string | null;
  };
  selectedSeats: number[];
  travelDate: string;
  routeFrom: string;
  routeTo: string;
  pricePerSeatCents: number;
  totalCents: number;
};

const PaymentPage = () => {
  const { state } = useLocation() as { state: PaymentLocationState | null };
  const navigate = useNavigate();
  const [passengerName, setPassengerName] = useState("");
  const [email, setEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paying, setPaying] = useState(false);

  if (!state) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No booking details. Select seats from the bus search first.</p>
            <Button asChild variant="hero">
              <Link to="/my-trip/book">Go to Book</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const { bus, selectedSeats, travelDate, routeFrom, routeTo, pricePerSeatCents, totalCents } = state;
  const totalRupees = (totalCents / 100).toLocaleString("en-IN");

  const handlePayNow = () => {
    setPaying(true);
    const bookingId = `BW${Date.now()}${String(100 + Math.floor(Math.random() * 900))}`;
    setTimeout(() => {
      navigate("/my-trip/booking-success", {
        state: {
          ...state,
          passengerName: passengerName.trim() || "Passenger",
          email: email.trim() || "",
          passengerPhone: passengerPhone.trim() || "",
          bookingId,
        },
      });
    }, 1500);
  };

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

          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <h1 className="text-xl font-semibold text-foreground mb-4">Payment</h1>

            <div className="space-y-4 text-sm mb-6 pb-6 border-b border-dashed border-slate-200">
              <p><span className="text-muted-foreground">Company</span> {bus.listingName}</p>
              <p><span className="text-muted-foreground">Bus</span> {bus.busName}{bus.registrationNumber ? ` · Reg: ${bus.registrationNumber}` : ""}{bus.busNumber ? ` · ${bus.busNumber}` : ""}</p>
              <p><span className="text-muted-foreground">Route</span> {routeFrom || bus.routeFrom || "—"} → {routeTo || bus.routeTo || "—"}</p>
              <p><span className="text-muted-foreground">Date</span> {travelDate}</p>
              <p><span className="text-muted-foreground">Departure</span> {bus.departureTime}</p>
              <p><span className="text-muted-foreground">Seats</span> {selectedSeats.join(", ")}</p>
              <p><span className="text-muted-foreground">Price per seat</span> ₹ {((pricePerSeatCents || 0) / 100).toLocaleString("en-IN")}</p>
              <p className="font-semibold text-foreground"><span className="text-muted-foreground">Total</span> ₹ {totalRupees}</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-xs">Passenger name</Label>
                <Input
                  className="mt-1 rounded-xl"
                  placeholder="Full name"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  className="mt-1 rounded-xl"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Phone number</Label>
                <Input
                  type="tel"
                  className="mt-1 rounded-xl"
                  placeholder="10-digit mobile number"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full rounded-xl"
              size="lg"
              disabled={paying}
              onClick={handlePayNow}
            >
              {paying ? "Processing…" : "Pay Now (mock)"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;
