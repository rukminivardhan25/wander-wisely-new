import { useState, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { MapPin, Calendar, Wallet, Users, Heart, Plane, Sparkles, Clock, IndianRupee, ChevronRight, ChevronLeft, Bus, Utensils, Mountain, ShoppingBag, CalendarDays, Sparkle, Wrench, AlertCircle, Trash2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

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
const loadingMessages = [
  "Mapping the best route for your journey...",
  "Picking food spots, experiences, and scenic moments...",
  "Balancing your budget with memorable stops...",
  "Adding thoughtful day-wise details to your plan...",
];

const BLOCK_OPTIONS: Record<ActivityType, { label: string; icon: JSX.Element; options: string[]; theme: string }> = {
  transport: { label: "Transport", icon: <Bus className="h-4 w-4" />, theme: "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20", options: ["Bus options", "Train options", "Car rentals", "Local taxis", "Ride-sharing", "Price comparison", "Seat booking"] },
  stay: { label: "Stay", icon: <Plane className="h-4 w-4" />, theme: "border-l-4 border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20", options: ["Hotels", "Homestays", "Check-in/out", "Amenities"] },
  food: { label: "Food", icon: <Utensils className="h-4 w-4" />, theme: "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20", options: ["Top rated", "Budget friendly", "Trendy", "Street food", "Map view", "Filter by cuisine", "Book table"] },
  experience: { label: "Experience", icon: <Mountain className="h-4 w-4" />, theme: "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20", options: ["Adventure sports", "Cultural shows", "Local tours", "Guided packages", "Entry tickets"] },
  shopping: { label: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, theme: "border-l-4 border-l-pink-500 bg-pink-50/50 dark:bg-pink-950/20", options: ["Famous markets", "Luxury malls", "Street markets", "What it's famous for", "Price range", "Best time to visit"] },
  events: { label: "Events", icon: <CalendarDays className="h-4 w-4" />, theme: "border-l-4 border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/20", options: ["Festivals", "Concerts", "Local events", "Dates & tickets"] },
  hidden_gem: { label: "Hidden Gem", icon: <Sparkle className="h-4 w-4" />, theme: "border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20", options: ["Local tips", "Offbeat spots", "Contributor picks"] },
  local_service: { label: "Local Services", icon: <Wrench className="h-4 w-4" />, theme: "border-l-4 border-l-slate-500 bg-slate-50/50 dark:bg-slate-950/20", options: ["SIM cards", "Luggage storage", "Guides", "Travel insurance"] },
  emergency: { label: "Emergency", icon: <AlertCircle className="h-4 w-4" />, theme: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20", options: ["Hospitals", "Police", "Embassy", "Emergency numbers"] },
};

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

/** Parse cost range string to [min, max]. Handles "Free", "₹200–₹400", "₹1,000–₹1,500". Never merge digits (e.g. "500 1000" must not become 5001000). */
const MAX_SANE_COST = 10_000_000; // 1 crore per activity cap to avoid one misparse blowing up total

function parseCostRangeForTotal(s: string | undefined): [number, number] | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (/^free$/i.test(t)) return [0, 0];
  const rangeMatch = t.match(/(\d[\d,.]*)\s*[–\-]\s*(\d[\d,.]*)/);
  if (rangeMatch) {
    const min = Math.min(MAX_SANE_COST, parseFloat(rangeMatch[1].replace(/,/g, "")) || 0);
    const max = Math.min(MAX_SANE_COST, parseFloat(rangeMatch[2].replace(/,/g, "")) || 0);
    return [min, max];
  }
  // Find all number-like parts (avoid merging "500" and "1000" into "5001000")
  const parts = t.match(/\d[\d,.]*/g);
  if (parts && parts.length >= 2) {
    const a = Math.min(MAX_SANE_COST, parseFloat(parts[0].replace(/,/g, "")) || 0);
    const b = Math.min(MAX_SANE_COST, parseFloat(parts[1].replace(/,/g, "")) || 0);
    return [Math.min(a, b), Math.max(a, b)];
  }
  if (parts && parts.length === 1) {
    const n = Math.min(MAX_SANE_COST, parseFloat(parts[0].replace(/,/g, "")) || 0);
    return [n, n];
  }
  return null;
}

function computeEstimatedTotalRange(itineraries: ItineraryDay[]): { min: number; max: number } | null {
  let totalMin = 0;
  let totalMax = 0;
  let hasAny = false;
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      const range = parseCostRangeForTotal(act.costEstimate);
      if (range) {
        totalMin += range[0];
        totalMax += range[1];
        hasAny = true;
      }
    });
  });
  return hasAny ? { min: totalMin, max: totalMax } : null;
}

const PlanTrip = () => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [days, setDays] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [travelType, setTravelType] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [transportPref, setTransportPref] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [result, setResult] = useState<{ trip: { id: string; origin: string; destination: string; days: number }; itineraries: ItineraryDay[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [makingActive, setMakingActive] = useState(false);
  const [confirmMakeMyTripOpen, setConfirmMakeMyTripOpen] = useState(false);
  const [confirmedBudgetAmount, setConfirmedBudgetAmount] = useState("");
  const { token, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const restore = (location.state as { restoreItinerary?: typeof result; selectedDay?: number } | null)?.restoreItinerary;
    const day = (location.state as { selectedDay?: number } | null)?.selectedDay;
    if (restore) {
      setResult(restore);
      setSelectedDay(day ?? 1);
      navigate("/plan-trip", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useLayoutEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 2400);

    return () => window.clearInterval(interval);
  }, [loading]);

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
    if (!travelType) {
      toast({ title: "Missing fields", description: "Please select Travel type.", variant: "destructive" });
      return;
    }
    const budgetNum = budgetAmount.trim() ? parseFloat(budgetAmount.replace(/[^0-9.]/g, "")) : undefined;
    if (!budgetAmount.trim() || budgetNum == null || isNaN(budgetNum) || budgetNum <= 0) {
      toast({ title: "Missing budget", description: "Enter your total budget amount (e.g. 50000 or ₹50000 or $1200).", variant: "destructive" });
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
          travel_type: travelType,
          interests: selectedInterests,
          transport_preference: transportPref || undefined,
          budget_amount: budgetNum,
        },
        timeoutMs: 180000,
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setLoading(false);

    if (networkError || error) {
      toast({
        title: networkError ? "Connection failed" : "Generation failed",
        description: networkError
          ? (error ?? "Could not reach the server. Start the backend (npm run dev in the backend folder) and ensure it runs on the URL shown in the app.")
          : (error ?? "Could not generate itinerary. Try again."),
        variant: "destructive",
      });
      return;
    }
    if (data?.trip && data?.itineraries) {
      setResult(data);
      setSelectedDay(1);
      setConfirmedBudgetAmount("");
      toast({ title: "Itinerary ready", description: "Your trip plan is ready." });
    }
  };

  const getDayImage = (day: ItineraryDay): string | undefined =>
    (day.content.imageUrls && day.content.imageUrls[0]) || day.content.imageUrl;

  if (result) {
    const totalDays = result.itineraries.length;
    // Backend returns itineraries ordered by day_number, so index 0 = Day 1, index 1 = Day 2, etc.
    const currentDayData = result.itineraries[selectedDay - 1] ?? result.itineraries[0];
    const dayImage = currentDayData ? getDayImage(currentDayData) : undefined;
    const canGoPrev = selectedDay > 1;
    const canGoNext = selectedDay < totalDays;
    const goPrev = () => { if (canGoPrev) setSelectedDay(selectedDay - 1); };
    const goNext = () => { if (canGoNext) setSelectedDay(selectedDay + 1); };

    const removeActivity = (dayIndex: number, activityIndex: number) => {
      setResult((prev) => {
        if (!prev) return prev;
        const newItineraries = prev.itineraries.map((day, i) => {
          if (i !== dayIndex) return day;
          const newActivities = (day.content.activities ?? []).filter((_, j) => j !== activityIndex);
          return { ...day, content: { ...day.content, activities: newActivities } };
        });
        return { ...prev, itineraries: newItineraries };
      });
      toast({ title: "Removed", description: "Activity removed from your plan." });
    };

    const handleMakeMyTrip = async () => {
      if (!token || !result?.trip.id) return;
      setMakingActive(true);
      const budgetNum = confirmedBudgetAmount.trim()
        ? parseFloat(confirmedBudgetAmount.replace(/[^0-9.]/g, ""))
        : undefined;
      if (confirmedBudgetAmount.trim() && (budgetNum == null || isNaN(budgetNum) || budgetNum <= 0)) {
        toast({ title: "Invalid budget", description: "Enter a valid total budget amount (e.g. 60150).", variant: "destructive" });
        setMakingActive(false);
        return;
      }
      if (budgetNum != null && budgetNum > 0) {
        const patchRes = await apiFetch<{ message: string }>(`/api/trips/${result.trip.id}`, {
          method: "PATCH",
          body: { budget_amount: budgetNum },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (patchRes.error || patchRes.networkError) {
          toast({
            title: patchRes.networkError ? "Connection failed" : "Could not save budget",
            description: patchRes.error ?? "Please try again.",
            variant: "destructive",
          });
          setMakingActive(false);
          return;
        }
      }
      const { error, networkError } = await apiFetch(`/api/trips/${result.trip.id}/activate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMakingActive(false);
      if (networkError || error) {
        toast({
          title: networkError ? "Connection failed" : "Could not set trip",
          description: error ?? "Please try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Done", description: "This plan is now your active trip." });
      navigate("/my-trip");
    };

    return (
      <Layout>
        <section className="min-h-screen bg-sand">
          {/* Day navigation: < Day X of Y > */}
          <div className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-soft">
            <div className="container mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {result.trip.origin} → {result.trip.destination}
                  </h1>
                  <p className="text-sm text-muted-foreground">{result.trip.days}-day trip</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 w-fit">
                  <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Days</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goPrev}
                    disabled={!canGoPrev}
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm font-semibold text-foreground min-w-[5.5rem] text-center tabular-nums">
                    Day {selectedDay} of {totalDays}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={goNext}
                    disabled={!canGoNext}
                    aria-label="Next day"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              {/* Estimated total and confirm budget */}
              {(() => {
                const totalRange = computeEstimatedTotalRange(result.itineraries);
                const budgetNum = confirmedBudgetAmount.trim() ? parseFloat(confirmedBudgetAmount.replace(/,/g, "")) : NaN;
                const budgetOutOfRange = totalRange != null && !Number.isNaN(budgetNum) && (budgetNum < totalRange.min || budgetNum > totalRange.max);
                return (
                  <div className="pt-3 mt-3 border-t border-border/60 space-y-2">
                    {totalRange != null && (
                      <p className="text-sm text-muted-foreground">
                        Estimated total trip cost: <span className="font-semibold text-foreground">₹{Math.round(totalRange.min).toLocaleString("en-IN")}–₹{Math.round(totalRange.max).toLocaleString("en-IN")}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="confirm-budget" className="text-sm text-muted-foreground whitespace-nowrap">
                        Confirm your total budget for this trip (₹):
                      </label>
                      <Input
                        id="confirm-budget"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 60150"
                        value={confirmedBudgetAmount}
                        onChange={(e) => setConfirmedBudgetAmount(e.target.value)}
                        className="w-32 h-8 text-sm"
                      />
                    </div>
                    {budgetOutOfRange && (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Your budget is outside the estimated range for this trip.
                      </p>
                    )}
                  </div>
                );
              })()}
              {/* Plan actions: always visible bar */}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={() => setResult(null)} className="flex-1 sm:flex-none">
                  Modify Plan
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  disabled={makingActive}
                  onClick={() => setConfirmMakeMyTripOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  {makingActive ? "Setting…" : "Make This My Trip"}
                </Button>
              </div>
            </div>
          </div>

          <AlertDialog open={confirmMakeMyTripOpen} onOpenChange={setConfirmMakeMyTripOpen}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Fix this plan as your trip?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will set this plan as your active trip. You can set your trip start date from the My Trip page. You can still plan another trip later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => {
                    setConfirmMakeMyTripOpen(false);
                    handleMakeMyTrip();
                  }}
                >
                  Yes, make it my trip
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                  <div className="px-4 py-4 border-b border-border bg-muted/50 flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={goPrev}
                      disabled={!canGoPrev}
                      className="gap-1.5 shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2 justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                      Day {currentDayData.day_number} — Time-wise plan
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={goNext}
                      disabled={!canGoNext}
                      className="gap-1.5 shrink-0"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <ul className="divide-y divide-border">
                    {(currentDayData.content.activities ?? []).map((act, j) => {
                      const type = (act.activityType && BLOCK_OPTIONS[act.activityType] ? act.activityType : "experience") as ActivityType;
                      const block = BLOCK_OPTIONS[type];
                      return (
                        <li key={j} className={`rounded-r-lg ${block.theme}`}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/plan-trip/activity", {
                                state: {
                                  trip: result.trip,
                                  dayNumber: selectedDay,
                                  activity: act,
                                  activityIndex: j,
                                  daySummary: currentDayData.content.summary,
                                  fullResult: result,
                                  returnTo: "plan-trip",
                                },
                              })
                            }
                            className="flex gap-4 p-5 hover:opacity-90 transition-opacity w-full text-left rounded-r-lg cursor-pointer"
                          >
                            <div className="flex flex-col items-center shrink-0 w-14">
                              <span className="text-lg font-display font-semibold text-foreground tabular-nums">
                                {act.time ?? "—"}
                              </span>
                              {act.duration && (
                                <span className="text-xs text-muted-foreground mt-0.5">{act.duration}</span>
                              )}
                            </div>
                            <div className="w-px bg-border shrink-0 self-stretch min-h-[2rem]" aria-hidden />
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{act.title}</h4>
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-md border border-border/50 shadow-sm">
                                  {block.icon}
                                  {block.label}
                                </span>
                              </div>
                              {act.description && (
                                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{act.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-3">
                                {act.duration && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-full">
                                    <Clock className="w-3.5 h-3.5" />
                                    {act.duration}
                                  </span>
                                )}
                                {act.costEstimate && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent bg-accent/15 px-2.5 py-1 rounded-full">
                                    <IndianRupee className="w-3.5 h-3.5" />
                                    {act.costEstimate}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground shrink-0 self-center">View details</span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              aria-label="Remove from plan"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeActivity(selectedDay - 1, j);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </button>
                        </li>
                      );
                    })}
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
                <Wallet className="w-4 h-4 text-accent" /> Total budget
              </label>
              <Input
                placeholder="e.g. ₹50000 or $1200"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Cost estimates will be tailored to this amount for the whole trip.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" /> Travel Type
              </label>
              <div className="flex gap-3 flex-wrap">
                {travelTypes.map((t) => (
                  <Button
                    key={t}
                    type="button"
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
                    type="button"
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
                    type="button"
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
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="overflow-hidden rounded-2xl border border-accent/20 bg-accent/5 px-4 py-4"
                >
                  <div className="relative mb-4 h-20 overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-white via-accent/5 to-white">
                    <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent/15" />
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      animate={{ x: ["-10%", "115%"] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-2 text-accent-foreground shadow-medium">
                        <Plane className="h-4 w-4" />
                        <span className="text-xs font-semibold">On the way</span>
                      </div>
                    </motion.div>
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      animate={{ x: ["-18%", "108%"] }}
                      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
                    >
                      <div className="relative flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-2 shadow-soft">
                        <motion.span
                          className="text-2xl leading-none"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                        >
                          🐰
                        </motion.span>
                        <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">
                          <Briefcase className="h-3 w-3" />
                          Ready to hop
                        </div>
                        <motion.span
                          aria-hidden
                          className="absolute -bottom-2 left-5 text-sm opacity-60"
                          animate={{ x: [0, 7, 14], opacity: [0.2, 0.7, 0] }}
                          transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                        >
                          • •
                        </motion.span>
                      </div>
                    </motion.div>
                  </div>

                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      This may take a few minutes. We&apos;re building your personalized itinerary.
                    </p>
                    <motion.p
                      key={loadingMessageIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="text-sm text-muted-foreground"
                    >
                      {loadingMessages[loadingMessageIndex]}
                    </motion.p>
                    <p className="text-xs text-muted-foreground/90">
                      Please keep this page open while we put everything together.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
