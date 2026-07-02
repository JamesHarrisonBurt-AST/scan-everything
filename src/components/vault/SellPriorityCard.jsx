import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function SellPriorityCard({ vaultItems }) {
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function compute() {
      const withItemId = vaultItems.filter(v => v.identified_item_id && v.status !== 'sold').slice(0, 20);
      if (withItemId.length === 0) { setRanked([]); setLoading(false); return; }

      const [summaries, assessments] = await Promise.all([
        base44.entities.PriceSummary.list('-updated_date', 200),
        base44.entities.ValueAssessment.list('-created_date', 200),
      ]);
      const sumMap = {}; summaries.forEach(s => { sumMap[s.identified_item_id] = s; });
      const assessMap = {}; assessments.forEach(a => { assessMap[a.identified_item_id] = a; });

      const scored = withItemId.map(v => {
        const s = sumMap[v.identified_item_id];
        const a = assessMap[v.identified_item_id];
        const dealScore = s?.deal_score ?? 50;
        const resale = a?.resale_potential_score ?? 50;
        const rarity = a?.rarity_signal_score ?? 30;
        const sellScore = Math.round(dealScore * 0.35 + resale * 0.4 + rarity * 0.25);
        let reason = 'Steady resale demand';
        if (resale > 75) reason = 'High resale potential right now';
        else if (dealScore > 75) reason = 'Bought well below market value';
        else if (rarity > 70) reason = 'Rare — collectors paying premium';
        return { ...v, sellScore, reason, price: s?.lowest_price ?? v.best_price_found };
      }).sort((a, b) => b.sellScore - a.sellScore).slice(0, 5);

      setRanked(scored);
      setLoading(false);
    }
    compute();
  }, [vaultItems]);

  if (loading || ranked.length === 0) return null;

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-heading font-bold text-foreground uppercase tracking-wider">Sell First — vs Market Trends</h3>
      </div>
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {ranked.map((item, i) => (
            <Link key={item.id} to={item.identified_item_id ? `/scan-result/${item.identified_item_id}` : '#'}>
              <motion.div
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="w-40 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ background: 'hsl(240 12% 8%)', border: '1px solid hsl(160 84% 39% / 0.25)' }}>
                <div className="h-24 bg-muted relative">
                  {item.item_image_url
                    ? <img src={item.item_image_url} alt={item.item_title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full" />}
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'hsl(160 84% 39% / 0.85)', color: '#04140c' }}>
                    #{i + 1} · {item.sellScore}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-foreground truncate">{item.item_title}</p>
                  {item.price != null && <p className="text-xs text-emerald-400 font-bold mt-0.5">${item.price.toFixed(2)}</p>}
                  <p className="text-[9px] text-muted-foreground mt-1 leading-snug">{item.reason}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}