import { motion } from 'framer-motion';
import { X, ChevronRight, Trash2 } from 'lucide-react';
import { RARITY_STYLES } from '@/lib/gamification';

export default function MarkerInfoPanel({ discovery, onView, onRemove, onClose }) {
  if (!discovery) return null;
  const rarity = RARITY_STYLES[discovery.rarity] || RARITY_STYLES.common;

  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 z-40"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 9rem)' }}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25 }}
    >
      <div className="glass-card rounded-2xl p-3 w-[280px]">
        <div className="flex items-start gap-3">
          {discovery.image_url && (
            <img src={discovery.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: rarity.color }}>
              {discovery.category}
            </p>
            <p className="text-sm font-heading font-bold text-foreground truncate">{discovery.title}</p>
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full mt-0.5" style={{ color: rarity.color, background: rarity.bg }}>
              {rarity.label}
            </span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(220 12% 14%)' }}>
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onView} className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1 touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}>
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} className="px-3 h-9 rounded-xl text-xs font-bold flex items-center justify-center touch-target" style={{ background: 'hsl(340 70% 25% / 0.4)', border: '1px solid hsl(340 70% 50% / 0.4)', color: 'hsl(340 70% 75%)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}