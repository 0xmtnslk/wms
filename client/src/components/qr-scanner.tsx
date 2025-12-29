import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2 } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export function QRScanner({ open, onClose, onScan, title = "QR Kod Tara" }: QRScannerProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && containerRef.current) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = async () => {
    if (scannerRef.current) return;
    
    setIsStarting(true);
    setError(null);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {}
      );
    } catch (err: any) {
      setError(err?.message || "Kamera erisimi saglanamadi");
    } finally {
      setIsStarting(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      scannerRef.current = null;
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <div 
            id="qr-reader" 
            ref={containerRef}
            className="w-full aspect-square bg-black rounded-md overflow-hidden"
          />
          
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground text-center">
          QR kodu kare icine hizalayin
        </p>
        
        <Button variant="outline" onClick={handleClose}>
          <X className="h-4 w-4 mr-2" />
          Kapat
        </Button>
      </DialogContent>
    </Dialog>
  );
}
