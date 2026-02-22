import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  IndianRupee,
  Bus,
  Plane,
  Utensils,
  Mountain,
  ShoppingBag,
  CalendarDays,
  Sparkle,
  Wrench,
  AlertCircle,
  Calendar as CalendarIcon,
  MapPin,
  Download,
  Wallet,
  Map,
  Plus,
  ChevronRight,
  Hotel,
  Train,
  Ticket,
  Stethoscope,
  Phone,
  Building2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

const CATEGORY_CONFIG: Record<ActivityType, { label: string; icon: JSX.Element; color: string; bg: string }> = {
  transport: { label: "Transport", icon: <Bus className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-500" },
  stay: { label: "Stay", icon: <Plane className="h-4 w-4" />, color: "text-violet-600", bg: "bg-violet-500" },
  food: { label: "Food", icon: <Utensils className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-500" },
  experience: { label: "Experience", icon: <Mountain className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-500" },
  shopping: { label: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, color: "text-green-600", bg: "bg-green-500" },
  events: { label: "Events", icon: <CalendarDays className="h-4 w-4" />, color: "text-rose-600", bg: "bg-rose-500" },
  hidden_gem: { label: "Hidden Gem", icon: <Sparkle className="h-4 w-4" />, color: "text-yellow-600", bg: "bg-yellow-500" },
  local_service: { label: "Local Services", icon: <Wrench className="h-4 w-4" />, color: "text-slate-600", bg: "bg-slate-500" },
  emergency: { label: "Emergency", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-500" },
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

type ActiveTripResult = {
  trip: { id: string; origin: string; destination: string; days: number; status?: string; start_date?: string; budget?: string; budget_amount?: number };
  itineraries: ItineraryDay[];
};

function getDateForDay(startDateStr: string, dayNumber: number): Date {
  const dateOnly = startDateStr.slice(0, 10);
  const d = new Date(dateOnly + "T12:00:00");
  if (Number.isNaN(d.getTime())) return d;
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type Expense = {
  id: string;
  trip_id: string;
  amount: number;
  category: string;
  day_number: number | null;
  note: string;
  created_at: string;
};

const EXPENSE_CATEGORIES = ["Transport", "Food", "Shopping", "Stay", "Experience", "Other"] as const;

function parseCost(s: string | undefined): number {
  if (!s) return 0;
  const num = s.replace(/[^0-9.]/g, "");
  return parseFloat(num) || 0;
}

function sumCostsByCategory(itineraries: ItineraryDay[]): Record<string, number> {
  const byCat: Record<string, number> = {};
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      const cat = act.activityType ?? "experience";
      byCat[cat] = (byCat[cat] ?? 0) + parseCost(act.costEstimate);
    });
  });
  return byCat;
}

function totalEstimatedCost(itineraries: ItineraryDay[]): number {
  let sum = 0;
  itineraries.forEach((day) => {
    (day.content.activities ?? []).forEach((act) => {
      sum += parseCost(act.costEstimate);
    });
  });
  return sum;
}

const MyTrip = () => {
  const [data, setData] = useState<ActiveTripResult | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Food");
  const [expenseDay, setExpenseDay] = useState<string>("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | undefined>(undefined);
  const [startDateSetting, setStartDateSetting] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiFetch<ActiveTripResult>("/api/trips/active", { headers: { Authorization: `Bearer ${token}` } }).then(({ data: resData, status }) => {
      if (!cancelled) {
        setLoading(false);
        if (status === 200 && resData) setData(resData);
      }
    });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    if (!token || !data?.trip.id) return;
    let cancelled = false;
    apiFetch<{ expenses: Expense[] }>(`/api/trips/${data.trip.id}/expenses`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: resData }) => {
      if (!cancelled && resData?.expenses) setExpenses(resData.expenses);
    });
    return () => { cancelled = true; };
  }, [token, data?.trip.id]);

  if (!token) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center px-4">
            <p className="text-muted-foreground mb-4">Sign in to view your trip.</p>
            <Button asChild variant="hero">
              <Link to="/signin">Sign In</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-muted-foreground">Loading your trip…</p>
        </section>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <section className="pt-24 pb-16 min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center px-4 max-w-md">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No active trip</h2>
            <p className="text-muted-foreground mb-6">Plan a trip and choose &ldquo;Make This My Trip&rdquo; to see it here.</p>
            <Button asChild variant="hero">
              <Link to="/plan-trip">Plan a trip</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  const totalDays = data.itineraries.length;
  const currentDayData = data.itineraries[selectedDay - 1] ?? data.itineraries[0];
  const dayImage = currentDayData ? (currentDayData.content.imageUrls?.[0] ?? currentDayData.content.imageUrl) : undefined;
  const totalBudget = Math.max(
    data.trip.budget_amount ?? totalEstimatedCost(data.itineraries),
    1
  );
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = Math.max(0, totalBudget - spent);
  const budgetByCat = sumCostsByCategory(data.itineraries);
  const categoryOrder: ActivityType[] = ["transport", "stay", "food", "experience", "shopping", "events", "emergency", "local_service", "hidden_gem"];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/80">
        {/* ——— TOP SECTION: Trip Overview Header ——— */}
        <section className="pt-20 pb-6 px-4">
          <div
            className="max-w-6xl mx-auto rounded-[20px] overflow-hidden shadow-lg bg-white border border-slate-200/80"
            style={{
              backgroundImage: dayImage ? `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%), url(${dayImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="p-6 md:p-8 bg-gradient-to-b from-black/50 to-black/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold mb-2">Active</span>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white drop-shadow-md">
                    {data.trip.destination}
                  </h1>
                  <p className="text-white/90 text-sm mt-1">
                    {data.trip.origin} → {data.trip.destination} · {data.trip.days}-day trip
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className={`bg-white/90 text-slate-800 hover:bg-white shadow-md rounded-xl gap-1.5 ${!data.trip.start_date ? "opacity-80" : ""}`}
                    title={!data.trip.start_date ? "Set your trip start date first (use the calendar below)" : undefined}
                    onClick={() => {
                      if (!data.trip.start_date) {
                        toast({
                          title: "Select the date",
                          description: "Set your trip start date using the calendar below, then you can add expenses.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setExpenseAmount("");
                      setExpenseCategory("Food");
                      setExpenseDay("");
                      setExpenseNote("");
                      setAddExpenseOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add Expense
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white/90 text-slate-800 hover:bg-white shadow-md rounded-xl gap-1.5">
                    <Map className="h-4 w-4" /> View Map
                  </Button>
                  <Button size="sm" variant="secondary" className="bg-white/90 text-slate-800 hover:bg-white shadow-md rounded-xl gap-1.5">
                    <Download className="h-4 w-4" /> Download Plan
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-white/90" />
                    <span className="text-white/80 text-sm">Total budget</span>
                    <span className="font-semibold text-white">₹ {totalBudget.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm">Spent</span>
                    <span className="font-semibold text-white">₹ {spent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/80 text-sm">Remaining</span>
                    <span className="font-semibold text-emerald-300">₹ {remaining.toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (spent / totalBudget) * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— MIDDLE SECTION: 60/40 Split ——— */}
        <section className="px-4 pb-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            {/* LEFT: Calendar + Timeline */}
            <div className="space-y-4">
              <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 p-4 overflow-hidden">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-500" /> Trip days
                </h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1 min-w-0 w-full sm:min-w-0">
                    <div className="grid grid-cols-5 gap-3 w-full">
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                        const startDate = data.trip.start_date;
                        const dayDate = startDate ? getDateForDay(startDate, d) : null;
                        const dateLabel =
                          dayDate && !Number.isNaN(dayDate.getTime())
                            ? dayDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : null;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDay(d)}
                            className={`
                              w-full aspect-square min-w-[3.25rem] max-h-20 rounded-xl text-base font-semibold transition-all shadow-sm flex flex-col items-center justify-center gap-0.5
                              ${selectedDay === d ? "bg-orange-500 text-white ring-2 ring-orange-300 scale-105" : d < selectedDay ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}
                            `}
                          >
                            <span>{d}</span>
                            {dateLabel && <span className="text-[10px] opacity-90 leading-tight">{dateLabel}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1 align-middle" /> Today &nbsp;
                      <span className="inline-block w-3 h-3 rounded-full bg-emerald-400 mr-1 align-middle" /> Completed &nbsp;
                      <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-1 align-middle" /> Upcoming
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-2 -mt-1 sm:-mt-2">
                    <div className="scale-75 origin-top sm:scale-90">
                      <DateCalendar
                        mode="single"
                        selected={data.trip.start_date ? getDateForDay(data.trip.start_date, 1) : calendarSelectedDate}
                        onSelect={(date) => {
                          if (data.trip.start_date) return;
                          setCalendarSelectedDate(date);
                        }}
                        disabled={!!data.trip.start_date}
                        className="rounded-xl border border-slate-200 p-2"
                        classNames={{
                          months: "space-y-0",
                          month: "space-y-1",
                          caption_label: "text-xs",
                          head_cell: "w-7 text-[0.6rem] text-muted-foreground",
                          cell: "h-7 w-7 text-center p-0",
                          day: "h-7 w-7 p-0 text-[0.7rem]",
                          nav_button: "h-6 w-6",
                        }}
                      />
                    </div>
                    {!data.trip.start_date && calendarSelectedDate && (
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 w-full"
                        disabled={startDateSetting}
                        onClick={async () => {
                          if (!token || !data?.trip.id) return;
                          const startDateStr = toLocalDateString(calendarSelectedDate);
                          setStartDateSetting(true);
                          const { error, status } = await apiFetch(`/api/trips/${data.trip.id}`, {
                            method: "PATCH",
                            headers: { Authorization: `Bearer ${token}` },
                            body: { start_date: startDateStr },
                          });
                          setStartDateSetting(false);
                          if (error || status !== 200) {
                            toast({ title: "Could not set start date", description: error ?? "Try again.", variant: "destructive" });
                            return;
                          }
                          setData((prev) =>
                            prev ? { ...prev, trip: { ...prev.trip, start_date: startDateStr } } : null
                          );
                          setCalendarSelectedDate(undefined);
                          toast({ title: "Trip started", description: `Your trip starts on ${calendarSelectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` });
                        }}
                      >
                        <Play className="h-4 w-4" />
                        {startDateSetting ? "Starting…" : `Start trip from ${calendarSelectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                      </Button>
                    )}
                    {data.trip.start_date && (
                      <p className="text-xs text-muted-foreground text-center">
                        Started {getDateForDay(data.trip.start_date, 1).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-foreground">Day {selectedDay} — Activities</h3>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                  {(currentDayData?.content.activities ?? []).map((act, j) => {
                    const type = (act.activityType && CATEGORY_CONFIG[act.activityType] ? act.activityType : "experience") as ActivityType;
                    const cfg = CATEGORY_CONFIG[type];
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() =>
                          navigate("/plan-trip/activity", {
                            state: {
                              trip: data.trip,
                              dayNumber: selectedDay,
                              activity: act,
                              activityIndex: j,
                              daySummary: currentDayData?.content.summary,
                              fullResult: { trip: data.trip, itineraries: data.itineraries },
                            },
                          })
                        }
                        className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/80 transition-colors rounded-xl mx-1 my-1"
                      >
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg} text-white`}>
                          {cfg.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{act.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{act.time ?? "—"}</span>
                            {act.place && (
                              <>
                                <span>·</span>
                                <MapPin className="h-3 w-3 inline" /> {act.place}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {act.costEstimate && (
                            <p className="text-sm font-medium text-foreground">{act.costEstimate}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Upcoming</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Trip Plan Summary card */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="bg-white rounded-[20px] shadow-lg border border-slate-200/80 p-5 overflow-hidden">
                <h3 className="font-semibold text-foreground mb-3">Trip summary</h3>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {currentDayData?.content.summary ?? `${data.trip.days}-day trip from ${data.trip.origin} to ${data.trip.destination}.`}
                </p>
                <div className="mb-4">
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Day</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  >
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                  className="text-sm font-medium text-accent hover:underline mb-2"
                >
                  {summaryCollapsed ? "Show" : "Hide"} activities
                </button>
                {!summaryCollapsed && (
                  <ul className="space-y-1 mb-4 max-h-32 overflow-y-auto">
                    {(currentDayData?.content.activities ?? []).slice(0, 8).map((act, i) => (
                      <li key={i} className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <span>{act.time}</span> {act.title}
                      </li>
                    ))}
                  </ul>
                )}
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Budget by category</h4>
                <div className="space-y-2">
                  {categoryOrder.filter((c) => (budgetByCat[c] ?? 0) > 0).map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    const val = budgetByCat[cat] ?? 0;
                    const pct = totalBudget > 0 ? (val / totalBudget) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                          <span className="font-medium">₹ {val.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— BOTTOM SECTION: Tabs ——— */}
        <section className="px-4 pb-16 max-w-6xl mx-auto">
          <div className="bg-white rounded-[20px] shadow-md border border-slate-200/80 overflow-hidden">
            <Tabs defaultValue="bookings" className="w-full">
              <div className="border-b border-slate-200 bg-slate-50/50 px-4 pt-2">
                <TabsList className="h-auto flex-wrap bg-transparent gap-1 p-0 border-0">
                  <TabsTrigger value="bookings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Bookings</TabsTrigger>
                  <TabsTrigger value="restaurants" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Restaurants</TabsTrigger>
                  <TabsTrigger value="shopping" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Shopping</TabsTrigger>
                  <TabsTrigger value="emergency" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Emergency</TabsTrigger>
                  <TabsTrigger value="nearby" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Nearby</TabsTrigger>
                </TabsList>
              </div>
              <div className="p-4">
                <TabsContent value="bookings" className="mt-0">
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-semibold text-foreground">My Bookings</h3>
                    <Button asChild variant="hero" size="sm" className="rounded-xl gap-2 shrink-0">
                      <Link to="/my-trip/book">
                        <Plus className="h-4 w-4" />
                        Book transport, stay & more
                      </Link>
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { icon: Train, title: "Hyderabad → Chandigarh", sub: "Train · Day 1", status: "Confirmed", img: true },
                      { icon: Hotel, title: "Hotel in Manali", sub: "Stay · Day 1–5", status: "Pending", img: true },
                      { icon: Ticket, title: "Rohtang Pass Tour", sub: "Experience · Day 3", status: "Not booked", img: true },
                    ].map((b, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 flex gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                          <b.icon className="h-6 w-6 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{b.title}</p>
                          <p className="text-xs text-muted-foreground">{b.sub}</p>
                          <p className="text-xs mt-1 text-amber-600">{b.status}</p>
                          <Button size="sm" variant="outline" className="mt-2 rounded-lg text-xs">View ticket</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="restaurants" className="mt-0">
                  <p className="text-sm text-muted-foreground mb-4">Recommended restaurants in {data.trip.destination}.</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {["Top rated", "Budget-friendly", "Luxury", "Trending"].map((t, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="h-24 bg-slate-100" />
                        <div className="p-3">
                          <p className="font-medium text-foreground">{t} options</p>
                          <p className="text-xs text-muted-foreground">Rating · Cuisine · ₹₹</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="shopping" className="mt-0">
                  <p className="text-sm text-muted-foreground mb-4">Markets and shopping in {data.trip.destination}.</p>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {["Famous markets", "Malls", "Street markets", "Special items"].map((s, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden aspect-square bg-slate-100" />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="emergency" className="mt-0">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 flex gap-3">
                      <Stethoscope className="h-8 w-8 text-red-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Nearest hospital</p>
                        <p className="text-sm text-muted-foreground">—</p>
                        <Button size="sm" variant="destructive" className="mt-2 rounded-lg">Call</Button>
                      </div>
                    </div>
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-4 flex gap-3">
                      <Building2 className="h-8 w-8 text-red-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Police station</p>
                        <p className="text-sm text-muted-foreground">—</p>
                        <Button size="sm" variant="destructive" className="mt-2 rounded-lg">Call</Button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 flex gap-3">
                      <Phone className="h-8 w-8 text-slate-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Emergency numbers</p>
                        <p className="text-sm text-muted-foreground">112 · 100 · 102</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 flex gap-3">
                      <Building2 className="h-8 w-8 text-slate-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Embassy</p>
                        <p className="text-sm text-muted-foreground">If international</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="nearby" className="mt-0">
                  <p className="text-sm text-muted-foreground mb-4">Use your location or trip destination to see nearby places.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {["Restaurants nearby", "Shops", "ATMs", "Hospitals"].map((label, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 p-4 flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">— km · Open</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>

        {/* Add Expense modal: two cards side by side */}
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
            <div className="flex flex-col sm:flex-row flex-1 min-h-0">
              {/* Side card: Your expenses */}
              <div className="w-full sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50/80 p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-foreground mb-2">Your expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No expenses yet. Add one on the right.</p>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                      {expenses.map((e) => (
                        <div key={e.id} className="flex justify-between gap-2 py-1.5 text-sm border-b border-slate-200/80 last:border-0">
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{e.category}</span>
                            {(e.note || e.day_number != null) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {e.note && e.note}
                                {e.note && e.day_number != null && " · "}
                                {e.day_number != null && `Day ${e.day_number}`}
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-foreground shrink-0">₹ {Number(e.amount).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 mt-2 border-t border-slate-200">
                      Total spent: <span className="font-semibold text-foreground">₹ {spent.toLocaleString("en-IN")}</span>
                    </p>
                  </>
                )}
              </div>

              {/* Main card: Add expense form */}
              <div className="flex-1 p-6 flex flex-col min-w-0">
                <DialogHeader className="p-0 mb-4">
                  <DialogTitle>Add expense</DialogTitle>
                  <DialogDescription>Record spending for this trip. It will update your budget summary.</DialogDescription>
                </DialogHeader>
                <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amount = parseFloat(expenseAmount.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast({ title: "Invalid amount", description: "Enter a valid amount.", variant: "destructive" });
                  return;
                }
                if (!token || !data?.trip.id) return;
                setExpenseSubmitting(true);
                const { data: resData, error, status } = await apiFetch<{ expense: Expense }>(
                  `/api/trips/${data.trip.id}/expenses`,
                  {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: {
                      amount,
                      category: expenseCategory,
                      day_number: expenseDay ? Number(expenseDay) : undefined,
                      note: expenseNote.trim() || undefined,
                    },
                  }
                );
                setExpenseSubmitting(false);
                if (error || status !== 201) {
                  toast({ title: "Could not add expense", description: error ?? "Try again.", variant: "destructive" });
                  return;
                }
                if (resData?.expense) setExpenses((prev) => [resData.expense, ...prev]);
                setAddExpenseOpen(false);
                setExpenseAmount("");
                setExpenseNote("");
                toast({ title: "Expense added", description: `₹ ${amount.toLocaleString("en-IN")} recorded.` });
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="expense-amount">Amount (₹)</Label>
                <Input
                  id="expense-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="rounded-xl mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <select
                  id="expense-category"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expense-day">Day (optional)</Label>
                <select
                  id="expense-day"
                  value={expenseDay}
                  onChange={(e) => setExpenseDay(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mt-1"
                >
                  <option value="">Not linked to a day</option>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="expense-note">Note (optional)</Label>
                <Input
                  id="expense-note"
                  type="text"
                  placeholder="e.g. Lunch at café"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  className="rounded-xl mt-1"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddExpenseOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="hero" disabled={expenseSubmitting} className="rounded-xl">
                  {expenseSubmitting ? "Adding…" : "Add expense"}
                </Button>
              </DialogFooter>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyTrip;
