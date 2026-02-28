import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DollarSign, Calendar, ArrowLeft } from "lucide-react";
import { vendorFetch } from "@/lib/api";

const FLEET_LABELS: Record<string, string> = {
  bus: "Bus bookings",
  car: "Car bookings",
  flight: "Flight bookings",
  hotel: "Hotel bookings",
};

interface FleetBooking {
  id: string;
  bookingRef: string;
  userName: string;
  amountCents: number;
  paidAt: string | null;
  status: string;
}

interface FleetDetail {
  fleetName: string;
  totalShareCents: number;
  bookingCount: number;
  bookings: FleetBooking[];
}

function formatRevenue(cents: number): string {
  return "₹" + (cents / 100).toLocaleString("en-IN");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function PayoutsFleetRevenue() {
  const { listingId, fleetId, entityId } = useParams<{ listingId: string; fleetId: string; entityId?: string }>();
  const decodedFleetId = fleetId ? decodeURIComponent(fleetId) : "";
  const fleetLabel = decodedFleetId ? (FLEET_LABELS[decodedFleetId] ?? decodedFleetId) : "Fleet";

  const [data, setData] = useState<FleetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId || !decodedFleetId) {
      setLoading(false);
      return;
    }
    const url = entityId
      ? `/api/payouts/listings/${listingId}/fleets/${decodedFleetId}/entity/${entityId}`
      : `/api/payouts/listings/${listingId}/fleets/${decodedFleetId}`;
    let cancelled = false;
    vendorFetch<FleetDetail>(url)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load fleet");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, decodedFleetId, entityId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/payouts" className="hover:text-foreground">Payouts</Link>
            <span>/</span>
            <Link to={`/payouts/listing/${listingId}`} className="hover:text-foreground">Listing</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{fleetLabel}</span>
          </nav>
          <h1 className="text-2xl font-display font-bold text-foreground">Fleet revenue</h1>
        </div>
        <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/payouts" className="hover:text-foreground">Payouts</Link>
            <span>/</span>
            <Link to={`/payouts/listing/${listingId}`} className="hover:text-foreground">Listing</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{fleetLabel}</span>
          </nav>
          <h1 className="text-2xl font-display font-bold text-foreground">Fleet revenue</h1>
        </div>
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error ?? "Fleet not found"}
        </div>
      </div>
    );
  }

  const { totalShareCents, bookingCount, bookings } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/payouts" className="hover:text-foreground">Payouts</Link>
          <span>/</span>
          <Link to={`/payouts/listing/${listingId}`} className="hover:text-foreground">Listing</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{data.fleetName}</span>
        </nav>
        <h1 className="text-2xl font-display font-bold text-foreground">Fleet revenue</h1>
        <p className="text-muted-foreground">Bookings and revenue from this fleet.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <div className="p-3 rounded-xl bg-accent/10 w-fit mb-3">
            <DollarSign size={22} className="text-accent" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{formatRevenue(totalShareCents)}</p>
          <p className="text-sm text-muted-foreground mt-1">Total revenue (this fleet)</p>
        </div>
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <div className="p-3 rounded-xl bg-primary/10 w-fit mb-3">
            <Calendar size={22} className="text-primary" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{bookingCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Bookings</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Bookings</h3>
          <Link
            to={`/payouts/listing/${listingId}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft size={14} /> Back to listing
          </Link>
        </div>
        {bookings.length > 0 ? (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Ref</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">User</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/50">
                    <td className="px-6 py-3.5 font-medium text-foreground whitespace-nowrap">{b.bookingRef}</td>
                    <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">{formatDate(b.paidAt)}</td>
                    <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">{b.userName}</td>
                    <td className="px-6 py-3.5 font-semibold text-foreground whitespace-nowrap">{formatRevenue(b.amountCents)}</td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status === "Paid" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">No bookings for this fleet yet.</div>
        )}
      </div>
    </div>
  );
}
