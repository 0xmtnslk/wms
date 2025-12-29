import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Camera, Loader2, AlertTriangle, Keyboard } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export function QRScanner({ open, onClose, onScan, title = "QR Kod Tara" }: QRScannerProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraPermission, setCameraPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.log("Scanner stop error (safe to ignore):", e);
      }
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!mountedRef.current) return;
    if (scannerRef.current) {
      await stopScanner();
    }
    
    setIsStarting(true);
    setError(null);

    // First check if we have camera permission
    try {
      const permissionResult = await navigator.permissions.query({ name: "camera" as PermissionName });
      setCameraPermission(permissionResult.state === "granted" ? "granted" : permissionResult.state === "denied" ? "denied" : "unknown");
      
      if (permissionResult.state === "denied") {
        setError("Kamera izni reddedilmis. Tarayici ayarlarindan izin verin.");
        setIsStarting(false);
        return;
      }
    } catch (e) {
      // permissions API not supported, continue anyway
    }

    // Small delay to ensure the DOM element is ready
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!mountedRef.current) return;

    try {
      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError("Kamera bulunamadi. Cihazinizda kamera oldugundan emin olun.");
        setIsStarting(false);
        return;
      }

      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (mountedRef.current) {
            onScan(decodedText);
            stopScanner();
            onClose();
          }
        },
        () => {} // ignore error frames
      );
      
      if (mountedRef.current) {
        setCameraPermission("granted");
      }
    } catch (err: any) {
      console.error("QR Scanner error:", err);
      
      let errorMessage = "Kamera baslatilirken hata olustu.";
      
      if (err?.message?.includes("Permission") || err?.name === "NotAllowedError") {
        errorMessage = "Kamera izni verilmedi. Tarayici adres cubugunun yanindaki kamera simgesinden izin verin.";
        setCameraPermission("denied");
      } else if (err?.message?.includes("NotFoundError") || err?.name === "NotFoundError") {
        errorMessage = "Kamera bulunamadi.";
      } else if (err?.message?.includes("NotReadableError") || err?.name === "NotReadableError") {
        errorMessage = "Kamera baska bir uygulama tarafindan kullaniliyor.";
      } else if (err?.message?.includes("OverconstrainedError")) {
        errorMessage = "Arka kamera bulunamadi, on kamera ile deneniyor...";
        // Try front camera as fallback
        try {
          const scanner = new Html5Qrcode("qr-reader", { verbose: false });
          scannerRef.current = scanner;
          await scanner.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 200, height: 200 } },
            (decodedText) => {
              if (mountedRef.current) {
                onScan(decodedText);
                stopScanner();
                onClose();
              }
            },
            () => {}
          );
          setError(null);
          setIsStarting(false);
          return;
        } catch (e2) {
          errorMessage = "Kamera baslatilirken hata olustu.";
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      if (mountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsStarting(false);
      }
    }
  }, [onScan, onClose, stopScanner]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (open) {
      setShowManualInput(false);
      setManualCode("");
      setError(null);
      startScanner();
    }
    
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      onClose();
    }
  };

  const requestCameraPermission = async () => {
    setError(null);
    setIsStarting(true);
    
    try {
      // This will trigger the permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission("granted");
      // Now try starting the scanner again
      await startScanner();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Kamera izni reddedildi. Tarayici ayarlarindan manuel olarak izin vermeniz gerekiyor.");
        setCameraPermission("denied");
      } else {
        setError("Kamera erisimi saglanamadi: " + (err.message || "Bilinmeyen hata"));
      }
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-sm" data-testid="dialog-qr-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {!showManualInput ? (
          <>
            <div className="relative">
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full aspect-square bg-black rounded-md overflow-hidden"
              />
              
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                  <p className="text-sm text-white/70">Kamera baslatiliyor...</p>
                </div>
              )}
              
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 gap-3">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                  <p className="text-sm text-white text-center">{error}</p>
                  
                  {cameraPermission === "denied" || cameraPermission === "unknown" ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={requestCameraPermission}
                      className="mt-2"
                      data-testid="button-request-camera"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Kamera Izni Ver
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={startScanner}
                      className="mt-2"
                      data-testid="button-retry-camera"
                    >
                      Tekrar Dene
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {!error && !isStarting && (
              <p className="text-sm text-muted-foreground text-center">
                QR kodu kare icine hizalayin
              </p>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1" data-testid="button-close-scanner">
                <X className="h-4 w-4 mr-2" />
                Kapat
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowManualInput(true)} 
                className="flex-1"
                data-testid="button-manual-input"
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Manuel Gir
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Kamera calismiyor veya QR kodu okunamiyorsa, atik kodunu manuel olarak girin:
              </p>
              <Input
                placeholder="Atik kodu (orn: H1-ICU-001)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                autoFocus
                data-testid="input-manual-code"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowManualInput(false)} 
                className="flex-1"
                data-testid="button-back-to-camera"
              >
                <Camera className="h-4 w-4 mr-2" />
                Kameraya Don
              </Button>
              <Button 
                onClick={handleManualSubmit} 
                className="flex-1"
                disabled={!manualCode.trim()}
                data-testid="button-submit-manual"
              >
                Onayla
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
