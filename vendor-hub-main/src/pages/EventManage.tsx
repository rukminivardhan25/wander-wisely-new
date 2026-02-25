import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { PartyPopper, ArrowLeft, MapPin, Calendar, Clock, Pencil, ToggleLeft, ToggleRight, Ticket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type TicketType = { id: string; name: string; price_cents: number; quantity_total: number; max_per_user: number };
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
type BookingRow = { id: string; bookingRef: string; userId: string; totalCents: number; status: string; paidAt?: string; createdAt: string };

export default function EventManage() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const locationState = location.state as { message?: string; success?: boolean } | null;
  const [event, setEvent] = useState<EventData | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    setError("");
    Promise.all([
      vendorFetch<EventData>(`/api/listings/${listingId}/event`),
      vendorFetch<{ bookings: BookingRow[] }>(`/api/listings/${listingId}/event/bookings`),
    ])
      .then(([ev, bk]) => {
        setEvent(ev);
        setBookings(bk.bookings ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const setActive = async (active: boolean) => {
    if (!listingId || !event) return;
    setToggling(true);
    try {
      await vendorFetch(`/api/listings/${listingId}/event`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: active ? "live" : "suspended" }),
      });
      setEvent((e) => (e ? { ...e, status: active ? "live" : "suspended" } : null));
    } catch {
      setError("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (error || !event) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || "Event not found."}</p>
        <Link to="/listings" className="text-sm text-primary mt-2 inline-block hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>
    );
  }

  const isActive = event.status === "live";

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
        <span className="text-foreground font-medium">{event.name}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <PartyPopper className="h-7 w-7 text-violet-600" />
          Manage Event
        </h1>
        <Link
          to={`/listings/${listingId}/event/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-600 text-violet-700 dark:text-violet-400 text-sm font-medium hover:bg-violet-500/10 transition-colors"
        >
          <Pencil size={16} /> Edit details
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">Set active/inactive here. When <strong>Inactive</strong>, the event will not appear to users. Use <strong>Edit details</strong> to change venue, dates, or ticket types.</p>

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
                isActive ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
            {isActive ? "Event is visible and bookable." : "Event is hidden and not bookable."}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-6">
        <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3">Event details</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium text-foreground">{event.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</dt>
            <dd className="mt-1 text-foreground capitalize">{event.category}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><MapPin size={14} /> City</dt>
            <dd className="mt-1 text-foreground">{event.city}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Venue</dt>
            <dd className="mt-1 text-foreground">{event.venue_name}{event.venue_address ? ` · ${event.venue_address}` : ""}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Calendar size={14} /> Date</dt>
            <dd className="mt-1 text-foreground">{event.start_date}{event.end_date !== event.start_date ? ` – ${event.end_date}` : ""}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock size={14} /> Time</dt>
            <dd className="mt-1 text-foreground">{event.start_time} – {event.end_time}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Organizer</dt>
            <dd className="mt-1 text-foreground">{event.organizer_name}</dd>
          </div>
        </dl>
        {event.description && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</dt>
            <dd className="text-foreground text-sm">{event.description}</dd>
          </div>
        )}
        {event.ticket_types?.length > 0 && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2"><Ticket size={14} /> Ticket types (max tickets)</dt>
            <dd className="space-y-1">
              {event.ticket_types.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="text-muted-foreground">₹{(t.price_cents / 100).toLocaleString()} · {t.quantity_total} max · {t.max_per_user} per user</span>
                </div>
              ))}
            </dd>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <h2 className="font-display font-semibold text-lg text-foreground border-b border-border/50 pb-3 mb-4 flex items-center gap-2">
          <Users size={18} /> Bookings ({bookings.length})
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-medium text-muted-foreground py-2 pr-2">Ref</th>
                  <th className="text-left font-medium text-muted-foreground py-2 pr-2">Amount</th>
                  <th className="text-left font-medium text-muted-foreground py-2 pr-2">Status</th>
                  <th className="text-left font-medium text-muted-foreground py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-2 font-mono text-foreground">{b.bookingRef}</td>
                    <td className="py-2 pr-2 text-foreground">₹{(b.totalCents / 100).toLocaleString()}</td>
                    <td className="py-2 pr-2 capitalize text-foreground">{b.status}</td>
                    <td className="py-2 text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
