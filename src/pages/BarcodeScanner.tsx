import { useState, useRef, useCallback, useEffect } from 'react';
import { useInvoice } from '../context/InvoiceContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Camera as CameraIcon, X, ScanLine, Search, Plus, Zap, ZapOff } from 'lucide-react';
import { BarcodeScanner as NativeScanner, BarcodeFormat, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Device } from '@capacitor/device';

export default function BarcodeScanner() {
  const { config, saveItem } = useInvoice();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [matchedItem, setMatchedItem] = useState<typeof config.savedItems[0] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lastScanned, setLastScanned] = useState('');
  const [isNative, setIsNative] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    Device.getInfo().then(info => {
      setIsNative(info.platform === 'android' || info.platform === 'ios');
    });
  }, []);

  // CRITICAL: Stop the camera when user navigates away from this page
  useEffect(() => {
    return () => {
      // Cleanup runs when the component unmounts (user navigates away)
      (async () => {
        try {
          // Stop native ML Kit scanner
          document.querySelector('body')?.classList.remove('barcode-scanner-active');
          await NativeScanner.stopScan();
          await NativeScanner.removeAllListeners();
        } catch (_) {
          // Ignore errors if scanner wasn't running
        }
        // Stop web camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      })();
    };
  }, []);


  const lookupBarcode = useCallback((code: string) => {
    const item = config.savedItems.find(i => i.barcode === code);
    if (item) {
      setMatchedItem(item);
      setNotFound(false);
    } else {
      setMatchedItem(null);
      setNotFound(true);
    }
    setLastScanned(code);
  }, [config.savedItems]);

  const startCamera = async () => {
    if (isNative) {
      try {
        const status = await NativeScanner.requestPermissions();
        if (status.camera !== 'granted') {
          alert('Camera permission denied.');
          return;
        }

        const isSupported = await NativeScanner.isSupported();
        if (!isSupported.supported) {
          alert('Barcode scanning is not supported on this device.');
          return;
        }

        document.querySelector('body')?.classList.add('barcode-scanner-active');
        
        await NativeScanner.addListener('barcodesScanned', async (result) => {
           if (result.barcodes && result.barcodes.length > 0) {
             const code = result.barcodes[0].displayValue;
             lookupBarcode(code);
             stopCamera();
           }
        });

        await NativeScanner.startScan({
          formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.Code128, BarcodeFormat.QrCode, BarcodeFormat.UpcA],
          lensFacing: LensFacing.Back
        });
        
        setScanning(true);
      } catch (err) {
        console.error(err);
        alert('Failed to start native scanner.');
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setScanning(true);
      } catch (err) {
        alert('Camera access denied or not available. Use the manual barcode input below.');
        console.error(err);
      }
    }
  };

  const stopCamera = async () => {
    if (isNative) {
       document.querySelector('body')?.classList.remove('barcode-scanner-active');
       await NativeScanner.stopScan();
       await NativeScanner.removeAllListeners();
    } else if (streamRef.current) {
       streamRef.current.getTracks().forEach(track => track.stop());
       streamRef.current = null;
    }
    setScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    try {
      await NativeScanner.toggleTorch();
      setTorchOn(!torchOn);
    } catch (e) {
      console.error(e);
    }
  };

  // Check for BarcodeDetector API (Web Only)
  useEffect(() => {
    if (!scanning || !videoRef.current || isNative) return;

    let animId: number;
    const detectBarcode = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        animId = requestAnimationFrame(detectBarcode);
        return;
      }

      // @ts-ignore - BarcodeDetector is experimental
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            lookupBarcode(code);
            stopCamera();
            return;
          }
        } catch {
          // Detector failed, continue scanning
        }
      }
      animId = requestAnimationFrame(detectBarcode);
    };

    animId = requestAnimationFrame(detectBarcode);
    return () => cancelAnimationFrame(animId);
  }, [scanning, lookupBarcode, isNative]);

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    lookupBarcode(manualCode.trim());
  };

  const handleAddNewItemWithBarcode = () => {
    const name = prompt('Enter item name:');
    if (!name) return;
    const rateStr = prompt('Enter rate (₹):');
    const rate = parseFloat(rateStr || '0') || 0;

    saveItem({
      id: crypto.randomUUID(),
      name,
      hsn: '',
      rate,
      gstPercent: 18,
      barcode: lastScanned,
      stock: 0,
      lowStockAlert: 5,
    });

    setMatchedItem(null);
    setNotFound(false);
    setLastScanned('');
    alert(`✅ Item "${name}" added with barcode ${lastScanned}`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24 overflow-x-hidden">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Barcode Scanner</h1>
        <p className="text-muted-foreground text-sm mt-1">Scan product barcodes to look up or add items instantly.</p>
      </header>

      {/* Scanner Card */}
      <Card className={`${scanning && isNative ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ScanLine className="w-4 h-4 text-primary" /> Camera Scanner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {scanning ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              {!isNative && <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/2 border-2 border-primary rounded-xl opacity-50" />
                {!isNative && <div className="absolute top-4 bg-black/50 px-3 py-1 rounded-full text-xs text-white">Scanning...</div>}
              </div>
              
              <div className="absolute top-3 right-3 flex gap-2">
                 {isNative && (
                    <Button variant="secondary" size="icon" onClick={toggleTorch} className="rounded-full bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/40">
                       {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </Button>
                 )}
                 <Button variant="destructive" size="icon" className="rounded-full shadow-lg" onClick={stopCamera}>
                    <X className="w-4 h-4" />
                 </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <CameraIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Point your camera at a barcode to scan it</p>
              <Button onClick={startCamera} className="rounded-2xl"><CameraIcon className="w-4 h-4 mr-2" /> Start Scanner</Button>
              <p className="text-xs text-muted-foreground mt-2">Uses device camera. Works best on mobile phones.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen Scanner UI for Native (displayed when app is hidden) */}
      {scanning && isNative && (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
            <div className="absolute top-10 w-full flex justify-between px-6 pointer-events-auto">
               <div className="text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 text-sm font-bold">
                  Scanning Barcode...
               </div>
               <div className="flex gap-2">
                  <Button variant="secondary" size="icon" onClick={toggleTorch} className="rounded-full bg-white/20 backdrop-blur-md border-white/30 text-white pointer-events-auto">
                      {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={stopCamera} className="rounded-full shadow-lg pointer-events-auto">
                      <X className="w-4 h-4" />
                  </Button>
               </div>
            </div>
            
            <div className="w-64 h-64 border-2 border-primary rounded-3xl relative overflow-hidden">
               <div className="absolute inset-0 border-2 border-white/20 rounded-3xl" />
               <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan-slow" />
            </div>
            
            <div className="absolute bottom-10 px-8 text-center text-white/70 text-xs">
               Align the barcode within the frame to scan it automatically.
            </div>
        </div>
      )}

      {/* Manual Input */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Manual Lookup</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input label="" placeholder="Enter barcode number..." value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()} className="flex-1" />
            <Button onClick={handleManualSearch} className="self-end"><Search className="w-4 h-4 mr-1" /> Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {matchedItem && (
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <CardHeader><CardTitle className="text-base text-emerald-500">✅ Item Found!</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <strong>{matchedItem.name}</strong></div>
              <div><span className="text-muted-foreground">HSN:</span> {matchedItem.hsn || '-'}</div>
              <div><span className="text-muted-foreground">Rate:</span> ₹{matchedItem.rate}</div>
              <div><span className="text-muted-foreground">GST:</span> {matchedItem.gstPercent}%</div>
              <div><span className="text-muted-foreground">Stock:</span> {matchedItem.stock ?? 'Not tracked'}</div>
              <div><span className="text-muted-foreground">Barcode:</span> <code className="text-xs">{matchedItem.barcode}</code></div>
            </div>
          </CardContent>
        </Card>
      )}

      {notFound && (
        <Card className="border-amber-500/20 bg-amber-500/10">
          <CardHeader><CardTitle className="text-base text-amber-500">⚠️ Not Found: <code className="text-sm">{lastScanned}</code></CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">No item with this barcode exists in your inventory. Would you like to add it?</p>
            <Button size="sm" onClick={handleAddNewItemWithBarcode}><Plus className="w-4 h-4 mr-1" /> Add New Item</Button>
          </CardContent>
        </Card>
      )}

      {/* Barcode-enabled items */}
      {config.savedItems.filter(i => i.barcode).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Items with Barcodes ({config.savedItems.filter(i => i.barcode).length})</CardTitle></CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-[11px] uppercase border-b">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Barcode</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-[13px]">
                  {config.savedItems.filter(i => i.barcode).map(item => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3 font-medium">{item.name}</td>
                      <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{item.barcode}</td>
                      <td className="py-2 px-3 text-right">₹{item.rate}</td>
                      <td className="py-2 px-3 text-center">{item.stock ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
