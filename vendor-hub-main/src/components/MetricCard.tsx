import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function MetricCard({ title, value, change, icon: Icon, iconColor }: MetricCardProps) {
  const showChange = change !== undefined && change !== null;
  const isPositive = showChange && change >= 0;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-5 shadow-sm hover:shadow transition-shadow border border-border/40">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2.5 rounded-lg", iconColor || "bg-accent/10")}>
          <Icon size={20} className={iconColor ? "text-primary-foreground" : "text-accent"} />
        </div>
        {showChange && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change!)}%
          </div>
        )}
      </div>
      <p className="text-xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
    </div>
  );
}
