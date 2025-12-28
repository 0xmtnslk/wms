import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  FileText, Download, Image, FileSpreadsheet, Filter, Calendar,
  Building2, Trash2, Scale, Banknote, TrendingUp, PieChart, BarChart3,
  Search, X, Check, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

interface ReportsData {
  summary: {
    totalWeight: number;
    totalCost: number;
    totalCollections: number;
    hospitalCount: number;
    avgWeightPerCollection: number;
    avgCostPerKg: number;
  };
  wasteTypes: { name: string; code: string; weight: number; cost: number; color: string }[];
  hospitals: { name: string; code: string; weight: number; cost: number; color: string }[];
  categories: { name: string; weight: number; cost: number }[];
  trend: { month: string; weight: number; cost: number }[];
  tableData: {
    id: string;
    date: string;
    hospital: string;
    hospitalCode: string;
    wasteType: string;
    wasteTypeCode: string;
    category: string;
    location: string;
    weightKg: number;
    cost: number;
  }[];
}

const PRESET_RANGES = [
  { label: "Bu Ay", getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: "Son 3 Ay", getValue: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
  { label: "Son 6 Ay", getValue: () => ({ start: subMonths(new Date(), 6), end: new Date() }) },
  { label: "Bu Yıl", getValue: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) },
];

function ChartExportContainer({ 
  children, 
  title, 
  onExportPNG 
}: { 
  children: React.ReactNode; 
  title: string;
  onExportPNG: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPNG}
          className="gap-1.5"
          data-testid={`button-export-${title.toLowerCase().replace(/\s/g, '-')}`}
        >
          <Image className="h-3.5 w-3.5" />
          PNG
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subMonths(new Date(), 3),
    end: new Date()
  });
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);
  const [showAllHospitals, setShowAllHospitals] = useState(true);

  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const hospitalChartRef = useRef<HTMLDivElement>(null);

  const { data: allHospitals } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["/api/hospitals"],
  });

  const { data: wasteTypes } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["/api/waste-types"],
  });

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/settings/location-categories"],
  });

  const filteredHospitals = useMemo(() => {
    if (!allHospitals) return [];
    if (!hospitalSearch) return allHospitals;
    return allHospitals.filter(h =>
      h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.code.toLowerCase().includes(hospitalSearch.toLowerCase())
    );
  }, [allHospitals, hospitalSearch]);

  const hospitalIds = showAllHospitals ? "all" : selectedHospitals.join(',');

  const { data, isLoading, refetch } = useQuery<ReportsData>({
    queryKey: ["/api/reports", dateRange.start, dateRange.end, hospitalIds, wasteTypeFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        hospitalFilter: hospitalIds,
        wasteTypeFilter,
        categoryFilter
      });
      const res = await fetch(`/api/reports?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const toggleHospital = (id: string) => {
    setShowAllHospitals(false);
    setSelectedHospitals(prev =>
      prev.includes(id)
        ? prev.filter(h => h !== id)
        : [...prev, id]
    );
  };

  const selectAllHospitals = () => {
    setShowAllHospitals(true);
    setSelectedHospitals([]);
  };

  const exportChartAsPNG = useCallback(async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#1a1a2e',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: "Grafik indirildi", description: `${filename}.png olarak kaydedildi` });
    } catch (error) {
      toast({ title: "Hata", description: "Grafik indirilemedi", variant: "destructive" });
    }
  }, [toast]);

  const exportToExcel = useCallback((type: 'hospital' | 'wasteType' | 'all') => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    if (type === 'all') {
      const summaryData = [
        { 'Metrik': 'Toplam Ağırlık (kg)', 'Değer': data.summary.totalWeight.toFixed(2) },
        { 'Metrik': 'Toplam Maliyet (TL)', 'Değer': data.summary.totalCost.toFixed(2) },
        { 'Metrik': 'Toplam Kayıt', 'Değer': data.summary.totalCollections.toString() },
        { 'Metrik': 'Hastane Sayısı', 'Değer': data.summary.hospitalCount.toString() },
        { 'Metrik': 'Ort. Ağırlık/Kayıt (kg)', 'Değer': data.summary.avgWeightPerCollection.toFixed(2) },
        { 'Metrik': 'Ort. Maliyet/kg (TL)', 'Değer': data.summary.avgCostPerKg.toFixed(2) },
        { 'Metrik': 'Rapor Tarihi', 'Değer': format(new Date(), 'dd.MM.yyyy HH:mm', { locale: tr }) },
        { 'Metrik': 'Tarih Aralığı', 'Değer': `${format(dateRange.start, 'dd.MM.yyyy')} - ${format(dateRange.end, 'dd.MM.yyyy')}` },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');
    }

    if (type === 'all' || type === 'hospital') {
      const hospitalData = data.hospitals.map(h => ({
        'Hastane': h.name,
        'Kod': h.code,
        'Toplam Ağırlık (kg)': h.weight.toFixed(2),
        'Toplam Maliyet (TL)': h.cost.toFixed(2)
      }));
      const wsHospital = XLSX.utils.json_to_sheet(hospitalData);
      XLSX.utils.book_append_sheet(wb, wsHospital, 'Hastane Bazlı');
    }

    if (type === 'all' || type === 'wasteType') {
      const wasteData = data.wasteTypes.map(w => ({
        'Atık Türü': w.name,
        'Kod': w.code,
        'Toplam Ağırlık (kg)': w.weight.toFixed(2),
        'Toplam Maliyet (TL)': w.cost.toFixed(2)
      }));
      const wsWaste = XLSX.utils.json_to_sheet(wasteData);
      XLSX.utils.book_append_sheet(wb, wsWaste, 'Atık Türü Bazlı');
    }

    if (type === 'all') {
      const categoryData = data.categories.map(c => ({
        'Kategori': c.name,
        'Toplam Ağırlık (kg)': c.weight.toFixed(2),
        'Toplam Maliyet (TL)': c.cost.toFixed(2)
      }));
      const wsCategory = XLSX.utils.json_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, wsCategory, 'Kategori Bazlı');

      const trendData = data.trend.map(t => ({
        'Ay': format(new Date(t.month + '-01'), 'MMMM yyyy', { locale: tr }),
        'Toplam Ağırlık (kg)': t.weight.toFixed(2),
        'Toplam Maliyet (TL)': t.cost.toFixed(2)
      }));
      const wsTrend = XLSX.utils.json_to_sheet(trendData);
      XLSX.utils.book_append_sheet(wb, wsTrend, 'Aylık Trend');

      const detailData = data.tableData.map(row => ({
        'Tarih': row.date ? format(new Date(row.date), 'dd.MM.yyyy HH:mm') : '',
        'Hastane': row.hospital,
        'Hastane Kodu': row.hospitalCode,
        'Atık Türü': row.wasteType,
        'Kategori': row.category,
        'Lokasyon': row.location,
        'Ağırlık (kg)': row.weightKg.toFixed(2),
        'Maliyet (TL)': row.cost.toFixed(2)
      }));
      const wsDetail = XLSX.utils.json_to_sheet(detailData);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Detaylı Veriler');
    }

    const filename = `rapor_${type}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast({ title: "Excel indirildi", description: `${filename} olarak kaydedildi` });
  }, [data, dateRange, toast]);

  const COLORS = ['#e11d48', '#f59e0b', '#64748b', '#06b6d4', '#22c55e', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Raporlar
          </h1>
          <p className="text-muted-foreground">
            Karşılaştırmalı analizler ve veri indirme
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="gap-1.5"
            data-testid="button-refresh-reports"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="default" className="gap-1.5" data-testid="button-export-excel">
                <FileSpreadsheet className="h-4 w-4" />
                Excel İndir
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => exportToExcel('hospital')}
                  data-testid="button-excel-hospital"
                >
                  <Building2 className="h-4 w-4" />
                  Hastane Bazlı
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => exportToExcel('wasteType')}
                  data-testid="button-excel-waste"
                >
                  <Trash2 className="h-4 w-4" />
                  Atık Türü Bazlı
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => exportToExcel('all')}
                  data-testid="button-excel-all"
                >
                  <FileText className="h-4 w-4" />
                  Tüm Veriler
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Tarih Aralığı</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_RANGES.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange(preset.getValue())}
                    className="text-xs"
                    data-testid={`button-preset-${preset.label}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(dateRange.start, 'dd.MM.yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(dateRange.end, 'dd.MM.yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                      locale={tr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Hastane</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Hastane ara..."
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      className="pl-9 h-8 text-sm"
                      data-testid="input-hospital-search"
                    />
                  </div>
                  <Button
                    variant={showAllHospitals ? "default" : "outline"}
                    size="sm"
                    onClick={selectAllHospitals}
                    data-testid="button-all-hospitals"
                  >
                    Tümü
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30 max-h-24 overflow-y-auto">
                  {filteredHospitals.map((h) => (
                    <div
                      key={h.id}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer transition-all",
                        !showAllHospitals && selectedHospitals.includes(h.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover-elevate"
                      )}
                      onClick={() => toggleHospital(h.id)}
                      data-testid={`toggle-hospital-${h.id}`}
                    >
                      {!showAllHospitals && selectedHospitals.includes(h.id) && <Check className="h-3 w-3" />}
                      {h.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Atık Türü</label>
              <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
                <SelectTrigger data-testid="select-waste-type">
                  <SelectValue placeholder="Tüm Atık Türleri" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Atık Türleri</SelectItem>
                  {wasteTypes?.map((wt) => (
                    <SelectItem key={wt.id} value={wt.id}>{wt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Kategori</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Tüm Kategoriler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Scale className="h-4 w-4" />
                    <span className="text-xs">Toplam Ağırlık</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.totalWeight.toFixed(1)} kg</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs">Toplam Maliyet</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.totalCost.toLocaleString('tr-TR')} TL</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">Toplam Kayıt</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.totalCollections}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="h-4 w-4" />
                    <span className="text-xs">Hastane Sayısı</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.hospitalCount}</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Scale className="h-4 w-4" />
                    <span className="text-xs">Ort. Ağırlık/Kayıt</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.avgWeightPerCollection.toFixed(2)} kg</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs">Ort. Maliyet/kg</span>
                  </div>
                  <p className="text-xl font-bold font-mono">{data.summary.avgCostPerKg.toFixed(2)} TL</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div ref={pieChartRef}>
              <ChartExportContainer
                title="Atık Türü Dağılımı"
                onExportPNG={() => exportChartAsPNG(pieChartRef, 'atik_turu_dagilimi')}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={data.wasteTypes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="weight"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.wasteTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(2)} kg`}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </ChartExportContainer>
            </div>

            <div ref={hospitalChartRef}>
              <ChartExportContainer
                title="Hastane Bazlı Karşılaştırma"
                onExportPNG={() => exportChartAsPNG(hospitalChartRef, 'hastane_karsilastirma')}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hospitals.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(2)} kg`}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="weight" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartExportContainer>
            </div>

            <div ref={barChartRef}>
              <ChartExportContainer
                title="Maliyet Karşılaştırması"
                onExportPNG={() => exportChartAsPNG(barChartRef, 'maliyet_karsilastirmasi')}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.wasteTypes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(2)} TL`}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar dataKey="cost" name="Maliyet (TL)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartExportContainer>
            </div>

            <div ref={trendChartRef}>
              <ChartExportContainer
                title="Aylık Trend"
                onExportPNG={() => exportChartAsPNG(trendChartRef, 'aylik_trend')}
              >
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM yy', { locale: tr })}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        labelFormatter={(value) => format(new Date(value + '-01'), 'MMMM yyyy', { locale: tr })}
                        formatter={(value: number, name: string) =>
                          name === 'weight' ? `${value.toFixed(2)} kg` : `${value.toFixed(2)} TL`
                        }
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend formatter={(value) => value === 'weight' ? 'Ağırlık (kg)' : 'Maliyet (TL)'} />
                      <Line type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                      <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartExportContainer>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-sm font-medium">Veri Tablosu ({data.tableData.length} kayıt)</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{data.tableData.length} kayıt</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Tarih</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Hastane</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Atık Türü</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Kategori</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Ağırlık</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Maliyet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tableData.slice(0, 50).map((row, idx) => (
                      <tr key={row.id} className="border-b border-border/50 hover-elevate">
                        <td className="py-2 px-3 text-muted-foreground">
                          {row.date ? format(new Date(row.date), 'dd.MM.yyyy') : '-'}
                        </td>
                        <td className="py-2 px-3">{row.hospital}</td>
                        <td className="py-2 px-3">{row.wasteType}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.category}</td>
                        <td className="py-2 px-3 text-right font-mono">{row.weightKg.toFixed(2)} kg</td>
                        <td className="py-2 px-3 text-right font-mono">{row.cost.toFixed(2)} TL</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.tableData.length > 50 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    İlk 50 kayıt gösteriliyor. Tüm veriler için Excel indir.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
