import { useState, useEffect } from "react";
import { Users, Building2, ShieldCheck, FileCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { adminFetch } from "@/lib/api";

type DashboardStats = {
  totalVendors: number;
  totalListings: number;
  pendingVerification: number;
  verifiedToday: number;
};

const metricsConfig = [
  { key: "totalVendors" as const, title: "Total Vendors", icon: Users },
  { key: "totalListings" as const, title: "Total Listings", icon: Building2 },
  { key: "pendingVerification" as const, title: "Pending Verification", icon: ShieldCheck },
  { key: "verifiedToday" as const, title: "Verified Today", icon: FileCheck },
];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminFetch<DashboardStats>("/api/dashboard/stats")
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load stats");
        setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Overview of admin activity.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsConfig.map((m) => (
          <MetricCard
            key={m.key}
            title={m.title}
            value={loading ? "…" : stats != null ? String(stats[m.key]) : "—"}
            icon={m.icon}
          />
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-forest-200 border-l-4 border-l-forest-500 p-4 sm:p-6 shadow-card">
        <h2 className="font-semibold text-foreground mb-2">Quick actions</h2>
        <p className="text-sm text-muted-foreground">Use the Verification page to review and approve or reject pending requests.</p>
      </div>
    </div>
  );
}
