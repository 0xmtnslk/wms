import { Clock } from "lucide-react";

interface TimeChartData {
  hour: number;
  value: number;
}

interface TimeChartProps {
  data: TimeChartData[];
  label?: string;
}

export function TimeChart({ data, label = "kg" }: TimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-xs font-mono border-2 border-dashed border-border rounded-md w-full h-32">
        VERİ YOK
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Saatlik Dağılım</span>
      </div>
      <div className="flex items-end gap-1 h-24 overflow-x-auto pb-2">
        {data.map((item, idx) => {
          const heightPercent = Math.max((item.value / maxValue) * 100, 2);
          const isActive = item.hour >= 8 && item.hour <= 16;
          
          return (
            <div 
              key={idx} 
              className="flex flex-col items-center gap-1 group min-w-[20px]"
            >
              <div 
                className={`w-4 rounded-t-sm transition-all duration-300 ${
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                style={{ height: `${heightPercent}%`, minHeight: 2 }}
              />
              <span className="text-[8px] text-muted-foreground font-mono">
                {item.hour.toString().padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>00:00</span>
        <span className="text-primary font-medium">08:00 - 16:00 (Aktif)</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
