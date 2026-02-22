import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bus,
  Plane,
  Train,
  Hotel,
  Ticket,
  Car,
  Bike,
  MapPin,
  Users,
  Search,
  ArrowLeft,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  { id: "bus", label: "Bus", icon: Bus },
  { id: "flight", label: "Flight", icon: Plane },
  { id: "train", label: "Train", icon: Train },
  { id: "hotel", label: "Hotel", icon: Hotel },
  { id: "experience", label: "Experiences", icon: Ticket },
  { id: "car", label: "Car Rental", icon: Car },
  { id: "bike", label: "Bike Rental", icon: Bike },
  { id: "tours", label: "Local Tours", icon: MapPin },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const MOCK_BUSES = [
  { id: "1", operator: "Orange Travels", rating: 4.2, dep: "22:00", arr: "06:00", duration: "8h", seats: "12 left", price: 899 },
  { id: "2", operator: "SRM Transport", rating: 4.0, dep: "23:30", arr: "07:30", duration: "8h", seats: "18 left", price: 750 },
  { id: "3", operator: "KPN Travels", rating: 4.5, dep: "21:00", arr: "05:00", duration: "8h", seats: "5 left", price: 1200 },
];

const BookingMarketplace = () => {
  const [tripOrigin, setTripOrigin] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [passengers, setPassengers] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    apiFetch<{ trip: { origin: string; destination: string } }>("/api/trips/active", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (data?.trip) {
        setTripOrigin(data.trip.origin);
        setTripDestination(data.trip.destination);
        setFrom(data.trip.origin);
        setTo(data.trip.destination);
      }
    });
  }, [token]);

  const toggleSeat = (n: number) => {
    setSelectedSeats((prev) => (prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n]));
  };

  const totalSeats = 28;
  const bookedSeats = [3, 7, 12, 15, 21];
  const seatsPerRow = 4;
  const seatRows = Math.ceil(totalSeats / seatsPerRow);

  if (!token) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Sign in to book.</p>
            <Button asChild variant="hero">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80 pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Link
            to="/my-trip"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Trip
          </Link>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Search bookings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  placeholder="City"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  placeholder="City"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={date ? date.toISOString().slice(0, 10) : ""}
                  onChange={(e) => setDate(e.target.value ? new Date(e.target.value + "T12:00:00") : undefined)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Passengers</Label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value) || 1)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full rounded-xl gap-2" size="lg">
                  <Search className="h-4 w-4" /> Search
                </Button>
              </div>
            </div>
          </div>

          {/* Category cards */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">What do you want to book?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedCategory === cat.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-slate-200 bg-white hover:border-slate-300 text-foreground"
                  }`}
                >
                  <cat.icon className="h-8 w-8" />
                  <span className="text-xs font-medium text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category content: Bus */}
          {selectedCategory === "bus" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">Available buses</h3>
                <div className="space-y-4">
                  {MOCK_BUSES.map((bus) => (
                    <div
                      key={bus.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{bus.operator}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Star className="h-3.5 w-3 fill-amber-400 text-amber-400" /> {bus.rating} · {bus.seats}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span>{bus.dep} → {bus.arr}</span>
                          <span className="text-muted-foreground">{bus.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div>
                          <p className="text-lg font-semibold text-foreground">₹ {bus.price}</p>
                          <p className="text-xs text-muted-foreground">starting price</p>
                        </div>
                        <Button
                          size="sm"
                          variant="hero"
                          className="rounded-xl"
                          onClick={() => {
                            setSelectedBusId(bus.id);
                            setSelectedSeats([]);
                            setSeatModalOpen(true);
                          }}
                        >
                          View seats
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 h-fit">
                <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <Label className="text-xs">Price range</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="number" placeholder="Min" className="rounded-lg" />
                      <Input type="number" placeholder="Max" className="rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Departure</Label>
                    <select className="w-full mt-1 rounded-lg border border-input px-3 py-2 text-sm">
                      <option>Any</option>
                      <option>Before 6 AM</option>
                      <option>6 AM - 12 PM</option>
                      <option>12 PM - 6 PM</option>
                      <option>After 6 PM</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" /> AC
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" /> Non-AC
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" /> Sleeper
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" /> Seater
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other categories */}
          {selectedCategory && selectedCategory !== "bus" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-muted-foreground">
              <p>{CATEGORIES.find((c) => c.id === selectedCategory)?.label} booking coming soon.</p>
              <p className="text-sm mt-2">Use the categories above or go back to My Trip.</p>
            </div>
          )}
        </div>
      </div>

      {/* Seat layout modal - bus style 2+2 with aisle */}
      <Dialog open={seatModalOpen} onOpenChange={setSeatModalOpen}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select seats</DialogTitle>
            <DialogDescription>
              Click on a green seat to select. Window and aisle seats are marked.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Front of bus - driver */}
            <div className="bg-slate-700 text-slate-200 rounded-t-xl py-3 px-4 text-center text-sm font-medium border-b-2 border-slate-600">
              Driver · Front
            </div>

            {/* Bus body with aisle */}
            <div className="bg-slate-100 rounded-b-xl p-3 border border-t-0 border-slate-200">
              {Array.from({ length: seatRows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex items-stretch gap-1 mb-2 last:mb-0">
                  {/* Left side: 2 seats (window, aisle) */}
                  <div className="flex gap-1 flex-1">
                    {[0, 1].map((col) => {
                      const n = rowIndex * seatsPerRow + col + 1;
                      if (n > totalSeats) return <div key={col} className="flex-1" />;
                      const booked = bookedSeats.includes(n);
                      const selected = selectedSeats.includes(n);
                      const isWindow = col === 0;
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={booked}
                          onClick={() => !booked && toggleSeat(n)}
                          title={isWindow ? `Seat ${n} (Window)` : `Seat ${n} (Aisle)`}
                          className={`flex-1 min-w-[2.5rem] py-2.5 rounded-md text-xs font-semibold transition-all ${
                            booked
                              ? "bg-slate-400 cursor-not-allowed text-slate-600"
                              : selected
                                ? "bg-blue-500 text-white ring-2 ring-blue-300"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  {/* Aisle */}
                  <div className="w-3 bg-slate-300 rounded flex-shrink-0 self-stretch" aria-hidden />
                  {/* Right side: 2 seats (aisle, window) */}
                  <div className="flex gap-1 flex-1">
                    {[2, 3].map((col) => {
                      const n = rowIndex * seatsPerRow + col + 1;
                      if (n > totalSeats) return <div key={col} className="flex-1" />;
                      const booked = bookedSeats.includes(n);
                      const selected = selectedSeats.includes(n);
                      const isWindow = col === 3;
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={booked}
                          onClick={() => !booked && toggleSeat(n)}
                          title={isWindow ? `Seat ${n} (Window)` : `Seat ${n} (Aisle)`}
                          className={`flex-1 min-w-[2.5rem] py-2.5 rounded-md text-xs font-semibold transition-all ${
                            booked
                              ? "bg-slate-400 cursor-not-allowed text-slate-600"
                              : selected
                                ? "bg-blue-500 text-white ring-2 ring-blue-300"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">↑ Front &nbsp; · &nbsp; 2+2 seater layout</p>

            <div className="flex gap-4 mt-4 text-xs justify-center flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-400" /> Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-500" /> Selected</span>
            </div>
          </div>
          <DialogFooter>
            <p className="text-sm text-muted-foreground mr-auto">
              {selectedSeats.length} seat(s) selected · ₹ {(selectedSeats.length * 899).toLocaleString("en-IN")}
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => setSeatModalOpen(false)}>Cancel</Button>
            <Button variant="hero" className="rounded-xl" onClick={() => setSeatModalOpen(false)}>
              Continue to payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BookingMarketplace;
