import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  colorClass?: string;
  iconColorClass?: string;
}

export function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  colorClass = "text-foreground",
  iconColorClass = "text-primary",
}: KPICardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground";

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider truncate mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold font-mono ${colorClass}`}>
                {value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span className="text-xs font-medium">{trendValue}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={`p-2 rounded-md bg-muted ${iconColorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
