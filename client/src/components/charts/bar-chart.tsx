interface BarChartData {
  label: string;
  value: number;
  hex?: string;
}

interface BarChartProps {
  data: BarChartData[];
  maxVal?: number;
  height?: number;
  showLabels?: boolean;
}

export function BarChart({ data, maxVal, height = 160, showLabels = true }: BarChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground text-xs font-mono border-2 border-dashed border-border rounded-md w-full"
        style={{ height }}
      >
        VERİ YOK
      </div>
    );
  }

  const maxValue = maxVal || Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full" style={{ height: height + (showLabels ? 24 : 0) }}>
      <div 
        className="flex items-end justify-around gap-2 px-2 border-b border-border pb-1 w-full"
        style={{ height }}
      >
        {data.map((item, idx) => {
          const val = item.value || 0;
          const heightPercent = Math.max((val / maxValue) * 100, 2);
          const barColor = item.hex || "hsl(var(--primary))";
          
          return (
            <div 
              key={idx} 
              className="flex-1 max-w-16 flex flex-col items-center gap-1 group"
            >
              <span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {val.toFixed(1)}
              </span>
              <div 
                className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                style={{ 
                  height: `${heightPercent}%`,
                  backgroundColor: barColor,
                  minHeight: 4
                }}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-around gap-2 px-2 pt-1">
          {data.map((item, idx) => (
            <span 
              key={idx} 
              className="flex-1 max-w-16 text-[9px] text-muted-foreground text-center truncate"
            >
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
