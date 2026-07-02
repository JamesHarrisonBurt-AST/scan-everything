import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RotateCcw, Move, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ARView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const imageUrl = urlParams.get('image');
  const title = urlParams.get('title') || 'Item';

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch (err) {
        setError(err.message || 'Camera access denied');
      }
    }
    start();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const onPointerDown = (e) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.target.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };
  const onPointerUp = () => { dragRef.current.dragging = false; };

  const reset = () => { setPos({ x: 0, y: 0 }); setScale(1); setRotation(0); };

  const close = () => { streamRef.current?.getTracks().forEach(t => t.stop()); navigate(-1); };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <button onClick={close}
        className="absolute left-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <X className="w-5 h-5 text-white" />
      </button>
      <button onClick={reset}
        className="absolute right-4 z-20 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <RotateCcw className="w-4 h-4 text-white" />
      </button>

      <div className="absolute z-20 left-1/2 -translate-x-1/2" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/50 text-white whitespace-nowrap">AR Preview · {title}</span>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <motion.div className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-cyan-500/20"
              animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-8">
            <p className="text-red-400 text-sm text-center mb-2">Camera access denied</p>
            <p className="text-muted-foreground text-xs text-center">{error}</p>
          </div>
        )}

        {ready && imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute select-none touch-none"
            style={{
              left: '50%', top: '50%', width: 180, height: 180, objectFit: 'contain',
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation}deg)`,
              filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.5))',
              cursor: 'grab',
            }}
          />
        )}

        {ready && !imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-white/60 text-sm text-center">No item image available to place</p>
          </div>
        )}

        {ready && (
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center gap-3">
                <Maximize2 className="w-4 h-4 text-white/70 flex-shrink-0" />
                <input type="range" min="0.3" max="2.5" step="0.05" value={scale}
                  onChange={e => setScale(parseFloat(e.target.value))}
                  className="flex-1" />
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-white/70 flex-shrink-0" />
                <input type="range" min="-180" max="180" step="1" value={rotation}
                  onChange={e => setRotation(parseFloat(e.target.value))}
                  className="flex-1" />
              </div>
              <p className="text-[10px] text-white/50 text-center flex items-center justify-center gap-1">
                <Move className="w-3 h-3" /> Drag the item to position it in your space
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}