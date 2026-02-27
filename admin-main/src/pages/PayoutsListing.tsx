import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { IndianRupee, Send, Wallet, ChevronRight, Bus, Calendar } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { mainAppFetch } from "@/lib/api";

type FleetRow = {
  fleetId: string;
  fleetName: string;
  totalEarnedCents: number;
  paidToVendorCents: number;
  pendingCents: number;
  entityId?: string;
  entityName?: string;
};

type ListingDetailResponse = {
  listingName: string;
  totalShareCents: number;
  fleets: FleetRow[];
}

type EntityFleetRow = {
  fleetId: string;
  fleetName: string;
  entityId: string;
  entityName: string;
  totalEarnedCents: number;
  paidToVendorCents: number;
  pendingCents: number;
  bookingCount: number;
};

function formatRupee(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

export function PayoutsListing() {
  const { vendorId, listingId } = useParams<{ vendorId: string; listingId: string }>();
  const [data, setData] = useState<ListingDetailResponse | null>(null);
  const [entityFleets, setEntityFleets] = useState<EntityFleetRow[]>([]);
  const [vendorName, setVendorName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId || !listingId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      mainAppFetch<{ vendorName: string | null }>(`/api/admin/payouts/vendors/${vendorId}/listings`).then((r) => r.vendorName ?? "Vendor"),
      mainAppFetch<ListingDetailResponse>(`/api/admin/payouts/vendors/${vendorId}/listings/${listingId}`),
      mainAppFetch<{ fleets: EntityFleetRow[] }>(`/api/admin/payouts/vendors/${vendorId}/listings/${listingId}/entity-fleets`),
    ])
      .then(([name, detail, entityRes]) => {
        setVendorName(name);
        setData(detail);
        setEntityFleets(entityRes.fleets ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load listing");
        setData(null);
        setEntityFleets([]);
      })
      .finally(() => setLoading(false));
  }, [vendorId, listingId]);

  if (!vendorId || !listingId) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Missing vendor or listing.</p>
        <Link to="/payouts" className="text-forest-600 hover:underline">← Back to Payouts</Link>
      </div>
    );
  }

  const fleets = entityFleets;
  const hasFleet = fleets.length > 0;

  // Use only PAID amounts for revenue: derive from per-fleet vendor share
  const totalVendorPaidCents = fleets.reduce((sum, f) => sum + (f.paidToVendorCents ?? 0), 0);
  const totalCollectedCents = totalVendorPaidCents > 0 ? Math.round(totalVendorPaidCents / 0.9) : 0;
  const adminKeptCents = totalCollectedCents - totalVendorPaidCents;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/payouts" className="text-forest-600 hover:underline">Payouts</Link>
        <ChevronRight size={16} />
        <Link to={`/payouts/vendor/${vendorId}`} className="text-forest-600 hover:underline">{vendorName}</Link>
        <ChevronRight size={16} />
        <span className="text-foreground font-medium">{data?.listingName ?? listingId}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">{data?.listingName ?? listingId}</h1>
        <p className="text-muted-foreground mt-1">
          {hasFleet
            ? "Fleets under this company (buses, cars, flights, hotel branches). Click a fleet to see its bookings."
            : "This listing has no fleet. Experiences and events are listing types with no fleet; only transport/hotel listings have fleets."}
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard title="Total collected (this listing)" value={formatRupee(Math.round(totalCollectedCents))} icon={Wallet} />
            <MetricCard title="Admin share (10%)" value={formatRupee(adminKeptCents)} icon={IndianRupee} />
            <MetricCard title="Vendor share (90%)" value={formatRupee(totalVendorPaidCents)} icon={Send} iconBg="bg-forest-100" />
          </div>

          {hasFleet ? (
            <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
                <Bus size={20} className="text-forest-600" />
                <span className="font-semibold text-foreground">Fleets (vehicles / branches)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-forest-50 border-b border-forest-200">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Fleet</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Already paid</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor share (90%)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Admin share (10%)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Bookings</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest-200">
                    {fleets.map((f) => (
                      <tr key={`${f.fleetId}-${f.entityId}`} className="hover:bg-forest-50/50 transition-colors group">
                        <td className="px-6 py-3.5 font-medium text-foreground">
                          <Link
                            to={`/payouts/vendor/${vendorId}/listing/${listingId}/fleet/${f.fleetId}/entity/${f.entityId}`}
                            className="text-forest-600 hover:text-forest-700 hover:underline inline-flex items-center gap-1"
                          >
                            {f.fleetName} – {f.entityName}
                            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        {/* Already paid: gross paid amount */}
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">
                          {formatRupee(Math.round((f.paidToVendorCents ?? 0) / 0.9))}
                        </td>
                        {/* Vendor share on paid */}
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(f.paidToVendorCents)}</td>
                        {/* Admin share on paid */}
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">
                          {formatRupee(Math.round((f.paidToVendorCents ?? 0) / 0.9 * 0.1))}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{f.bookingCount}</td>
                        <td className="px-6 py-3.5">
                          <Link
                            to={`/payouts/vendor/${vendorId}/listing/${listingId}/fleet/${f.fleetId}/entity/${f.entityId}`}
                            className="text-sm text-forest-600 hover:underline"
                          >
                            View bookings
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
                <Calendar size={20} className="text-forest-600" />
                <span className="font-semibold text-foreground">Bookings (under this company)</span>
              </div>
              <div className="px-6 py-8 text-center text-muted-foreground">This listing has no fleet (no buses, cars, flights, or hotel branches). Experience and event listings do not have a fleet.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
