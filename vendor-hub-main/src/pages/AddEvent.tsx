import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, ChevronRight, ChevronLeft, Upload, MapPin, Ticket, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vendorFetch } from "@/lib/api";

const EVENT_STEPS = ["Event Details", "Tickets", "Media"];

const EVENT_CATEGORIES = ["Concert", "Comedy", "Exhibition", "Meetup", "Festival", "Sports", "Workshop", "Conference", "Other"];

type TicketType = { name: string; price: string; quantity: string; maxPerUser: string };

export default function AddEvent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({
    name: "",
    category: "",
    city: "",
    venueAddress: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    organizerName: "",
    description: "",
  });
  const [tickets, setTickets] = useState<TicketType[]>([{ name: "General", price: "", quantity: "", maxPerUser: "10" }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const addTicketType = () => setTickets((t) => [...t, { name: "", price: "", quantity: "", maxPerUser: "5" }]);
  const removeTicket = (i: number) => setTickets((t) => t.filter((_, j) => j !== i));
  const updateTicket = (i: number, field: keyof TicketType, value: string) =>
    setTickets((t) => t.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

  const next = () => setStep((s) => Math.min(s + 1, EVENT_STEPS.length - 1));
  const prev = () => (step === 0 ? navigate("/add-listing") : setStep((s) => s - 1));

  const createEventListing = async (asDraft: boolean) => {
    const name = details.name.trim();
    if (!name) {
      setSubmitError("Event name is required.");
      return;
    }
    const category = (details.category || "Other").trim() || "Other";
    const city = (details.city || "").trim() || "Not set";
    const startDate = (details.startDate || "").trim();
    const endDate = (details.endDate || "").trim() || startDate;
    const startTime = (details.startTime || "09:00").trim().slice(0, 5) || "09:00";
    const endTime = (details.endTime || "18:00").trim().slice(0, 5) || "18:00";
    const organizerName = (details.organizerName || "").trim() || name;
    if (!startDate) {
      setSubmitError("Start date is required.");
      return;
    }
    const ticketTypesValid = tickets.filter((t) => (t.name || "").trim() && Number(t.quantity) > 0);
    if (ticketTypesValid.length === 0) {
      setSubmitError("Add at least one ticket type with a name and quantity.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const listingRes = await vendorFetch<{ id: string }>("/api/listings", {
        method: "POST",
        body: JSON.stringify({
          name,
          type: "event",
          status: "draft",
          description: (details.description || "").trim() || null,
        }),
      });
      const listingId = listingRes.id;
      const ticket_types = ticketTypesValid.map((t) => ({
        name: (t.name || "Ticket").trim(),
        price_cents: Math.max(0, Math.floor(Number(t.price) || 0) * 100),
        quantity_total: Math.max(1, Math.min(100000, Math.floor(Number(t.quantity) || 0))),
        max_per_user: Math.max(1, Math.min(50, Math.floor(Number(t.maxPerUser) || 5))),
      }));
      await vendorFetch(`/api/listings/${listingId}/event`, {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          city,
          venue_name: "",
          venue_address: (details.venueAddress || "").trim() || null,
          start_date: startDate,
          end_date: endDate,
          start_time: startTime,
          end_time: endTime,
          organizer_name: organizerName,
          description: (details.description || "").trim() || null,
          ticket_types,
        }),
      });
      navigate("/listings", {
        state: {
          message: asDraft
            ? "Event saved as draft. Verify it from My Listings to publish."
            : "Event created. Verify it from My Listings (Generate token → share with admin) to publish.",
          success: true,
        },
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create event");
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
        <span className="text-foreground font-medium">New Event</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <PartyPopper className="h-7 w-7 text-violet-600" />
          Create Event
        </h1>
        <p className="text-muted-foreground mt-1">Fixed-date, ticketed events. Set ticket types and capacity.</p>
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-1">
        {EVENT_STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                i === step ? "bg-violet-600 text-white" : i < step ? "bg-violet-500/20 text-violet-700 dark:text-violet-400" : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < EVENT_STEPS.length - 1 && <ChevronRight size={14} className="mx-1 text-muted-foreground/50 shrink-0" />}
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
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Event Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Event Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Summer Music Festival 2026" value={details.name} onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={details.category}
                    onChange={(e) => setDetails((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>City</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="e.g. Mumbai" value={details.city} onChange={(e) => setDetails((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1.5"><MapPin size={14} /> Venue full address</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Full address of the venue" value={details.venueAddress} onChange={(e) => setDetails((p) => ({ ...p, venueAddress: e.target.value }))} />
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" className="mt-1.5 rounded-xl" value={details.startDate} onChange={(e) => setDetails((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" className="mt-1.5 rounded-xl" value={details.endDate} onChange={(e) => setDetails((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" className="mt-1.5 rounded-xl" value={details.startTime} onChange={(e) => setDetails((p) => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" className="mt-1.5 rounded-xl" value={details.endTime} onChange={(e) => setDetails((p) => ({ ...p, endTime: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Organizer Name</Label>
                  <Input className="mt-1.5 rounded-xl" placeholder="Your or company name" value={details.organizerName} onChange={(e) => setDetails((p) => ({ ...p, organizerName: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={4} className="mt-1.5 rounded-xl resize-none" placeholder="What's the event about, lineup, rules..." value={details.description} onChange={(e) => setDetails((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
                <Ticket size={20} className="text-violet-600" />
                Ticket Setup
              </h2>
              <p className="text-sm text-muted-foreground">Create ticket types. Quantity will decrease as users book. No overbooking.</p>
              <div className="space-y-4">
                {tickets.map((t, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Ticket type {i + 1}</span>
                      {tickets.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8" onClick={() => removeTicket(i)}>
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input className="mt-1 rounded-lg" placeholder="General / VIP / Early Bird" value={t.name} onChange={(e) => updateTicket(i, "name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Price (₹)</Label>
                        <Input type="number" min={0} className="mt-1 rounded-lg" placeholder="0" value={t.price} onChange={(e) => updateTicket(i, "price", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="100" value={t.quantity} onChange={(e) => updateTicket(i, "quantity", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Max per user</Label>
                        <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="5" value={t.maxPerUser} onChange={(e) => updateTicket(i, "maxPerUser", e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addTicketType}>
                  <Ticket size={14} /> Add ticket type
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
              <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Media</h2>
              <p className="text-sm text-muted-foreground">Event poster is mandatory. Add more images for the gallery (optional). Min 1 image.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-foreground font-medium">Event poster (required)</Label>
                  <div className="mt-2 border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-2 hover:border-violet-500/50 transition-colors cursor-pointer bg-muted/20">
                    <Upload size={32} className="text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Upload poster image</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Additional images (optional)</Label>
                  <div className="mt-2 border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-violet-500/30 transition-colors cursor-pointer">
                    <Upload size={24} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Add more photos</p>
                  </div>
                </div>
              </div>
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                <Button type="button" variant="outline" className="rounded-xl" disabled={submitting} onClick={() => createEventListing(true)}>
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={submitting}
                  onClick={() => createEventListing(false)}
                >
                  {submitting ? "Creating…" : "Create event"}
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
        {step < EVENT_STEPS.length - 1 && (
          <Button type="button" className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white gap-2" onClick={next}>
            Next <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
