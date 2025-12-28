import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { tr } from "date-fns/locale";
import { 
  TrendingUp, TrendingDown, Trophy, ChevronDown, ChevronUp,
  Building2, Scale, Banknote, Gauge, Package, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsHQ } from "@/lib/auth-context";

type PeriodType = "daily" | "monthly" | "3month" | "6month" | "yearly" | "custom";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface HospitalPerformance {
  id: string;
  code: string;
  name: string;
  hex: string;
  score: number;
  wasteIndex: number;
  totalWeight: number;
  isLeader: boolean;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    medicalKg: number;
    hazardousKg: number;
    domesticKg: number;
    recycleKg: number;
    totalKg: number;
    opData: number;
    kpi: number;
    impact: number;
  }[];
}

interface CrossComparisonData {
  hospitals: {
    id: string;
    code: string;
    name: string;
    hex: string;
    weight: number;
    cost: number;
    efficiency: number;
    volume: number;
    medicalKg: number;
    hazardousKg: number;
    domesticKg: number;
    recycleKg: number;
  }[];
}

function getPeriodDates(period: PeriodType, customRange: DateRange): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case "daily":
      return { start: subDays(now, 1), end: now };
    case "monthly":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "3month":
      return { start: subMonths(now, 3), end: now };
    case "6month":
      return { start: subMonths(now, 6), end: now };
    case "yearly":
      return { start: startOfYear(now), end: endOfYear(now) };
    case "custom":
      return { 
        start: customRange.from || subMonths(now, 1), 
        end: customRange.to || now 
      };
    default:
      return { start: subMonths(now, 1), end: now };
  }
}

function ScoreBar({ score }: { score: number }) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  const getColor = (s: number) => {
    if (s >= 70) return '#22c55e';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };
  
  return (
    <div className="h-2 rounded-full overflow-hidden bg-muted">
      <div 
        className="h-full transition-all rounded-full" 
        style={{ 
          width: `${normalizedScore}%`, 
          background: `linear-gradient(to right, ${getColor(normalizedScore)}, ${getColor(normalizedScore)})`
        }} 
      />
    </div>
  );
}

function HospitalCard({ hospital, isExpanded, onToggle }: { 
  hospital: HospitalPerformance; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-visible">
      <div 
        className="p-4 cursor-pointer hover-elevate"
        onClick={onToggle}
        data-testid={`card-hospital-${hospital.id}`}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-1 h-12 rounded-full" 
            style={{ backgroundColor: hospital.hex }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{hospital.name}</h3>
                <span className="text-xs text-muted-foreground">({hospital.code})</span>
              </div>
              {hospital.isLeader && (
                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                  <Trophy className="h-3 w-3" />
                  LİDER
                </Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold">{hospital.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
              <span className="text-sm text-muted-foreground ml-2">
                Atık Yükü Endeksi: <span className="font-mono">{hospital.wasteIndex.toFixed(2)}</span>
              </span>
            </div>
            <ScoreBar score={hospital.score} />
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <span className="text-sm font-medium">DETAYLI PUAN KARNESİ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">Mahal</th>
                    <th className="text-right py-2 px-2 font-medium text-rose-500">Tıbbi (kg)</th>
                    <th className="text-right py-2 px-2 font-medium text-amber-500">Tehlikeli</th>
                    <th className="text-right py-2 px-2 font-medium text-slate-500">Evsel</th>
                    <th className="text-right py-2 px-2 font-medium text-cyan-500">Geri D.</th>
                    <th className="text-right py-2 px-2 font-medium">Toplam</th>
                    <th className="text-right py-2 px-2 font-medium">Op. Veri</th>
                    <th className="text-right py-2 px-2 font-medium">KPI</th>
                    <th className="text-right py-2 px-2 font-medium">Etki</th>
                  </tr>
                </thead>
                <tbody>
                  {hospital.categoryBreakdown.map((cat, idx) => (
                    <tr key={idx} className="border-b border-muted/50">
                      <td className="py-2 px-2">{cat.categoryName}</td>
                      <td className="py-2 px-2 text-right font-mono text-rose-500">{cat.medicalKg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-mono text-amber-500">{cat.hazardousKg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-500">{cat.domesticKg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-mono text-cyan-500">{cat.recycleKg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-mono">{cat.totalKg.toFixed(1)}</td>
                      <td className="py-2 px-2 text-right font-mono">{cat.opData}</td>
                      <td className="py-2 px-2 text-right font-mono">{cat.kpi.toFixed(2)}</td>
                      <td className={cn(
                        "py-2 px-2 text-right font-mono",
                        cat.impact >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {cat.impact >= 0 ? "+" : ""}{cat.impact.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              * KPI = Toplam Atık / Operasyonel Veri. Puan Etkisi = Referans değerine göre sapma.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function HospitalPerformanceTab() {
  const [period, setPeriod] = useState<PeriodType>("yearly");
  const [customRange, setCustomRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [expandedHospital, setExpandedHospital] = useState<string | null>(null);

  const dates = useMemo(() => getPeriodDates(period, customRange), [period, customRange]);

  const { data, isLoading } = useQuery<{ hospitals: HospitalPerformance[] }>({
    queryKey: ["/api/detailed-analytics/performance", dates.start.toISOString(), dates.end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dates.start.toISOString(),
        endDate: dates.end.toISOString()
      });
      const res = await fetch(`/api/detailed-analytics/performance?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Analiz Periyodu:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { value: "daily", label: "Günlük" },
                { value: "monthly", label: "Aylık" },
                { value: "3month", label: "3 Aylık" },
                { value: "6month", label: "6 Aylık" },
                { value: "yearly", label: "Yıllık" },
              ].map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPeriod(p.value as PeriodType)}
                  data-testid={`button-period-${p.value}`}
                >
                  {p.label}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={period === "custom" ? "default" : "ghost"} 
                    size="icon"
                    data-testid="button-period-custom"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: customRange.from, to: customRange.to }}
                    onSelect={(range) => {
                      setCustomRange({ from: range?.from, to: range?.to });
                      if (range?.from && range?.to) {
                        setPeriod("custom");
                      }
                    }}
                    locale={tr}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data?.hospitals?.map((hospital, idx) => (
          <HospitalCard
            key={hospital.id}
            hospital={{ ...hospital, isLeader: idx === 0 }}
            isExpanded={expandedHospital === hospital.id}
            onToggle={() => setExpandedHospital(
              expandedHospital === hospital.id ? null : hospital.id
            )}
          />
        ))}
        {(!data?.hospitals || data.hospitals.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Seçilen periyod için veri bulunamadı.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CrossComparisonTab() {
  const [metric, setMetric] = useState<string>("weight");
  const [hospitalFilter, setHospitalFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<CrossComparisonData>({
    queryKey: ["/api/detailed-analytics/comparison", metric, hospitalFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        metric,
        hospitalFilter,
        categoryFilter
      });
      const res = await fetch(`/api/detailed-analytics/comparison?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/settings/location-categories"],
  });

  const { data: hospitals } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["/api/hospitals"],
  });

  const metricOptions = [
    { value: "weight", label: "Ağırlık (kg)", icon: Scale },
    { value: "cost", label: "Maliyet (TL)", icon: Banknote },
    { value: "efficiency", label: "Verimlilik", icon: Gauge },
    { value: "volume", label: "Hacim", icon: Package },
    { value: "medical", label: "Tıbbi Atık", icon: Scale },
    { value: "hazardous", label: "Tehlikeli Atık", icon: Scale },
    { value: "domestic", label: "Evsel Atık", icon: Scale },
    { value: "recycle", label: "Geri Dönüşüm", icon: Scale },
  ];

  const getMetricValue = (h: CrossComparisonData["hospitals"][0]) => {
    switch (metric) {
      case "weight": return h.weight;
      case "cost": return h.cost;
      case "efficiency": return h.efficiency;
      case "volume": return h.volume;
      case "medical": return h.medicalKg;
      case "hazardous": return h.hazardousKg;
      case "domestic": return h.domesticKg;
      case "recycle": return h.recycleKg;
      default: return h.weight;
    }
  };

  const getMetricLabel = () => {
    const opt = metricOptions.find(m => m.value === metric);
    return opt?.label || "Değer";
  };

  const maxValue = useMemo(() => {
    if (!data?.hospitals) return 1;
    return Math.max(...data.hospitals.map(getMetricValue), 1);
  }, [data, metric]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Karşılaştırma Kriteri
              </label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger data-testid="select-metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Hastane Filtresi
              </label>
              <Select value={hospitalFilter} onValueChange={setHospitalFilter}>
                <SelectTrigger data-testid="select-hospital-filter">
                  <SelectValue placeholder="Tüm Hastaneler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Hastaneler</SelectItem>
                  {hospitals?.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Kategori Filtresi
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category-filter">
                  <SelectValue placeholder="Tüm Kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Hastane Karşılaştırması - {getMetricLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.hospitals?.map((hospital, idx) => {
              const value = getMetricValue(hospital);
              const percentage = (value / maxValue) * 100;
              const isTop = idx < 3;
              const isBottom = idx >= (data.hospitals.length - 3) && data.hospitals.length > 3;
              
              return (
                <div 
                  key={hospital.id}
                  className="flex items-center gap-3"
                  data-testid={`comparison-row-${hospital.id}`}
                >
                  <div 
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: hospital.hex }}
                  />
                  <div className="w-40 shrink-0">
                    <p className="font-medium text-sm truncate">{hospital.name}</p>
                    <p className="text-xs text-muted-foreground">{hospital.code}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          isTop ? "bg-green-500" : isBottom ? "bg-red-500" : "bg-primary"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="font-mono font-bold">
                      {metric === "cost" 
                        ? `${value.toFixed(0)} TL` 
                        : metric === "efficiency"
                        ? `${(value * 100).toFixed(0)}%`
                        : `${value.toFixed(1)} kg`
                      }
                    </span>
                  </div>
                  {isTop && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      En İyi
                    </Badge>
                  )}
                  {isBottom && (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                      En Düşük
                    </Badge>
                  )}
                </div>
              );
            })}
            {(!data?.hospitals || data.hospitals.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Karşılaştırma için veri bulunamadı.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DetailedAnalyticsPage() {
  const isHQ = useIsHQ();
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Detaylı Analiz & KPI</h1>
          <p className="text-muted-foreground">
            Hastane performans metrikleri ve çapraz karşılaştırma
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="performance" data-testid="tab-performance">
            Hastane Performans
          </TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison">
            Çapraz Kıyaslama
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <HospitalPerformanceTab />
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <CrossComparisonTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
