import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconBg?: string;
}

export function MetricCard({ title, value, change, icon: Icon, iconBg = "bg-forest-100" }: MetricCardProps) {
  const isPositive = change == null || change >= 0;
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-forest-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", iconBg)}>
          <Icon size={22} className="text-forest-600" />
        </div>
        {change != null && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              isPositive ? "bg-forest-100 text-forest-600" : "bg-red-100 text-red-700"
            )}
          >
            {isPositive ? "+" : ""}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </div>
  );
}
