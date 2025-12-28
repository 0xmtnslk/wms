interface DonutChartData {
  label: string;
  value: number;
  hex: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
}

export function DonutChart({ data, centerLabel = "kg Toplam", centerValue, size = 200 }: DonutChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground text-xs font-mono border-2 border-dashed border-border rounded-full mx-auto"
        style={{ width: size, height: size }}
      >
        VERİ YOK
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  if (total === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground text-xs font-mono border-2 border-dashed border-border rounded-full mx-auto"
        style={{ width: size, height: size }}
      >
        VERİ YOK
      </div>
    );
  }

  let accumulatedAngle = 0;
  const displayValue = centerValue !== undefined ? centerValue : total.toFixed(0);

  return (
    <div className="relative mx-auto group" style={{ width: size, height: size }}>
      <div className="absolute inset-4 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-700" />
      <svg 
        viewBox="0 0 100 100" 
        className="transform -rotate-90 w-full h-full drop-shadow-2xl relative z-10"
      >
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="hsl(var(--background))" strokeWidth="8" />
        {data.map((item, index) => {
          const val = item.value || 0;
          const percentage = val / total;
          const angle = percentage * 360;
          if (angle <= 0) return null;

          const largeArcFlag = angle > 180 ? 1 : 0;
          const x1 = 50 + 40 * Math.cos((accumulatedAngle * Math.PI) / 180);
          const y1 = 50 + 40 * Math.sin((accumulatedAngle * Math.PI) / 180);
          const x2 = 50 + 40 * Math.cos(((accumulatedAngle + angle) * Math.PI) / 180);
          const y2 = 50 + 40 * Math.sin(((accumulatedAngle + angle) * Math.PI) / 180);
          
          const pathData = total === val 
            ? `M 50 10 a 40 40 0 0 1 0 80 a 40 40 0 0 1 0 -80` 
            : `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
          accumulatedAngle += angle;
          
          return (
            <path 
              key={index} 
              d={pathData} 
              fill={item.hex} 
              stroke="hsl(var(--card))" 
              strokeWidth="2" 
              className="hover:opacity-100 opacity-90 transition-all duration-300 cursor-pointer"
            />
          );
        })}
        <circle cx="50" cy="50" r="32" fill="hsl(var(--card))" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        <span className="text-2xl font-bold text-foreground tracking-tighter drop-shadow-md font-mono">
          {displayValue}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
