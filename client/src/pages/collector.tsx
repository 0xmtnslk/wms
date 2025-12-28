import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  QrCode, Scale, AlertTriangle, ArrowLeft, ScanLine, 
  Printer, CheckCircle2, Keyboard, Save, Camera,
  MapPin, Loader2, RefreshCcw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useCurrentHospital } from "@/lib/auth-context";
import { WASTE_TYPES_CONFIG, WasteTypeSelectCard } from "@/components/waste-type-badge";
import { apiRequest, queryClient } from "@/lib/queryClient";

type CollectorView = "menu" | "collect" | "weigh" | "issue";

interface Location {
  id: string;
  code: string;
  customLabel: string | null;
}

export default function CollectorPage() {
  const [currentView, setCurrentView] = useState<CollectorView>("menu");

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {currentView === "menu" && <CollectorMenu onNavigate={setCurrentView} />}
      {currentView === "collect" && <CollectView onBack={() => setCurrentView("menu")} />}
      {currentView === "weigh" && <WeighView onBack={() => setCurrentView("menu")} />}
      {currentView === "issue" && <IssueView onBack={() => setCurrentView("menu")} />}
    </div>
  );
}

function CollectorMenu({ onNavigate }: { onNavigate: (view: CollectorView) => void }) {
  const currentHospital = useCurrentHospital();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in duration-500">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">Saha Operasyonları</h1>
        <p className="text-muted-foreground text-sm">{currentHospital?.name}</p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        <Button
          size="lg"
          className="h-20 text-lg gap-3"
          onClick={() => onNavigate("collect")}
          data-testid="button-collect"
        >
          <QrCode className="h-6 w-6" />
          Saha Topla
        </Button>

        <Button
          size="lg"
          variant="secondary"
          className="h-20 text-lg gap-3"
          onClick={() => onNavigate("weigh")}
          data-testid="button-weigh"
        >
          <Scale className="h-6 w-6" />
          Kantar / Tartım
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="h-20 text-lg gap-3 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          onClick={() => onNavigate("issue")}
          data-testid="button-report-issue"
        >
          <AlertTriangle className="h-6 w-6" />
          Uygunsuzluk Bildirimi
        </Button>
      </div>
    </div>
  );
}

function CollectView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"scan" | "type" | "confirm">("scan");
  const [locationCode, setLocationCode] = useState("");
  const [selectedWasteType, setSelectedWasteType] = useState<string | null>(null);
  const [tagCode, setTagCode] = useState("");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/settings/locations", currentHospital?.id],
    enabled: !!currentHospital?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/waste/collections", {
        hospitalId: currentHospital?.id,
        locationCode,
        wasteTypeCode: selectedWasteType,
        tagCode,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Kayıt oluşturuldu",
        description: `Etiket: ${tagCode}`,
      });
      setStep("scan");
      setLocationCode("");
      setSelectedWasteType(null);
      setTagCode("");
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kayıt oluşturulamadı",
        variant: "destructive",
      });
    }
  });

  const generateTagCode = () => {
    const code = `TAG-${Date.now().toString(36).toUpperCase()}`;
    setTagCode(code);
  };

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Saha Topla</h2>
          <p className="text-sm text-muted-foreground">
            {step === "scan" ? "1/3 Lokasyon" : step === "type" ? "2/3 Atık Türü" : "3/3 Onay"}
          </p>
        </div>
      </div>

      {step === "scan" && (
        <div className="flex-1 flex flex-col space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">QR Kod Tara veya Manuel Gir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full h-24 gap-2" variant="outline" data-testid="button-scan-qr">
                <ScanLine className="h-6 w-6" />
                QR Kod Tara
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">veya</span>
                </div>
              </div>

              <Select value={locationCode} onValueChange={setLocationCode}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Lokasyon seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.code}>
                      {loc.code} {loc.customLabel && `(${loc.customLabel})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button
            className="mt-auto"
            size="lg"
            disabled={!locationCode}
            onClick={() => setStep("type")}
            data-testid="button-next-step"
          >
            Devam Et
          </Button>
        </div>
      )}

      {step === "type" && (
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">{locationCode}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {WASTE_TYPES_CONFIG.map((type) => (
              <WasteTypeSelectCard
                key={type.id}
                type={type}
                selected={selectedWasteType === type.code}
                onClick={() => setSelectedWasteType(type.code)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("scan")} data-testid="button-prev-step">
              Geri
            </Button>
            <Button
              className="flex-1"
              size="lg"
              disabled={!selectedWasteType}
              onClick={() => {
                generateTagCode();
                setStep("confirm");
              }}
              data-testid="button-next-step"
            >
              Devam Et
            </Button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="flex-1 flex flex-col space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Etiket Önizleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-md border-2 border-dashed border-border bg-background text-center space-y-2">
                <div className="text-xs text-muted-foreground">ISGMed Atık Yönetimi</div>
                <div className="text-2xl font-mono font-bold">{tagCode}</div>
                <div className="flex justify-center gap-2">
                  <Badge className={WASTE_TYPES_CONFIG.find(t => t.code === selectedWasteType)?.color}>
                    {WASTE_TYPES_CONFIG.find(t => t.code === selectedWasteType)?.label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{locationCode}</div>
                <div className="pt-2">
                  <div className="h-8 bg-foreground/10 rounded flex items-center justify-center text-xs text-muted-foreground">
                    [Barkod Alanı]
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => generateTagCode()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Yeni Kod
            </Button>
          </div>

          <div className="flex gap-2 mt-auto">
            <Button variant="outline" onClick={() => setStep("type")} data-testid="button-prev-step">
              Geri
            </Button>
            <Button
              className="flex-1"
              size="lg"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-confirm"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Kaydet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WeighView({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [tagCode, setTagCode] = useState("");
  const [weight, setWeight] = useState("");
  const [isManual, setIsManual] = useState(true);

  const weighMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/waste/collections/${tagCode}/weigh`, {
        weightKg: parseFloat(weight),
        isManualWeight: isManual,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Tartım kaydedildi",
        description: `${weight} kg - ${tagCode}`,
      });
      setTagCode("");
      setWeight("");
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Etiket bulunamadı veya tartım kaydedilemedi",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Kantar / Tartım</h2>
          <p className="text-sm text-muted-foreground">Etiket barkodunu okutun</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Etiket Kodu</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="TAG-XXXXXX"
                  value={tagCode}
                  onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  data-testid="input-tag-code"
                />
                <Button variant="outline" size="icon">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ağırlık (kg)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="text-2xl font-mono text-center h-16"
                data-testid="input-weight"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 5, 10, 15, 20, 25].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  onClick={() => setWeight(num.toString())}
                  className="font-mono"
                >
                  {num}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!tagCode || !weight || weighMutation.isPending}
          onClick={() => weighMutation.mutate()}
          data-testid="button-save-weight"
        >
          {weighMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Tartımı Kaydet
        </Button>
      </div>
    </div>
  );
}

function IssueView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const { toast } = useToast();
  
  const [category, setCategory] = useState("");
  const [tagCode, setTagCode] = useState("");
  const [description, setDescription] = useState("");

  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/issues", {
        hospitalId: currentHospital?.id,
        category,
        tagCode: tagCode || null,
        description,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Bildirim kaydedildi",
        description: "Uygunsuzluk bildirimi iletildi",
      });
      onBack();
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Bildirim gönderilemedi",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Uygunsuzluk Bildirimi</h2>
          <p className="text-sm text-muted-foreground">Sorunu tanımlayın</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-issue-category">
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segregation">Ayrıştırma Hatası</SelectItem>
                  <SelectItem value="non_compliance">Uygunsuzluk</SelectItem>
                  <SelectItem value="technical">Teknik Sorun</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Etiket Kodu (Opsiyonel)</Label>
              <Input
                placeholder="TAG-XXXXXX"
                value={tagCode}
                onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                className="font-mono"
                data-testid="input-issue-tag"
              />
            </div>

            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                placeholder="Sorunu detaylı olarak açıklayın..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="textarea-issue-description"
              />
            </div>

            <Button variant="outline" className="w-full gap-2">
              <Camera className="h-4 w-4" />
              Fotoğraf Ekle
            </Button>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!category || !description || issueMutation.isPending}
          onClick={() => issueMutation.mutate()}
          data-testid="button-submit-issue"
        >
          {issueMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          Bildir
        </Button>
      </div>
    </div>
  );
}
