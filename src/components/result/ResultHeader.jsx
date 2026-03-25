import { motion } from 'framer-motion';
import DealScoreBadge from '../DealScoreBadge';

export default function ResultHeader({ item, priceSummary }) {
  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Image */}
      <div className="h-56 bg-muted relative">
        {item.image_primary_url ? (
          <img
            src={item.image_primary_url}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-card to-background">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
              <div className="w-8 h-8 rounded bg-muted-foreground/20" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Info overlay */}
      <div className="px-4 -mt-12 relative z-10">
        <motion.h1
          className="font-heading text-xl font-bold text-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {item.title}
        </motion.h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.brand && (
            <span className="text-xs text-cyan-400">{item.brand}</span>
          )}
          {item.model && (
            <span className="text-xs text-muted-foreground">• {item.model}</span>
          )}
          {item.category && (
            <span className="text-xs text-muted-foreground">• {item.category}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {item.confidence_score && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {item.confidence_score}% match
            </span>
          )}
          {priceSummary?.recommendation_label && (
            <DealScoreBadge
              score={priceSummary.deal_score || 50}
              label={priceSummary.recommendation_label}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}