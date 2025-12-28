import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { 
  Settings2, MapPin, Database, Save, Plus, Edit3, 
  Trash2, Loader2, Building2, CheckCircle2, QrCode,
  Printer, X, Eye, DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

interface WasteTypeCost {
  id: string;
  wasteTypeId: string;
  wasteTypeName: string;
  wasteTypeCode: string;
  wasteTypeColor: string;
  effectiveFrom: string;
  costPerKg: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const isHQ = useIsHQ();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => isHQ ? "categories" : "locations");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

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

  const { data: wasteTypeCosts, isLoading: costsLoading } = useQuery<WasteTypeCost[]>({
    queryKey: ["/api/settings/waste-type-costs"],
  });

  const isLoading = categoriesLoading || locationsLoading || coefficientsLoading || costsLoading;

  const handleShowQR = (location: Location) => {
    setSelectedLocation(location);
    setShowQRDialog(true);
  };

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
        <TabsList className={`grid w-full h-auto ${isHQ ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {isHQ ? (
            <>
              <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Kategoriler</span>
              </TabsTrigger>
              <TabsTrigger value="costs" className="gap-2" data-testid="tab-costs">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Maliyetler</span>
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="locations" className="gap-2" data-testid="tab-locations">
                <QrCode className="h-4 w-4" />
                <span className="hidden sm:inline">Mahaller</span>
              </TabsTrigger>
              <TabsTrigger value="coefficients" className="gap-2" data-testid="tab-coefficients">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">HBYS Verileri</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="locations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-medium">Mahal Listesi</CardTitle>
                  <CardDescription>QR kod ile eşleşen lokasyonlar - Toplam: {locations?.length || 0}</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="button-add-location">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Mahal Ekle
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
                        <div className="flex items-center gap-2 flex-wrap">
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleShowQR(location)}
                          data-testid={`button-qr-${location.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <QrCode className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Henüz mahal tanımlanmamış</p>
                  <p className="text-xs mt-1">Yeni mahal ekleyerek QR kodlarını oluşturabilirsiniz</p>
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-medium">Mahal Kategorileri</CardTitle>
                  <CardDescription>Atık üretim referans değerleri - Tüm hastaneler için geçerli</CardDescription>
                </div>
                {isHQ && (
                  <Button size="sm" onClick={() => setShowAddCategoryDialog(true)} data-testid="button-add-category">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Kategori
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CategoryReferenceForm 
                categories={categories || []} 
                isEditable={isHQ}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-medium">Atık Tipi Maliyetleri</CardTitle>
                  <CardDescription>Dönemsel maliyet tanımları (TL/kg)</CardDescription>
                </div>
                {!isHQ && (
                  <Badge variant="secondary" className="text-xs">
                    Sadece görüntüleme
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <WasteTypeCostsForm 
                costs={wasteTypeCosts || []} 
                isEditable={isHQ}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddLocationDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
        categories={categories || []}
        hospitalId={hospitalId || ""}
        hospitalName={currentHospital?.name || ""}
      />

      <QRCodeDialog
        open={showQRDialog}
        onOpenChange={setShowQRDialog}
        location={selectedLocation}
        hospitalName={currentHospital?.name || ""}
      />

      <AddCategoryDialog
        open={showAddCategoryDialog}
        onOpenChange={setShowAddCategoryDialog}
      />
    </div>
  );
}

function AddLocationDialog({ 
  open, 
  onOpenChange, 
  categories,
  hospitalId,
  hospitalName
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: LocationCategory[];
  hospitalId: string;
  hospitalName: string;
}) {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!categoryId) {
      toast({
        title: "Hata",
        description: "Lütfen bir kategori seçin",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/settings/locations", {
        hospitalId,
        categoryId,
        customLabel: customLabel.trim() || null
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/settings/locations", hospitalId] });
      
      toast({
        title: "Başarılı",
        description: "Yeni mahal oluşturuldu ve QR kodu hazır",
      });
      
      setCategoryId("");
      setCustomLabel("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Hata",
        description: "Mahal oluşturulurken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Yeni Mahal Ekle
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hastane</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">{hospitalName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Mahal Kategorisi <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Kategori seçin..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customLabel" className="text-sm font-medium">
              Açıklama / Detay
            </Label>
            <Textarea
              id="customLabel"
              placeholder="Örn: 3. Kat Yatan Hasta Servisi, 2. Kat İdari Ofisler..."
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-custom-label"
            />
            <p className="text-xs text-muted-foreground">
              QR kodun yanında görünecek ek bilgi
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !categoryId}
            data-testid="button-create-location"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QRCodeDialog({
  open,
  onOpenChange,
  location,
  hospitalName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
  hospitalName: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Kod - ${location?.code}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
              }
              .qr-container {
                text-align: center;
                padding: 24px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                max-width: 300px;
              }
              .qr-code {
                margin: 16px 0;
              }
              .hospital-name {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              .category-name {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 4px;
              }
              .custom-label {
                font-size: 14px;
                color: #374151;
                margin-bottom: 12px;
              }
              .code {
                font-family: monospace;
                font-size: 10px;
                background: #f3f4f6;
                padding: 8px 12px;
                border-radius: 6px;
                word-break: break-all;
              }
              @media print {
                body {
                  padding: 0;
                }
                .qr-container {
                  border: 1px solid #000;
                }
              }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Kod
          </DialogTitle>
        </DialogHeader>
        
        <div ref={printRef} className="flex justify-center py-4">
          <div className="qr-container text-center p-6 border rounded-lg bg-white">
            <p className="hospital-name text-sm text-muted-foreground mb-2">{hospitalName}</p>
            <p className="category-name text-base font-semibold">{location.categoryName}</p>
            {location.customLabel && (
              <p className="custom-label text-sm text-foreground mb-3">{location.customLabel}</p>
            )}
            <div className="qr-code my-4">
              <QRCodeSVG 
                value={location.code} 
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <code className="code text-xs bg-muted px-3 py-2 rounded block font-mono">
              {location.code}
            </code>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button onClick={handlePrint} data-testid="button-print-qr">
            <Printer className="h-4 w-4 mr-2" />
            Yazdır
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCategoryDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceWasteFactor, setReferenceWasteFactor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim() || !unit.trim()) {
      toast({
        title: "Hata",
        description: "Lütfen tüm zorunlu alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/settings/location-categories", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        unit: unit.trim(),
        referenceWasteFactor: parseFloat(referenceWasteFactor) || 0
      });

      queryClient.invalidateQueries({ queryKey: ["/api/settings/location-categories"] });
      toast({
        title: "Kategori Eklendi",
        description: `${name} kategorisi tüm hastaneler için oluşturuldu`,
      });
      onOpenChange(false);
      setCode("");
      setName("");
      setUnit("");
      setReferenceWasteFactor("");
    } catch (error: any) {
      const message = error?.message?.includes("403") 
        ? "Bu işlem için yetkiniz yok" 
        : "Kayıt sırasında bir hata oluştu";
      toast({
        title: "Hata",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Kategori Ekle</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Bu kategori tüm hastaneler için otomatik olarak geçerli olacaktır.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="category-code">Kategori Kodu</Label>
            <Input
              id="category-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="YATAK, YEMEK, vb."
              className="font-mono"
              data-testid="input-category-code"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category-name">Kategori Adı</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yatak Sayısı, Yemek Sayısı, vb."
              data-testid="input-category-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-unit">Birim</Label>
            <Input
              id="category-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="adet, porsiyon, vb."
              data-testid="input-category-unit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-factor">Referans Atık Faktörü (kg)</Label>
            <Input
              id="reference-factor"
              type="number"
              step="0.01"
              min="0"
              value={referenceWasteFactor}
              onChange={(e) => setReferenceWasteFactor(e.target.value)}
              placeholder="0.00"
              className="font-mono"
              data-testid="input-reference-factor"
            />
            <p className="text-xs text-muted-foreground">
              Bu değer birim başına beklenen atık miktarını (kg) belirtir
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="button-submit-category">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryReferenceForm({ 
  categories, 
  isEditable 
}: { 
  categories: LocationCategory[];
  isEditable: boolean;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    categories.forEach(c => {
      initial[c.id] = c.referenceWasteFactor;
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set());

  const handleValueChange = (categoryId: string, value: string) => {
    setValues(prev => ({ ...prev, [categoryId]: value }));
    setEditedIds(prev => new Set(prev).add(categoryId));
  };

  const handleSave = async () => {
    if (editedIds.size === 0) return;
    
    setIsSaving(true);
    try {
      const idsToUpdate = Array.from(editedIds);
      for (const categoryId of idsToUpdate) {
        await apiRequest("PATCH", `/api/settings/location-categories/${categoryId}`, {
          referenceWasteFactor: parseFloat(values[categoryId]) || 0
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/settings/location-categories"] });
      toast({
        title: "Kaydedildi",
        description: "Referans değerleri güncellendi",
      });
      setEditedIds(new Set());
    } catch (error: any) {
      const message = error?.message?.includes("403") 
        ? "Bu işlem için yetkiniz yok" 
        : "Kayıt sırasında bir hata oluştu";
      toast({
        title: "Hata",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Settings2 className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Kategori tanımı yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div 
          key={category.id} 
          className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
          data-testid={`category-row-${category.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {category.code}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Birim: {category.unit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditable ? (
              <>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-24 text-right font-mono"
                  value={values[category.id] || ""}
                  onChange={(e) => handleValueChange(category.id, e.target.value)}
                  data-testid={`input-reference-${category.code}`}
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </>
            ) : (
              <span className="font-mono text-sm">
                {category.referenceWasteFactor} kg
              </span>
            )}
          </div>
        </div>
      ))}
      {isEditable && editedIds.size > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-references">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Kaydet
          </Button>
        </div>
      )}
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

interface WasteTypeInfo {
  id: string;
  code: string;
  name: string;
  colorHex: string;
}

function WasteTypeCostsForm({ 
  costs, 
  isEditable 
}: { 
  costs: WasteTypeCost[];
  isEditable: boolean;
}) {
  const { toast } = useToast();
  const [effectiveFrom, setEffectiveFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showNewCostForm, setShowNewCostForm] = useState(false);

  const { data: wasteTypes } = useQuery<WasteTypeInfo[]>({
    queryKey: ["/api/waste-types"],
  });

  const currentCosts = (wasteTypes || []).map(wt => {
    const matching = costs
      .filter(c => c.wasteTypeId === wt.id)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    return {
      wasteType: wt,
      currentCost: matching[0] || null,
      history: matching
    };
  });

  const handleValueChange = (wasteTypeId: string, value: string) => {
    setValues(prev => ({ ...prev, [wasteTypeId]: value }));
  };

  const handleSave = async () => {
    const costsToSave = Object.entries(values).filter(([, v]) => v !== "");
    if (costsToSave.length === 0) {
      toast({
        title: "Uyarı",
        description: "Lütfen en az bir maliyet değeri girin",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const costsData = costsToSave.map(([wasteTypeId, costPerKg]) => ({
        wasteTypeId,
        costPerKg: parseFloat(costPerKg) || 0
      }));

      await apiRequest("POST", "/api/settings/waste-type-costs", {
        effectiveFrom,
        costs: costsData
      });

      queryClient.invalidateQueries({ queryKey: ["/api/settings/waste-type-costs"] });
      toast({
        title: "Kaydedildi",
        description: `${effectiveFrom} tarihinden itibaren yeni maliyetler geçerli olacak`,
      });
      setValues({});
      setShowNewCostForm(false);
    } catch (error: any) {
      const message = error?.message?.includes("403") 
        ? "Bu işlem için yetkiniz yok" 
        : "Kayıt sırasında bir hata oluştu";
      toast({
        title: "Hata",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-sm font-medium">Güncel Maliyetler</h3>
          {isEditable && !showNewCostForm && (
            <Button 
              size="sm" 
              onClick={() => setShowNewCostForm(true)}
              data-testid="button-add-new-costs"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Maliyet Ekle
            </Button>
          )}
        </div>

        {currentCosts.map(({ wasteType, currentCost }) => (
          <div 
            key={wasteType.id} 
            className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
            data-testid={`cost-row-${wasteType.code}`}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: wasteType.colorHex }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{wasteType.name}</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {wasteType.code}
                </Badge>
              </div>
              {currentCost && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(currentCost.effectiveFrom)} tarihinden itibaren
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {currentCost?.costPerKg || "0.00"} TL/kg
              </span>
            </div>
          </div>
        ))}
      </div>

      {showNewCostForm && isEditable && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-medium">Yeni Maliyet Tanımı</CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowNewCostForm(false);
                  setValues({});
                }}
                data-testid="button-close-cost-form"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Geçerlilik Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-48"
                data-testid="input-effective-from"
              />
              <p className="text-xs text-muted-foreground">
                Bu tarihten itibaren aşağıdaki maliyetler geçerli olacak
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {(wasteTypes || []).map((wt) => (
                <div key={wt.id} className="flex items-center gap-4">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: wt.colorHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{wt.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      className="w-24 text-right font-mono"
                      value={values[wt.id] || ""}
                      onChange={(e) => handleValueChange(wt.id, e.target.value)}
                      placeholder={currentCosts.find(c => c.wasteType.id === wt.id)?.currentCost?.costPerKg || "0.00"}
                      data-testid={`input-new-cost-${wt.code}`}
                    />
                    <span className="text-sm text-muted-foreground">TL/kg</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowNewCostForm(false);
                  setValues({});
                }}
              >
                İptal
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSaving || Object.values(values).every(v => !v)}
                data-testid="button-save-costs"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {costs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Maliyet Geçmişi</h3>
          <div className="space-y-2">
            {costs.map((cost) => (
              <div 
                key={cost.id} 
                className="flex items-center gap-4 p-2 rounded-md text-sm"
                data-testid={`cost-history-${cost.id}`}
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cost.wasteTypeColor }}
                />
                <span className="text-muted-foreground min-w-24">
                  {formatDate(cost.effectiveFrom)}
                </span>
                <span className="flex-1">{cost.wasteTypeName}</span>
                <span className="font-mono">
                  {cost.costPerKg} TL/kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
