import { Syringe, Zap, Trash2, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const WASTE_TYPES_CONFIG = [
  { 
    id: "medical", 
    code: "medical",
    label: "Tıbbi Atık", 
    color: "bg-rose-600", 
    textColor: "text-rose-500", 
    hex: "#e11d48", 
    icon: Syringe, 
    costPerKg: 15.0 
  },
  { 
    id: "hazardous", 
    code: "hazardous",
    label: "Tehlikeli Atık", 
    color: "bg-amber-500", 
    textColor: "text-amber-500", 
    hex: "#f59e0b", 
    icon: Zap, 
    costPerKg: 25.0 
  },
  { 
    id: "domestic", 
    code: "domestic",
    label: "Evsel Atık", 
    color: "bg-slate-500", 
    textColor: "text-slate-400", 
    hex: "#64748b", 
    icon: Trash2, 
    costPerKg: 2.0 
  },
  { 
    id: "recycle", 
    code: "recycle",
    label: "Geri Dönüşüm", 
    color: "bg-cyan-500", 
    textColor: "text-cyan-500", 
    hex: "#06b6d4", 
    icon: Recycle, 
    costPerKg: -1.0 
  },
];

export function getWasteTypeConfig(code: string) {
  return WASTE_TYPES_CONFIG.find(w => w.code === code) || WASTE_TYPES_CONFIG[0];
}

interface WasteTypeBadgeProps {
  code: string;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function WasteTypeBadge({ code, showIcon = true, size = "default" }: WasteTypeBadgeProps) {
  const config = getWasteTypeConfig(code);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.color} text-white border-transparent gap-1 ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : ""
      }`}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
      {config.label}
    </Badge>
  );
}

interface WasteTypeSelectCardProps {
  type: typeof WASTE_TYPES_CONFIG[0];
  selected?: boolean;
  onClick?: () => void;
}

export function WasteTypeSelectCard({ type, selected, onClick }: WasteTypeSelectCardProps) {
  const Icon = type.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-md border-2 transition-all hover-elevate ${
        selected 
          ? `${type.color} border-transparent text-white` 
          : "bg-card border-border hover:border-muted-foreground/50"
      }`}
      data-testid={`waste-type-${type.code}`}
    >
      <div className="flex flex-col items-center gap-2">
        <Icon className="h-8 w-8" />
        <span className="text-sm font-medium">{type.label}</span>
        <span className={`text-xs ${selected ? "text-white/80" : "text-muted-foreground"}`}>
          {type.costPerKg >= 0 ? `${type.costPerKg.toFixed(2)} TL/kg` : `${Math.abs(type.costPerKg).toFixed(2)} TL/kg kazanç`}
        </span>
      </div>
    </button>
  );
}
