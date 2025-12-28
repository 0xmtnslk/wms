import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Trophy, ChevronDown, ChevronUp,
  Building2, Scale, Banknote, Gauge, Package, Calendar, AlertTriangle, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

function MiniTrendLine({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 50" className="w-full h-8" preserveAspectRatio="none">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <motion.circle
        cx={100}
        cy={100 - ((data[data.length - 1] - min) / range) * 100}
        r="3"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
      />
    </svg>
  );
}

function CrossComparisonTab() {
  const [metric, setMetric] = useState<string>("medical");
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: allHospitals } = useQuery<{ id: string; code: string; name: string; colorHex?: string }[]>({
    queryKey: ["/api/hospitals"],
  });

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/settings/location-categories"],
  });

  useEffect(() => {
    if (allHospitals && selectedHospitals.length === 0) {
      setSelectedHospitals(allHospitals.slice(0, 3).map(h => h.id));
    }
  }, [allHospitals]);

  const hospitalIds = selectedHospitals.join(',');

  const { data, isLoading } = useQuery<CrossComparisonData>({
    queryKey: ["/api/detailed-analytics/comparison", metric, hospitalIds, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        metric,
        hospitalFilter: hospitalIds || "all",
        categoryFilter
      });
      const res = await fetch(`/api/detailed-analytics/comparison?${params}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: selectedHospitals.length > 0
  });

  const metricOptions = [
    { value: "medical", label: "Tıbbi Atık", icon: Scale },
    { value: "hazardous", label: "Tehlikeli Atık", icon: Scale },
    { value: "domestic", label: "Evsel Atık", icon: Scale },
    { value: "recycle", label: "Geri Dönüşüm", icon: Scale },
    { value: "weight", label: "Toplam Ağırlık", icon: Scale },
    { value: "cost", label: "Maliyet", icon: Banknote },
    { value: "efficiency", label: "Verimlilik", icon: Gauge },
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

  const toggleHospital = (id: string) => {
    setSelectedHospitals(prev => 
      prev.includes(id) 
        ? prev.filter(h => h !== id)
        : [...prev, id]
    );
  };

  const selectedData = useMemo(() => {
    if (!data?.hospitals) return [];
    return data.hospitals.filter(h => selectedHospitals.includes(h.id));
  }, [data, selectedHospitals]);

  const maxValue = useMemo(() => {
    if (!selectedData.length) return 1;
    return Math.max(...selectedData.map(getMetricValue), 1);
  }, [selectedData, metric]);

  const hospitalColors = ['#f59e0b', '#6366f1', '#ec4899', '#22c55e', '#06b6d4', '#8b5cf6'];

  if (isLoading && selectedHospitals.length > 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                Hastane Seçimi
              </label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 max-h-24 overflow-y-auto">
                {allHospitals?.map((h, idx) => (
                  <div
                    key={h.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-all",
                      selectedHospitals.includes(h.id) 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover-elevate"
                    )}
                    onClick={() => toggleHospital(h.id)}
                    data-testid={`toggle-hospital-${h.id}`}
                  >
                    {selectedHospitals.includes(h.id) && <Check className="h-3 w-3" />}
                    {h.name}
                  </div>
                ))}
              </div>
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

      {selectedData.length > 0 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Scale className="h-4 w-4 text-rose-500" />
                {getMetricLabel()} (kg)
              </CardTitle>
              <Badge variant="outline">{getMetricLabel()}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-center gap-8 h-64 pt-8">
                <AnimatePresence mode="popLayout">
                  {selectedData.map((hospital, idx) => {
                    const value = getMetricValue(hospital);
                    const heightPercent = (value / maxValue) * 100;
                    const color = hospitalColors[idx % hospitalColors.length];
                    const isLeader = idx === 0;
                    
                    return (
                      <motion.div
                        key={hospital.id}
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                      >
                        <div className="relative flex flex-col items-center">
                          {isLeader && (
                            <motion.div
                              initial={{ scale: 0, y: 10 }}
                              animate={{ scale: 1, y: 0 }}
                              transition={{ delay: 0.8, type: "spring" }}
                              className="absolute -top-8"
                            >
                              <Trophy className="h-6 w-6 text-yellow-500" />
                            </motion.div>
                          )}
                          <motion.div
                            className="w-20 rounded-t-md relative"
                            style={{ backgroundColor: color }}
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(heightPercent * 1.8, 20)}px` }}
                            transition={{ duration: 0.8, delay: idx * 0.15, ease: "easeOut" }}
                          >
                            <motion.span
                              className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono font-bold whitespace-nowrap"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8 + idx * 0.1 }}
                            >
                              {value.toFixed(1)} kg
                            </motion.span>
                          </motion.div>
                        </div>
                        <p className="text-xs text-center max-w-20 truncate">{hospital.name}</p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {selectedData.map((hospital, idx) => {
                const color = hospitalColors[idx % hospitalColors.length];
                const medicalRatio = hospital.weight > 0 
                  ? (hospital.medicalKg / hospital.weight) * 100 
                  : 0;
                const trendData = [
                  hospital.weight * 0.8,
                  hospital.weight * 0.9,
                  hospital.weight * 0.85,
                  hospital.weight * 1.1,
                  hospital.weight * 0.95,
                  hospital.weight
                ];
                const riskLevel = medicalRatio > 40 ? "YÜKSEK RİSK" : medicalRatio > 20 ? "ORTA RİSK" : "DÜŞÜK RİSK";
                const riskColor = medicalRatio > 40 ? "bg-red-500/10 text-red-500 border-red-500/20" 
                  : medicalRatio > 20 ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-green-500/10 text-green-500 border-green-500/20";

                return (
                  <motion.div
                    key={hospital.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                  >
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">#{idx + 1} SIRALAMA</p>
                            <h3 className="font-semibold flex items-center gap-1">
                              {hospital.name}
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                            </h3>
                          </div>
                          <Badge variant="outline" className={riskColor}>
                            {riskLevel}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Maliyet</p>
                            <p className="text-lg font-bold font-mono">
                              {hospital.cost.toLocaleString('tr-TR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tıbbi Oran</p>
                            <p className="text-lg font-bold font-mono">
                              %{medicalRatio.toFixed(1)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Hacim Trendi (Genel)</p>
                          <MiniTrendLine data={trendData} color="#ef4444" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {selectedHospitals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Karşılaştırma yapmak için hastane seçin.</p>
          </CardContent>
        </Card>
      )}
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
