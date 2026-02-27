import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { mainAppFetch } from "@/lib/api";

type PayoutTransaction = {
  id: string;
  vendorId: string;
  vendorName: string;
  amountCents: number;
  status: string;
  createdAt: string;
  vendorConfirmedAt?: string;
};

function formatRupee(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function PayoutsTransactions() {
  const [transactions, setTransactions] = useState<PayoutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    mainAppFetch<{ transactions: PayoutTransaction[] }>("/api/admin/payouts/transactions")
      .then((res) => setTransactions(res.transactions ?? []))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load transactions");
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/payouts" className="text-forest-600 hover:underline">
          Payouts
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Previous transactions</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Previous transactions</h1>
        <p className="text-muted-foreground mt-1">
          All payout transactions. Status updates to &quot;Completed&quot; when the vendor confirms receipt.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-forest-50 border-b border-forest-200">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Created</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No payout transactions yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}…</td>
                      <td className="px-6 py-3.5">
                        <Link to={`/payouts/vendor/${t.vendorId}`} className="text-forest-600 hover:underline font-medium">
                          {t.vendorName}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-foreground">{formatRupee(t.amountCents)}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={
                            t.status === "completed"
                              ? "text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800"
                              : "text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800"
                          }
                        >
                          {t.status === "completed" ? "Completed" : "Pending confirmation"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(t.createdAt)}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">
                        {t.vendorConfirmedAt ? formatDate(t.vendorConfirmedAt) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
