import { motion } from 'framer-motion';
import { getLevelInfo } from '@/lib/gamification';

export default function XPBar({ xp = 0, compact = false }) {
  const info = getLevelInfo(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-amber-400">L{info.current.level}</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}
            initial={{ width: 0 }}
            animate={{ width: `${info.progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground">{info.xpInLevel}/{info.xpToNext}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-heading font-bold text-amber-400">Level {info.current.level}</span>
          <span className="text-xs text-muted-foreground">{info.current.name}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{info.xpInLevel}/{info.xpToNext} XP</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}
          initial={{ width: 0 }}
          animate={{ width: `${info.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}