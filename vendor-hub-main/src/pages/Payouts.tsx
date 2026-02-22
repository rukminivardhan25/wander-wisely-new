import { motion } from "framer-motion";
import { DollarSign, Clock, CheckCircle, Download } from "lucide-react";

const payoutCards = [
  { label: "Total Earnings", value: "$48,920", icon: DollarSign, color: "bg-accent/10" },
  { label: "Pending Payout", value: "$3,240", icon: Clock, color: "bg-warning/10" },
  { label: "Completed Payouts", value: "$45,680", icon: CheckCircle, color: "bg-success/10" },
];

const transactions = [
  { id: "PAY-001", date: "Feb 15, 2026", amount: "$4,200", status: "Completed" },
  { id: "PAY-002", date: "Feb 01, 2026", amount: "$3,850", status: "Completed" },
  { id: "PAY-003", date: "Jan 15, 2026", amount: "$5,100", status: "Completed" },
  { id: "PAY-004", date: "Jan 01, 2026", amount: "$3,200", status: "Completed" },
];

export default function Payouts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Payouts</h1>
        <p className="text-muted-foreground mt-1">Track your earnings and payment history.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {payoutCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
            <div className={`p-3 rounded-xl ${c.color} w-fit mb-3`}>
              <c.icon size={22} className="text-accent" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Bank Details</h3>
          <button className="text-xs font-medium text-accent hover:underline">Edit</button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Bank:</span> <span className="text-foreground ml-1">First National Bank</span></div>
          <div><span className="text-muted-foreground">Account:</span> <span className="text-foreground ml-1">****4829</span></div>
          <div><span className="text-muted-foreground">Routing:</span> <span className="text-foreground ml-1">****1234</span></div>
          <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground ml-1">Business Checking</span></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Transaction History</h3>
          <button className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
            <Download size={14} /> Download
          </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/30">
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">ID</th>
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount</th>
            <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
          </tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-border/50">
                <td className="px-6 py-3.5 font-medium text-foreground">{t.id}</td>
                <td className="px-6 py-3.5 text-muted-foreground">{t.date}</td>
                <td className="px-6 py-3.5 font-semibold text-foreground">{t.amount}</td>
                <td className="px-6 py-3.5"><span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
