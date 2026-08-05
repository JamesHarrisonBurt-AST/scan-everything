import { useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import DealScoreBadge from '../DealScoreBadge';

export default function ResultHeader({ item, priceSummary }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 150, damping: 20 });
  const rawY = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(rawY, [-1, 1], [5, -5]);
  const rotateY = useTransform(rawX, [-1, 1], [-7, 7]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };
  const handleMouseLeave = () => { rawX.set(0); rawY.set(0); };

  return (
    <motion.div
      className="relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ perspective: '1000px' }}
    >
      {/* 3D Tilt image */}
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="h-60 bg-muted relative"
      >
        {item.image_primary_url ? (
          <img
            src={item.image_primary_url}
            alt={item.title}
            className="w-full h-full object-cover"
            style={{ transform: 'translateZ(20px)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-card to-background">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
              <div className="w-8 h-8 rounded bg-muted-foreground/20" />
            </div>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(240 15% 4%) 0%, transparent 55%)' }} />
        {/* Depth shadow layer */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 -50px 70px -20px rgba(0,0,0,0.7)' }} />
      </motion.div>

      {/* Info overlay */}
      <div className="px-4 -mt-14 relative z-10">
        <motion.h1
          className="font-heading text-xl font-bold text-foreground"
          initial={{ opacity: 0, y: 16, rotateX: -12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'bottom' }}
        >
          {item.title}
        </motion.h1>
        <motion.div
          className="flex items-center gap-2 mt-1 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          {item.brand && <span className="text-xs text-cyan-400">{item.brand}</span>}
          {item.model && <span className="text-xs text-muted-foreground">• {item.model}</span>}
          {item.category && <span className="text-xs text-muted-foreground">• {item.category}</span>}
        </motion.div>
        <motion.div
          className="flex items-center gap-2 mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {item.confidence_score && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {item.confidence_score}% match
            </span>
          )}
          {priceSummary?.recommendation_label && (
            <DealScoreBadge score={priceSummary.deal_score || 50} label={priceSummary.recommendation_label} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}