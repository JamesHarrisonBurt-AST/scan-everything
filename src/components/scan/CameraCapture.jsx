import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, SwitchCamera, X } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = async (facing) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setReady(false);
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => setReady(true);
    }
  };

  useEffect(() => {
    startCamera(facingMode).catch(err => setError(err.message || 'Camera access denied'));
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.92);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Close */}
      <button
        onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Switch camera */}
      <button
        onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <SwitchCamera className="w-5 h-5 text-white" />
      </button>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Viewfinder overlay */}
        {ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Corner brackets */}
              {[['top-0 left-0', 'border-t-2 border-l-2'], ['top-0 right-0', 'border-t-2 border-r-2'], ['bottom-0 left-0', 'border-b-2 border-l-2'], ['bottom-0 right-0', 'border-b-2 border-r-2']].map(([pos, border], i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-cyan-400`} />
              ))}
              {/* Scan beam */}
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(190 100% 60% / 0.8), transparent)' }}
                animate={{ y: [-10, 250, -10] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <motion.div
              className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-cyan-500/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8">
            <p className="text-red-400 text-sm text-center mb-2">Camera access denied</p>
            <p className="text-muted-foreground text-xs text-center">{error}</p>
            <p className="text-xs text-cyan-400 mt-4 text-center">Please allow camera access in your browser settings.</p>
          </div>
        )}
      </div>

      {/* Capture button */}
      {ready && (
        <div className="flex justify-center items-center py-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
          <motion.button
            onClick={capture}
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'white', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <Camera className="w-8 h-8 text-black" />
          </motion.button>
        </div>
      )}
    </div>
  );
}