import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Settings2, MapPin, Database, Save, Plus, Edit3, 
  Trash2, Loader2, Building2, CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCurrentHospital, useIsHQ } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LocationCategory {
  id: string;
  code: string;
  name: string;
  unit: string;
  referenceWasteFactor: string;
}

interface Location {
  id: string;
  code: string;
  customLabel: string | null;
  categoryId: string | null;
  categoryName?: string;
  isActive: boolean;
}

interface OperationalCoefficient {
  id: string;
  categoryId: string;
  categoryName: string;
  period: string;
  value: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("locations");

  const hospitalId = currentHospital?.id;

  const { data: categories, isLoading: categoriesLoading } = useQuery<LocationCategory[]>({
    queryKey: ["/api/settings/location-categories"],
  });

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/settings/locations", hospitalId],
    enabled: !!hospitalId,
  });

  const { data: coefficients, isLoading: coefficientsLoading } = useQuery<OperationalCoefficient[]>({
    queryKey: ["/api/settings/operational-coefficients", hospitalId],
    enabled: !!hospitalId,
  });

  const isLoading = categoriesLoading || locationsLoading || coefficientsLoading;

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <p className="text-muted-foreground text-sm">
            {currentHospital?.name || "Genel"} - Sistem parametreleri ve yapılandırma
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="locations" className="gap-2" data-testid="tab-locations">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Mahaller</span>
          </TabsTrigger>
          <TabsTrigger value="coefficients" className="gap-2" data-testid="tab-coefficients">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">HBYS Verileri</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Kategoriler</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-medium">Mahal Listesi</CardTitle>
                  <CardDescription>QR kod ile eşleşen lokasyonlar</CardDescription>
                </div>
                <Button size="sm" data-testid="button-add-location">
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {locations && locations.length > 0 ? (
                <div className="space-y-2">
                  {locations.map((location) => (
                    <div 
                      key={location.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50 hover-elevate"
                      data-testid={`location-row-${location.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                            {location.code}
                          </code>
                          {location.categoryName && (
                            <Badge variant="outline" className="text-xs">
                              {location.categoryName}
                            </Badge>
                          )}
                        </div>
                        {location.customLabel && (
                          <p className="text-sm text-muted-foreground mt-1">{location.customLabel}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={location.isActive ? "default" : "secondary"}>
                          {location.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Henüz mahal tanımlanmamış</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coefficients" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-medium">Operasyonel Katsayılar</CardTitle>
                  <CardDescription>HBYS'den alınan aylık istatistikler</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="2025-01">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Dönem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-01">Ocak 2025</SelectItem>
                      <SelectItem value="2024-12">Aralık 2024</SelectItem>
                      <SelectItem value="2024-11">Kasım 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CoefficientForm 
                categories={categories || []} 
                coefficients={coefficients || []}
                hospitalId={hospitalId || ""}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Mahal Kategorileri</CardTitle>
              <CardDescription>Atık üretim referans değerleri</CardDescription>
            </CardHeader>
            <CardContent>
              {categories && categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div 
                      key={category.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                      data-testid={`category-row-${category.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {category.code}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Birim: {category.unit} | Referans: {category.referenceWasteFactor} kg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Settings2 className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Kategori tanımı yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CoefficientForm({ 
  categories, 
  coefficients,
  hospitalId 
}: { 
  categories: LocationCategory[];
  coefficients: OperationalCoefficient[];
  hospitalId: string;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    coefficients.forEach(c => {
      initial[c.categoryId] = c.value;
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest("POST", "/api/settings/operational-coefficients", {
        hospitalId,
        period: "2025-01",
        values: Object.entries(values).map(([categoryId, value]) => ({
          categoryId,
          value: parseFloat(value) || 0
        }))
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/operational-coefficients"] });
      toast({
        title: "Kaydedildi",
        description: "Operasyonel katsayılar güncellendi",
      });
    } catch (error) {
      toast({
        title: "Hata",
        description: "Kayıt sırasında bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.id} className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <Label className="text-sm">{category.name}</Label>
            <p className="text-xs text-muted-foreground">{category.unit}</p>
          </div>
          <Input
            type="number"
            className="w-32 text-right font-mono"
            value={values[category.id] || ""}
            onChange={(e) => setValues(prev => ({ ...prev, [category.id]: e.target.value }))}
            placeholder="0"
            data-testid={`input-coefficient-${category.code}`}
          />
        </div>
      ))}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-coefficients">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Kaydet
        </Button>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-full" />
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
