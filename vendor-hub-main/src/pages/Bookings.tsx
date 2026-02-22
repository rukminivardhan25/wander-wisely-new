import { useState } from "react";
import { motion } from "framer-motion";
import { X, MessageSquare, Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const bookings = [
  { id: "BK-7821", customer: "Sarah Mitchell", service: "Dinner Reservation", date: "Feb 21, 2026", status: "Confirmed", payment: "Paid", amount: "$185.00", email: "sarah@email.com", guests: 4 },
  { id: "BK-7820", customer: "James Wilson", service: "Private Event", date: "Feb 20, 2026", status: "Pending", payment: "Awaiting", amount: "$1,200.00", email: "james@email.com", guests: 20 },
  { id: "BK-7819", customer: "Emily Chen", service: "Lunch Special", date: "Feb 19, 2026", status: "Completed", payment: "Paid", amount: "$95.00", email: "emily@email.com", guests: 2 },
  { id: "BK-7818", customer: "Michael Brown", service: "Dinner Reservation", date: "Feb 18, 2026", status: "Confirmed", payment: "Paid", amount: "$210.00", email: "michael@email.com", guests: 6 },
  { id: "BK-7817", customer: "Lisa Anderson", service: "Brunch Party", date: "Feb 17, 2026", status: "Cancelled", payment: "Refunded", amount: "$340.00", email: "lisa@email.com", guests: 10 },
  { id: "BK-7816", customer: "David Park", service: "Dinner Reservation", date: "Feb 16, 2026", status: "Completed", payment: "Paid", amount: "$155.00", email: "david@email.com", guests: 3 },
];

const statusStyles: Record<string, string> = {
  Confirmed: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Completed: "bg-info/10 text-info",
  Cancelled: "bg-destructive/10 text-destructive",
};

const paymentStyles: Record<string, string> = {
  Paid: "text-success",
  Awaiting: "text-warning",
  Refunded: "text-muted-foreground",
};

export default function Bookings() {
  const [selected, setSelected] = useState<typeof bookings[0] | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground mt-1">Manage your incoming and past bookings.</p>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Booking ID</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={cn(
                      "border-b border-border/50 cursor-pointer transition-colors",
                      selected?.id === b.id ? "bg-accent/5" : "hover:bg-muted/20"
                    )}
                  >
                    <td className="px-6 py-3.5 font-medium text-foreground">{b.id}</td>
                    <td className="px-6 py-3.5 text-foreground">{b.customer}</td>
                    <td className="px-6 py-3.5 text-foreground">{b.service}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{b.date}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[b.status]}`}>{b.status}</span>
                    </td>
                    <td className={cn("px-6 py-3.5 font-medium text-sm", paymentStyles[b.payment])}>{b.payment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-5 shrink-0"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium text-foreground ml-1">{selected.customer}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground ml-1">{selected.email}</span></div>
              <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground ml-1">{selected.service}</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground ml-1">{selected.date}</span></div>
              <div><span className="text-muted-foreground">Guests:</span> <span className="text-foreground ml-1">{selected.guests}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold text-foreground ml-1">{selected.amount}</span></div>
            </div>
            <div className="flex gap-2 pt-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium">
                <Check size={14} /> Confirm
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-destructive text-destructive text-xs font-medium">
                <Ban size={14} /> Cancel
              </button>
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
              <MessageSquare size={14} /> Message Customer
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
