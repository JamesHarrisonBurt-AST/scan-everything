import { motion } from 'framer-motion';
import { TrendingDown, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import GlassCard from '../GlassCard';
import CountUpNumber from '../CountUpNumber';

export default function PricePanel({ priceSummary }) {
  if (!priceSummary) return null;

  const diff = priceSummary.difference_from_observed;
  const hasDiff = diff !== null && diff !== undefined;

  return (
    <div className="px-4 mt-4 space-y-3">
      {/* Best price found */}
      <GlassCard glow="cyan">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="text-sm font-medium text-foreground">Best Price Found</span>
        </div>
        <div className="text-3xl font-heading font-bold text-cyan-400">
          <CountUpNumber value={priceSummary.lowest_price} />
        </div>
        {hasDiff && (
          <div className="flex items-center gap-1 mt-1">
            {diff > 0 ? (
              <>
                <ArrowDown className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">Save ${diff.toFixed(2)} vs observed price</span>
              </>
            ) : diff < 0 ? (
              <>
                <ArrowUp className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-400">${Math.abs(diff).toFixed(2)} above lowest</span>
              </>
            ) : (
              <>
                <Minus className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">At market price</span>
              </>
            )}
          </div>
        )}
      </GlassCard>

      {/* Price range */}
      <GlassCard>
        <h3 className="text-sm font-medium text-foreground mb-3">Price Range</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[11px] text-emerald-400 uppercase tracking-wider mb-1">Low</p>
            <p className="text-lg font-heading font-bold text-foreground">
              <CountUpNumber value={priceSummary.lowest_price} />
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-cyan-400 uppercase tracking-wider mb-1">Median</p>
            <p className="text-lg font-heading font-bold text-foreground">
              <CountUpNumber value={priceSummary.median_price} />
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-amber-400 uppercase tracking-wider mb-1">High</p>
            <p className="text-lg font-heading font-bold text-foreground">
              <CountUpNumber value={priceSummary.high_price} />
            </p>
          </div>
        </div>

        {/* Deal score bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">Deal Score</span>
            <span className="text-[11px] text-cyan-400 font-medium">{priceSummary.deal_score || 0}/100</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${priceSummary.deal_score || 0}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}