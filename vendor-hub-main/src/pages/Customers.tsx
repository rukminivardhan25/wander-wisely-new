import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { vendorFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type CustomerRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  totalBookings: number;
  lastBookingAt: string | null;
  totalSpentCents: number;
};

function formatLastBooking(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatSpent(cents: number): string {
  const rupees = cents / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(rupees);
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async (sync: boolean) => {
    if (sync) setSyncing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = sync ? "/api/customers?sync=1" : "/api/customers";
      const data = await vendorFetch<{ customers: CustomerRow[] }>(url);
      setCustomers(data.customers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">View your customer base and booking history.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl shrink-0"
          disabled={syncing || loading}
          onClick={() => load(true)}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Refresh from bookings"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && !syncing ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center text-muted-foreground">
          Loading customers…
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Total Bookings</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Last Booking</th>
                <th className="text-right px-6 py-3 font-medium text-muted-foreground">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No customers yet. Use “Refresh from bookings” to sync customers from your bus, car, and flight bookings (last 12 months).
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground text-xs font-semibold">
                          {c.name
                            .trim()
                            .split(/\s+/)
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "?"}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.email && c.email !== "—" && (
                            <span className="block text-xs text-muted-foreground">{c.email}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-foreground">{c.totalBookings}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{formatLastBooking(c.lastBookingAt)}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-foreground">{formatSpent(c.totalSpentCents)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
