import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function MetricCard({ title, value, change, icon: Icon, iconColor }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow border border-border/50">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconColor || "bg-accent/10")}>
          <Icon size={22} className={iconColor ? "text-primary-foreground" : "text-accent"} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
          isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  );
}
