import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IndianRupee, Send, Wallet, Eye, CreditCard, Clock, CheckCircle } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { mainAppFetch, vendorHubFetch } from "@/lib/api";

type PayoutSummary = {
  totalCollectedCents: number;
  adminShareCents: number;
  vendorShareCents?: number;
  totalPendingToVendorsCents: number;
  totalPaidToVendorsCents?: number;
  awaitingVendorConfirmationCents?: number;
};

type PayoutVendor = {
  vendorId: string;
  vendorName: string;
  totalListings: number;
  totalEarnedCents: number;
  paidToVendorCents: number;
  pendingCents: number;
};

function formatRupee(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

export function Payouts() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [vendors, setVendors] = useState<PayoutVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentGatewayVendor, setPaymentGatewayVendor] = useState<PayoutVendor | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentAmountError, setPaymentAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentGatewayVendor) {
      setPaymentAmountInput(String(paymentGatewayVendor.pendingCents));
      setPaymentAmountError(null);
    } else {
      setPaymentAmountInput("");
      setPaymentAmountError(null);
    }
  }, [paymentGatewayVendor]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      mainAppFetch<PayoutSummary>("/api/admin/payouts/summary"),
      mainAppFetch<{ vendors: PayoutVendor[] }>("/api/admin/payouts/vendors").catch(() => ({ vendors: [] as PayoutVendor[] })),
      mainAppFetch<{ counts: Record<string, number> }>("/api/admin/payouts/listing-counts").catch(() => ({ counts: {} })),
      vendorHubFetch<{ vendors: { id: string; name: string }[] }>("/api/admin/vendors").catch(() => ({ vendors: [] as { id: string; name: string }[] })),
    ])
      .then(([s, payoutRes, countRes, hubRes]) => {
        setSummary(s);
        const payoutMap = new Map<string, PayoutVendor>();
        (payoutRes.vendors ?? []).forEach((v) => payoutMap.set(v.vendorId, { ...v, totalListings: v.totalListings ?? 0 }));
        const listingCounts = countRes.counts ?? {};
        const hubVendors = hubRes.vendors ?? [];
        const merged: PayoutVendor[] =
          hubVendors.length > 0
            ? hubVendors.map((v) => {
                const p = payoutMap.get(v.id);
                const totalListings = listingCounts[v.id] ?? p?.totalListings ?? 0;
                return (
                  p
                    ? { ...p, totalListings }
                    : {
                        vendorId: v.id,
                        vendorName: v.name,
                        totalListings,
                        totalEarnedCents: 0,
                        paidToVendorCents: 0,
                        pendingCents: 0,
                      }
                );
              })
            : Array.from(payoutMap.values()).map((p) => ({
                ...p,
                totalListings: listingCounts[p.vendorId] ?? p.totalListings ?? 0,
              }));
        setVendors(merged);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load payouts");
        setSummary(null);
        setVendors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vendor payouts</h1>
        <p className="text-muted-foreground mt-1">
          Admin receives payments from users. 90% is given to the vendor and 10% is admin commission. Transfer the vendor share to each vendor here.
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Total collected (from users)"
              value={summary ? formatRupee(summary.totalCollectedCents) : "—"}
              icon={Wallet}
            />
            <MetricCard
              title="Admin share (10%)"
              value={summary ? formatRupee(summary.adminShareCents) : "—"}
              icon={IndianRupee}
            />
            <MetricCard
              title="Total vendor share (90%)"
              value={summary ? formatRupee(summary.vendorShareCents ?? (summary.totalCollectedCents - summary.adminShareCents)) : "—"}
              icon={Send}
              iconBg="bg-forest-100"
            />
            <MetricCard
              title="Total pending to vendors"
              value={summary ? formatRupee(summary.totalPendingToVendorsCents ?? 0) : "—"}
              icon={Send}
              iconBg="bg-amber-100"
            />
            <MetricCard
              title="Total paid to vendors"
              value={summary ? formatRupee(summary.totalPaidToVendorsCents ?? 0) : "—"}
              icon={CheckCircle}
              iconBg="bg-emerald-100"
            />
            <MetricCard
              title="Awaiting vendor confirmation"
              value={summary ? formatRupee(summary.awaitingVendorConfirmationCents ?? 0) : "—"}
              icon={Clock}
              iconBg="bg-sky-100"
            />
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/payouts/transactions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-forest-200 text-forest-700 hover:bg-forest-50 font-medium text-sm"
            >
              Previous transactions
            </Link>
          </div>

          <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
              <Send size={20} className="text-forest-600" />
              <span className="font-semibold text-foreground">Payout by vendor</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-forest-50 border-b border-forest-200">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Total listings</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">User paid</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Admin share</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor share</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Pending payment</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Payment done</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-200">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-muted-foreground">
                        No vendors found. Ensure partner portal is running and vendors are registered.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((p) => {
                      const userPaidCents = p.totalEarnedCents > 0 ? Math.round(p.totalEarnedCents / 0.9) : 0;
                      const adminShareCents = Math.round(userPaidCents * 0.1);
                      return (
                      <tr key={p.vendorId} className="hover:bg-forest-50/50 transition-colors group">
                        <td className="px-6 py-3.5 text-sm font-mono text-muted-foreground">{p.vendorId}</td>
                        <td className="px-6 py-3.5 font-medium text-foreground">{p.vendorName}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{p.totalListings}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(userPaidCents)}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(adminShareCents)}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(p.totalEarnedCents)}</td>
                        <td className="px-6 py-3.5 font-medium text-foreground">{formatRupee(p.pendingCents)}</td>
                        <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatRupee(p.paidToVendorCents)}</td>
                        <td className="px-6 py-3.5 flex items-center gap-2">
                          <Link
                            to={`/payouts/vendor/${p.vendorId}`}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-forest-200 text-forest-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
                            title="View companies / listings"
                          >
                            <Eye size={18} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPaymentGatewayVendor(p)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-forest-200 text-forest-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
                            title="Open payment gateway"
                          >
                            <CreditCard size={18} />
                          </button>
                        </td>
                      </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {paymentGatewayVendor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setPaymentGatewayVendor(null); setPaymentAmountError(null); setPaymentAmountInput(""); }}>
              <div className="bg-card rounded-2xl border border-forest-200 shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={24} className="text-forest-600" />
                  <h3 className="text-lg font-semibold text-foreground">Payment gateway</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Transfer vendor share to:</p>
                <p className="font-medium text-foreground mb-1">{paymentGatewayVendor.vendorName}</p>
                <p className="text-xs font-mono text-muted-foreground mb-4">{paymentGatewayVendor.vendorId}</p>
                <div className="rounded-lg bg-forest-50 border border-forest-200 p-3 mb-2">
                  <label className="text-xs text-muted-foreground block mb-1">Amount to pay (vendor share 90%)</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-foreground">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={paymentAmountInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setPaymentAmountInput(raw);
                        setPaymentAmountError(null);
                      }}
                      className="flex-1 min-w-[120px] text-xl font-bold text-foreground bg-transparent border border-forest-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                  <p className="text-sm text-foreground mt-1.5 font-medium">
                    = {formatRupee(parseInt(paymentAmountInput || "0", 10))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Digits only (amount in paise).</p>
                </div>
                {paymentAmountError && (
                  <p className="text-sm text-red-600 mb-3" role="alert">{paymentAmountError}</p>
                )}
                <p className="text-xs text-muted-foreground mb-4">
                  Mock payment. Integrate your payment provider (Razorpay, Stripe, etc.) here.
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Link
                    to="/payouts/transactions"
                    onClick={() => setPaymentGatewayVendor(null)}
                    className="text-sm font-medium text-forest-600 hover:underline"
                  >
                    Previous transactions
                  </Link>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setPaymentGatewayVendor(null); setPaymentAmountError(null); setPaymentAmountInput(""); }}
                    className="px-4 py-2 rounded-lg border border-forest-200 text-foreground hover:bg-forest-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-forest-600 text-white hover:bg-forest-700 font-medium"
                    onClick={async () => {
                      const raw = paymentAmountInput.replace(/\D/g, "");
                      if (raw !== paymentAmountInput) {
                        setPaymentAmountError("Invalid amount. Enter digits only.");
                        return;
                      }
                      const amountCents = parseInt(raw, 10) || 0;
                      if (amountCents <= 0) {
                        setPaymentAmountError("Enter a valid amount (digits only).");
                        return;
                      }
                      if (paymentGatewayVendor.pendingCents > 0 && amountCents > paymentGatewayVendor.pendingCents) {
                        setPaymentAmountError(`Amount cannot exceed pending (${formatRupee(paymentGatewayVendor.pendingCents)}).`);
                        return;
                      }
                      setPaymentAmountError(null);
                      try {
                        await mainAppFetch("/api/admin/payouts/transactions", {
                          method: "POST",
                          body: JSON.stringify({
                            vendorId: paymentGatewayVendor.vendorId,
                            amountCents,
                          }),
                        });
                        setPaymentGatewayVendor(null);
                        setPaymentAmountInput("");
                        const [s, payoutRes, countRes, hubRes] = await Promise.all([
                          mainAppFetch<PayoutSummary>("/api/admin/payouts/summary"),
                          mainAppFetch<{ vendors: PayoutVendor[] }>("/api/admin/payouts/vendors").catch(() => ({ vendors: [] as PayoutVendor[] })),
                          mainAppFetch<{ counts: Record<string, number> }>("/api/admin/payouts/listing-counts").catch(() => ({ counts: {} })),
                          vendorHubFetch<{ vendors: { id: string; name: string }[] }>("/api/admin/vendors").catch(() => ({ vendors: [] as { id: string; name: string }[] })),
                        ]);
                        setSummary(s);
                        const payoutMap = new Map<string, PayoutVendor>();
                        (payoutRes.vendors ?? []).forEach((v) => payoutMap.set(v.vendorId, { ...v, totalListings: v.totalListings ?? 0 }));
                        const listingCounts = countRes.counts ?? {};
                        const hubVendors = hubRes.vendors ?? [];
                        const merged: PayoutVendor[] =
                          hubVendors.length > 0
                            ? hubVendors.map((v) => {
                                const p = payoutMap.get(v.id);
                                const totalListings = listingCounts[v.id] ?? p?.totalListings ?? 0;
                                return p ? { ...p, totalListings } : { vendorId: v.id, vendorName: v.name, totalListings, totalEarnedCents: 0, paidToVendorCents: 0, pendingCents: 0 };
                              })
                            : Array.from(payoutMap.values()).map((p) => ({ ...p, totalListings: listingCounts[p.vendorId] ?? p.totalListings ?? 0 }));
                        setVendors(merged);
                      } catch (e) {
                        console.error(e);
                        setPaymentAmountError("Payment failed. Try again.");
                      }
                    }}
                  >
                    Proceed to pay
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
