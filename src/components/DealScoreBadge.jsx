import { cn } from '@/lib/utils';

export default function DealScoreBadge({ score, label }) {
  const getColor = () => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    if (score >= 40) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', getColor())}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || `${score}/100`}
    </span>
  );
}