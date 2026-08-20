import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Table2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CompareSummaryTable({ selectedIds, vaultItems }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selectedIds.length < 2) { setRows([]); setOpen(false); return; }
    setLoading(true);
    async function load() {
      const [summaries, assessments] = await Promise.all([
        base44.entities.PriceSummary.list('-updated_date', 200),
        base44.entities.ValueAssessment.list('-created_date', 200),
      ]);
      const sumMap = {}; summaries.forEach(s => { sumMap[s.identified_item_id] = s; });
      const assessMap = {}; assessments.forEach(a => { assessMap[a.identified_item_id] = a; });

      const data = selectedIds.map(id => {
        const v = vaultItems.find(item => (item.identified_item_id || item.id) === id);
        const s = sumMap[id];
        const a = assessMap[id];
        const low = s?.lowest_price ?? v?.best_price_found ?? 0;
        const high = s?.high_price ?? 0;
        const avg = s?.average_price ?? 0;
        const profitPotential = high > 0 ? high - low : (avg > 0 ? avg - low : 0);
        return {
          id,
          title: v?.item_title || 'Unknown',
          image: v?.item_image_url,
          category: v?.category || '—',
          low, high, avg,
          dealScore: s?.deal_score ?? 0,
          resaleScore: a?.resale_potential_score ?? 0,
          rarityScore: a?.rarity_signal_score ?? 0,
          profitPotential,
        };
      });
      setRows(data);
      setLoading(false);
    }
    load();
  }, [selectedIds, vaultItems]);

  if (selectedIds.length < 2) return null;

  // Find best values for highlighting
  const bestProfit = Math.max(...rows.map(r => r.profitPotential));
  const bestDeal = Math.max(...rows.map(r => r.dealScore));
  const bestResale = Math.max(...rows.map(r => r.resaleScore));

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(true)}
        className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, hsl(263 70% 58% / 0.15), hsl(190 100% 50% / 0.1))', border: '1px solid hsl(263 70% 58% / 0.3)', color: '#a78bfa' }}
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.97 }}>
        <Table2 className="w-3.5 h-3.5" /> View Summary Table ({rows.length} items)
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              className="relative w-full max-h-[80vh] rounded-t-3xl overflow-hidden"
              style={{ background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))', border: '1px solid hsl(240 10% 22%)', borderBottom: 'none' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted" /></div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground">Comparison Summary</h3>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(240 12% 14%)' }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="overflow-x-auto px-4 pb-8">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <motion.div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-400"
                      animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                  </div>
                ) : (
                  <table className="w-full text-xs" style={{ minWidth: 320 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(240 10% 18%)' }}>
                        <th className="text-left py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Item</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Market Low</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Avg</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">High</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Deal</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Resale</th>
                        <th className="text-right py-2.5 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          style={{ borderBottom: '1px solid hsl(240 10% 14%)' }}>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                {r.image ? <img src={r.image} alt={r.title} className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-foreground truncate max-w-[100px]">{r.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{r.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-2.5 px-2 text-emerald-400 font-semibold">${r.low.toFixed(0)}</td>
                          <td className="text-right py-2.5 px-2 text-cyan-400 font-semibold">${r.avg.toFixed(0)}</td>
                          <td className="text-right py-2.5 px-2 text-violet-400 font-semibold">${r.high.toFixed(0)}</td>
                          <td className="text-right py-2.5 px-2">
                            <span className={r.dealScore === bestDeal && bestDeal > 0 ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}>
                              {r.dealScore || '—'}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-2">
                            <span className={r.resaleScore === bestResale && bestResale > 0 ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}>
                              {r.resaleScore || '—'}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-2">
                            <span className={r.profitPotential === bestProfit && bestProfit > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                              ${r.profitPotential.toFixed(0)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-[11px] text-muted-foreground mt-3 text-center">Highlighted values indicate the best option in each column</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}