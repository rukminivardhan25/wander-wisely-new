import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Wallet, Users, Heart, Plane, Sparkles, Clock, IndianRupee, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

const budgetOptions = ["Budget", "Medium", "Luxury"];
const travelTypes = ["Solo", "Couple", "Family", "Friends"];
const interests = [
  { label: "Food", emoji: "🍜" },
  { label: "Adventure", emoji: "🏔️" },
  { label: "Culture", emoji: "🏛️" },
  { label: "Shopping", emoji: "🛍️" },
  { label: "Nature", emoji: "🌿" },
  { label: "Spiritual", emoji: "🕌" },
  { label: "Nightlife", emoji: "🌃" },
  { label: "Beach", emoji: "🏖️" },
];
const transport = ["Flight", "Train", "Bus", "Car"];

type ActivityItem = {
  time?: string;
  title: string;
  description: string;
  place?: string;
  duration?: string;
  costEstimate?: string;
};

type ItineraryDay = {
  id: string;
  trip_id: string;
  day_number: number;
  content: {
    summary?: string;
    activities?: ActivityItem[];
    imageUrl?: string;
    imageUrls?: string[];
  };
};

const PlanTrip = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [travelType, setTravelType] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [transportPref, setTransportPref] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ trip: { id: string; origin: string; destination: string; days: number }; itineraries: ItineraryDay[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const { token, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) {
      toast({ title: "Sign in required", description: "Please sign in to generate an itinerary.", variant: "destructive" });
      navigate("/signin", { state: { from: "/plan-trip" } });
      return;
    }
    const daysNum = parseInt(days, 10);
    if (!to.trim() || !from.trim() || !days || isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      toast({ title: "Missing fields", description: "Please fill in From, To, and Days (1–30).", variant: "destructive" });
      return;
    }
    if (!budget || !travelType) {
      toast({ title: "Missing fields", description: "Please select Budget and Travel type.", variant: "destructive" });
      return;
    }
    const budgetNum = budgetAmount.trim() ? parseFloat(budgetAmount.replace(/[^0-9.]/g, "")) : undefined;
    if (budgetAmount.trim() && (isNaN(budgetNum!) || budgetNum! <= 0)) {
      toast({ title: "Invalid budget", description: "Enter a valid total budget amount (e.g. 50000 or ₹50000).", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    const { data, error, networkError } = await apiFetch<{ trip: { id: string; origin: string; destination: string; days: number }; itineraries: ItineraryDay[] }>(
      "/api/trips/generate",
      {
        method: "POST",
        body: {
          origin: from.trim(),
          destination: to.trim(),
          days: daysNum,
          budget,
          travel_type: travelType,
          interests: selectedInterests,
          transport_preference: transportPref || undefined,
          budget_amount: budgetNum,
        },
        timeoutMs: 60000,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setLoading(false);

    if (networkError || error) {
      toast({
        title: networkError ? "Connection failed" : "Generation failed",
        description: error ?? "Could not generate itinerary. Try again.",
        variant: "destructive",
      });
      return;
    }
    if (data?.trip && data?.itineraries) {
      setResult(data);
      setSelectedDay(1);
      toast({ title: "Itinerary ready", description: "Your trip plan is ready." });
    }
  };

  const getDayImage = (day: ItineraryDay): string | undefined =>
    (day.content.imageUrls && day.content.imageUrls[0]) || day.content.imageUrl;

  if (result) {
    const currentDayData = result.itineraries.find((d) => d.day_number === selectedDay);
    const dayImage = currentDayData ? getDayImage(currentDayData) : undefined;

    return (
      <Layout>
        <section className="min-h-screen bg-sand">
          {/* Day selector */}
          <div className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-soft">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {result.trip.origin} → {result.trip.destination}
                  </h1>
                  <p className="text-sm text-muted-foreground">{result.trip.days}-day trip</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {result.itineraries.map((d) => (
                    <Button
                      key={d.id}
                      variant={selectedDay === d.day_number ? "hero" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDay(d.day_number)}
                      className="min-w-[3rem]"
                    >
                      Day {d.day_number}
                    </Button>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                  Plan another trip
                </Button>
              </div>
            </div>
          </div>

          {/* Day detail: hero with background image + timeline */}
          <AnimatePresence mode="wait">
            {currentDayData && (
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="container mx-auto px-4 py-8 max-w-4xl"
              >
                {/* Hero with destination background */}
                <div
                  className="relative rounded-2xl overflow-hidden mb-8 min-h-[220px] flex flex-col justify-end"
                  style={{
                    backgroundImage: dayImage ? `url(${dayImage})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "hsl(var(--muted))",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                  <div className="relative p-6 text-white">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-medium mb-2">
                      Day {currentDayData.day_number}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-display font-bold drop-shadow-md">
                      {result.trip.destination}
                    </h2>
                    {currentDayData.content.summary && (
                      <p className="text-white/95 text-sm md:text-base mt-1 max-w-2xl">
                        {currentDayData.content.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Time-wise timeline */}
                <div className="bg-card rounded-2xl shadow-medium overflow-hidden">
                  <div className="px-6 py-4 border-b border-border bg-muted/50">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5 text-accent" />
                      Day {currentDayData.day_number} — Time-wise plan
                    </h3>
                  </div>
                  <ul className="divide-y divide-border">
                    {(currentDayData.content.activities ?? []).map((act, j) => (
                      <li key={j} className="flex gap-4 p-6 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-lg font-display font-semibold text-accent tabular-nums">
                            {act.time ?? "—"}
                          </span>
                          {act.duration && (
                            <span className="text-xs text-muted-foreground mt-0.5">{act.duration}</span>
                          )}
                        </div>
                        <div className="w-px bg-border shrink-0 self-stretch min-h-[2rem]" aria-hidden />
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="font-semibold text-foreground">{act.title}</h4>
                          {act.description && (
                            <p className="text-sm text-muted-foreground mt-1">{act.description}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-3">
                            {act.duration && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5" />
                                {act.duration}
                              </span>
                            )}
                            {act.costEstimate && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                                <IndianRupee className="w-3.5 h-3.5" />
                                {act.costEstimate}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 self-center" />
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="pt-24 pb-16 bg-sand min-h-screen">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">AI-Powered</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              Plan Your Perfect Trip
            </h1>
            <p className="text-muted-foreground">
              Tell us about your dream trip and our AI will craft a personalized itinerary with photos.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl shadow-medium p-8 space-y-8"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" /> From
                </label>
                <Input placeholder="e.g. Hyderabad" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-secondary" /> To
                </label>
                <Input placeholder="e.g. Manali" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" /> Number of Days
              </label>
              <Input type="number" placeholder="e.g. 5" value={days} onChange={(e) => setDays(e.target.value)} min={1} max={30} />
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-accent" /> Budget
              </label>
              <div className="flex gap-3 mb-3">
                {budgetOptions.map((b) => (
                  <Button
                    key={b}
                    variant={budget === b ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setBudget(b)}
                    className="flex-1"
                  >
                    {b}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Total budget (e.g. ₹50000 or $1200) — optional"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">We'll tailor cost estimates to your budget.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Travel Type
              </label>
              <div className="flex gap-3 flex-wrap">
                {travelTypes.map((t) => (
                  <Button
                    key={t}
                    variant={travelType === t ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setTravelType(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-accent" /> Interests
              </label>
              <div className="flex gap-2 flex-wrap">
                {interests.map((i) => (
                  <Button
                    key={i.label}
                    variant={selectedInterests.includes(i.label) ? "hero" : "outline"}
                    size="sm"
                    onClick={() => toggleInterest(i.label)}
                  >
                    {i.emoji} {i.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Plane className="w-4 h-4 text-accent" /> Transport Preference
              </label>
              <div className="flex gap-3 flex-wrap">
                {transport.map((t) => (
                  <Button
                    key={t}
                    variant={transportPref === t ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setTransportPref(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            {!token && (
              <p className="text-sm text-muted-foreground">
                <Link to="/signin" className="text-accent font-medium hover:underline">Sign in</Link> to generate your itinerary.
              </p>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full text-base py-6"
              disabled={loading || !token}
            >
              {loading ? (
                <>Generating your itinerary…</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Itinerary
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Powered by Groq AI. Photos from Unsplash.
            </p>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
};

export default PlanTrip;
