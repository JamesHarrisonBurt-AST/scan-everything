import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, X, Loader2, Sparkles, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { RARITY_STYLES } from '@/lib/gamification';

export default function ShareCard({ discovery, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [shared, setShared] = useState(false);
  const rarity = RARITY_STYLES[discovery.rarity] || RARITY_STYLES.common;

  const handleShare = async () => {
    if (!cardRef.current || generating) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], `${(discovery.title || 'discovery').replace(/\s+/g, '_')}_scan.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: discovery.title, text: discovery.summary || '' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      setShared(true);
    } catch {}
    setGenerating(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
      style={{ background: 'hsl(220 18% 5% / 0.92)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target z-10">
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Card to capture */}
      <div ref={cardRef} className="w-full max-w-[300px] rounded-3xl overflow-hidden" style={{ background: 'hsl(220 14% 8%)', border: '1px solid hsl(220 12% 18%)' }}>
        <div className="w-full aspect-[4/3] relative overflow-hidden" style={{ background: 'hsl(220 12% 14%)' }}>
          {discovery.image_url ? (
            <img src={discovery.image_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles className="w-10 h-10" style={{ color: 'hsl(35 95% 55% / 0.3)' }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(220 14% 8%) 0%, transparent 60%)' }} />
        </div>
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(35 95% 65%)' }}>{discovery.category}</p>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'hsl(40 30% 92%)', fontFamily: 'Syne, sans-serif' }}>{discovery.title}</h2>
          {discovery.summary && <p className="text-xs mb-3 leading-relaxed" style={{ color: 'hsl(220 10% 60%)' }}>{discovery.summary}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            {discovery.estimated_value && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ background: 'hsl(35 95% 55% / 0.12)', color: 'hsl(35 95% 65%)', border: '1px solid hsl(35 95% 55% / 0.25)' }}>{discovery.estimated_value}</span>
            )}
            {discovery.rarity && discovery.rarity !== 'common' && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold" style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}30` }}>{rarity.label}</span>
            )}
            {discovery.confidence_score != null && (
              <span className="text-[11px]" style={{ color: 'hsl(220 10% 55%)' }}>{discovery.confidence_score}% confidence</span>
            )}
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-1.5" style={{ background: 'hsl(220 14% 6%)', borderTop: '1px solid hsl(220 12% 16%)' }}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: 'hsl(220 10% 55%)' }}>Scan Anything AI</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 w-full max-w-[300px]">
        {shared ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(160 70% 42% / 0.15)', border: '1px solid hsl(160 70% 42% / 0.3)' }}>
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm text-amber-400 font-semibold mb-3">Shared!</p>
            <button onClick={onClose} className="w-full h-11 rounded-xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 14%)', color: 'hsl(220 10% 70%)' }}>Done</button>
          </motion.div>
        ) : (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 14%)', color: 'hsl(220 10% 70%)' }}>Cancel</button>
            <button onClick={handleShare} disabled={generating} className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {generating ? 'Creating...' : 'Share Card'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}