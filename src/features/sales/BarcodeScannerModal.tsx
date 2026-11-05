import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, Barcode, CheckCircle, Search, RefreshCw, Zap } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { toast } from 'sonner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (product: any) => void;
  products: any[];
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  products,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [detectorActive, setDetectorActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScannedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      setManualCode('');
      setCameraError('');
      // Auto focus manual/scanner gun input
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera is not supported on this device/browser. Use a USB scanner or enter code manually.');
        return;
      }
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError('Camera access denied or unavailable. You can use a USB scanner gun or type code below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleProcessCode = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    // Search product by id, barcode, hsnCode, or name
    const matched = products.find(p => 
      (p.id && p.id.toLowerCase() === trimmed) ||
      (p.barcode && p.barcode.toLowerCase() === trimmed) ||
      (p.hsnCode && p.hsnCode.toLowerCase() === trimmed) ||
      (p.name && p.name.toLowerCase().includes(trimmed)) ||
      (p.genericName && p.genericName.toLowerCase().includes(trimmed))
    );

    if (matched) {
      toast.success(`Scanned: ${matched.name} (MRP: ₹${matched.mrp})`);
      onScanSuccess(matched);
      setManualCode('');
    } else {
      toast.info(`Scanned code: ${code}. Added to row.`);
      onScanSuccess({
        id: `prod_${Date.now()}`,
        name: ``,
        barcode: code,
        mrp: 0,
        purchasePrice: 0,
        stockQty: 1,
        unit: 'Strip',
        gstPercent: 12
      });
      setManualCode('');
    }
  };

  // Automated Barcode Detection Loop from Video Feed
  useEffect(() => {
    let intervalId: any = null;
    if (isCameraActive && videoRef.current && 'BarcodeDetector' in window) {
      setDetectorActive(true);
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'data_matrix']
        });

        intervalId = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              const now = Date.now();
              if (code && now - lastScannedTimeRef.current > 1500) {
                lastScannedTimeRef.current = now;
                handleProcessCode(code);
              }
            }
          } catch (_) {}
        }, 300);
      } catch (err) {
        console.warn("BarcodeDetector initialization:", err);
      }
    } else {
      setDetectorActive(false);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraActive, products]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(manualCode);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Live Barcode & Camera Scanner
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewfinder */}
          <div className="relative w-full h-64 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            {isCameraActive ? (
              <>
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover opacity-90" 
                />
                {/* Laser scan line animation */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce" />
                <div className="absolute inset-0 border-2 border-dashed border-white/30 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="bg-slate-900/80 text-white text-[11px] px-3 py-1 rounded-full font-medium">
                    Align barcode within frame
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-2">
                <Barcode className="w-12 h-12 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {cameraError || 'Camera inactive.'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={startCamera}
                  className="mt-2 text-xs text-white border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry Camera
                </Button>
              </div>
            )}
          </div>

          {/* Manual / USB Scanner Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Scan Barcode / Type Code (USB Scanner Ready)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={scanInputRef}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Scan item barcode or type product name/ID..."
                  className="h-11 text-sm font-semibold pl-10"
                />
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              <Button type="submit" className="h-11 px-5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs">
                Lookup & Add
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 Tip: If using a USB barcode scanner gun, simply scan the product barcode while this box is focused. It will instantly add the item to your bill.
            </p>
          </form>

          {/* Quick Mock Barcode Buttons for testing */}
          {products.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                Quick Test Products (Tap to simulate scan):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      toast.success(`Scanned: ${p.name}`);
                      onScanSuccess(p);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium transition-colors"
                  >
                    {p.name} (₹{p.mrp})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Done Scanning
          </Button>
        </div>
      </div>
    </div>
  );
}
