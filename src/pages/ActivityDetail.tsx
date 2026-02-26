import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  IndianRupee,
  MapPin,
  Bus,
  Utensils,
  Mountain,
  ShoppingBag,
  CalendarDays,
  Sparkle,
  Wrench,
  AlertCircle,
  Plane,
  Map,
  Lightbulb,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

type ActivityType =
  | "transport"
  | "stay"
  | "food"
  | "experience"
  | "shopping"
  | "events"
  | "hidden_gem"
  | "local_service"
  | "emergency";

type ActivityItem = {
  time?: string;
  title: string;
  description: string;
  place?: string;
  duration?: string;
  costEstimate?: string;
  activityType?: ActivityType;
};

type TransportMode = "bus" | "train" | "car" | "taxi" | "rideshare";

const TRANSPORT_OPTION_TO_MODE: Record<string, TransportMode> = {
  "Bus options": "bus",
  "Train options": "train",
  "Car rentals": "car",
  "Local taxis": "taxi",
  "Ride-sharing": "rideshare",
  "Price comparison": "bus",
  "Seat booking": "bus",
};

type LocationState = {
  trip: { origin: string; destination: string; days: number; id?: string };
  dayNumber: number;
  activity: ActivityItem;
  activityIndex: number;
  daySummary?: string;
  fullResult?: { trip: { id: string; origin: string; destination: string; days: number }; itineraries: unknown[] };
  /** Where to go when clicking "Back to Day X": "plan-trip" or "my-plan" */
  returnTo?: "plan-trip" | "my-plan";
};

const BLOCK_CONFIG: Record<ActivityType, { label: string; icon: JSX.Element; options: string[] }> = {
  transport: { label: "Transport", icon: <Bus className="h-5 w-5" />, options: ["Bus options", "Train options", "Car rentals", "Local taxis", "Ride-sharing", "Price comparison", "Seat booking"] },
  stay: { label: "Stay", icon: <Plane className="h-5 w-5" />, options: ["Hotels", "Homestays", "Check-in/out", "Amenities"] },
  food: { label: "Food", icon: <Utensils className="h-5 w-5" />, options: ["Top rated", "Budget friendly", "Trendy", "Street food", "Map view", "Filter by cuisine", "Book table"] },
  experience: { label: "Experience", icon: <Mountain className="h-5 w-5" />, options: ["Adventure sports", "Cultural shows", "Local tours", "Guided packages", "Entry tickets"] },
  shopping: { label: "Shopping", icon: <ShoppingBag className="h-5 w-5" />, options: ["Famous markets", "Luxury malls", "Street markets", "What it's famous for", "Price range", "Best time to visit"] },
  events: { label: "Events", icon: <CalendarDays className="h-5 w-5" />, options: ["Festivals", "Concerts", "Local events", "Dates & tickets"] },
  hidden_gem: { label: "Hidden Gem", icon: <Sparkle className="h-5 w-5" />, options: ["Local tips", "Offbeat spots", "Contributor picks"] },
  local_service: { label: "Local Services", icon: <Wrench className="h-5 w-5" />, options: ["SIM cards", "Luggage storage", "Guides", "Travel insurance"] },
  emergency: { label: "Emergency", icon: <AlertCircle className="h-5 w-5" />, options: ["Hospitals", "Police", "Embassy", "Emergency numbers"] },
};

const ActivityDetail = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const locationState = state as LocationState | null;

  if (!locationState?.activity) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen bg-sand">
          <div className="container max-w-2xl mx-auto px-4 text-center">
            <p className="text-muted-foreground mb-4">Activity details not found.</p>
            <Button asChild variant="outline">
              <Link to="/plan-trip">Back to Plan Trip</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const { trip, dayNumber, activity, daySummary, fullResult, returnTo } = locationState;
  const type = (activity.activityType && BLOCK_CONFIG[activity.activityType] ? activity.activityType : "experience") as ActivityType;
  const block = BLOCK_CONFIG[type];

  const handleBack = () => {
    if (returnTo === "my-plan") {
      navigate("/my-trip", { state: { selectedDay: dayNumber } });
    } else if (returnTo === "plan-trip" && fullResult) {
      navigate("/plan-trip", { state: { restoreItinerary: fullResult, selectedDay: dayNumber } });
    } else if (fullResult) {
      navigate("/plan-trip", { state: { restoreItinerary: fullResult, selectedDay: dayNumber } });
    } else {
      navigate(-1);
    }
  };

  return (
    <Layout>
      <section className="pt-24 pb-16 min-h-screen bg-sand">
        <div className="container max-w-2xl mx-auto px-4">
          <Button variant="ghost" onClick={handleBack} className="mb-6 gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Day {dayNumber}
          </Button>

          <div className="bg-card rounded-2xl shadow-medium overflow-hidden border border-border">
            {/* Hero */}
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{trip.origin} → {trip.destination}</span>
                <span>·</span>
                <span>Day {dayNumber} of {trip.days}</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-3">{activity.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground bg-muted px-3 py-1.5 rounded-lg">
                  {block.icon}
                  {block.label}
                </span>
                {activity.time && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {activity.time}
                  </span>
                )}
                {activity.duration && (
                  <span className="text-sm text-muted-foreground">{activity.duration}</span>
                )}
                {activity.costEstimate && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                    <IndianRupee className="h-4 w-4" />
                    {activity.costEstimate}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <div className="p-6 border-b border-border">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Overview</h2>
                <p className="text-foreground">{activity.description}</p>
                {activity.place && (
                  <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {activity.place}
                  </p>
                )}
              </div>
            )}

            {/* Day context */}
            {daySummary && (
              <div className="p-6 border-b border-border bg-muted/20">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Day summary</h2>
                <p className="text-sm text-foreground">{daySummary}</p>
              </div>
            )}

            {/* Explore options */}
            <div className="p-6 border-b border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Explore options</h2>
              <div className="flex flex-wrap gap-2">
                {type === "transport"
                  ? block.options.map((opt) => {
                      const mode = TRANSPORT_OPTION_TO_MODE[opt];
                      return mode ? (
                        <Button
                          key={opt}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate("/book/transport", {
                              state: {
                                from: trip.origin,
                                to: trip.destination,
                                date: "",
                                mode,
                              },
                            })
                          }
                        >
                          {opt}
                        </Button>
                      ) : (
                        <Button key={opt} type="button" variant="secondary" size="sm">
                          {opt}
                        </Button>
                      );
                    })
                  : block.options.map((opt) => (
                      <Button key={opt} type="button" variant="secondary" size="sm">
                        {opt}
                      </Button>
                    ))}
              </div>
            </div>

            {/* Tips (placeholder) */}
            <div className="p-6 border-b border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Tips
              </h2>
              <p className="text-sm text-muted-foreground">
                Book in advance during peak season. Check local timings and weather before you go.
              </p>
            </div>

            {/* Map placeholder */}
            <div className="p-6 border-b border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Map className="h-4 w-4" />
                Location
              </h2>
              <div className="h-40 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground text-sm">
                Map view — coming soon
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 flex flex-wrap gap-3">
              <Button variant="hero" className="gap-2">
                <Bookmark className="h-4 w-4" />
                Save activity
              </Button>
              <Button variant="outline" className="gap-2">
                Book / Reserve
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ActivityDetail;
