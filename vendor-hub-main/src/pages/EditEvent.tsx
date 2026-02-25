import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PartyPopper, ArrowLeft, MapPin, Ticket, Upload, X } from "lucide-react";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EVENT_CATEGORIES = ["Concert", "Comedy", "Exhibition", "Meetup", "Festival", "Sports", "Workshop", "Conference", "Other"];

type TicketType = { id?: string; name: string; price_cents: number; quantity_total: number; max_per_user: number };
type EventData = {
  id: string;
  listing_id: string;
  name: string;
  category: string;
  city: string;
  venue_name: string;
  venue_address: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  organizer_name: string;
  description: string | null;
  status: string;
  ticket_types: TicketType[];
  media: { id: string; file_url: string; is_poster: boolean; sort_order: number }[];
};

export default function EditEvent() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    city: "",
    venue_name: "",
    venue_address: "",
    start_date: "",
    end_date: "",
    start_time: "09:00",
    end_time: "18:00",
    organizer_name: "",
    description: "",
  });
  const [tickets, setTickets] = useState<{ name: string; price: string; quantity: string; max_per_user: string }[]>([
    { name: "General", price: "0", quantity: "100", max_per_user: "10" },
  ]);
  const [mediaItems, setMediaItems] = useState<{ file_url: string; is_poster: boolean; sort_order: number }[]>([]);
  const [posterIndex, setPosterIndex] = useState(0);

  useEffect(() => {
    if (!listingId) return;
    setError("");
    vendorFetch<EventData>(`/api/listings/${listingId}/event`)
      .then((ev) => {
        setForm({
          name: ev.name || "",
          category: ev.category || "",
          city: ev.city || "",
          venue_name: ev.venue_name || "",
          venue_address: ev.venue_address || "",
          start_date: ev.start_date?.slice(0, 10) || "",
          end_date: ev.end_date?.slice(0, 10) || "",
          start_time: ev.start_time?.slice(0, 5) || "09:00",
          end_time: ev.end_time?.slice(0, 5) || "18:00",
          organizer_name: ev.organizer_name || "",
          description: ev.description || "",
        });
        if (ev.ticket_types?.length) {
          setTickets(
            ev.ticket_types.map((t) => ({
              name: t.name,
              price: String(Math.round(t.price_cents / 100)),
              quantity: String(t.quantity_total),
              max_per_user: String(t.max_per_user),
            }))
          );
        }
        const sorted = [...(ev.media ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        setMediaItems(sorted.map((m) => ({ file_url: m.file_url, is_poster: m.is_poster, sort_order: m.sort_order })));
        const posterIdx = sorted.findIndex((m) => m.is_poster);
        setPosterIndex(posterIdx >= 0 ? posterIdx : 0);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const addTicket = () => setTickets((t) => [...t, { name: "", price: "0", quantity: "50", max_per_user: "5" }]);
  const removeTicket = (i: number) => setTickets((t) => t.filter((_, j) => j !== i));
  const updateTicket = (i: number, field: string, value: string) =>
    setTickets((t) => t.map((x, j) => (j === i ? { ...x, [field]: value } : x)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId) return;
    const name = form.name.trim();
    if (!name) {
      setError("Event name is required.");
      return;
    }
    const ticketTypesValid = tickets.filter((t) => (t.name || "").trim() && Number(t.quantity) > 0);
    if (ticketTypesValid.length === 0) {
      setError("Add at least one ticket type with a name and quantity (max tickets).");
      return;
    }

    const ticket_types = ticketTypesValid.map((t) => ({
      name: (t.name || "Ticket").trim(),
      price_cents: Math.max(0, Math.floor(Number(t.price) || 0) * 100),
      quantity_total: Math.max(1, Math.min(100000, Math.floor(Number(t.quantity) || 0))),
      max_per_user: Math.max(1, Math.min(50, Math.floor(Number(t.max_per_user) || 5))),
    }));

    const mediaUrls: { file_url: string; is_poster: boolean; sort_order: number }[] = [];
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      if (item.file_url.startsWith("data:")) {
        const payload = item.file_url.startsWith("data:application/pdf") ? { file: item.file_url } : { image: item.file_url };
        const { url } = await vendorFetch<{ url: string }>("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        mediaUrls.push({ file_url: url, is_poster: i === posterIndex, sort_order: i });
      } else {
        mediaUrls.push({ file_url: item.file_url, is_poster: i === posterIndex, sort_order: i });
      }
    }
    const mediaPayload = mediaUrls.length ? mediaUrls : undefined;

    setSaving(true);
    setError("");
    try {
      await vendorFetch(`/api/listings/${listingId}/event`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          category: (form.category || "Other").trim() || undefined,
          city: (form.city || "").trim() || undefined,
          venue_name: (form.venue_name || "").trim() || undefined,
          venue_address: (form.venue_address || "").trim() || null,
          start_date: form.start_date || undefined,
          end_date: form.end_date || form.start_date || undefined,
          start_time: form.start_time || undefined,
          end_time: form.end_time || undefined,
          organizer_name: (form.organizer_name || "").trim() || undefined,
          description: (form.description || "").trim() || null,
          ticket_types,
          media: mediaPayload,
        }),
      });
      navigate(`/listings/${listingId}/event`, {
        state: {
          message: "Event details updated. Re-verification may be required — check Verification page if your listing is set to pending.",
          success: true,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error && !form.name) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error}</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link to={`/listings/${listingId}/event`} className="hover:text-foreground flex items-center gap-1">
          <ArrowLeft size={14} /> Manage
        </Link>
        <span className="text-foreground font-medium">Edit event</span>
      </div>

      <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
        <PartyPopper className="h-7 w-7 text-violet-600" />
        Edit Event
      </h1>
      <p className="text-muted-foreground text-sm">
        Update event details, venue, dates, and <strong>ticket types (max tickets available)</strong>. Only that many users can book per type. Saving may require re-verification.
      </p>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-2 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Event name</Label>
            <Input className="mt-1.5 rounded-xl" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Music Festival" />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>City</Label>
            <Input className="mt-1.5 rounded-xl" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. Mumbai" />
          </div>
          <div className="sm:col-span-2">
            <Label className="flex items-center gap-1.5"><MapPin size={14} /> Venue name</Label>
            <Input className="mt-1.5 rounded-xl" value={form.venue_name} onChange={(e) => setForm((f) => ({ ...f, venue_name: e.target.value }))} placeholder="e.g. Jawaharlal Nehru Stadium" />
          </div>
          <div className="sm:col-span-2">
            <Label>Venue address</Label>
            <Input className="mt-1.5 rounded-xl" value={form.venue_address} onChange={(e) => setForm((f) => ({ ...f, venue_address: e.target.value }))} placeholder="Full address" />
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" className="mt-1.5 rounded-xl" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" className="mt-1.5 rounded-xl" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div>
            <Label>Start time</Label>
            <Input type="time" className="mt-1.5 rounded-xl" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
          </div>
          <div>
            <Label>End time</Label>
            <Input type="time" className="mt-1.5 rounded-xl" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Organizer name</Label>
            <Input className="mt-1.5 rounded-xl" value={form.organizer_name} onChange={(e) => setForm((f) => ({ ...f, organizer_name: e.target.value }))} placeholder="Your or company name" />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} className="mt-1.5 rounded-xl resize-none" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What's the event about..." />
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Ticket size={18} className="text-violet-600" /> Ticket types (max tickets available)
          </h3>
          <p className="text-sm text-muted-foreground">Only this many users can book each type. Quantity = max tickets available.</p>
          {tickets.map((t, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Ticket type {i + 1}</span>
                {tickets.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8" onClick={() => removeTicket(i)}>Remove</Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="mt-1 rounded-lg" placeholder="General / VIP" value={t.name} onChange={(e) => updateTicket(i, "name", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Price (₹)</Label>
                  <Input type="number" min={0} className="mt-1 rounded-lg" value={t.price} onChange={(e) => updateTicket(i, "price", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Max tickets available</Label>
                  <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="100" value={t.quantity} onChange={(e) => updateTicket(i, "quantity", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Max per user</Label>
                  <Input type="number" min={1} className="mt-1 rounded-lg" placeholder="5" value={t.max_per_user} onChange={(e) => updateTicket(i, "max_per_user", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={addTicket}>
            <Ticket size={14} /> Add ticket type
          </Button>
        </div>

        <div className="border-t border-border/50 pt-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Upload size={18} className="text-violet-600" /> Media</h3>
          <p className="text-sm text-muted-foreground">Poster (required) and optional gallery images.</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="edit-event-media"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              Array.from(files).forEach((file) => {
                if (!file.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = () =>
                  setMediaItems((prev) => [...prev, { file_url: reader.result as string, is_poster: prev.length === 0, sort_order: prev.length }]);
                reader.readAsDataURL(file);
              });
              e.target.value = "";
            }}
          />
          <label htmlFor="edit-event-media" className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-violet-500/50 cursor-pointer bg-muted/20 block">
            <Upload size={28} className="text-muted-foreground" />
            <span className="text-sm font-medium">Add poster / images</span>
          </label>
          {mediaItems.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {mediaItems.map((item, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden bg-muted aspect-video border border-border">
                  <img src={item.file_url.startsWith("http") ? item.file_url : item.file_url.startsWith("data:") ? item.file_url : `/${item.file_url}`} alt="" className="w-full h-full object-cover" />
                  {i === posterIndex && <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-600 text-white">Poster</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaItems((prev) => prev.filter((_, idx) => idx !== i));
                      if (i === posterIndex) setPosterIndex(0);
                      else if (i < posterIndex) setPosterIndex((p) => Math.max(0, p - 1));
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-destructive/90 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                  <button type="button" onClick={() => setPosterIndex(i)} className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white bg-black/40 opacity-0 group-hover:opacity-100">
                    Set as poster
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="rounded-xl bg-violet-600 hover:bg-violet-700">
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Link to={`/listings/${listingId}/event`}>
            <Button type="button" variant="outline" className="rounded-xl">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
