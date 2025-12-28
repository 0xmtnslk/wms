import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  BarChart3, AlertOctagon, Coins, Clock,
  TrendingUp, TrendingDown, Building2, ArrowLeft, Search, ChevronRight,
  AlertTriangle, CheckCircle2, Target, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { TimeChart } from "@/components/charts/time-chart";
import { KPICard } from "@/components/kpi-card";
import { useAuth, useCurrentHospital, useIsHQ } from "@/lib/auth-context";

interface AnalyticsData {
  kpis: {
    wastePerBed: number;
    wastePerSurgery: number;
    wastePerProtocol: number;
    totalBedDays: number;
    totalSurgeries: number;
    totalProtocols: number;
    medicalWasteRatio: number;
    recycleRatio: number;
    costEfficiency: number;
    totalHospitals: number;
    totalCollections: number;
  };
  categoryRanking: {
    code: string;
    name: string;
    weight: number;
    percentage: number;
    hex: string;
  }[];
  riskMatrix: {
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    byCategory: { category: string; count: number; severity: 'low' | 'medium' | 'high' }[];
    overallRisk: 'low' | 'medium' | 'high';
    riskScore: number;
  };
  costAnalysis: {
    wasteType: string;
    code: string;
    weight: number;
    unitCost: number;
    totalCost: number;
    hex: string;
  }[];
  totalCost: number;
  hospitalCosts: {
    id: string;
    code: string;
    name: string;
    totalCost: number;
    totalWeight: number;
    hex: string;
  }[];
  bestHospitals: {
    id: string;
    code: string;
    name: string;
    totalCost: number;
    hex: string;
  }[];
  worstHospitals: {
    id: string;
    code: string;
    name: string;
    totalCost: number;
    hex: string;
  }[];
  timeAnalysis: {
    hour: number;
    count: number;
    weight: number;
  }[];
  shiftAnalysis: {
    name: string;
    hours: number[];
    count: number;
    weight: number;
  }[];
  avgCollectionTime: number;
  hospitalTimeStats: {
    id: string;
    code: string;
    name: string;
    avgCollectionTime: number;
    totalWeight: number;
    collectionsCount: number;
    issueCount: number;
    hex: string;
  }[];
}

interface Hospital {
  id: string;
  code: string;
  name: string;
}

const categoryLabels: Record<string, string> = {
  segregation: "Ayrıştırma Hatası",
  non_compliance: "Uygunsuzluk",
  technical: "Teknik Sorun",
  other: "Diğer",
};

const riskColors = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  high: "bg-rose-500/20 text-rose-400 border-rose-500/30"
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/analytics/:hospitalId");
  const [activeTab, setActiveTab] = useState("kpi");
  const [searchQuery, setSearchQuery] = useState("");

  const urlHospitalId = params?.hospitalId;
  const hospitalId = urlHospitalId || (isHQ ? undefined : currentHospital?.id);
  const isViewingSpecificHospital = !!urlHospitalId;

  const { data: hospitalsData } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
    enabled: isViewingSpecificHospital,
  });

  const viewingHospital = hospitalsData?.find(h => h.id === urlHospitalId);

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", hospitalId],
    queryFn: async () => {
      const url = hospitalId ? `/api/analytics?hospitalId=${hospitalId}` : "/api/analytics";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const displayName = isViewingSpecificHospital 
    ? viewingHospital?.name || "Hastane" 
    : (isHQ ? "Tüm Tesisler" : currentHospital?.name);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {isViewingSpecificHospital && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/analytics")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Analitik</h1>
            <p className="text-muted-foreground text-sm">
              {displayName} - Performans ve risk analizi
            </p>
          </div>
        </div>
        {isHQ && !isViewingSpecificHospital && (
          <Badge variant="outline" className="text-xs">
            {data?.kpis.totalHospitals} tesis - {data?.kpis.totalCollections} toplama
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="kpi" className="gap-2" data-testid="tab-kpi">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">KPI</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2" data-testid="tab-risk">
            <AlertOctagon className="h-4 w-4" />
            <span className="hidden sm:inline">Risk</span>
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-2" data-testid="tab-cost">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Maliyet</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-2" data-testid="tab-time">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Zaman</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpi" className="space-y-6 mt-6">
          {(data?.kpis.totalBedDays || 0) + (data?.kpis.totalSurgeries || 0) + (data?.kpis.totalProtocols || 0) > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>HBYS Verileri:</span>
              {(data?.kpis.totalBedDays || 0) > 0 && (
                <Badge variant="outline" className="text-xs">{data?.kpis.totalBedDays?.toLocaleString()} yatış günü</Badge>
              )}
              {(data?.kpis.totalSurgeries || 0) > 0 && (
                <Badge variant="outline" className="text-xs">{data?.kpis.totalSurgeries?.toLocaleString()} ameliyat</Badge>
              )}
              {(data?.kpis.totalProtocols || 0) > 0 && (
                <Badge variant="outline" className="text-xs">{data?.kpis.totalProtocols?.toLocaleString()} protokol</Badge>
              )}
            </div>
          )}
          {(data?.kpis.totalBedDays || 0) + (data?.kpis.totalSurgeries || 0) + (data?.kpis.totalProtocols || 0) === 0 && (
            <div className="text-xs text-amber-500 flex items-center gap-2">
              <AlertTriangle className="h-3 w-3" />
              HBYS verisi girilmedi - KPI hesaplamaları için Ayarlar sayfasından veri girişi yapın
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Yatış Başına Atık"
              value={data?.kpis.wastePerBed?.toFixed(2) || "0"}
              unit="kg/gün"
              subtitle={data?.kpis.totalBedDays ? `${data.kpis.totalBedDays.toLocaleString()} yatış günü` : "Veri yok"}
              icon={Target}
              trend={data?.kpis.wastePerBed && data.kpis.wastePerBed < 1.5 ? "down" : "up"}
              trendValue={data?.kpis.wastePerBed && data.kpis.wastePerBed < 1.5 ? "İyi" : "Yüksek"}
            />
            <KPICard
              title="Ameliyat Başına"
              value={data?.kpis.wastePerSurgery?.toFixed(2) || "0"}
              unit="kg"
              subtitle={data?.kpis.totalSurgeries ? `${data.kpis.totalSurgeries.toLocaleString()} ameliyat` : "Veri yok"}
              icon={Target}
            />
            <KPICard
              title="Protokol Başına"
              value={data?.kpis.wastePerProtocol?.toFixed(3) || "0"}
              unit="kg"
              subtitle={data?.kpis.totalProtocols ? `${data.kpis.totalProtocols.toLocaleString()} protokol` : "Veri yok"}
              icon={Target}
            />
            <KPICard
              title="Tıbbi Atık Oranı"
              value={((data?.kpis.medicalWasteRatio || 0) * 100).toFixed(1)}
              unit="%"
              icon={TrendingUp}
              colorClass="text-rose-500"
            />
            <KPICard
              title="Geri Dönüşüm Oranı"
              value={((data?.kpis.recycleRatio || 0) * 100).toFixed(1)}
              unit="%"
              icon={TrendingUp}
              colorClass="text-cyan-500"
            />
            <KPICard
              title="Maliyet Verimliliği"
              value={((data?.kpis.costEfficiency || 0) * 100).toFixed(0)}
              unit="%"
              icon={Coins}
              iconColorClass="text-emerald-500"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Atık Türü Sıralaması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.categoryRanking?.map((cat, idx) => (
                  <div key={cat.code} className="flex items-center gap-4">
                    <span className="w-6 text-sm text-muted-foreground font-mono">#{idx + 1}</span>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: cat.hex }}
                    />
                    <span className="w-32 text-sm truncate">{cat.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.hex }}
                      />
                    </div>
                    <span className="text-sm font-mono w-20 text-right">
                      {cat.weight.toFixed(1)} kg
                    </span>
                    <span className="text-sm font-mono w-16 text-right text-muted-foreground">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHQ && !isViewingSpecificHospital && (
            <HospitalSearchList
              hospitals={data?.hospitalTimeStats || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onHospitalClick={(id) => navigate(`/analytics/${id}`)}
              metricLabel="Toplama"
              metricValue={(h) => `${h.collectionsCount}`}
            />
          )}
        </TabsContent>

        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
                  data?.riskMatrix.overallRisk === 'high' ? 'bg-rose-500/20' :
                  data?.riskMatrix.overallRisk === 'medium' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                }`}>
                  <AlertOctagon className={`h-8 w-8 ${
                    data?.riskMatrix.overallRisk === 'high' ? 'text-rose-400' :
                    data?.riskMatrix.overallRisk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                  }`} />
                </div>
                <p className="text-2xl font-bold">{data?.riskMatrix.riskScore || 0}</p>
                <p className="text-sm text-muted-foreground">Genel Risk Skoru</p>
                <Badge variant="outline" className={`mt-2 ${riskColors[data?.riskMatrix.overallRisk || 'low']}`}>
                  {data?.riskMatrix.overallRisk === 'high' ? 'Yüksek Risk' :
                   data?.riskMatrix.overallRisk === 'medium' ? 'Orta Risk' : 'Düşük Risk'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 bg-amber-500/20">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
                <p className="text-2xl font-bold">{data?.riskMatrix.openIssues || 0}</p>
                <p className="text-sm text-muted-foreground">Açık Uygunsuzluk</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 bg-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold">{data?.riskMatrix.resolvedIssues || 0}</p>
                <p className="text-sm text-muted-foreground">Çözülen Uygunsuzluk</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Kategori Bazlı Risk Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.riskMatrix.byCategory && data.riskMatrix.byCategory.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.riskMatrix.byCategory.map((cat) => (
                    <div 
                      key={cat.category}
                      className={`p-4 rounded-md border ${riskColors[cat.severity]}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {categoryLabels[cat.category] || cat.category}
                        </span>
                        <Badge variant="outline" className={riskColors[cat.severity]}>
                          {cat.count}
                        </Badge>
                      </div>
                      <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            cat.severity === 'high' ? 'bg-rose-500' :
                            cat.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(cat.count * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-3 opacity-50 text-emerald-500" />
                  <p className="text-sm">Açık uygunsuzluk bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isHQ && !isViewingSpecificHospital && (
            <HospitalSearchList
              hospitals={data?.hospitalTimeStats || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onHospitalClick={(id) => navigate(`/analytics/${id}`)}
              metricLabel="Uygunsuzluk"
              metricValue={(h) => `${h.issueCount}`}
              metricColor={(h) => h.issueCount > 0 ? 'text-amber-400' : 'text-emerald-400'}
            />
          )}
        </TabsContent>

        <TabsContent value="cost" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <KPICard
              title="Toplam Maliyet"
              value={(data?.totalCost || 0).toFixed(2)}
              unit="TL"
              icon={Coins}
              iconColorClass="text-amber-500"
            />
            <KPICard
              title="Ortalama kg/TL"
              value={((data?.totalCost || 0) / Math.max(data?.costAnalysis?.reduce((s, c) => s + c.weight, 0) || 1, 1)).toFixed(2)}
              unit="TL"
              icon={Target}
            />
            <KPICard
              title="Geri Kazanım"
              value={Math.abs(data?.costAnalysis?.find(c => c.unitCost < 0)?.totalCost || 0).toFixed(2)}
              unit="TL"
              icon={TrendingDown}
              iconColorClass="text-emerald-500"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Atık Türü Bazlı Maliyet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.costAnalysis?.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.hex }}
                      />
                      <span className="text-sm">{item.wasteType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground font-mono">
                        {item.weight.toFixed(1)} kg
                      </span>
                      <span className="text-muted-foreground">x</span>
                      <span className={`font-mono ${item.unitCost < 0 ? 'text-emerald-500' : ''}`}>
                        {item.unitCost.toFixed(2)} TL
                      </span>
                      <span className="text-muted-foreground">=</span>
                      <span className={`font-mono font-bold ${item.totalCost < 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                        {item.totalCost.toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHQ && !isViewingSpecificHospital && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-emerald-500" />
                    En Düşük Maliyet (En İyi 3)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.bestHospitals?.map((h, idx) => (
                      <div 
                        key={h.id}
                        className="flex items-center justify-between p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover-elevate"
                        onClick={() => navigate(`/analytics/${h.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {idx + 1}
                          </span>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: h.hex }}
                          />
                          <span className="text-sm font-medium">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-400 font-bold">
                            {h.totalCost.toFixed(2)} TL
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-rose-500" />
                    En Yüksek Maliyet (Son 3)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.worstHospitals?.map((h, idx) => (
                      <div 
                        key={h.id}
                        className="flex items-center justify-between p-3 rounded-md bg-rose-500/10 border border-rose-500/20 cursor-pointer hover-elevate"
                        onClick={() => navigate(`/analytics/${h.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-xs font-bold text-rose-400">
                            {idx + 1}
                          </span>
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: h.hex }}
                          />
                          <span className="text-sm font-medium">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-rose-400 font-bold">
                            {h.totalCost.toFixed(2)} TL
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {isHQ && !isViewingSpecificHospital && (
            <HospitalSearchList
              hospitals={data?.hospitalCosts || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onHospitalClick={(id) => navigate(`/analytics/${id}`)}
              metricLabel="Maliyet"
              metricValue={(h) => `${h.totalCost.toFixed(2)} TL`}
            />
          )}
        </TabsContent>

        <TabsContent value="time" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <KPICard
              title="Ortalama Toplama Süresi"
              value={(data?.avgCollectionTime || 15).toFixed(0)}
              unit="dk"
              icon={Clock}
              iconColorClass="text-blue-500"
            />
            <KPICard
              title="Toplam Toplama"
              value={data?.kpis.totalCollections?.toString() || "0"}
              unit="adet"
              icon={Activity}
            />
            <KPICard
              title="En Yoğun Saat"
              value={data?.timeAnalysis?.reduce((max, t) => t.weight > max.weight ? t : max, { hour: 0, weight: 0 }).hour.toString().padStart(2, '0') + ":00" || "09:00"}
              unit=""
              icon={Target}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Saatlik Atık Toplama Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeChart data={data?.timeAnalysis?.map(t => ({ hour: t.hour, value: t.weight })) || []} />
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">En Yoğun Saatler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(data?.timeAnalysis || [])
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-sm">
                            {item.hour.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{item.count} toplama</span>
                          <span className="font-mono font-bold">{item.weight.toFixed(1)} kg</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Vardiya Analizi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.shiftAnalysis?.map((shift, idx) => {
                    const maxWeight = Math.max(...(data?.shiftAnalysis?.map(s => s.weight) || [1]));
                    const percentage = maxWeight > 0 ? (shift.weight / maxWeight) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{shift.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{shift.count} toplama</span>
                            <span className="font-mono font-bold">{shift.weight.toFixed(1)} kg</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {isHQ && !isViewingSpecificHospital && (
            <HospitalSearchList
              hospitals={data?.hospitalTimeStats || []}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onHospitalClick={(id) => navigate(`/analytics/${id}`)}
              metricLabel="Ort. Süre"
              metricValue={(h) => `${h.avgCollectionTime.toFixed(0)} dk`}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface HospitalSearchListProps {
  hospitals: { id: string; code: string; name: string; hex: string; [key: string]: any }[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onHospitalClick: (id: string) => void;
  metricLabel: string;
  metricValue: (h: any) => string;
  metricColor?: (h: any) => string;
}

function HospitalSearchList({ 
  hospitals, 
  searchQuery, 
  onSearchChange, 
  onHospitalClick,
  metricLabel,
  metricValue,
  metricColor
}: HospitalSearchListProps) {
  const filtered = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Hastaneler
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Hastane ara..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-48"
              data-testid="input-hospital-search"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((h) => (
              <div 
                key={h.id}
                className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                onClick={() => onHospitalClick(h.id)}
                data-testid={`hospital-row-${h.id}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: h.hex }}
                  />
                  <span className="font-medium truncate">{h.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {h.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono ${metricColor?.(h) || ''}`}>
                    {metricLabel}: {metricValue(h)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">"{searchQuery}" ile eşleşen hastane bulunamadı</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Hastane verisi yok</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
