import { useState, useEffect } from "react";
import { Calendar, CreditCard, IndianRupee } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { mainAppFetch } from "@/lib/api";

type BookingRow = {
  id: string;
  type: string;
  bookingRef: string;
  userName: string;
  vendorName: string;
  amountCents: number;
  paid: boolean;
  paidAt: string | null;
};

type AdminBookingsResponse = {
  bookings: BookingRow[];
  totalPaidCents: number;
  adminShareCents: number;
  vendorShareCents: number;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function Bookings() {
  const [data, setData] = useState<AdminBookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    mainAppFetch<AdminBookingsResponse>("/api/admin/bookings")
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load bookings");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const bookings = data?.bookings ?? [];
  const totalPaidCents = data?.totalPaidCents ?? 0;
  const adminShareCents = data?.adminShareCents ?? 0;
  const vendorShareCents = data?.vendorShareCents ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground mt-1">
          All bookings. When users make payments, the amount is collected by admin; 90% is paid to the vendor and 10% is admin commission.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total paid by users" value={`₹${(totalPaidCents / 100).toLocaleString("en-IN")}`} icon={IndianRupee} />
        <MetricCard title="Admin share (10%)" value={`₹${(adminShareCents / 100).toLocaleString("en-IN")}`} icon={CreditCard} />
        <MetricCard title="Vendor share (90%)" value={`₹${(vendorShareCents / 100).toLocaleString("en-IN")}`} icon={IndianRupee} iconBg="bg-forest-100" />
      </div>

      <div className="bg-card rounded-2xl border border-forest-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-200 flex items-center gap-2">
          <Calendar size={20} className="text-forest-600" />
          <span className="font-semibold text-foreground">All bookings</span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-forest-50 border-b border-forest-200">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Booking ID</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">User</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Payment</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3.5">Paid at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-200">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={`${b.type}-${b.id}`} className="hover:bg-forest-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-foreground">{b.bookingRef}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{b.type}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{b.userName}</td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{b.vendorName}</td>
                      <td className="px-6 py-3.5 font-medium text-foreground">₹{(b.amountCents / 100).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-3.5">
                        {b.paid ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-forest-100 text-forest-600">Paid</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground">{formatDate(b.paidAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
