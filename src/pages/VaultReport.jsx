import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FileText, Download, TrendingUp, Tag, Star, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const conditionTips = {
  'new': { label: 'New / Sealed', tip: 'Keep sealed for maximum value. List immediately at 90–95% of retail.', color: '#10b981' },
  'like new': { label: 'Like New', tip: 'Price at 75–85% of retail. Highlight minimal use in listing.', color: '#00d4ff' },
  'good': { label: 'Good', tip: 'Price at 55–70% of retail. Clean thoroughly before photographing.', color: '#8b5cf6' },
  'fair': { label: 'Fair', tip: 'Price at 35–50% of retail. Disclose all flaws upfront.', color: '#f59e0b' },
  'poor': { label: 'Poor / Parts', tip: 'Best for parts buyers. Price at 15–25% of retail.', color: '#f43f5e' },
};

const getConditionTip = (guess) => {
  if (!guess) return conditionTips['good'];
  const g = guess.toLowerCase();
  for (const key of Object.keys(conditionTips)) {
    if (g.includes(key)) return conditionTips[key];
  }
  return conditionTips['good'];
};

const verdictColor = { Common: '#8b9db0', Resellable: '#00d4ff', Collectible: '#f59e0b', 'Limited Edition': '#8b5cf6', Vintage: '#10b981', Rare: '#f43f5e', 'Research More': '#94a3b8' };

export default function VaultReport() {
  const navigate = useNavigate();
  const printRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const ids = urlParams.get('ids')?.split(',').filter(Boolean) || [];

  const [loading, setLoading] = useState(true);
  const [reportItems, setReportItems] = useState([]);
  const [generatedAt] = useState(new Date().toLocaleString());

  useEffect(() => {
    async function load() {
      if (!ids.length) { setLoading(false); return; }

      const [allItems, allSummaries, allAssessments, allVault] = await Promise.all([
        base44.entities.IdentifiedItem.list('-created_date', 200),
        base44.entities.PriceSummary.list('-created_date', 200),
        base44.entities.ValueAssessment.list('-created_date', 200),
        base44.entities.VaultItem.list('-created_date', 200),
      ]);

      const results = ids.map(id => {
        const item = allItems.find(i => i.id === id);
        const vault = allVault.find(v => v.identified_item_id === id);
        const summary = allSummaries.find(s => s.identified_item_id === id);
        const assess = allAssessments.find(a => a.identified_item_id === id);
        if (!item) return null;

        const condTip = getConditionTip(item.condition_guess);
        const margin = summary?.lowest_price && summary?.observed_price
          ? ((summary.lowest_price - summary.observed_price) / summary.observed_price * 100).toFixed(1)
          : null;
        const potentialProfit = summary?.median_price && summary?.lowest_price
          ? (summary.median_price - summary.lowest_price).toFixed(2)
          : null;

        return { item, vault, summary, assess, condTip, margin, potentialProfit };
      }).filter(Boolean);

      setReportItems(results);
      setLoading(false);
    }
    load();
  }, []);

  const handlePrint = () => window.print();

  const totalPotentialProfit = reportItems.reduce((sum, r) => sum + (parseFloat(r.potentialProfit) || 0), 0);
  const avgDealScore = reportItems.length
    ? Math.round(reportItems.reduce((s, r) => s + (r.summary?.deal_score || 0), 0) / reportItems.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-12 h-12 rounded-full border-2 border-t-cyan-400 border-cyan-500/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe-12 pb-4 print:hidden">
        <button onClick={() => navigate(-1)} className="touch-target">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" /> Vault Report
        </h1>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}
        >
          <Printer className="w-3.5 h-3.5" /> Print / PDF
        </button>
      </div>

      <div className="px-4 space-y-5" ref={printRef}>
        {/* Report header */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(263 70% 12%) 0%, hsl(190 100% 8%) 100%)', border: '1px solid hsl(263 70% 30% / 0.3)' }}
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Vault Intelligence Report</p>
          <h2 className="font-heading text-xl font-bold text-foreground">{reportItems.length} Items Analyzed</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Generated {generatedAt}</p>

          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Est. Total Profit', value: `$${totalPotentialProfit.toFixed(0)}`, color: '#10b981' },
              { label: 'Avg Deal Score', value: `${avgDealScore}/100`, color: '#00d4ff' },
              { label: 'Items', value: reportItems.length, color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-3 text-center">
                <p className="font-heading font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Item cards */}
        {reportItems.map((r, i) => (
          <motion.div
            key={r.item.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="glass-card rounded-2xl overflow-hidden">
              {/* Item header */}
              <div className="flex gap-3 p-4 border-b border-border/40">
                {r.item.image_primary_url ? (
                  <img src={r.item.image_primary_url} alt={r.item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-foreground truncate">{r.item.title}</p>
                  {r.item.brand && <p className="text-xs text-muted-foreground">{r.item.brand} {r.item.model}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {r.assess?.value_verdict && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${verdictColor[r.assess.value_verdict] || '#8b9db0'}20`, color: verdictColor[r.assess.value_verdict] || '#8b9db0', border: `1px solid ${verdictColor[r.assess.value_verdict] || '#8b9db0'}40` }}>
                        {r.assess.value_verdict}
                      </span>
                    )}
                    {r.vault?.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{r.vault.status}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price metrics */}
              <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
                {[
                  { label: 'Best Buy', value: r.summary?.lowest_price ? `$${r.summary.lowest_price.toFixed(2)}` : '—', color: '#10b981' },
                  { label: 'Market Avg', value: r.summary?.median_price ? `$${r.summary.median_price.toFixed(2)}` : '—', color: '#00d4ff' },
                  { label: 'High End', value: r.summary?.high_price ? `$${r.summary.high_price.toFixed(2)}` : '—', color: '#8b5cf6' },
                ].map(p => (
                  <div key={p.label} className="p-3 text-center">
                    <p className="font-heading font-bold text-sm" style={{ color: p.color }}>{p.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.label}</p>
                  </div>
                ))}
              </div>

              {/* Profit & margin */}
              <div className="p-4 space-y-3">
                {r.potentialProfit !== null && parseFloat(r.potentialProfit) > 0 && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: '#10b98115', border: '1px solid #10b98130' }}>
                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-400">Est. Profit Potential: +${r.potentialProfit}</p>
                      <p className="text-[10px] text-muted-foreground">Buy low at ${r.summary?.lowest_price?.toFixed(2)}, sell at market avg ${r.summary?.median_price?.toFixed(2)}</p>
                    </div>
                  </div>
                )}

                {r.margin !== null && (
                  <div className={`flex items-center gap-2.5 p-3 rounded-xl`} style={{ background: parseFloat(r.margin) > 0 ? '#10b98115' : '#f43f5e15', border: `1px solid ${parseFloat(r.margin) > 0 ? '#10b98130' : '#f43f5e30'}` }}>
                    {parseFloat(r.margin) > 0
                      ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <p className="text-xs" style={{ color: parseFloat(r.margin) > 0 ? '#10b981' : '#f43f5e' }}>
                      {parseFloat(r.margin) > 0
                        ? `${r.margin}% below observed shelf price — good buy`
                        : `${Math.abs(r.margin)}% above market — may be overpriced`}
                    </p>
                  </div>
                )}

                {/* Condition tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: `${r.condTip.color}12`, border: `1px solid ${r.condTip.color}30` }}>
                  <Tag className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: r.condTip.color }} />
                  <div>
                    <p className="text-[10px] font-semibold mb-0.5" style={{ color: r.condTip.color }}>
                      Condition: {r.item.condition_guess || r.condTip.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{r.condTip.tip}</p>
                  </div>
                </div>

                {/* Resale score */}
                {r.assess && (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-muted-foreground">Resale Score</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.assess.resale_potential_score || 0}%`, background: 'linear-gradient(90deg, #8b5cf6, #00d4ff)' }} />
                      </div>
                      <p className="text-[11px] font-semibold text-violet-400">{r.assess.resale_potential_score || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {reportItems.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No items selected for report.</p>
            <button onClick={() => navigate('/vault')} className="text-violet-400 text-sm mt-2">← Back to Vault</button>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body { background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .glass-card { background: #f8f9fa !important; border: 1px solid #dee2e6 !important; }
        }
      `}</style>
    </div>
  );
}