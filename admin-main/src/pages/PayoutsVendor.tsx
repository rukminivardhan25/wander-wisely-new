import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { IndianRupee, Send, Wallet, ChevronRight, Building2 } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { mainAppFetch } from "@/lib/api";

type ListingRow = { listingId: string; listingName: string; totalShareCents: number };

type VendorListingsResponse = { vendorName: string | null; listings: ListingRow[] };

function formatRupee(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

export function PayoutsVendor() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [data, setData] = useState<VendorListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    mainAppFetch<VendorListingsResponse>(`/api/admin/payouts/vendors/${vendorId}/listings`)
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load vendor listings");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  const vendorName = data?.vendorName ?? "Vendor";
  const listings = data?.listings ?? [];
  const totalVendorShareCents = listings.reduce((s, l) => s + l.totalShareCents, 0);
  const totalCollectedCents = totalVendorShareCents > 0 ? Math.round(totalVendorShareCents / 0.9) : 0;
  const adminKeptCents = totalCollectedCents - totalVendorShareCents;

  if (!vendorId) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Missing vendor.</p>
        <Link to="/payouts" className="text-forest-600 hover:underline">← Back to Payouts</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/payouts" className="text-forest-600 hover:underline">Payouts</Link>
        <ChevronRight size={16} />
        <span className="text-foreground font-medium">{vendorName}</span>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">{vendorName}</h1>
        <p className="text-muted-foreground mt-1">
          Companies / listings for this vendor. Total share only. Click a listing to see fleets and bookings.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard title="Total collected (this vendor)" value={formatRupee(totalCollectedCents)} icon={Wallet} />
            <MetricCard title="Admin share (10%)" value={formatRupee(adminKeptCents)} icon={IndianRupee} />
            <MetricCard title="Vendor share (90%)" value={formatRupee(totalVendorShareCents)} icon={Send} iconBg="bg-forest-100" />
          </div>

          <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
              <Building2 size={20} className="text-forest-600" />
              <span className="font-semibold text-foreground">Companies / Listings</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-forest-50 border-b border-forest-200">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Company / Listing</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor share (90%)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Admin share (10%)</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-200">
                  {listings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No listings.</td>
                    </tr>
                  ) : (
                    listings.map((l) => (
                      <tr key={l.listingId} className="hover:bg-forest-50/50 transition-colors group">
                        <td className="px-6 py-3.5 font-medium text-foreground">
                          <Link
                            to={`/payouts/vendor/${vendorId}/listing/${l.listingId}`}
                            className="text-forest-600 hover:text-forest-700 hover:underline inline-flex items-center gap-1"
                          >
                            {l.listingName}
                            <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(l.totalShareCents)}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">
                          {formatRupee(Math.round(l.totalShareCents / 9))}
                        </td>
                        <td className="px-6 py-3.5">
                          <Link
                            to={`/payouts/vendor/${vendorId}/listing/${l.listingId}`}
                            className="text-sm text-forest-600 hover:underline"
                          >
                            View fleets & bookings
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
