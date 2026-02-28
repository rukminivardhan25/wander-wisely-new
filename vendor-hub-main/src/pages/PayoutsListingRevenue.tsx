import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, Calendar, Bus, Car, Plane, Building2, ChevronRight } from "lucide-react";
import { vendorFetch } from "@/lib/api";

const FLEET_ICONS: Record<string, typeof Bus> = {
  bus: Bus,
  car: Car,
  flight: Plane,
  hotel: Building2,
};

interface FleetRow {
  fleetId: string;
  fleetName: string;
  entityId?: string;
  entityName?: string;
  totalShareCents: number;
  bookingCount: number;
}

interface ListingDetail {
  listingName: string;
  type: string;
  totalShareCents: number;
  bookingCount: number;
  pendingCents: number;
  fleets: FleetRow[];
}

function formatRevenue(cents: number): string {
  return "₹" + (cents / 100).toLocaleString("en-IN");
}

export default function PayoutsListingRevenue() {
  const { listingId } = useParams<{ listingId: string }>();
  const [data, setData] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    vendorFetch<ListingDetail>(`/api/payouts/listings/${listingId}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load listing");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const listingName = data?.listingName ?? "Listing";
  const fleets = data?.fleets ?? [];
  const hasFleets = fleets.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/payouts" className="hover:text-foreground">Payouts</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">…</span>
          </nav>
          <h1 className="text-2xl font-display font-bold text-foreground">Revenue by listing</h1>
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
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{listingId}</span>
          </nav>
          <h1 className="text-2xl font-display font-bold text-foreground">Revenue by listing</h1>
        </div>
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error ?? "Listing not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/payouts" className="hover:text-foreground">Payouts</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">{listingName}</span>
        </nav>
        <h1 className="text-2xl font-display font-bold text-foreground">Revenue by listing</h1>
        <p className="text-muted-foreground">Earnings and bookings for this listing. Drill into a fleet to see individual bookings.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <div className="p-3 rounded-xl bg-accent/10 w-fit mb-3">
            <DollarSign size={22} className="text-accent" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{formatRevenue(data.totalShareCents)}</p>
          <p className="text-sm text-muted-foreground mt-1">Total revenue (this listing)</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <div className="p-3 rounded-xl bg-primary/10 w-fit mb-3">
            <Calendar size={22} className="text-primary" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{data.bookingCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Total bookings</p>
        </motion.div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Revenue by fleet</h3>
          <p className="text-sm text-muted-foreground mt-1">All buses, cars, flights, and hotel branches for this listing. Click one to see its bookings.</p>
        </div>
        {hasFleets ? (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Fleet</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Total revenue</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">Bookings</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground w-32 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {fleets.map((f) => {
                  const Icon = FLEET_ICONS[f.fleetId] ?? Building2;
                  const displayName = f.entityName ?? f.fleetName;
                  const rowKey = f.entityId ? `${f.fleetId}-${f.entityId}` : f.fleetId;
                  const viewUrl = f.entityId
                    ? `/payouts/listing/${listingId}/fleet/${f.fleetId}/entity/${f.entityId}`
                    : `/payouts/listing/${listingId}/fleet/${f.fleetId}`;
                  return (
                    <tr key={rowKey} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2 font-medium text-foreground">
                          <Icon size={18} className="text-muted-foreground" />
                          {f.entityId ? `${f.fleetName} – ${displayName}` : displayName}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-foreground whitespace-nowrap">{formatRevenue(f.totalShareCents)}</td>
                      <td className="px-6 py-3.5 text-muted-foreground whitespace-nowrap">{f.bookingCount}</td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <Link
                          to={viewUrl}
                          className="inline-flex items-center gap-1 text-accent hover:underline font-medium text-xs"
                        >
                          View details
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            This listing has no fleets (e.g. experience or event). Revenue from this listing appears in your total payouts.
          </div>
        )}
      </div>
    </div>
  );
}
