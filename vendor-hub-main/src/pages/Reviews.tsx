import { motion } from "framer-motion";
import { Star, MessageSquare, Flag } from "lucide-react";

const reviews = [
  { id: 1, customer: "Sarah M.", rating: 5, text: "Absolutely incredible dining experience! The ambiance was perfect and the food was outstanding.", date: "Feb 20, 2026", listing: "The Grand Kitchen" },
  { id: 2, customer: "James W.", rating: 4, text: "Great food and service. Slightly long wait times but the quality made up for it.", date: "Feb 18, 2026", listing: "The Grand Kitchen" },
  { id: 3, customer: "Emily C.", rating: 5, text: "Best rooftop dining in the city! Will definitely be coming back.", date: "Feb 15, 2026", listing: "Rooftop Lounge" },
  { id: 4, customer: "Michael B.", rating: 3, text: "Good food but the portion sizes could be better for the price point.", date: "Feb 12, 2026", listing: "The Grand Kitchen" },
];

export default function Reviews() {
  const avgRating = (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground mt-1">See what your customers are saying.</p>
      </div>

      {/* Summary */}
      <div className="bg-card rounded-2xl shadow-card border border-border/50 p-6 flex items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-display font-bold text-foreground">{avgRating}</p>
          <div className="flex items-center gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className={s <= Math.round(Number(avgRating)) ? "text-accent fill-accent" : "text-muted-foreground"} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => r.rating === star).length;
            const pct = (count / reviews.length) * 100;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{star}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-muted-foreground text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {reviews.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl shadow-card border border-border/50 p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full vendor-gradient flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {r.customer.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{r.customer}</p>
                  <p className="text-xs text-muted-foreground">{r.listing} • {r.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className={s <= r.rating ? "text-accent fill-accent" : "text-muted-foreground"} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-foreground leading-relaxed">{r.text}</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <MessageSquare size={14} /> Reply
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                <Flag size={14} /> Report
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
