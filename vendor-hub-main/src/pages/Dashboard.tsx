import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListPlus, CalendarCheck, DollarSign, Star, PlusCircle, Camera, Tag } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { motion } from "framer-motion";
import { useVendorAuth } from "@/hooks/useVendorAuth";
import { vendorFetch } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

type DashboardSummary = {
  totalListings: number;
  totalBookings: number;
  totalRevenueCents: number;
  averageRating: number;
  reviewCount: number;
  recentBookings: {
    id: string;
    ref: string;
    service: string;
    date: string;
    status: string;
    amountCents: number;
  }[];
};

type PayoutListing = {
  listingId: string;
  listingName: string;
  type: string;
  totalShareCents: number;
  bookingCount: number;
};

const statusStyles: Record<string, string> = {
  Confirmed: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Completed: "bg-info/10 text-info",
  Cancelled: "bg-destructive/10 text-destructive",
  Rejected: "bg-destructive/10 text-destructive",
};

function formatRupee(cents: number): string {
  return "₹" + (cents / 100).toLocaleString("en-IN");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

const quickActions = [
  { label: "Add New Listing", icon: PlusCircle, path: "/add-listing" },
  { label: "My Listings", icon: Camera, path: "/listings" },
  { label: "Create Promotion", icon: Tag, path: "/promotions" },
];

export default function Dashboard() {
  const { vendor } = useVendorAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [topListings, setTopListings] = useState<PayoutListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, payoutsRes] = await Promise.all([
          vendorFetch<DashboardSummary>("/api/dashboard/summary"),
          vendorFetch<{ listings: PayoutListing[] }>("/api/payouts/listings").catch(() => ({ listings: [] })),
        ]);
        if (!cancelled) {
          setSummary(summaryRes);
          const list = (payoutsRes.listings ?? []).filter((l) => l.bookingCount > 0 || l.totalShareCents > 0);
          list.sort((a, b) => b.totalShareCents - a.totalShareCents || b.bookingCount - a.bookingCount);
          setTopListings(list.slice(0, 8));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-4rem)] min-h-0">
      <div className="space-y-8">
        {/* Page title – on the screen, not in a card */}
        <header className="pb-2">
          <motion.h1
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-display font-bold text-foreground"
          >
            Welcome back, {vendor?.name ?? "Vendor"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-muted-foreground mt-0.5"
          >
            Here's what's happening with your business today. All data is live from your listings and bookings.
          </motion.p>
        </header>

        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Stats: single strip on the page */}
        <section aria-label="Overview">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Total Listings", value: loading ? "—" : String(summary?.totalListings ?? 0), icon: ListPlus },
              { title: "Total Bookings", value: loading ? "—" : (summary?.totalBookings ?? 0).toLocaleString("en-IN"), icon: CalendarCheck },
              { title: "Revenue (vendor share)", value: loading ? "—" : formatRupee(summary?.totalRevenueCents ?? 0), icon: DollarSign },
              { title: "Average Rating", value: loading ? "—" : (summary?.averageRating ? `${summary.averageRating} (${summary.reviewCount} reviews)` : "—"), icon: Star },
            ].map((m, i) => (
              <motion.div key={m.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                <MetricCard title={m.title} value={m.value} icon={m.icon} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Analytics: one section, two charts */}
        <section aria-label="Analytics">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Analytics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-xl border border-border/40 bg-card/50 p-5 min-w-0 overflow-hidden"
            >
              <h3 className="text-base font-semibold text-foreground mb-3">Bookings This Week</h3>
              <div className="overflow-hidden min-w-0" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={(() => {
                    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
                    (summary?.recentBookings ?? []).forEach((b) => {
                      const d = new Date(b.date + "T12:00:00");
                      const dayIndex = d.getDay();
                      if (dayIndex >= 0 && dayIndex <= 6) counts[dayIndex]++;
                    });
                    return dayLabels.map((day, i) => ({ day, bookings: counts[i] }));
                  })()}
                >
                  <defs>
                    <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="bookings" stroke="hsl(43, 74%, 49%)" fill="url(#viewsGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="rounded-xl border border-border/40 bg-card/50 p-5 min-w-0 overflow-hidden"
            >
              <h3 className="text-base font-semibold text-foreground mb-3">Revenue by Listing</h3>
              <div className="overflow-hidden min-w-0" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={(topListings ?? []).slice(0, 6).map((l) => ({ name: l.listingName.length > 12 ? l.listingName.slice(0, 12) + "…" : l.listingName, revenue: l.totalShareCents / 100 }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={44} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <Tooltip formatter={(v: number) => [`₹${(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]} labelFormatter={(l) => l} />
                  <Bar dataKey="revenue" fill="hsl(222, 47%, 14%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main content: Recent Bookings + right column as one layout */}
        <section aria-label="Activity" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings – table on the page */}
          <div className="lg:col-span-2 rounded-xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recent Bookings</h2>
              <Link to="/bookings" className="text-sm font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            <div className="min-w-0">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[28%]" />
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Booking ref</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">Loading…</td>
                    </tr>
                  ) : (summary?.recentBookings?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">No bookings yet.</td>
                    </tr>
                  ) : (
                    summary?.recentBookings?.map((b) => (
                      <tr key={b.id} className="border-b border-border/30 hover:bg-muted/15 transition-colors">
                        <td className="px-5 py-3 font-medium text-foreground font-mono text-xs break-all">{b.ref}</td>
                        <td className="px-5 py-3 text-foreground text-xs break-words">{b.service}</td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(b.date)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[b.status] ?? "bg-muted text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-foreground text-xs">{formatRupee(b.amountCents)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column: Quick Actions + Top Listings in one panel */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-3">Quick Actions</h2>
              <div className="space-y-1.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      to={action.path}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="p-1.5 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                        <Icon size={16} className="text-accent" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{action.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 p-3.5 rounded-lg vendor-gradient">
                <p className="text-primary-foreground font-display font-semibold text-xs">Boost Your Visibility</p>
                <p className="text-primary-foreground/70 text-xs mt-0.5">Create a promotion to reach more customers.</p>
                <Link
                  to="/promotions"
                  className="mt-2.5 inline-block px-3 py-1.5 rounded-md gold-gradient text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Create Offer
                </Link>
              </div>
            </div>

            <div className="border-t border-border/50 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">Top Listings (by revenue)</h3>
                <Link to="/listings" className="text-xs font-medium text-accent hover:underline">
                  All
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : topListings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                <div className="space-y-2 -mx-1 px-1">
                  {topListings.map((l, i) => (
                    <Link
                      key={l.listingId}
                      to={`/listings/${l.listingId}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-7 h-7 rounded-md vendor-gradient flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground text-sm truncate min-w-0">{l.listingName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground whitespace-nowrap">{l.bookingCount}</span>
                        <span className="font-semibold text-foreground whitespace-nowrap">{formatRupee(l.totalShareCents)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
