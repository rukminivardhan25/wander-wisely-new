import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bus, Train, Car, Users, MapPin, Calendar, Search, Clock, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TransportMode = "bus" | "train" | "car" | "taxi" | "rideshare";

const MODES: { id: TransportMode; label: string; icon: JSX.Element }[] = [
  { id: "bus", label: "Bus", icon: <Bus className="h-5 w-5" /> },
  { id: "train", label: "Train", icon: <Train className="h-5 w-5" /> },
  { id: "car", label: "Car rental", icon: <Car className="h-5 w-5" /> },
  { id: "taxi", label: "Taxi", icon: <Car className="h-5 w-5" /> },
  { id: "rideshare", label: "Ride-share", icon: <Users className="h-5 w-5" /> },
];

type BookingOption = {
  id: string;
  operator: string;
  departure: string;
  arrival: string;
  duration: string;
  price: string;
  meta?: string;
};

const MOCK_RESULTS: Record<TransportMode, BookingOption[]> = {
  bus: [
    { id: "b1", operator: "Orange Travels", departure: "06:00", arrival: "14:30", duration: "8h 30m", price: "₹650", meta: "AC Sleeper" },
    { id: "b2", operator: "SRM Transport", departure: "22:00", arrival: "06:00", duration: "8h", price: "₹550", meta: "Non-AC" },
    { id: "b3", operator: "KPN Travels", departure: "09:30", arrival: "18:00", duration: "8h 30m", price: "₹720", meta: "AC Seater" },
  ],
  train: [
    { id: "t1", operator: "Express 12345", departure: "08:15", arrival: "20:45", duration: "12h 30m", price: "₹480", meta: "Sleeper" },
    { id: "t2", operator: "Superfast 67890", departure: "14:00", arrival: "02:30", duration: "12h 30m", price: "₹620", meta: "3AC" },
    { id: "t3", operator: "Rajdhani", departure: "16:30", arrival: "05:00", duration: "12h 30m", price: "₹1,100", meta: "2AC" },
  ],
  car: [
    { id: "c1", operator: "Zoomcar", departure: "—", arrival: "—", duration: "Full day", price: "₹899", meta: "Swift / similar" },
    { id: "c2", operator: "Revv", departure: "—", arrival: "—", duration: "Full day", price: "₹999", meta: "SUV" },
  ],
  taxi: [
    { id: "x1", operator: "Outstation cab", departure: "On demand", arrival: "—", duration: "~8h", price: "₹4,500", meta: "One-way" },
    { id: "x2", operator: "Round trip", departure: "On demand", arrival: "—", duration: "2 days", price: "₹8,000", meta: "Including return" },
  ],
  rideshare: [
    { id: "r1", operator: "Blablacar", departure: "07:00", arrival: "15:00", duration: "8h", price: "₹400", meta: "Shared" },
    { id: "r2", operator: "Quick ride", departure: "06:30", arrival: "14:30", duration: "8h", price: "₹450", meta: "Shared" },
  ],
};

type LocationState = {
  from?: string;
  to?: string;
  date?: string;
  mode?: TransportMode;
};

const defaultDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const TransportBook = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const locState = state as LocationState | null;

  const [from, setFrom] = useState(locState?.from ?? "");
  const [to, setTo] = useState(locState?.to ?? "");
  const [date, setDate] = useState(locState?.date ?? defaultDate());
  const [mode, setMode] = useState<TransportMode>(locState?.mode ?? "bus");
  const [searched, setSearched] = useState(!!(locState?.from && locState?.to));

  const results = MOCK_RESULTS[mode];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/10 via-sand to-sand">
      {/* Full-width header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-lg font-display font-bold text-foreground">Book transport</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Mode tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/80 border border-border mb-6 overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                mode === m.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        {/* Search card */}
        <form onSubmit={handleSearch} className="bg-card rounded-2xl shadow-medium border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" /> From
              </label>
              <Input
                placeholder="City or station"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5" /> To
              </label>
              <Input
                placeholder="City or station"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Calendar className="h-3.5 w-3.5" /> Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" variant="hero" className="w-full gap-2 h-12">
            <Search className="h-5 w-5" />
            Search {MODES.find((m) => m.id === mode)?.label}
          </Button>
        </form>

        {/* Results */}
        {searched ? (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Available options
            </h2>
            <div className="space-y-3">
              {results.map((opt) => (
                <div
                  key={opt.id}
                  className="bg-card rounded-xl border border-border shadow-soft p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{opt.operator}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {opt.departure} → {opt.arrival}
                      </span>
                      <span>{opt.duration}</span>
                      {opt.meta && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{opt.meta}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xl font-bold text-accent">{opt.price}</span>
                    <Button variant="hero" size="sm">Book</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border border-dashed p-12 text-center">
            <p className="text-muted-foreground">Enter from, to and date, then search to see options.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default TransportBook;
