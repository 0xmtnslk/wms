import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Scale, Activity, Clock, AlertTriangle, TrendingUp, 
  Building2, Loader2, RefreshCcw, Search, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { KPICard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { WasteTypeBadge, WASTE_TYPES_CONFIG } from "@/components/waste-type-badge";
import { useAuth, useCurrentHospital, useIsHQ } from "@/lib/auth-context";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface HospitalSummary {
  id: string;
  code: string;
  name: string;
  totalWeight: number;
  pendingCount: number;
  completedCount: number;
  issueCount: number;
  lastCollectionAt: string | null;
}

interface DashboardSummary {
  totalWeight: number;
  pendingCount: number;
  completedCount: number;
  issueCount: number;
  byType: { code: string; label: string; weight: number; hex: string }[];
  byHospital: { code: string; name: string; weight: number; hex: string }[];
  hospitals: HospitalSummary[];
  recentCollections: {
    id: string;
    tagCode: string;
    wasteTypeCode: string;
    weightKg: number | null;
    status: string;
    collectedAt: string;
    hospitalName: string;
    locationCode: string | null;
  }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const hospitalId = isHQ ? undefined : currentHospital?.id;

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary", hospitalId],
  });

  const filteredHospitals = useMemo(() => {
    if (!data?.hospitals) return [];
    const sorted = [...data.hospitals].sort((a, b) => {
      if (!a.lastCollectionAt && !b.lastCollectionAt) return 0;
      if (!a.lastCollectionAt) return 1;
      if (!b.lastCollectionAt) return -1;
      return new Date(b.lastCollectionAt).getTime() - new Date(a.lastCollectionAt).getTime();
    });
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(h => 
      h.name.toLowerCase().includes(query) || 
      h.code.toLowerCase().includes(query)
    );
  }, [data?.hospitals, searchQuery]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const donutData = data?.byType.map(t => ({
    label: t.label,
    value: t.weight,
    hex: t.hex,
  })) || [];

  const hospitalBarData = data?.byHospital.map(h => ({
    label: h.code,
    value: h.weight,
    hex: h.hex,
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {isHQ ? "Tüm hastaneler" : currentHospital?.name} - {format(new Date(), "d MMMM yyyy", { locale: tr })}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Toplam Atık"
          value={data?.totalWeight?.toFixed(1) || "0"}
          unit="kg"
          icon={Scale}
          trend="up"
          trendValue="+12%"
        />
        <KPICard
          title="Bekleyen"
          value={data?.pendingCount || 0}
          icon={Clock}
          iconColorClass="text-amber-500"
        />
        <KPICard
          title="İşlenen"
          value={data?.completedCount || 0}
          icon={Activity}
          iconColorClass="text-emerald-500"
        />
        <KPICard
          title="Uygunsuzluk"
          value={data?.issueCount || 0}
          icon={AlertTriangle}
          iconColorClass="text-rose-500"
          trend={data?.issueCount && data.issueCount > 5 ? "up" : "neutral"}
          trendValue={data?.issueCount && data.issueCount > 5 ? "Dikkat!" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atık Türü Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <DonutChart data={donutData} size={180} />
              <div className="flex flex-wrap justify-center gap-2">
                {donutData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-mono font-medium">{item.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isHQ && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Hastane Bazlı Dağılım
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={hospitalBarData} height={200} />
            </CardContent>
          </Card>
        )}

        {!isHQ && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Performans Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-md bg-muted">
                  <span className="text-sm">Tıbbi Atık Oranı</span>
                  <span className="font-mono font-bold text-rose-500">
                    {data?.byType.find(t => t.code === "medical")?.weight 
                      ? ((data.byType.find(t => t.code === "medical")!.weight / (data.totalWeight || 1)) * 100).toFixed(1)
                      : "0"
                    }%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-md bg-muted">
                  <span className="text-sm">Geri Dönüşüm Oranı</span>
                  <span className="font-mono font-bold text-cyan-500">
                    {data?.byType.find(t => t.code === "recycle")?.weight 
                      ? ((data.byType.find(t => t.code === "recycle")!.weight / (data.totalWeight || 1)) * 100).toFixed(1)
                      : "0"
                    }%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-md bg-muted">
                  <span className="text-sm">İşlem Tamamlanma</span>
                  <span className="font-mono font-bold text-emerald-500">
                    {data?.completedCount && data?.pendingCount !== undefined
                      ? ((data.completedCount / ((data.completedCount + data.pendingCount) || 1)) * 100).toFixed(0)
                      : "0"
                    }%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isHQ ? (
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-hospital-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredHospitals.length > 0 ? (
              <div className="space-y-2">
                {filteredHospitals.map((hospital) => (
                  <div 
                    key={hospital.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/analytics/${hospital.id}`)}
                    data-testid={`hospital-row-${hospital.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{hospital.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {hospital.code}
                          </Badge>
                        </div>
                        {hospital.lastCollectionAt && (
                          <p className="text-xs text-muted-foreground">
                            Son işlem: {format(new Date(hospital.lastCollectionAt), "d MMM HH:mm", { locale: tr })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-mono font-medium">{hospital.totalWeight.toFixed(1)} kg</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-amber-500">{hospital.pendingCount} bekleyen</span>
                          {hospital.issueCount > 0 && (
                            <span className="text-rose-500">{hospital.issueCount} uygunsuz</span>
                          )}
                        </div>
                      </div>
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
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Son İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentCollections && data.recentCollections.length > 0 ? (
              <div className="space-y-2">
                {data.recentCollections.slice(0, 10).map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 ${item.status === 'pending' ? 'cursor-pointer hover-elevate' : ''}`}
                    data-testid={`collection-row-${item.id}`}
                    onClick={() => {
                      if (item.status === 'pending') {
                        navigate(`/collector?weigh=${item.tagCode}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                        {item.tagCode}
                      </code>
                      <WasteTypeBadge code={item.wasteTypeCode} size="sm" />
                      {item.status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                          Bekliyor
                        </Badge>
                      )}
                      {!isHQ && item.hospitalName && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">{item.hospitalName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {item.collectedAt && (
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          {format(new Date(item.collectedAt), "dd MMM HH:mm", { locale: tr })}
                        </span>
                      )}
                      {item.weightKg !== null && item.status === 'completed' && (
                        <span className="text-sm font-mono font-medium">
                          {Number(item.weightKg).toFixed(2)} kg
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <StatusBadge status={item.status as any} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Henüz işlem kaydı yok</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[180px] w-[180px] rounded-full mx-auto" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
