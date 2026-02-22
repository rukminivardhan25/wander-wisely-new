import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const viewsData = [
  { day: "Mon", views: 420 }, { day: "Tue", views: 380 }, { day: "Wed", views: 510 },
  { day: "Thu", views: 470 }, { day: "Fri", views: 620 }, { day: "Sat", views: 780 },
  { day: "Sun", views: 690 },
];

const revenueData = [
  { month: "Sep", revenue: 18200 }, { month: "Oct", revenue: 21400 }, { month: "Nov", revenue: 19800 },
  { month: "Dec", revenue: 28900 }, { month: "Jan", revenue: 22100 }, { month: "Feb", revenue: 24580 },
];

const topListings = [
  { name: "The Grand Kitchen", bookings: 156, revenue: "$18,400" },
  { name: "Rooftop Lounge", bookings: 89, revenue: "$12,300" },
];

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your business performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Views This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={viewsData}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(43, 74%, 49%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke="hsl(43, 74%, 49%)" fill="url(#viewsGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(222, 47%, 14%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Top Performing Listings</h3>
        <div className="space-y-3">
          {topListings.map((l, i) => (
            <div key={l.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg vendor-gradient flex items-center justify-center text-primary-foreground font-bold text-sm">{i + 1}</span>
                <span className="font-medium text-foreground text-sm">{l.name}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">{l.bookings} bookings</span>
                <span className="font-semibold text-foreground">{l.revenue}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
