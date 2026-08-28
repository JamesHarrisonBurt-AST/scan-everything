import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { RARITY_STYLES } from '@/lib/gamification';

export default function DiscoveryCard({ discovery, index = 0 }) {
  const rarity = RARITY_STYLES[discovery.rarity] || RARITY_STYLES.common;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link to={`/discovery/${discovery.id}`}>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="aspect-square bg-muted relative">
            {discovery.image_url ? (
              <img src={discovery.image_url} alt={discovery.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-muted-foreground/25" />
              </div>
            )}
            {discovery.favorited && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full glass-card flex items-center justify-center">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              </div>
            )}
            {discovery.rarity && discovery.rarity !== 'common' && (
              <span
                className="absolute bottom-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}30` }}
              >
                {rarity.label}
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-medium text-foreground truncate">{discovery.title}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground capitalize truncate">{discovery.category}</span>
              <span className="text-[11px] text-amber-400 font-semibold">{discovery.confidence_score}%</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}