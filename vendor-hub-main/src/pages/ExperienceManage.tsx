import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { Compass, ArrowLeft, MapPin, Calendar, Clock, Users, IndianRupee, FileText, ToggleLeft, ToggleRight, Pencil, Upload, X } from "lucide-react";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

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
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[]>>({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });
  const [savingSchedule, setSavingSchedule] = useState(false);

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
    const byDay: Record<string, string[]> = {};
    DAY_KEYS.forEach((d) => { byDay[d] = []; });
    (experience?.recurring_slots ?? []).forEach(({ day, time }) => {
      const d = day.toLowerCase().slice(0, 3);
      if (byDay[d] && !byDay[d].includes(time)) byDay[d].push(time);
      if (!byDay[d]) byDay[d] = [time];
    });
    const days: Record<string, boolean> = {};
    DAY_KEYS.forEach((d) => { days[d] = (byDay[d]?.length ?? 0) > 0; });
    setScheduleDays(days);
    setSlotsByDay(byDay);
    setEditingSchedule(true);
  };

  const saveSchedule = async () => {
    if (!listingId || !experience) return;
    const recurring_slots: { day: string; time: string }[] = [];
    DAY_KEYS.forEach((day) => {
      if (!scheduleDays[day]) return;
      const times = slotsByDay[day];
      if (times?.length) {
        times.forEach((time) => recurring_slots.push({ day, time: time.slice(0, 5) || "09:00" }));
      } else {
        // Selected day with no time slots: save with a default time so the day is persisted
        recurring_slots.push({ day, time: "09:00" });
      }
    });
    setSavingSchedule(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/experience`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recurring_slots }),
      });
      const updated = await vendorFetch<Experience>(`/api/listings/${listingId}/experience`);
      setExperience(updated);
      setEditingSchedule(false);
    } catch {
      setError("Failed to save schedule");
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
          <ArrowLeft size={14} /> My Listings
        </Link>
        <span className="text-foreground font-medium">{experience.name}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Compass className="h-7 w-7 text-emerald-600" />
          Manage Experience
        </h1>
        <Link
          to={`/listings/${listingId}/experience/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors"
        >
          <Pencil size={16} /> Edit details
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">Set active/inactive status and manage your schedule here. For basic info, pricing, and media, use <strong>Edit details</strong>.</p>

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
        <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Experience details</h2>

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
                  <Label className="block mb-2 text-xs">Time slots per day</Label>
                  {DAY_KEYS.filter((d) => scheduleDays[d]).map((day) => (
                    <div key={day} className="rounded-lg border border-border bg-muted/20 p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{DAY_LABELS[day]}</span>
                        <button
                          type="button"
                          className="text-xs text-emerald-600 hover:underline"
                          onClick={() => setSlotsByDay((prev) => ({ ...prev, [day]: [...(prev[day] || []), "09:00"] }))}
                        >
                          + Add slot
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(slotsByDay[day] || []).map((time, idx) => (
                          <div key={`${day}-${idx}`} className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
                            <input
                              type="time"
                              className="w-24 rounded border-0 bg-transparent text-sm"
                              value={time}
                              onChange={(e) => {
                                const next = [...(slotsByDay[day] || [])];
                                next[idx] = e.target.value;
                                setSlotsByDay((prev) => ({ ...prev, [day]: next }));
                              }}
                            />
                            <button type="button" onClick={() => setSlotsByDay((prev) => ({ ...prev, [day]: (prev[day] || []).filter((_, i) => i !== idx) }))} className="p-0.5 rounded text-muted-foreground hover:text-destructive" aria-label="Remove"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (experience.recurring_slots?.length ?? 0) > 0 ? (
              <>
                {(() => {
                  const byDay: Record<string, string[]> = {};
                  (experience.recurring_slots ?? []).forEach(({ day, time }) => {
                    if (!byDay[day]) byDay[day] = [];
                    if (!byDay[day].includes(time)) byDay[day].push(time);
                  });
                  const days = Object.keys(byDay).sort();
                  return (
                    <ul className="space-y-2 text-sm text-foreground">
                      {days.map((day) => (
                        <li key={day}>
                          <span className="font-medium">{DAY_LABELS[day] ?? day}</span>
                          <span className="text-muted-foreground ml-2">{byDay[day].sort().join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
                {experience.slots.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{experience.slots.length} slot(s) generated for the next 12 weeks.</p>
                )}
              </>
            ) : experience.slots.length > 0 ? (
              <ul className="space-y-1 text-sm text-foreground">
                {experience.slots.slice(0, 10).map((s) => (
                  <li key={s.id}>{s.slot_date} {s.slot_time} — capacity {s.capacity}</li>
                ))}
                {experience.slots.length > 10 && <li className="text-muted-foreground">+{experience.slots.length - 10} more</li>}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No schedule set. Click &quot;Edit schedule&quot; to add days and times.</p>
            )}
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

      <div className="flex gap-2">
        <Link to="/listings">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft size={16} className="mr-2" /> Back to My Listings
          </Button>
        </Link>
        <Link to={`/listings/${listingId}/experience/edit`}>
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <Pencil size={16} className="mr-2" /> Edit details
          </Button>
        </Link>
      </div>
    </div>
  );
}
