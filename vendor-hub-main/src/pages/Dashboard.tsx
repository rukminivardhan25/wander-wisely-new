import { Eye, CalendarCheck, DollarSign, Star, PlusCircle, Camera, Tag } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { motion } from "framer-motion";
import { useVendorAuth } from "@/hooks/useVendorAuth";

const metrics = [
  { title: "Total Views", value: "12,847", change: 12.5, icon: Eye },
  { title: "Total Bookings", value: "384", change: 8.2, icon: CalendarCheck },
  { title: "Revenue This Month", value: "$24,580", change: -3.1, icon: DollarSign },
  { title: "Average Rating", value: "4.8", change: 2.4, icon: Star },
];

const recentBookings = [
  { id: "BK-7821", service: "Dinner Reservation", date: "Feb 21, 2026", status: "Confirmed", amount: "$185.00" },
  { id: "BK-7820", service: "Private Event", date: "Feb 20, 2026", status: "Pending", amount: "$1,200.00" },
  { id: "BK-7819", service: "Lunch Special", date: "Feb 19, 2026", status: "Completed", amount: "$95.00" },
  { id: "BK-7818", service: "Dinner Reservation", date: "Feb 18, 2026", status: "Confirmed", amount: "$210.00" },
  { id: "BK-7817", service: "Brunch Party", date: "Feb 17, 2026", status: "Cancelled", amount: "$340.00" },
];

const statusStyles: Record<string, string> = {
  Confirmed: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Completed: "bg-info/10 text-info",
  Cancelled: "bg-destructive/10 text-destructive",
};

const quickActions = [
  { label: "Add New Listing", icon: PlusCircle, path: "/add-listing" },
  { label: "Upload Photos", icon: Camera, path: "/listings" },
  { label: "Create Promotion", icon: Tag, path: "/promotions" },
];

export default function Dashboard() {
  const { vendor } = useVendorAuth();
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Welcome back, {vendor?.name ?? "Vendor"}</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your business today.</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }}>
            <MetricCard {...m} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Table */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Recent Bookings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Booking ID</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-6 py-3.5 font-medium text-foreground">{b.id}</td>
                    <td className="px-6 py-3.5 text-foreground">{b.service}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{b.date}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[b.status]}`}>{b.status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-foreground">{b.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <h2 className="font-display font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <a
                  key={action.label}
                  href={action.path}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </a>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-xl vendor-gradient">
            <p className="text-primary-foreground font-display font-semibold text-sm">Boost Your Visibility</p>
            <p className="text-primary-foreground/70 text-xs mt-1">Create a promotion to reach more customers.</p>
            <button className="mt-3 px-4 py-2 rounded-lg gold-gradient text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
              Create Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
