import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function ShareCardModal({ item, priceSummary, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const dealScore = priceSummary?.deal_score || 0;
  const lowestPrice = priceSummary?.lowest_price;
  const avgPrice = priceSummary?.average_price;
  const trendUp = avgPrice && lowestPrice && lowestPrice < avgPrice * 0.85;

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a14',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Card generation failed:', e);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `${(item.title || 'item').replace(/[^a-z0-9]/gi, '_')}_card.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${item.title || 'item'}_card.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.title,
          text: `Check out ${item.title} — estimated value $${lowestPrice?.toFixed(2)} on Scan Everything`,
        });
      } else {
        handleDownload();
      }
    } catch (e) {
      handleDownload();
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-sm"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-4 h-4 text-white" />
        </button>

        {/* The card to capture — inline styles for reliable html2canvas rendering */}
        <div ref={cardRef} style={{
          width: '100%', aspectRatio: '4/5',
          background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
          borderRadius: 24, overflow: 'hidden', position: 'relative',
          border: '1px solid rgba(0,212,255,0.15)',
        }}>
          {/* Item image */}
          <div style={{ position: 'relative', width: '100%', height: '55%', overflow: 'hidden' }}>
            {item.image_primary_url ? (
              <img src={item.image_primary_url} alt={item.title} crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e, #0d0d1a)' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0d0d1a 0%, transparent 50%)' }} />
            {item.category && (
              <span style={{
                position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 20,
                background: 'rgba(0,0,0,0.6)', color: '#00d4ff', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1, border: '1px solid rgba(0,212,255,0.3)',
              }}>
                {item.category}
              </span>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: 20, position: 'relative' }}>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 800, fontFamily: 'sans-serif', margin: 0, lineHeight: 1.2 }}>
              {item.title || 'Unknown Item'}
            </p>
            {item.brand && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{item.brand}</p>}

            {/* Value section */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>
                  Estimated Value
                </p>
                <p style={{ color: '#00d4ff', fontSize: 36, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                  {lowestPrice ? `$${lowestPrice.toFixed(2)}` : '—'}
                </p>
              </div>
              {dealScore > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>
                    Deal Score
                  </p>
                  <p style={{
                    color: dealScore > 75 ? '#10b981' : dealScore > 50 ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    fontSize: 24, fontWeight: 800, margin: 0,
                  }}>
                    {dealScore}/100
                  </p>
                </div>
              )}
            </div>

            {/* Trend indicator */}
            {avgPrice && lowestPrice && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
                padding: '8px 12px', borderRadius: 12,
                background: trendUp ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${trendUp ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              }}>
                <span style={{ color: trendUp ? '#10b981' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
                  {trendUp ? '▼ Below market average — great deal' : '● Near market average'}
                </span>
              </div>
            )}

            {/* Branding */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 16,
              paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ color: '#00d4ff', fontSize: 14 }}>⚡</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
                Scan Everything
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <motion.button onClick={handleDownload} disabled={generating}
            className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: 'white' }}
            whileTap={{ scale: 0.96 }}>
            {generating ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><Download className="w-4 h-4" /> Download</>}
          </motion.button>
          <motion.button onClick={handleShare} disabled={generating}
            className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 glass-card text-foreground"
            whileTap={{ scale: 0.96 }}>
            <Share2 className="w-4 h-4" /> Share
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}