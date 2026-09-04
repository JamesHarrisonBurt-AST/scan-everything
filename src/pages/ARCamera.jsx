import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Images, AlertCircle, Sparkles, ChevronRight, Camera, CameraOff, Crosshair, MapPin } from 'lucide-react';
import ARHudMode from '@/components/ar/ARHudMode';
import ARMarkersMode from '@/components/ar/ARMarkersMode';
import { base44 } from '@/api/base44Client';
import { RARITY_STYLES } from '@/lib/gamification';

export default function ARCamera() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const [mode, setMode] = useState(urlParams.get('collection') ? 'markers' : 'discover');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('unavailable');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        const onReady = () => {
          video.play().catch(() => {});
          setCameraReady(true);
        };
        if (video.readyState >= 2) {
          onReady();
        } else {
          video.onloadedmetadata = onReady;
          setTimeout(() => { if (streamRef.current) setCameraReady(true); }, 1500);
        }
      }
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError' ? 'permission' : 'unavailable');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const captureAndAnalyze = async () => {
    if (!cameraReady || analyzing) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    const maxW = 800;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
    await analyzeImage(new File([blob], 'discovery.jpg', { type: 'image/jpeg' }));
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) await analyzeImage(file);
  };

  const analyzeImage = async (file) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('analyzeDiscovery', { image_url: file_url });
      setResult(response.data);
    } catch {
      setError('Analysis failed. Please try again.');
    }
    setAnalyzing(false);
  };

  const reset = () => { setResult(null); setError(null); };
  const rarity = result?.discovery?.rarity ? RARITY_STYLES[result.discovery.rarity] : null;

  return (
    <div className="fixed inset-0 bg-black" style={{ zIndex: 100 }}>
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-cover" />

      <AnimatePresence>
        {flash && <motion.div className="absolute inset-0 bg-white z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />}
      </AnimatePresence>

      {/* AR HUD */}
      {cameraReady && !analyzing && !result && mode === 'discover' && (
        <motion.div className="absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 pt-safe px-4 py-3 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex rounded-full p-1 ar-glass">
              <button onClick={() => setMode('discover')} className="px-3 h-8 rounded-full text-xs font-bold touch-target transition-all flex items-center gap-1.5" style={mode === 'discover' ? { background: 'hsl(35 95% 55%)', color: 'hsl(220 18% 5%)' } : { color: 'rgba(255,255,255,0.6)' }}>
                <Camera className="w-3.5 h-3.5" /> Scanner
              </button>
              <button onClick={() => setMode('hud')} className="px-3 h-8 rounded-full text-xs font-bold touch-target transition-all flex items-center gap-1.5" style={mode === 'hud' ? { background: 'hsl(35 95% 55%)', color: 'hsl(220 18% 5%)' } : { color: 'rgba(255,255,255,0.6)' }}>
                <Crosshair className="w-3.5 h-3.5" /> AR
              </button>
            </div>
            <button onClick={() => setMode('markers')} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
              <MapPin className="w-5 h-5 text-teal-400" />
            </button>
          </div>

          {/* Targeting reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div className="relative w-48 h-48" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-amber-400/60 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-amber-400/60 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-amber-400/60 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-amber-400/60 rounded-br-lg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-amber-400" animate={{ scale: [1, 3, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
              </div>
              <motion.div className="absolute left-0 right-0 h-0.5 bg-amber-400/40" style={{ boxShadow: '0 0 8px hsl(35 95% 55% / 0.5)' }} animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
          </div>

          <div className="absolute bottom-32 left-0 right-0 text-center pointer-events-none">
            <p className="text-xs text-white/60">Point at any object and capture</p>
            <p className="text-[10px] text-white/30 mt-1">Images analyzed by AI · Delete discoveries anytime</p>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 pb-safe px-4 py-4 flex items-center justify-around">
            <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl ar-glass flex items-center justify-center touch-target">
              <Images className="w-5 h-5 text-white" />
            </button>
            <motion.button onClick={captureAndAnalyze} className="rounded-full flex items-center justify-center touch-target" style={{ width: '72px', height: '72px' }} whileTap={{ scale: 0.9 }}>
              <div className="absolute inset-0 rounded-full border-4 border-white/80" />
              <div className="w-14 h-14 rounded-full bg-amber-400" />
            </motion.button>
            <div className="w-12 h-12" />
          </div>
        </motion.div>
      )}

      {/* HUD Mode */}
      {cameraReady && mode === 'hud' && (
        <ARHudMode videoRef={videoRef} cameraReady={cameraReady} mode={mode} onSetMode={setMode} onClose={() => navigate(-1)} />
      )}

      {/* Markers Mode */}
      {cameraReady && mode === 'markers' && (
        <ARMarkersMode collectionId={urlParams.get('collection')} onSwitchMode={() => setMode('discover')} onClose={() => navigate(-1)} />
      )}

      {/* Analyzing */}
      {analyzing && (
        <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center" style={{ background: 'hsl(220 18% 5% / 0.85)', backdropFilter: 'blur(8px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'hsl(35 95% 55% / 0.1)', border: '2px solid hsl(35 95% 55% / 0.2)' }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <motion.div className="w-12 h-12 rounded-full border-2 border-amber-400/30 border-t-amber-400" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          </motion.div>
          <p className="text-sm font-heading font-semibold text-foreground mb-1">Analyzing...</p>
          <p className="text-xs text-muted-foreground">AI is identifying your discovery</p>
        </motion.div>
      )}

      {/* Low confidence / unidentified */}
      {result && !analyzing && (result.discovery?.confidence_score || 0) < 40 && (
        <motion.div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center" style={{ background: 'hsl(220 18% 5% / 0.92)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AlertCircle className="w-12 h-12 text-amber-400/60 mb-4" />
          <p className="text-sm font-heading font-semibold text-foreground mb-1">Couldn't identify this confidently</p>
          <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">Try a different angle, better lighting, or move closer to the object.</p>
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 h-10 rounded-xl text-sm font-bold touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}>Try Again</button>
            <button onClick={() => fileInputRef.current?.click()} className="px-5 h-10 rounded-xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 14%)', border: '1px solid hsl(220 12% 20%)', color: 'white' }}>Choose Photo</button>
          </div>
        </motion.div>
      )}

      {/* Result overlay */}
      {result && !analyzing && (result.discovery?.confidence_score || 0) >= 40 && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'linear-gradient(to top, hsl(220 18% 5% / 0.95) 0%, hsl(220 18% 5% / 0.5) 50%, transparent 100%)' }}>
          {result.xp_earned > 0 && (
            <motion.div className="absolute top-20 left-1/2 -translate-x-1/2" initial={{ opacity: 0, y: -20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
              <div className="px-4 py-2 rounded-full" style={{ background: 'hsl(35 95% 55% / 0.15)', border: '1px solid hsl(35 95% 55% / 0.4)' }}>
                <span className="text-sm font-bold text-amber-400">+{result.xp_earned} XP</span>
              </div>
            </motion.div>
          )}
          {result.leveled_up && (
            <motion.div className="absolute top-32 left-1/2 -translate-x-1/2" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
              <div className="px-4 py-2 rounded-full" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(340 70% 55%))' }}>
                <span className="text-sm font-bold text-white">LEVEL UP! {result.level.name}</span>
              </div>
            </motion.div>
          )}
          {result.new_achievements?.length > 0 && (
            <motion.div className="absolute top-44 left-1/2 -translate-x-1/2 flex gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              {result.new_achievements.map((ach, i) => (
                <div key={i} className="px-3 py-1.5 rounded-full" style={{ background: 'hsl(35 95% 55% / 0.12)', border: '1px solid hsl(35 95% 55% / 0.3)' }}>
                  <span className="text-xs font-bold text-amber-400">🏆 {ach.title}</span>
                </div>
              ))}
            </motion.div>
          )}

          <div className="px-4 pb-safe">
            <motion.div className="glass-card rounded-3xl p-5 mb-4" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="flex items-start gap-4">
                {result.discovery?.image_url && <img src={result.discovery.image_url} alt="" className="w-16 h-16 rounded-xl object-cover" />}
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">{result.discovery?.category}</p>
                  <p className="text-lg font-heading font-bold text-foreground">{result.discovery?.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-amber-400 font-semibold">{result.discovery?.confidence_score}% confidence</span>
                    {rarity && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: rarity.color, background: rarity.bg }}>{rarity.label}</span>}
                  </div>
                </div>
              </div>
              {result.discovery?.summary && <p className="text-xs text-muted-foreground mt-3">{result.discovery.summary}</p>}
            </motion.div>
            <div className="flex gap-3">
              <motion.button onClick={reset} className="flex-1 h-12 rounded-2xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 14%)', border: '1px solid hsl(220 12% 20%)', color: 'hsl(220 10% 70%)' }} whileTap={{ scale: 0.95 }}>
                Keep Exploring
              </motion.button>
              <motion.button onClick={() => navigate(`/discovery/${result.discovery.id}`)} className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-1 touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }} whileTap={{ scale: 0.95 }}>
                Explore <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Analysis error */}
      {error && !analyzing && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center" style={{ background: 'hsl(220 18% 5% / 0.9)' }}>
          <AlertCircle className="w-12 h-12 text-rose-400/60 mb-4" />
          <p className="text-sm font-heading font-semibold text-foreground mb-1">Analysis Failed</p>
          <p className="text-xs text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 h-10 rounded-xl text-sm font-bold" style={{ background: 'hsl(220 12% 14%)', color: 'white' }}>Try Again</button>
            <button onClick={() => navigate(-1)} className="px-5 h-10 rounded-xl text-sm font-bold" style={{ background: 'hsl(220 12% 14%)', color: 'hsl(220 10% 60%)' }}>Go Back</button>
          </div>
        </div>
      )}

      {/* Close button */}
      {(!cameraReady || analyzing || result) && (
        <button onClick={() => navigate(-1)} className="absolute top-0 left-0 z-50 pt-safe px-4 py-3">
          <div className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
            <X className="w-5 h-5 text-white" />
          </div>
        </button>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
    </div>
  );
}