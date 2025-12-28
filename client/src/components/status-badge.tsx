import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Status = "pending" | "completed" | "cancelled" | "in_progress";

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
}

const statusConfig: Record<Status, { label: string; icon: typeof Clock; className: string }> = {
  pending: {
    label: "Bekliyor",
    icon: Clock,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  in_progress: {
    label: "İşleniyor",
    icon: Loader2,
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  completed: {
    label: "Tamamlandı",
    icon: CheckCircle2,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  cancelled: {
    label: "İptal",
    icon: XCircle,
    className: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      {showIcon && <Icon className={`h-3 w-3 ${status === "in_progress" ? "animate-spin" : ""}`} />}
      {config.label}
    </Badge>
  );
}
