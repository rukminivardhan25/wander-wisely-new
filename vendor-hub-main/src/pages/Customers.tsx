import { motion } from "framer-motion";

const customers = [
  { name: "Sarah Mitchell", totalBookings: 12, lastBooking: "Feb 21, 2026", spent: "$2,340" },
  { name: "James Wilson", totalBookings: 8, lastBooking: "Feb 20, 2026", spent: "$4,800" },
  { name: "Emily Chen", totalBookings: 5, lastBooking: "Feb 19, 2026", spent: "$890" },
  { name: "Michael Brown", totalBookings: 15, lastBooking: "Feb 18, 2026", spent: "$3,210" },
  { name: "Lisa Anderson", totalBookings: 3, lastBooking: "Feb 17, 2026", spent: "$680" },
  { name: "David Park", totalBookings: 7, lastBooking: "Feb 16, 2026", spent: "$1,550" },
];

export default function Customers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-1">View your customer base and booking history.</p>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Customer</th>
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Total Bookings</th>
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Last Booking</th>
            <th className="text-right px-6 py-3 font-medium text-muted-foreground">Total Spent</th>
          </tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground text-xs font-semibold">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <span className="font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-foreground">{c.totalBookings}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{c.lastBooking}</td>
                <td className="px-6 py-3.5 text-right font-semibold text-foreground">{c.spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
