import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  QrCode, Scale, AlertTriangle, ArrowLeft, ScanLine, 
  Printer, CheckCircle2, Keyboard, Save, Camera,
  MapPin, Loader2, RefreshCcw, Search, Mic, MicOff, X, ImagePlus
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
import { QRCodeSVG } from "qrcode.react";
import { QRScanner } from "@/components/qr-scanner";

function maskName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length <= 1) return part;
    if (part.length === 2) return part[0] + "*";
    return part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
  }).join(" ");
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedWasteType, setSelectedWasteType] = useState<string | null>(null);
  const [tagCode, setTagCode] = useState("");
  const [tagDateTime, setTagDateTime] = useState<Date | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/settings/locations", currentHospital?.id],
    enabled: !!currentHospital?.id,
  });

  const filteredLocations = locations?.filter(loc => 
    loc.code.toLowerCase().includes(locationSearch.toLowerCase()) ||
    loc.customLabel?.toLowerCase().includes(locationSearch.toLowerCase())
  ) || [];

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
        title: "Kayit olusturuldu",
        description: `Etiket: ${tagCode}`,
      });
      setStep("scan");
      setLocationCode("");
      setLocationSearch("");
      setSelectedWasteType(null);
      setTagCode("");
      setTagDateTime(null);
      setIsPrinted(false);
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kayit olusturulamadi",
        variant: "destructive",
      });
    }
  });

  const generateTagCode = () => {
    const code = `TAG-${Date.now().toString(36).toUpperCase()}`;
    setTagCode(code);
    setTagDateTime(new Date());
    setIsPrinted(false);
  };

  const handleQRScan = (scannedCode: string) => {
    const matchedLocation = locations?.find(loc => 
      loc.code.toUpperCase() === scannedCode.toUpperCase()
    );
    if (matchedLocation) {
      setLocationCode(matchedLocation.code);
      toast({
        title: "Lokasyon bulundu",
        description: matchedLocation.code,
      });
    } else {
      toast({
        title: "Lokasyon bulunamadi",
        description: `QR: ${scannedCode}`,
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
    setIsPrinted(true);
    toast({
      title: "Yazdir",
      description: "Etiket yaziciya gonderildi",
    });
  };

  const getUserFullName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || "";
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
              <Button 
                className="w-full h-24 gap-2" 
                variant="outline" 
                onClick={() => setShowQRScanner(true)}
                data-testid="button-scan-qr"
              >
                <Camera className="h-6 w-6" />
                Kamera ile QR Tara
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">veya</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Lokasyon ara..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-location-search"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                  {filteredLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">Lokasyon bulunamadi</p>
                  ) : (
                    filteredLocations.map((loc) => (
                      <Button
                        key={loc.id}
                        variant={locationCode === loc.code ? "default" : "ghost"}
                        className="w-full justify-start font-mono text-sm"
                        onClick={() => setLocationCode(loc.code)}
                        data-testid={`button-location-${loc.code}`}
                      >
                        <MapPin className="h-3 w-3 mr-2" />
                        {loc.code} {loc.customLabel && <span className="text-muted-foreground ml-1">({loc.customLabel})</span>}
                      </Button>
                    ))
                  )}
                </div>
              </div>
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

          <QRScanner 
            open={showQRScanner} 
            onClose={() => setShowQRScanner(false)}
            onScan={handleQRScan}
            title="Lokasyon QR Tara"
          />
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
          <Card className="print-label">
            <CardHeader className="print-label-header">
              <CardTitle className="text-sm">Etiket Onizleme (70x50mm)</CardTitle>
            </CardHeader>
            <CardContent className="print-label-content">
              <div className="p-3 rounded-md border-2 border-dashed border-border bg-white dark:bg-zinc-900 flex items-center justify-center gap-4 print:border-none print:p-0">
                <div className="print-label-info space-y-0.5 text-center">
                  <div className="text-[10px] font-semibold text-foreground print:text-[7pt] print:text-black">{currentHospital?.name || "Hastane"}</div>
                  <div className="text-sm font-mono font-bold print:text-[10pt] print:text-black">{tagCode}</div>
                  <div className="flex justify-center">
                    <Badge className={`text-[9px] print:text-[6pt] print:bg-transparent print:text-black print:border print:border-black ${WASTE_TYPES_CONFIG.find(t => t.code === selectedWasteType)?.color}`}>
                      {WASTE_TYPES_CONFIG.find(t => t.code === selectedWasteType)?.label}
                    </Badge>
                  </div>
                  <div className="text-[9px] text-muted-foreground font-mono print:text-[6pt] print:text-black">{locationCode}</div>
                  <div className="text-[9px] text-muted-foreground print:text-[6pt] print:text-black">
                    {maskName(getUserFullName())}
                  </div>
                  <div className="text-[9px] text-muted-foreground print:text-[6pt] print:text-black">
                    {tagDateTime ? formatDateTime(tagDateTime) : formatDateTime(new Date())}
                  </div>
                </div>
                <div className="print-label-qr flex-shrink-0">
                  <QRCodeSVG 
                    value={tagCode} 
                    size={100} 
                    level="M"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button 
              variant={isPrinted ? "secondary" : "default"}
              className="flex-1 gap-2"
              onClick={handlePrint}
              data-testid="button-print"
            >
              <Printer className="h-4 w-4" />
              {isPrinted ? "Tekrar Yazdir" : "Yazdir"}
            </Button>
          </div>

          {isPrinted && (
            <p className="text-sm text-emerald-500 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Etiket yazdirildi
            </p>
          )}

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
  const [tagSearch, setTagSearch] = useState("");
  const [weight, setWeight] = useState("");
  const [isManual, setIsManual] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);

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
        title: "Tartim kaydedildi",
        description: `${weight} kg - ${tagCode}`,
      });
      setTagCode("");
      setTagSearch("");
      setWeight("");
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Etiket bulunamadi veya tartim kaydedilemedi",
        variant: "destructive",
      });
    }
  });

  const handleQRScan = (scannedCode: string) => {
    setTagCode(scannedCode.toUpperCase());
    toast({
      title: "Etiket bulundu",
      description: scannedCode,
    });
  };

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Kantar / Tartim</h2>
          <p className="text-sm text-muted-foreground">Etiket barkodunu okutun</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Etiket Kodu</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="TAG-XXXXXX ara veya gir..."
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                    className="font-mono pl-10"
                    data-testid="input-tag-code"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowQRScanner(true)}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agirlik (kg)</Label>
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
          Tartimi Kaydet
        </Button>
      </div>

      <QRScanner 
        open={showQRScanner} 
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title="Etiket QR Tara"
      />
    </div>
  );
}

function IssueView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const currentHospital = useCurrentHospital();
  const { toast } = useToast();
  
  const [category, setCategory] = useState("");
  const [tagCode, setTagCode] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showLocationScanner, setShowLocationScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/settings/locations", currentHospital?.id],
    enabled: !!currentHospital?.id,
  });

  const filteredLocations = (locations || []).filter(loc => 
    loc.code.toLowerCase().includes(locationSearch.toLowerCase()) ||
    (loc.customLabel && loc.customLabel.toLowerCase().includes(locationSearch.toLowerCase()))
  );

  const issueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/issues", {
        hospitalId: currentHospital?.id,
        category,
        tagCode: tagCode || null,
        locationCode: locationCode || null,
        description,
        photoUrls: photos.length > 0 ? photos : null,
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
        description: "Bildirim gonderilemedi",
        variant: "destructive",
      });
    }
  });

  const handleQRScan = (scannedCode: string) => {
    setTagCode(scannedCode.toUpperCase());
    toast({
      title: "Etiket bulundu",
      description: scannedCode,
    });
  };

  const handleLocationScan = (scannedCode: string) => {
    const matchedLocation = locations?.find(loc => 
      loc.code.toUpperCase() === scannedCode.toUpperCase()
    );
    if (matchedLocation) {
      setLocationCode(matchedLocation.code);
      toast({
        title: "Lokasyon bulundu",
        description: matchedLocation.code,
      });
    } else {
      toast({
        title: "Lokasyon bulunamadi",
        description: `QR: ${scannedCode}`,
        variant: "destructive",
      });
    }
  };

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && photos.length < 5) {
      const remaining = 5 - photos.length;
      const filesToProcess = Array.from(files).slice(0, remaining);
      for (const file of filesToProcess) {
        const compressed = await compressImage(file);
        setPhotos(prev => [...prev, compressed]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Desteklenmiyor",
        description: "Tarayiciniz ses tanima desteklemiyor",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        if (result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            setDescription(prev => prev ? prev + ' ' + transcript : transcript);
          }
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Ses Hatasi",
          description: "Ses tanima basarisiz oldu",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Uygunsuzluk Bildirimi</h2>
          <p className="text-sm text-muted-foreground">Sorunu tanimlayin</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-issue-category">
                  <SelectValue placeholder="Secin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="segregation">Ayristirma Hatasi</SelectItem>
                  <SelectItem value="non_compliance">Uygunsuzluk</SelectItem>
                  <SelectItem value="technical">Teknik Sorun</SelectItem>
                  <SelectItem value="other">Diger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lokasyon (Opsiyonel)</Label>
              <Button 
                className="w-full gap-2" 
                variant="outline" 
                onClick={() => setShowLocationScanner(true)}
                data-testid="button-scan-location-qr"
              >
                <Camera className="h-4 w-4" />
                Kamera ile QR Tara
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Lokasyon ara..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-issue-location-search"
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                {filteredLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">Lokasyon bulunamadi</p>
                ) : (
                  filteredLocations.slice(0, 10).map((loc) => (
                    <Button
                      key={loc.id}
                      variant={locationCode === loc.code ? "default" : "ghost"}
                      className="w-full justify-start font-mono text-xs"
                      onClick={() => setLocationCode(loc.code)}
                      data-testid={`button-issue-location-${loc.code}`}
                    >
                      <MapPin className="h-3 w-3 mr-2" />
                      {loc.code}
                    </Button>
                  ))
                )}
              </div>
              {locationCode && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs font-mono">{locationCode}</span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setLocationCode("")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Etiket Kodu (Opsiyonel)</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="TAG-XXXXXX ara veya gir..."
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                    className="font-mono pl-10"
                    data-testid="input-issue-tag"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => setShowQRScanner(true)}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Aciklama</Label>
                <Button 
                  variant={isRecording ? "destructive" : "ghost"} 
                  size="sm"
                  onClick={toggleVoiceRecording}
                  className="gap-1"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="h-3 w-3" />
                      Durdur
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3" />
                      Sesli Gir
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Sorunu detayli olarak aciklayin..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="textarea-issue-description"
              />
              {isRecording && (
                <p className="text-xs text-rose-500 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 bg-rose-500 rounded-full" />
                  Dinleniyor...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Fotograflar</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                      <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removePhoto(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Fotograf Ekle ({photos.length}/5)
              </Button>
            </div>
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

      <QRScanner 
        open={showQRScanner} 
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
        title="Etiket QR Tara"
      />
      <QRScanner 
        open={showLocationScanner} 
        onClose={() => setShowLocationScanner(false)}
        onScan={handleLocationScan}
        title="Lokasyon QR Tara"
      />
    </div>
  );
}
