import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DollarSign, Clock, CheckCircle, Download, Building2, ChevronRight } from "lucide-react";
import { vendorFetch } from "@/lib/api";

interface PayoutListing {
  listingId: string;
  listingName: string;
  type: string;
  totalShareCents: number;
  bookingCount: number;
}

interface PayoutTransaction {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  vendorConfirmedAt?: string;
}

function formatRevenue(cents: number): string {
  return "₹" + (cents / 100).toLocaleString("en-IN");
}

function formatType(t: string): string {
  if (!t) return "—";
  const s = t.trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function Payouts() {
  const [listings, setListings] = useState<PayoutListing[]>([]);
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const totalShareCents = listings.reduce((sum, l) => sum + (l.totalShareCents ?? 0), 0);
    const completedCents = transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amountCents, 0);
    const pendingCents = Math.max(0, totalShareCents - completedCents);
    return {
      totalShareCents,
      pendingCents,
      completedCents,
    };
  }, [listings, transactions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [listingsRes, txRes] = await Promise.all([
          vendorFetch<{ listings: PayoutListing[] }>("/api/payouts/listings"),
          vendorFetch<{ transactions: PayoutTransaction[] }>("/api/payouts/transactions").catch(() => ({ transactions: [] })),
        ]);
        if (!cancelled) {
          setListings(listingsRes.listings ?? []);
          setTransactions(txRes.transactions ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load listings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Payouts</h1>
        <p className="text-muted-foreground mt-1">Track your earnings and payment history.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Total Earnings",
            value: loading ? "—" : formatRevenue(totals.totalShareCents),
            icon: DollarSign,
            color: "bg-accent/10",
          },
          {
            label: "Pending Payout",
            value: loading ? "—" : formatRevenue(totals.pendingCents),
            icon: Clock,
            color: "bg-warning/10",
          },
          {
            label: "Completed Payouts",
            value: loading ? "—" : formatRevenue(totals.completedCents),
            icon: CheckCircle,
            color: "bg-success/10",
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
            <div className={`p-3 rounded-xl ${c.color} w-fit mb-3`}>
              <c.icon size={22} className="text-accent" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Building2 size={20} className="text-accent" />
          <h3 className="font-display font-semibold text-foreground">My Listings</h3>
        </div>
        <p className="text-sm text-muted-foreground px-6 pt-3 pb-1">Revenue and bookings per listing. Click a listing to see revenue by fleet (Bus, Car, Flight, Hotel).</p>
        {error && (
          <div className="mx-6 mt-2 rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-2">{error}</div>
        )}
        {loading ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">Loading listings…</div>
        ) : (
          <>
            <div className="overflow-x-auto min-w-0 -mx-1">
              <table className="w-full text-sm min-w-[32rem]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Listing</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Total revenue</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Bookings</th>
                    <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground w-32">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.listingId} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-foreground">{l.listingName}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-muted-foreground">{formatType(l.type)}</td>
                      <td className="px-4 sm:px-6 py-3.5 font-semibold text-foreground">{formatRevenue(l.totalShareCents)}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-muted-foreground">{l.bookingCount}</td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <Link
                          to={`/payouts/listing/${l.listingId}`}
                          className="inline-flex items-center gap-1 text-accent hover:underline font-medium text-xs"
                        >
                          View revenue
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listings.length === 0 && !error && (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">No listings yet. Add a listing to see revenue here.</div>
            )}
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Transaction History</h3>
          <button className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
            <Download size={14} /> Download
          </button>
        </div>
        <div className="overflow-x-auto min-w-0 -mx-1">
          <table className="w-full text-sm min-w-[28rem]">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">ID</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 sm:px-6 py-3 font-medium text-muted-foreground w-36">Action</th>
            </tr></thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-muted-foreground">No payout transactions yet.</td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="px-4 sm:px-6 py-3.5 font-medium text-foreground font-mono text-xs">{t.id.slice(0, 8)}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-muted-foreground">{formatDate(t.createdAt)}</td>
                    <td className="px-4 sm:px-6 py-3.5 font-semibold text-foreground">{formatRevenue(t.amountCents)}</td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {t.status === "completed" ? "Completed" : "Pending confirmation"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5">
                      {t.status === "pending_vendor_confirmation" ? (
                        <button
                          type="button"
                          disabled={confirmingId === t.id}
                          onClick={async () => {
                            setConfirmingId(t.id);
                            try {
                              await vendorFetch(`/api/payouts/transactions/${t.id}/confirm`, { method: "PATCH" });
                              const res = await vendorFetch<{ transactions: PayoutTransaction[] }>("/api/payouts/transactions");
                              setTransactions(res.transactions ?? []);
                            } catch {
                              // keep list as is
                            } finally {
                              setConfirmingId(null);
                            }
                          }}
                          className="text-xs font-medium text-accent hover:underline disabled:opacity-50"
                        >
                          {confirmingId === t.id ? "Confirming…" : "Confirm received"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
