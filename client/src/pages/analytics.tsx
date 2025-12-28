import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, GitCompare, AlertOctagon, Target, Coins, Clock,
  TrendingUp, TrendingDown, Building2, Loader2, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskMatrix, RiskActionPanel } from "@/components/risk-matrix";
import { BarChart } from "@/components/charts/bar-chart";
import { TimeChart } from "@/components/charts/time-chart";
import { KPICard } from "@/components/kpi-card";
import { useAuth, useCurrentHospital, useIsHQ } from "@/lib/auth-context";
import { WASTE_TYPES_CONFIG } from "@/components/waste-type-badge";

interface AnalyticsData {
  kpis: {
    wastePerBed: number;
    wastePerSurgery: number;
    wastePerProtocol: number;
    medicalWasteRatio: number;
    recycleRatio: number;
    costEfficiency: number;
  };
  riskMatrix: {
    category: string;
    risk: "low" | "medium" | "high";
    score: number;
    label: string;
  }[];
  costAnalysis: {
    wasteType: string;
    weight: number;
    unitCost: number;
    totalCost: number;
    hex: string;
  }[];
  timeAnalysis: {
    hour: number;
    value: number;
  }[];
  hospitalComparison: {
    hospitalCode: string;
    hospitalName: string;
    totalWeight: number;
    medicalRatio: number;
    recycleRatio: number;
    efficiency: number;
    hex: string;
  }[];
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const [activeTab, setActiveTab] = useState("kpi");
  const [selectedRiskCell, setSelectedRiskCell] = useState<any>(null);

  const hospitalId = isHQ ? undefined : currentHospital?.id;

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", hospitalId],
  });

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  const totalCost = data?.costAnalysis?.reduce((sum, c) => sum + c.totalCost, 0) || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analitik</h1>
          <p className="text-muted-foreground text-sm">
            {isHQ ? "Tüm hastaneler" : currentHospital?.name} - Performans ve risk analizi
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger value="kpi" className="gap-2" data-testid="tab-kpi">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">KPI</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2" data-testid="tab-risk">
            <AlertOctagon className="h-4 w-4" />
            <span className="hidden sm:inline">Risk</span>
          </TabsTrigger>
          {isHQ && (
            <TabsTrigger value="compare" className="gap-2" data-testid="tab-compare">
              <GitCompare className="h-4 w-4" />
              <span className="hidden sm:inline">Karşılaştır</span>
            </TabsTrigger>
          )}
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              title="Yatış Başına Atık"
              value={data?.kpis.wastePerBed?.toFixed(2) || "0"}
              unit="kg/gün"
              icon={Target}
              trend={data?.kpis.wastePerBed && data.kpis.wastePerBed < 1.5 ? "down" : "up"}
              trendValue={data?.kpis.wastePerBed && data.kpis.wastePerBed < 1.5 ? "İyi" : "Yüksek"}
            />
            <KPICard
              title="Ameliyat Başına"
              value={data?.kpis.wastePerSurgery?.toFixed(2) || "0"}
              unit="kg"
              icon={Target}
            />
            <KPICard
              title="Protokol Başına"
              value={data?.kpis.wastePerProtocol?.toFixed(3) || "0"}
              unit="kg"
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
              <CardTitle className="text-sm font-medium">Mahal Kategorisi Bazlı Performans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Yoğun Bakım", "Ameliyathane", "Poliklinik", "Servis", "İdari"].map((cat, idx) => {
                  const performance = Math.random() * 100;
                  const isGood = performance < 60;
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <span className="w-24 text-sm text-muted-foreground truncate">{cat}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${performance}%` }}
                        />
                      </div>
                      <span className={`text-sm font-mono w-12 text-right ${isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {performance.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <RiskMatrix 
              data={data?.riskMatrix || []} 
              onCellClick={(cell) => setSelectedRiskCell(cell)}
            />
            {selectedRiskCell ? (
              <RiskActionPanel
                risk={selectedRiskCell.risk}
                category={selectedRiskCell.label}
                actions={[
                  "Atık ayrıştırma eğitimi düzenle",
                  "Görsel uyarı materyallerini güncelle",
                  "Haftalık denetim programı başlat",
                  "Personel performans takibi yap"
                ]}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  <div className="text-center">
                    <AlertOctagon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Detay görmek için risk hücresine tıklayın</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {isHQ && (
          <TabsContent value="compare" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hastane Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.hospitalComparison?.map((hospital, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-md bg-muted/50 space-y-3"
                      data-testid={`hospital-compare-${hospital.hospitalCode}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: hospital.hex }}
                          />
                          <span className="font-medium">{hospital.hospitalName}</span>
                        </div>
                        <Badge variant="outline">
                          {hospital.totalWeight.toFixed(1)} kg
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Tıbbi Oran</p>
                          <p className="text-lg font-mono font-bold text-rose-500">
                            {(hospital.medicalRatio * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Geri Dönüşüm</p>
                          <p className="text-lg font-mono font-bold text-cyan-500">
                            {(hospital.recycleRatio * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Verimlilik</p>
                          <p className="text-lg font-mono font-bold text-emerald-500">
                            {(hospital.efficiency * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="cost" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-3 gap-4">
            <KPICard
              title="Toplam Maliyet"
              value={totalCost.toFixed(2)}
              unit="TL"
              icon={Coins}
              iconColorClass="text-amber-500"
            />
            <KPICard
              title="Ortalama kg/TL"
              value={(totalCost / (data?.costAnalysis?.reduce((s, c) => s + c.weight, 0) || 1)).toFixed(2)}
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
                      <span className="text-muted-foreground">×</span>
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
        </TabsContent>

        <TabsContent value="time" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Saatlik Atık Toplama Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeChart data={data?.timeAnalysis || []} />
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
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="font-mono text-sm">
                          {item.hour.toString().padStart(2, '0')}:00
                        </span>
                        <span className="font-mono font-bold">{item.value.toFixed(1)} kg</span>
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
                  {[
                    { name: "Sabah (08-16)", hours: [8,9,10,11,12,13,14,15] },
                    { name: "Akşam (16-24)", hours: [16,17,18,19,20,21,22,23] },
                    { name: "Gece (00-08)", hours: [0,1,2,3,4,5,6,7] }
                  ].map((shift, idx) => {
                    const total = shift.hours.reduce((sum, h) => {
                      const found = data?.timeAnalysis?.find(t => t.hour === h);
                      return sum + (found?.value || 0);
                    }, 0);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                        <span className="text-sm">{shift.name}</span>
                        <span className="font-mono font-bold">{total.toFixed(1)} kg</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
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
