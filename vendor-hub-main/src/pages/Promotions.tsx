import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Eye } from "lucide-react";

const existingPromos = [
  { id: 1, title: "20% Off Dinner", code: "DINNER20", discount: "20%", validUntil: "Mar 15, 2026", listing: "The Grand Kitchen", active: true },
  { id: 2, title: "Happy Hour Special", code: "HAPPY10", discount: "10%", validUntil: "Feb 28, 2026", listing: "Rooftop Lounge", active: true },
];

export default function Promotions() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Promotions</h1>
          <p className="text-muted-foreground mt-1">Create and manage your offers.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> Create Offer
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card border border-border/50 p-6 space-y-4">
          <h3 className="font-display font-semibold text-foreground">New Promotion</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Discount %</label>
              <input type="number" placeholder="e.g. 15" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Coupon Code</label>
              <input placeholder="e.g. SAVE15" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Valid From</label>
              <input type="date" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Valid To</label>
              <input type="date" className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Applicable Listing</label>
            <select className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
              <option>The Grand Kitchen</option>
              <option>Rooftop Lounge</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl gold-gradient text-accent-foreground text-sm font-semibold hover:opacity-90 transition-opacity">Create</button>
            <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
              <Eye size={14} /> Preview
            </button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {existingPromos.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Code: <span className="font-mono text-accent">{p.code}</span> • {p.listing} • Until {p.validUntil}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-display font-bold text-accent">{p.discount}</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">Active</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
