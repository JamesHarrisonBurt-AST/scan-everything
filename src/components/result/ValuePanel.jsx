import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Gem, TrendingUp, Search } from 'lucide-react';
import GlassCard from '../GlassCard';

const verdictConfig = {
  'Common': { color: 'text-muted-foreground', bg: 'bg-muted', icon: Shield },
  'Resellable': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: TrendingUp },
  'Collectible': { color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Gem },
  'Limited Edition': { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Gem },
  'Vintage': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Gem },
  'Rare': { color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Gem },
  'Research More': { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Search },
};

function ScoreBar({ label, score, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] text-foreground">{score}/100</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export default function ValuePanel({ assessment }) {
  if (!assessment) return null;

  const config = verdictConfig[assessment.value_verdict] || verdictConfig['Common'];
  const VerdictIcon = config.icon;
  const reasoning = (() => {
    try { return JSON.parse(assessment.reasoning_json || '[]'); }
    catch { return []; }
  })();

  return (
    <div className="px-4 mt-4">
      <GlassCard glow="violet">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
            <VerdictIcon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground font-heading">Value Scanner</h3>
            <span className={`text-xs ${config.color}`}>{assessment.value_verdict}</span>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <ScoreBar label="Resale Potential" score={assessment.resale_potential_score || 0} color="bg-gradient-to-r from-cyan-500 to-cyan-400" />
          <ScoreBar label="Collectible Chance" score={assessment.collectible_potential_score || 0} color="bg-gradient-to-r from-violet-500 to-violet-400" />
          <ScoreBar label="Rarity Signal" score={assessment.rarity_signal_score || 0} color="bg-gradient-to-r from-emerald-500 to-emerald-400" />
        </div>

        {reasoning.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {reasoning.map((r, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className="w-1 h-1 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">{r}</p>
              </motion.div>
            ))}
          </div>
        )}

        {assessment.cautionary_notes && (
          <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-400/80">{assessment.cautionary_notes}</p>
          </div>
        )}

        {assessment.research_recommended && (
          <motion.div
            className="mt-3 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center gap-2"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-[11px] text-cyan-400">Further research recommended</p>
          </motion.div>
        )}
      </GlassCard>
    </div>
  );
}