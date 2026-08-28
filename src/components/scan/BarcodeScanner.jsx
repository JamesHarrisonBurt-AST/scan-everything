import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ScanBarcode, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // Try BarcodeDetector API first
        let hasNativeDetector = false;
        if ('BarcodeDetector' in window) {
          try {
            detectorRef.current = new window.BarcodeDetector({
              formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
            });
            hasNativeDetector = true;
          } catch { hasNativeDetector = false; }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }

        if (hasNativeDetector) {
          const detectLoop = async () => {
            if (cancelled || !scanning) return;
            try {
              const barcodes = await detectorRef.current.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const value = barcodes[0].rawValue || barcodes[0].rawValue;
                if (value) {
                  setScanning(false);
                  stream.getTracks().forEach(t => t.stop());
                  onDetect(value);
                  return;
                }
              }
            } catch { /* keep scanning */ }
            rafRef.current = requestAnimationFrame(detectLoop);
          };
          detectLoop();
        }
      } catch (err) {
        setError(err.message || 'Camera access denied');
      }
    };

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleFallbackCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    setFallbackLoading(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
    const file = new File([blob], 'barcode.jpg', { type: 'image/jpeg' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: 'Look at this image and read any visible barcode, QR code, or UPC number. Return ONLY the code value, nothing else. If no barcode is visible, return "NOT_FOUND".',
        file_urls: [file_url],
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            barcode_value: { type: 'string' },
            barcode_type: { type: 'string' },
          },
        },
      });
      if (res.barcode_value && res.barcode_value !== 'NOT_FOUND') {
        streamRef.current?.getTracks().forEach(t => t.stop());
        setScanning(false);
        onDetect(res.barcode_value);
      } else {
        setError('No barcode detected. Try again or use Photo mode.');
        setFallbackLoading(false);
      }
    } catch {
      setError('Could not read barcode. Try Photo mode instead.');
      setFallbackLoading(false);
    }
  };

  const hasNativeDetector = 'BarcodeDetector' in window;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <button
        onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/50" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <span className="text-[11px] text-white/80 font-medium">Barcode Scanner</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {ready && scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-72 h-40">
              {/* Corner brackets */}
              {[['top-0 left-0', 'border-t-2 border-l-2'], ['top-0 right-0', 'border-t-2 border-r-2'], ['bottom-0 left-0', 'border-b-2 border-l-2'], ['bottom-0 right-0', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-cyan-400 rounded`} />
              ))}
              <motion.div
                className="absolute left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(190 100% 60%), transparent)' }}
                animate={{ y: [0, 140, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <motion.div className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-cyan-500/20" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8">
            <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
            <p className="text-red-400 text-sm text-center mb-2">Camera issue</p>
            <p className="text-muted-foreground text-xs text-center">{error}</p>
          </div>
        )}
      </div>

      {ready && scanning && (
        <div className="flex flex-col items-center gap-3 py-6" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          <p className="text-[11px] text-white/60">
            {hasNativeDetector ? 'Point at any barcode or QR code' : 'Tap capture to scan with AI'}
          </p>
          {!hasNativeDetector && (
            <motion.button
              onClick={handleFallbackCapture}
              disabled={fallbackLoading}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'white', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }}
              whileTap={{ scale: 0.9 }}
            >
              {fallbackLoading ? (
                <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <ScanBarcode className="w-8 h-8 text-black" />
              )}
            </motion.button>
          )}
          {hasNativeDetector && (
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-cyan-400/40 border-t-cyan-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>
      )}
    </div>
  );
}