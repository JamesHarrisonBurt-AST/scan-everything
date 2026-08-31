import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ScanLine, Camera, History, Crosshair } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ARHudLabel, { VALUE_STYLES } from './ARHudLabel';

const SCAN_INTERVAL = 5000;
const LOW_CONF_THRESHOLD = 40;

export default function ARHudMode({ videoRef, cameraReady, onSwitchMode, onClose }) {
  const navigate = useNavigate();
  const [hudAnalyzing, setHudAnalyzing] = useState(false);
  const [hudResult, setHudResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [recent, setRecent] = useState([]);
  const [hudError, setHudError] = useState(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef(null);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    const maxW = 640;
    const scale = Math.min(1, maxW / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
  }, [videoRef]);

  const runHudScan = useCallback(async () => {
    if (scanningRef.current || !cameraReady) return;
    scanningRef.current = true;
    setHudAnalyzing(true);
    setHudError(null);
    try {
      const blob = await captureFrame();
      if (!blob) { setHudAnalyzing(false); scanningRef.current = false; return; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([blob], 'hud.jpg', { type: 'image/jpeg' }) });
      const response = await base44.functions.invoke('quickIdentify', { image_url: file_url });
      setHudResult({ analysis: response.data.analysis, image_url: file_url });
      setSavedId(null);
    } catch {
      setHudError('Scan failed — retrying...');
    }
    setHudAnalyzing(false);
    scanningRef.current = false;
  }, [cameraReady, captureFrame, videoRef]);

  // Initial scan + auto-scan interval
  useEffect(() => {
    if (!cameraReady) return;
    const initialTimer = setTimeout(() => runHudScan(), 800);
    return () => clearTimeout(initialTimer);
  }, [cameraReady, runHudScan]);

  // Auto re-scan when result dismissed or saved
  useEffect(() => {
    if (!cameraReady || hudResult || hudAnalyzing || saving) return;
    const timer = setTimeout(() => runHudScan(), 2000);
    return () => clearTimeout(timer);
  }, [cameraReady, hudResult, hudAnalyzing, saving, runHudScan]);

  const handleSave = async () => {
    if (!hudResult || saving) return;
    setSaving(true);
    try {
      const response = await base44.functions.invoke('analyzeDiscovery', {
        image_url: hudResult.image_url,
        analysis: hudResult.analysis,
      });
      setSavedId(response.data.discovery.id);
      setRecent(prev => [
        { name: hudResult.analysis.name, value: hudResult.analysis.estimatedValue, id: response.data.discovery.id }
      ].concat(prev).slice(0, 4));
    } catch {
      setHudError('Save failed — try again');
    }
    setSaving(false);
  };

  const handleDismiss = () => {
    setHudResult(null);
    setSavedId(null);
  };

  const handleView = () => {
    if (savedId) navigate(`/discovery/${savedId}`);
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHudAnalyzing(true);
    setHudError(null);
    setHudResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('quickIdentify', { image_url: file_url });
      setHudResult({ analysis: response.data.analysis, image_url: file_url });
      setSavedId(null);
    } catch {
      setHudError('Scan failed — try again');
    }
    setHudAnalyzing(false);
  };

  const confidence = hudResult?.analysis?.confidence || 0;
  const showLabel = hudResult && confidence >= LOW_CONF_THRESHOLD;

  return (
    <div className="absolute inset-0 z-30">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 pt-safe px-4 py-3 flex items-center justify-between">
        <button onClick={onClose} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
          <X className="w-5 h-5 text-white" />
        </button>
        <div className="px-4 py-1.5 rounded-full ar-glass flex items-center gap-1.5">
          <motion.div animate={{ rotate: hudAnalyzing ? 360 : 0 }} transition={{ duration: 1.2, repeat: hudAnalyzing ? Infinity : 0, ease: 'linear' }}>
            <ScanLine className="w-3.5 h-3.5 text-amber-400" />
          </motion.div>
          <span className="text-xs font-semibold text-white">HUD MODE</span>
        </div>
        <button onClick={onSwitchMode} className="w-10 h-10 rounded-full ar-glass flex items-center justify-center touch-target">
          <Camera className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scanning reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="relative w-52 h-52"
          animate={{ scale: hudAnalyzing ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 1, repeat: hudAnalyzing ? Infinity : 0 }}
        >
          <div className="absolute top-0 left-0 w-10 h-10 border-l-2 border-t-2 rounded-tl-lg" style={{ borderColor: hudAnalyzing ? 'hsl(35 95% 60%)' : 'hsl(35 95% 55% / 0.6)' }} />
          <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 rounded-tr-lg" style={{ borderColor: hudAnalyzing ? 'hsl(35 95% 60%)' : 'hsl(35 95% 55% / 0.6)' }} />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-l-2 border-b-2 rounded-bl-lg" style={{ borderColor: hudAnalyzing ? 'hsl(35 95% 60%)' : 'hsl(35 95% 55% / 0.6)' }} />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-r-2 border-b-2 rounded-br-lg" style={{ borderColor: hudAnalyzing ? 'hsl(35 95% 60%)' : 'hsl(35 95% 55% / 0.6)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Crosshair className="w-6 h-6" style={{ color: hudAnalyzing ? 'hsl(35 95% 60%)' : 'hsl(35 95% 55% / 0.5)' }} />
          </div>
          {hudAnalyzing && (
            <motion.div
              className="absolute left-0 right-0 h-0.5"
              style={{ background: 'hsl(35 95% 60%)', boxShadow: '0 0 10px hsl(35 95% 60%)' }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      </div>

      {/* Scanning status text */}
      <AnimatePresence>
        {hudAnalyzing && !showLabel && (
          <motion.div
            className="absolute left-0 right-0 text-center pointer-events-none"
            style={{ top: 'calc(50% + 130px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <p className="text-xs font-semibold text-amber-400 tracking-wider">SCANNING...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Low confidence indicator */}
      {hudResult && !hudAnalyzing && confidence < LOW_CONF_THRESHOLD && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-auto"
          style={{ top: '18%' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="rounded-2xl px-4 py-3 max-w-[260px]" style={{ background: 'hsl(220 18% 5% / 0.82)', backdropFilter: 'blur(16px)', border: '1px solid hsl(220 12% 22%)' }}>
            <p className="text-sm font-heading font-bold text-white mb-1">Low Confidence</p>
            <p className="text-xs text-white/50 mb-3">Couldn't identify clearly. Try a different angle.</p>
            <button onClick={handleDismiss} className="w-full h-9 rounded-xl text-xs font-bold" style={{ background: 'hsl(220 12% 16%)', color: 'white' }}>Dismiss</button>
          </div>
        </motion.div>
      )}

      {/* AR Label */}
      {showLabel && (
        <ARHudLabel
          result={hudResult}
          onSave={handleSave}
          onDismiss={handleDismiss}
          onView={handleView}
          saving={saving}
          saved={!!savedId}
        />
      )}

      {/* Error toast */}
      <AnimatePresence>
        {hudError && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full"
            style={{ background: 'hsl(340 70% 25% / 0.4)', border: '1px solid hsl(340 70% 50% / 0.4)' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs text-rose-300">{hudError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom area: recent detections + hint */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe px-4 pt-2">
        {/* Recent detections */}
        {recent.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <History className="w-3 h-3 text-white/40" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">Recent</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recent.map((item, i) => {
                const vs = VALUE_STYLES[item.value] || VALUE_STYLES['Everyday Item'];
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/discovery/${item.id}`)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full flex items-center gap-1.5"
                    style={{ background: vs.bg, border: `1px solid ${vs.border}` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: vs.color }} />
                    <span className="text-[11px] font-medium text-white/80 whitespace-nowrap">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex items-center justify-around">
          <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-2xl ar-glass flex items-center justify-center touch-target">
            <Camera className="w-5 h-5 text-white" />
          </button>
          <motion.button
            onClick={runHudScan}
            disabled={hudAnalyzing}
            className="rounded-full flex items-center justify-center touch-target disabled:opacity-50"
            style={{ width: '64px', height: '64px' }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="absolute inset-0 rounded-full border-2 border-white/60" />
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}>
              <ScanLine className="w-5 h-5 text-white" />
            </div>
          </motion.button>
          <div className="w-12 h-12" />
        </div>

        <p className="text-center text-[10px] text-white/30 mt-2">Auto-scanning · Tap label to save</p>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
    </div>
  );
}