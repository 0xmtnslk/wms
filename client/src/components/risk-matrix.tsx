import { AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RiskCell {
  category: string;
  risk: "low" | "medium" | "high";
  score: number;
  label: string;
}

interface RiskMatrixProps {
  data: RiskCell[];
  onCellClick?: (cell: RiskCell) => void;
}

const riskColors = {
  low: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  medium: "bg-amber-500/20 border-amber-500/50 text-amber-400",
  high: "bg-rose-500/20 border-rose-500/50 text-rose-400",
};

const riskIcons = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertOctagon,
};

export function RiskMatrix({ data, onCellClick }: RiskMatrixProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Matrisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Veri yok
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Risk Matrisi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {data.map((cell, idx) => {
            const Icon = riskIcons[cell.risk];
            return (
              <button
                key={idx}
                onClick={() => onCellClick?.(cell)}
                className={`p-3 rounded-md border transition-all hover-elevate ${riskColors[cell.risk]}`}
                data-testid={`risk-cell-${cell.category}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] uppercase tracking-wider font-medium truncate w-full text-center">
                    {cell.label}
                  </span>
                  <span className="text-lg font-bold font-mono">{cell.score}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Düşük</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground">Orta</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-[10px] text-muted-foreground">Yüksek</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskActionPanel({ risk, category, actions }: { 
  risk: "low" | "medium" | "high"; 
  category: string;
  actions: string[];
}) {
  return (
    <Card className={`border ${riskColors[risk]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">{category}</CardTitle>
          <Badge variant="outline" className={riskColors[risk]}>
            {risk === "low" ? "Düşük" : risk === "medium" ? "Orta" : "Yüksek"} Risk
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actions.map((action, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
