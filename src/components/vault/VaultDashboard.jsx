import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Coins, PieChart } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORY_COLORS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#a78bfa'];

export default function VaultDashboard({ vaultItems }) {
  const [sellListings, setSellListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const listings = await base44.entities.SellListing.list('-created_date', 100);
        setSellListings(listings);
      } catch { setSellListings([]); }
      setLoading(false);
    }
    if (vaultItems.length > 0) load(); else setLoading(false);
  }, [vaultItems]);

  if (loading || vaultItems.length === 0) return null;

  // Total collection value (non-sold items)
  const activeItems = vaultItems.filter(v => v.status !== 'sold');
  const totalValue = activeItems.reduce((sum, v) => sum + (v.best_price_found || 0), 0);

  // Historical growth: value added in last 30 days vs prior
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentValue = activeItems
    .filter(v => new Date(v.created_date) >= thirtyDaysAgo)
    .reduce((sum, v) => sum + (v.best_price_found || 0), 0);
  const olderValue = activeItems
    .filter(v => new Date(v.created_date) < thirtyDaysAgo)
    .reduce((sum, v) => sum + (v.best_price_found || 0), 0);
  const growthPct = olderValue > 0 ? ((recentValue - olderValue) / olderValue * 100) : (recentValue > 0 ? 100 : 0);
  const isGrowth = growthPct >= 0;

  // Sold profit
  const soldListings = sellListings.filter(l => l.status === 'sold');
  const soldRevenue = soldListings.reduce((sum, l) => sum + (l.asking_price || 0), 0);
  // Estimate cost basis from matching vault items
  const soldProfit = soldListings.reduce((profit, l) => {
    const vaultMatch = vaultItems.find(v => v.identified_item_id === l.identified_item_id);
    const cost = vaultMatch?.best_price_found || 0;
    return profit + ((l.asking_price || 0) - cost);
  }, 0);

  // Asset class breakdown by category
  const catMap = {};
  activeItems.forEach(v => {
    const cat = v.category || 'Uncategorized';
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat] += (v.best_price_found || 0);
  });
  const categories = Object.entries(catMap)
    .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue * 100) : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="px-4 mt-3">
      {/* Main value card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(240 14% 11%), hsl(263 50% 14%))',
          border: '1px solid hsl(263 70% 58% / 0.25)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(263 70% 58% / 0.15), transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-violet-400" />
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Collection Value</p>
          </div>
          <div className="flex items-end gap-3">
            <h2 className="font-heading text-3xl font-extrabold text-foreground">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
            <div className="flex items-center gap-1 mb-1.5">
              {isGrowth ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              <span className={`text-xs font-bold ${isGrowth ? 'text-emerald-400' : 'text-red-400'}`}>
                {isGrowth ? '+' : ''}{growthPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">vs prior 30-day period · {activeItems.length} items</p>
        </div>
      </motion.div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl p-3.5"
          style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(160 84% 39% / 0.2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(160 84% 39% / 0.12)' }}>
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Sold Profit</p>
          </div>
          <p className="font-heading text-xl font-bold text-emerald-400">${soldProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{soldListings.length} sold · ${soldRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl p-3.5"
          style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(190 100% 50% / 0.2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 100% 50% / 0.12)' }}>
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Asset Classes</p>
          </div>
          <p className="font-heading text-xl font-bold text-cyan-400">{categories.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">categories tracked</p>
        </motion.div>
      </div>

      {/* Asset class breakdown */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-4 mt-3"
          style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 18%)' }}>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Asset Class Breakdown</p>
          <div className="space-y-2.5">
            {categories.map((cat, i) => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-xs font-medium text-foreground truncate max-w-[140px]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{fmt(cat.value)}</span>
                    <span className="text-[11px] text-muted-foreground w-9 text-right">{cat.pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(240 10% 14%)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}