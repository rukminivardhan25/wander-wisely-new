import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { IndianRupee, Send, Wallet, ChevronRight, Calendar } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { mainAppFetch } from "@/lib/api";

type FleetSummary = {
  fleetName: string;
  totalEarnedCents: number;
  paidToVendorCents: number;
  pendingCents: number;
  vendorName: string | null;
  listingName: string | null;
};

type BookingRow = {
  id: string;
  booking_ref: string;
  user_name: string;
  amount_cents: number;
  paid_at: string | null;
  status: string;
};

function formatRupee(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function PayoutsFleet() {
  const { vendorId, listingId, fleetId, entityId } = useParams<{ vendorId: string; listingId: string; fleetId: string; entityId?: string }>();
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId || !listingId || !fleetId) return;
    setLoading(true);
    setError(null);
    const summaryPath = entityId
      ? `/api/admin/payouts/vendors/${vendorId}/listings/${listingId}/fleets/${fleetId}/entity/${entityId}`
      : `/api/admin/payouts/vendors/${vendorId}/listings/${listingId}/fleets/${fleetId}`;
    const bookingsPath = entityId
      ? `/api/admin/payouts/vendors/${vendorId}/listings/${listingId}/fleets/${fleetId}/entity/${entityId}/bookings`
      : `/api/admin/payouts/vendors/${vendorId}/listings/${listingId}/fleets/${fleetId}/bookings`;
    Promise.all([
      mainAppFetch<FleetSummary>(summaryPath),
      mainAppFetch<{ bookings: BookingRow[] }>(bookingsPath),
    ])
      .then(([s, b]) => {
        setSummary(s);
        setBookings(b.bookings ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load fleet");
        setSummary(null);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, [vendorId, listingId, fleetId]);

  if (!vendorId || !listingId || !fleetId) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Missing vendor, listing, or fleet.</p>
        <Link to="/payouts" className="text-forest-600 hover:underline">← Back to Payouts</Link>
      </div>
    );
  }

  const vendorName = summary?.vendorName ?? "Vendor";
  const listingName = summary?.listingName ?? listingId;
  const fleetName = summary?.fleetName ?? `${fleetId} bookings`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/payouts" className="text-forest-600 hover:underline">Payouts</Link>
        <ChevronRight size={16} />
        <Link to={`/payouts/vendor/${vendorId}`} className="text-forest-600 hover:underline">{vendorName}</Link>
        <ChevronRight size={16} />
        <Link to={`/payouts/vendor/${vendorId}/listing/${listingId}`} className="text-forest-600 hover:underline">{listingName}</Link>
        <ChevronRight size={16} />
        <span className="text-foreground font-medium">{fleetName}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">{fleetName}</h1>
        <p className="text-muted-foreground mt-1">
          Bookings and payout summary for this fleet ({listingName}, {vendorName}).
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard title="Total collected (this fleet)" value={formatRupee(Math.round(summary.totalEarnedCents / 0.9))} icon={Wallet} />
            <MetricCard title="Admin share (10%)" value={formatRupee(Math.round(summary.totalEarnedCents / 0.9 * 0.1))} icon={IndianRupee} />
          </div>

          <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
              <Calendar size={20} className="text-forest-600" />
              <span className="font-semibold text-foreground">Bookings</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-forest-50 border-b border-forest-200">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Booking ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">User</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Paid at</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-200">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No bookings.</td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-forest-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-foreground">{b.booking_ref}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{b.user_name}</td>
                        <td className="px-6 py-3.5 font-medium text-foreground">{formatRupee(b.amount_cents)}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(b.paid_at)}</td>
                        <td className="px-6 py-3.5">
                          {b.status === "Paid" ? (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-forest-100 text-forest-600">Paid</span>
                          ) : (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">Fleet not found or has no data.</div>
      )}
    </div>
  );
}
