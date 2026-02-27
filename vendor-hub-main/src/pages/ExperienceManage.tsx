import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Compass, ArrowLeft, MapPin, Calendar, Clock, Users, IndianRupee, FileText, ToggleLeft, ToggleRight, Pencil, Upload } from "lucide-react";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

type DaySchedule = { startTime: string; endTime: string; numberOfSlots: number };

type Experience = {
  id: string;
  listing_id: string;
  name: string;
  category: string;
  city: string;
  location_address: string | null;
  duration_text: string;
  short_description: string | null;
  long_description: string | null;
  age_restriction: string | null;
  max_participants_per_slot: number;
  price_per_person_cents: number;
  tax_included: boolean;
  cancellation_policy: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  slots: { id: string; slot_date: string; slot_time: string; capacity: number }[];
  recurring_slots?: { day: string; time: string }[];
  schedule_days?: Record<string, boolean>;
  schedule_by_day?: Record<string, DaySchedule>;
  media: { id: string; file_url: string; is_cover: boolean; sort_order: number }[];
};

export default function ExperienceManage() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const locationState = location.state as { message?: string; success?: boolean } | null;
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<Record<string, boolean>>({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false });
  const defaultDaySchedule = (): DaySchedule => ({ startTime: "09:00", endTime: "17:00", numberOfSlots: 1 });
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, DaySchedule>>(() =>
    Object.fromEntries(DAY_KEYS.map((d) => [d, { startTime: "09:00", endTime: "17:00", numberOfSlots: 1 }]))
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    if (!listingId) return;
    setError("");
    vendorFetch<Experience>(`/api/listings/${listingId}/experience`)
      .then(setExperience)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const setActive = async (active: boolean) => {
    if (!listingId || !experience) return;
    setToggling(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/experience`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: active ? "live" : "suspended" }),
      });
      setExperience((e) => (e ? { ...e, status: active ? "live" : "suspended" } : null));
    } catch {
      setError("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const startEditSchedule = () => {
    const template = experience?.schedule_by_day;
    const daysMap = experience?.schedule_days;
    const hasTemplate = template && daysMap && DAY_KEYS.some((d) => daysMap[d] && template[d]);
    if (hasTemplate && template && daysMap) {
      const days: Record<string, boolean> = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
      const byDay: Record<string, DaySchedule> = {};
      DAY_KEYS.forEach((d) => {
        byDay[d] = defaultDaySchedule();
        if (daysMap[d] && template[d]) {
          days[d] = true;
          const s = template[d];
          byDay[d] = {
            startTime: (s.startTime ?? "09:00").slice(0, 5),
            endTime: (s.endTime ?? "17:00").slice(0, 5),
            numberOfSlots: Math.max(1, s.numberOfSlots ?? 1),
          };
        }
      });
      setScheduleDays(days);
      setScheduleByDay(byDay);
    } else {
      const byDay: Record<string, string[]> = {};
      DAY_KEYS.forEach((d) => { byDay[d] = []; });
      (experience?.recurring_slots ?? []).forEach(({ day, time }) => {
        const d = day.toLowerCase().slice(0, 3);
        if (byDay[d] && !byDay[d].includes(time)) byDay[d].push(time);
        if (!byDay[d]) byDay[d] = [time];
      });
      const days: Record<string, boolean> = {};
      const byDaySchedule: Record<string, DaySchedule> = {};
      DAY_KEYS.forEach((d) => {
        const times = (byDay[d] ?? []).sort();
        days[d] = times.length > 0;
        if (times.length > 0) {
          byDaySchedule[d] = {
            startTime: times[0].slice(0, 5),
            endTime: times[times.length - 1].slice(0, 5),
            numberOfSlots: times.length,
          };
        } else {
          byDaySchedule[d] = defaultDaySchedule();
        }
      });
      setScheduleDays(days);
      setScheduleByDay(byDaySchedule);
    }
    setScheduleError("");
    setEditingSchedule(true);
  };

  const saveSchedule = async () => {
    if (!listingId || !experience) return;
    const schedule_days: Record<string, boolean> = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
    const schedule_by_day: Record<string, DaySchedule> = {};
    DAY_KEYS.forEach((day) => {
      if (!scheduleDays[day]) return;
      schedule_days[day] = true;
      const s = scheduleByDay[day];
      schedule_by_day[day] = {
        startTime: (s?.startTime ?? "09:00").slice(0, 5),
        endTime: (s?.endTime ?? "17:00").slice(0, 5),
        numberOfSlots: Math.max(1, Math.min(100, s?.numberOfSlots ?? 1)),
      };
    });
    setScheduleError("");
    setSavingSchedule(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);
      await vendorFetch(`/api/listings/${listingId}/experience`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_days, schedule_by_day }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const updated = await vendorFetch<Experience>(`/api/listings/${listingId}/experience`);
      setExperience(updated);
      setEditingSchedule(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save schedule";
      setScheduleError(err instanceof Error && err.name === "AbortError" ? "Save timed out. Please try again." : msg);
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error || !experience) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || "Experience not found."}</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>
    );
  }

  const isActive = experience.status === "live";

  return (
    <div className="space-y-6 max-w-3xl">
      {locationState?.message && (
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm border",
          locationState.success ? "bg-emerald-500/10 text-emerald-800 border-emerald-300" : "bg-amber-500/10 text-amber-800 border-amber-300"
        )}>
          {locationState.message}
        </div>
      )}
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link to="/listings" className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>

      <h1 className="text-2xl font-display font-bold text-foreground">
        {experience.name}
      </h1>

      {/* Quick actions: Active / Inactive */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3 mb-4">Active / Inactive status</h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-muted-foreground">Status:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={toggling}
              onClick={() => setActive(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50",
                isActive ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ToggleRight size={18} /> Active
            </button>
            <button
              type="button"
              disabled={toggling}
              onClick={() => setActive(false)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50",
                !isActive ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ToggleLeft size={18} /> Inactive
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isActive ? "Experience is visible and bookable." : "Experience is paused and not bookable."}
          </p>
        </div>
      </div>

      {/* Full details */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-6">
        <div className="border-b border-border/50 pb-3">
          <h2 className="font-display font-semibold text-lg text-foreground">Experience details</h2>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Compass size={14} /> Name
            </dt>
            <dd className="mt-1 font-medium text-foreground">{experience.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</dt>
            <dd className="mt-1 text-foreground capitalize">{experience.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin size={14} /> City
            </dt>
            <dd className="mt-1 text-foreground">{experience.city}</dd>
          </div>
          {experience.location_address && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location address</dt>
              <dd className="mt-1 text-foreground">{experience.location_address}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock size={14} /> Duration
            </dt>
            <dd className="mt-1 text-foreground">{experience.duration_text}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users size={14} /> Max participants per slot
            </dt>
            <dd className="mt-1 text-foreground">{experience.max_participants_per_slot}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <IndianRupee size={14} /> Price per person
            </dt>
            <dd className="mt-1 text-foreground">
              ₹{(experience.price_per_person_cents / 100).toLocaleString()}
              {experience.tax_included && <span className="text-muted-foreground text-xs ml-1">(tax included)</span>}
            </dd>
          </div>
          {experience.age_restriction && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Age restriction</dt>
              <dd className="mt-1 text-foreground">{experience.age_restriction}</dd>
            </div>
          )}
        </dl>

        {(experience.short_description || experience.long_description) && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
              <FileText size={14} /> Description
            </dt>
            <dd className="text-foreground text-sm">
              {experience.short_description && <p className="mb-2">{experience.short_description}</p>}
              {experience.long_description && <p className="text-muted-foreground">{experience.long_description}</p>}
            </dd>
          </div>
        )}

        {experience.cancellation_policy && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cancellation policy</dt>
            <dd className="mt-1 text-foreground text-sm">{experience.cancellation_policy}</dd>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar size={14} /> Schedule (days & times)
            </dt>
            {!editingSchedule ? (
              <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1.5" onClick={startEditSchedule}>
                <Pencil size={12} /> Edit schedule
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs" onClick={() => setEditingSchedule(false)}>Cancel</Button>
                <Button type="button" size="sm" className="rounded-lg h-8 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={savingSchedule} onClick={saveSchedule}>
                  {savingSchedule ? "Saving…" : "Save schedule"}
                </Button>
              </div>
            )}
          </div>
          {scheduleError && (
            <p className="text-sm text-destructive mb-2" role="alert">{scheduleError}</p>
          )}
          <dd>
            {editingSchedule ? (
              <div className="space-y-4">
                <div>
                  <Label className="block mb-2 text-xs">Days of the week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_KEYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setScheduleDays((prev) => ({ ...prev, [day]: !prev[day] }))}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          scheduleDays[day] ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="block mb-2 text-xs">Start time, end time & number of slots per day</Label>
                  {DAY_KEYS.filter((d) => scheduleDays[d]).map((day) => {
                    const s = scheduleByDay[day] ?? defaultDaySchedule();
                    return (
                      <div key={day} className="rounded-lg border border-border bg-muted/20 p-3 mb-2">
                        <span className="font-medium text-sm block mb-2">{DAY_LABELS[day]}</span>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Start</Label>
                            <input
                              type="time"
                              className="h-8 w-28 rounded border border-input bg-background px-2 text-sm"
                              value={s.startTime}
                              onChange={(e) => setScheduleByDay((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] ?? defaultDaySchedule()), startTime: e.target.value.slice(0, 5) || "09:00" },
                              }))}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">End</Label>
                            <input
                              type="time"
                              className="h-8 w-28 rounded border border-input bg-background px-2 text-sm"
                              value={s.endTime}
                              onChange={(e) => setScheduleByDay((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] ?? defaultDaySchedule()), endTime: e.target.value.slice(0, 5) || "17:00" },
                              }))}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Slots</Label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              className="h-8 w-20"
                              value={s.numberOfSlots}
                              onChange={(e) => setScheduleByDay((prev) => ({
                                ...prev,
                                [day]: { ...(prev[day] ?? defaultDaySchedule()), numberOfSlots: Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)) },
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (() => {
              const scheduleByDay = experience.schedule_by_day;
              const scheduleDays = experience.schedule_days;
              const hasTemplate = scheduleByDay && scheduleDays && DAY_KEYS.some((d) => scheduleDays[d] && scheduleByDay[d]);
              if (hasTemplate) {
                const days = DAY_KEYS.filter((d) => scheduleDays![d] && scheduleByDay![d]);
                let totalSlotsPerWeek = 0;
                return (
                  <>
                    <ul className="space-y-2 text-sm text-foreground">
                      {days.map((day) => {
                        const s = scheduleByDay![day];
                        if (!s) return null;
                        const n = Math.max(1, s.numberOfSlots ?? 1);
                        totalSlotsPerWeek += n;
                        const start = (s.startTime ?? "09:00").slice(0, 5);
                        const end = (s.endTime ?? "17:00").slice(0, 5);
                        return (
                          <li key={day}>
                            <span className="font-medium">{DAY_LABELS[day] ?? day}</span>
                            <span className="text-muted-foreground ml-2">Start {start}, End {end}, {n} slot{n !== 1 ? "s" : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3">
                      Total slots per week: <strong>{totalSlotsPerWeek}</strong>
                      {" · "}
                      Max bookings per week: <strong>{totalSlotsPerWeek * (experience.max_participants_per_slot ?? 1)}</strong>
                      {" "}({totalSlotsPerWeek} × {experience.max_participants_per_slot} per slot)
                    </p>
                  </>
                );
              }
              if ((experience.recurring_slots?.length ?? 0) > 0) {
                const byDay: Record<string, string[]> = {};
                (experience.recurring_slots ?? []).forEach(({ day, time }) => {
                  const d = day.toLowerCase().slice(0, 3);
                  if (!byDay[d]) byDay[d] = [];
                  const t = (time ?? "09:00").slice(0, 5);
                  if (!byDay[d].includes(t)) byDay[d].push(t);
                });
                const days = Object.keys(byDay).sort();
                let totalSlotsPerWeek = 0;
                return (
                  <>
                    <ul className="space-y-2 text-sm text-foreground">
                      {days.map((day) => {
                        const times = (byDay[day] ?? []).sort();
                        const n = times.length;
                        totalSlotsPerWeek += n;
                        const start = times[0] ?? "09:00";
                        const end = times[n - 1] ?? "17:00";
                        return (
                          <li key={day}>
                            <span className="font-medium">{DAY_LABELS[day] ?? day}</span>
                            <span className="text-muted-foreground ml-2">Start {start}, End {end}, {n} slot{n !== 1 ? "s" : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3">
                      Total slots per week: <strong>{totalSlotsPerWeek}</strong>
                      {" · "}
                      Max bookings per week: <strong>{totalSlotsPerWeek * (experience.max_participants_per_slot ?? 1)}</strong>
                      {" "}({totalSlotsPerWeek} × {experience.max_participants_per_slot} per slot)
                    </p>
                  </>
                );
              }
              return null;
            })() ?? (experience.slots.length > 0 ? (
              <ul className="space-y-1 text-sm text-foreground">
                {experience.slots.slice(0, 10).map((s) => (
                  <li key={s.id}>{s.slot_date} {s.slot_time} — capacity {s.capacity}</li>
                ))}
                {experience.slots.length > 10 && <li className="text-muted-foreground">+{experience.slots.length - 10} more</li>}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No schedule set. Click &quot;Edit schedule&quot; to add days and times.</p>
            ))}
          </dd>
        </div>

        {experience.media.length > 0 && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Media</dt>
            <dd className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...experience.media].sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                <div key={m.id} className="relative rounded-xl overflow-hidden bg-muted aspect-video border border-border">
                  <img src={m.file_url.startsWith("http") ? m.file_url : `/${m.file_url}`} alt="" className="w-full h-full object-cover" />
                  {m.is_cover && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </dd>
          </div>
        )}
      </div>
    </div>
  );
}
