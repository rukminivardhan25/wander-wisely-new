import { Users, Building2, ShieldCheck, FileCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

const metrics = [
  { title: "Total Vendors", value: "—", icon: Users },
  { title: "Total Listings", value: "—", icon: Building2 },
  { title: "Pending Verification", value: "—", icon: ShieldCheck },
  { title: "Verified Today", value: "—", icon: FileCheck },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of admin activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} />
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-forest-200 border-l-4 border-l-forest-500 p-6 shadow-card">
        <h2 className="font-semibold text-foreground mb-2">Quick actions</h2>
        <p className="text-sm text-muted-foreground">Use the Verification page to review and approve or reject pending requests.</p>
      </div>
    </div>
  );
}
