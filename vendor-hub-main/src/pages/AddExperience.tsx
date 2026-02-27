import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, ChevronRight, ChevronLeft, Upload, X, Check, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vendorFetch } from "@/lib/api";
import { searchAddressSuggestions, type AddressSuggestion } from "@/lib/addressSuggestions";

const EXPERIENCE_STEPS = ["Basic Info", "Schedule", "Pricing", "Media"];

const CATEGORIES = ["Adventure", "Tour", "Cultural", "Workshop", "Water", "Food & Drink", "Nature", "Other"];
const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "Half day", "1 day", "Multi-day"];

export default function AddExperience() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState({
    name: "",
    category: "",
    city: "",
    location: "",
    duration: "",
    shortDesc: "",
    detailedDesc: "",
    ageRestriction: "",
    maxParticipants: "",
  });
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const DAY_LABELS: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  type DaySchedule = { startTime: string; endTime: string; numberOfSlots: number };
  const defaultDaySchedule: DaySchedule = { startTime: "09:00", endTime: "17:00", numberOfSlots: 1 };
  const [scheduleDays, setScheduleDays] = useState<Record<string, boolean>>({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false });
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, DaySchedule>>({ mon: { ...defaultDaySchedule }, tue: { ...defaultDaySchedule }, wed: { ...defaultDaySchedule }, thu: { ...defaultDaySchedule }, fri: { ...defaultDaySchedule }, sat: { ...defaultDaySchedule }, sun: { ...defaultDaySchedule } });
  const [price, setPrice] = useState({ perPerson: "", taxIncluded: true, cancellationPolicy: "" });
  const [coverIndex, setCoverIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] = useState(false);
  const locationInputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = basic.location.trim();
    if (q.length < 2) {
      setLocationSuggestions([]);
      setLocationSuggestionsOpen(false);
      return;
    }
    const t = setTimeout(() => {
      setLocationSuggestionsLoading(true);
      searchAddressSuggestions(q)
        .then((list) => {
          setLocationSuggestions(list);
          setLocationSuggestionsOpen(list.length > 0);
        })
        .catch(() => {
          setLocationSuggestions([]);
          setLocationSuggestionsOpen(false);
        })
        .finally(() => setLocationSuggestionsLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [basic.location]);

  const chooseLocationSuggestion = useCallback((item: AddressSuggestion) => {
    setBasic((p) => ({ ...p, location: item.displayName }));
    setLocationSuggestions([]);
    setLocationSuggestionsOpen(false);
  }, []);

  useEffect(() => {
    const wrap = locationInputWrapRef.current;
    if (!wrap) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrap.contains(e.target as Node)) return;
      setLocationSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, EXPERIENCE_STEPS.length - 1));
  const prev = () => (step === 0 ? navigate("/add-listing") : setStep((s) => s - 1));

  function slotTimesFromRange(startTime: string, endTime: string, numberOfSlots: number): string[] {
    if (numberOfSlots < 1) return [];
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let startMins = (sh ?? 0) * 60 + (sm ?? 0);
    let endMins = (eh ?? 0) * 60 + (em ?? 0);
    if (endMins <= startMins) endMins += 24 * 60;
    const out: string[] = [];
    for (let i = 0; i < numberOfSlots; i++) {
      const mins = startMins + ((endMins - startMins) * i) / numberOfSlots;
      const h = Math.floor(mins / 60) % 24;
      const m = Math.round(mins % 60);
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return out;
  }

  const createExperienceListing = async (asDraft: boolean) => {
    const name = basic.name.trim();
    if (!name) {
      setSubmitError("Experience name is required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const listingRes = await vendorFetch<{ id: string }>("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "experience",
          status: "draft",
          description: (basic.shortDesc || basic.detailedDesc || "").trim() || null,
        }),
      });
      const listingId = listingRes.id;

      const recurring_slots: { day: string; time: string }[] = [];
      DAY_KEYS.forEach((day) => {
        if (scheduleDays[day]) {
          const s = scheduleByDay[day] ?? defaultDaySchedule;
          const n = Math.max(1, s.numberOfSlots);
          const times = slotTimesFromRange(s.startTime, s.endTime, n);
          times.forEach((time) => recurring_slots.push({ day, time: time.slice(0, 5) || "09:00" }));
        }
      });

      const mediaUrls: { file_url: string; is_cover: boolean; sort_order: number }[] = [];
      for (let i = 0; i < images.length; i++) {
        const dataUrl = images[i];
        if (dataUrl.startsWith("data:")) {
          const payload = dataUrl.startsWith("data:application/pdf") ? { file: dataUrl } : { image: dataUrl };
          const { url } = await vendorFetch<{ url: string }>("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          mediaUrls.push({ file_url: url, is_cover: i === coverIndex, sort_order: i });
        }
      }

      await vendorFetch(`/api/listings/${listingId}/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: basic.name.trim(),
          category: (basic.category || "activity").trim() || "activity",
          city: (basic.city || "").trim() || "Not set",
          location_address: (basic.location || "").trim() || null,
          duration_text: (basic.duration || "").trim() || "Not set",
          short_description: (basic.shortDesc || "").trim() || null,
          long_description: (basic.detailedDesc || "").trim() || null,
          age_restriction: (basic.ageRestriction || "").trim() || null,
          max_participants_per_slot: Math.min(200, Math.max(1, parseInt(basic.maxParticipants || "10", 10))),
          price_per_person_cents: Math.max(0, Math.floor(parseFloat(price.perPerson || "0") * 100)),
          tax_included: price.taxIncluded,
          cancellation_policy: (price.cancellationPolicy || "").trim() || null,
          schedule_days: scheduleDays,
          schedule_by_day: scheduleByDay,
          recurring_slots: recurring_slots.length ? recurring_slots : undefined,
          media: mediaUrls.length ? mediaUrls : undefined,
        }),
      });

      navigate("/listings", {
        state: {
          message: asDraft
            ? "Experience saved as draft. Verify it from My Listings to publish."
            : "Experience created. Verify it from My Listings (Generate token → share with admin) to publish.",
          success: true,
        },
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create experience");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <button type="button" onClick={() => navigate("/add-listing")} className="hover:text-foreground">
          Add listing
        </button>
        <ChevronRight size={14} />
        <span className="text-foreground font-medium">New Experience</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Compass className="h-7 w-7 text-emerald-600" />
          Create Experience
        </h1>
        <p className="text-muted-foreground mt-1">Slot-based, repeatable activities customers can book by date and time.</p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1">
        {EXPERIENCE_STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                i === step ? "bg-emerald-600 text-white" : i < step ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < EXPERIENCE_STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-muted-foreground/50 shrink-0" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Basic Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Experience Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Paragliding over the valley" value={basic.name} onChange={(e) => setBasic((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={basic.category}
                    onChange={(e) => setBasic((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>City</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Manali" value={basic.city} onChange={(e) => setBasic((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="sm:col-span-2" ref={locationInputWrapRef}>
                  <Label className="flex items-center gap-1.5"><MapPin size={14} /> Exact Location</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    placeholder="Start typing address for suggestions"
                    value={basic.location}
                    onChange={(e) => setBasic((p) => ({ ...p, location: e.target.value }))}
                    autoComplete="off"
                  />
                  {locationSuggestionsLoading && (
                    <p className="text-xs text-muted-foreground mt-1">Finding addresses…</p>
                  )}
                  {locationSuggestionsOpen && locationSuggestions.length > 0 && !locationSuggestionsLoading && (
                    <ul className="mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden divide-y divide-border max-h-48 overflow-y-auto z-10">
                      {locationSuggestions.map((item, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted/80 transition-colors"
                            onClick={() => chooseLocationSuggestion(item)}
                          >
                            {item.displayName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <Label>Duration per slot</Label>
                  <Input
                    className="mt-1.5 rounded-xl"
                    list="duration-options"
                    placeholder="e.g. 1 hour, 2 hours, or type your own"
                    value={basic.duration}
                    onChange={(e) => setBasic((p) => ({ ...p, duration: e.target.value }))}
                  />
                  <datalist id="duration-options">
                    {DURATIONS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label>Max Participants Per Slot</Label>
                  <Input type="number" min={1} max={100} className="mt-1.5 rounded-xl" placeholder="e.g. 10" value={basic.maxParticipants} onChange={(e) => setBasic((p) => ({ ...p, maxParticipants: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Short Description</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="One line summary" value={basic.shortDesc} onChange={(e) => setBasic((p) => ({ ...p, shortDesc: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Detailed Description</Label>
                  <Textarea rows={4} className="mt-1.5 rounded-xl resize-none" placeholder="What happens during the experience, what's included..." value={basic.detailedDesc} onChange={(e) => setBasic((p) => ({ ...p, detailedDesc: e.target.value }))} />
                </div>
                <div>
                  <Label>Age Restriction (optional)</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. 12+ or None" value={basic.ageRestriction} onChange={(e) => setBasic((p) => ({ ...p, ageRestriction: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
                <Calendar size={20} className="text-emerald-600" />
                Schedule Setup
              </h2>

              <div>
                <Label className="block mb-2">Days of the week</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setScheduleDays((prev) => ({ ...prev, [day]: !prev[day] }))}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                        scheduleDays[day] ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="block mb-2">Start time, end time & number of slots per day</Label>
                <div className="space-y-4 mt-3">
                  {DAY_KEYS.filter((day) => scheduleDays[day]).map((day) => {
                    const s = scheduleByDay[day] ?? defaultDaySchedule;
                    return (
                      <div key={day} className="rounded-xl border border-border bg-muted/20 p-4">
                        <span className="font-medium text-foreground block mb-3">{DAY_LABELS[day]}</span>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <Label className="text-xs">Start time</Label>
                            <input
                              type="time"
                              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                              value={s.startTime}
                              onChange={(e) => setScheduleByDay((prev) => ({ ...prev, [day]: { ...(prev[day] ?? defaultDaySchedule), startTime: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End time</Label>
                            <input
                              type="time"
                              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                              value={s.endTime}
                              onChange={(e) => setScheduleByDay((prev) => ({ ...prev, [day]: { ...(prev[day] ?? defaultDaySchedule), endTime: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Number of slots</Label>
                            <Input
                              type="number"
                              min={1}
                              className="mt-1 rounded-xl"
                              value={s.numberOfSlots}
                              onChange={(e) => setScheduleByDay((prev) => ({ ...prev, [day]: { ...(prev[day] ?? defaultDaySchedule), numberOfSlots: Math.max(1, parseInt(e.target.value || "1", 10) || 1) } }))}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Max bookings this day = {s.numberOfSlots} × (max participants per slot) = {s.numberOfSlots * Math.max(1, parseInt(basic.maxParticipants || "10", 10) || 1)}</p>
                      </div>
                    );
                  })}
                  {!DAY_KEYS.some((d) => scheduleDays[d]) && (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
                      Select at least one day above to set start time, end time, and number of slots.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Pricing</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Price per person (₹)</Label>
                  <Input type="number" min={0} className="mt-1.5 rounded-xl" placeholder="e.g. 2500" value={price.perPerson} onChange={(e) => setPrice((p) => ({ ...p, perPerson: e.target.value }))} />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="taxIncluded" checked={price.taxIncluded} onChange={(e) => setPrice((p) => ({ ...p, taxIncluded: e.target.checked }))} className="rounded border-input" />
                  <Label htmlFor="taxIncluded">Tax included in price</Label>
                </div>
                <div className="sm:col-span-2">
                  <Label>Cancellation policy</Label>
                  <Textarea rows={3} className="mt-1.5 rounded-xl resize-none" placeholder="e.g. Free cancellation 24h before. No refund within 24h." value={price.cancellationPolicy} onChange={(e) => setPrice((p) => ({ ...p, cancellationPolicy: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Media Upload</h2>
              <p className="text-sm text-muted-foreground">Minimum 3 images. One will be the cover. No videos for now.</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="experience-media-upload"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  Array.from(files).forEach((file) => {
                    if (!file.type.startsWith("image/")) return;
                    const reader = new FileReader();
                    reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
                    reader.readAsDataURL(file);
                  });
                  e.target.value = "";
                }}
              />
              <label htmlFor="experience-media-upload" className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 hover:border-emerald-500/50 transition-colors cursor-pointer bg-muted/20 block">
                <Upload size={36} className="text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drag & drop images here or click to browse</p>
                <p className="text-xs text-muted-foreground">Min 3 images · 1 cover · Gallery</p>
              </label>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {images.map((_, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden bg-muted aspect-video">
                      <img src={images[i]} alt="" className="w-full h-full object-cover" />
                      {i === coverIndex && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 text-white z-10">Cover</span>}
                      <button
                        type="button"
                        onClick={() => {
                          setImages((prev) => prev.filter((_, idx) => idx !== i));
                          if (i === coverIndex) setCoverIndex(0);
                          else if (i < coverIndex) setCoverIndex((c) => Math.max(0, c - 1));
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={12} />
                      </button>
                      <button type="button" onClick={() => setCoverIndex(i)} className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        Set as cover
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                <Button type="button" variant="outline" className="rounded-xl" disabled={submitting} onClick={() => createExperienceListing(true)}>
                  Save as Draft
                </Button>
                <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting} onClick={() => createExperienceListing(false)}>
                  {submitting ? "Creating…" : "Create experience"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" className="rounded-xl gap-2" onClick={prev}>
          <ChevronLeft size={16} /> {step === 0 ? "Back to listing type" : "Previous"}
        </Button>
        {step < EXPERIENCE_STEPS.length - 1 && (
          <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
