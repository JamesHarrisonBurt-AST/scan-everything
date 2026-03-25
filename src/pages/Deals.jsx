import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingDown, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import GlassCard from '../components/GlassCard';
import DealScoreBadge from '../components/DealScoreBadge';
import CountUpNumber from '../components/CountUpNumber';

export default function Deals() {
  const [items, setItems] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [allItems, allSummaries] = await Promise.all([
        base44.entities.IdentifiedItem.list('-created_date', 20),
        base44.entities.PriceSummary.list('-deal_score', 20),
      ]);
      setItems(allItems);
      setSummaries(allSummaries);
      setLoading(false);
    }
    load();
  }, []);

  const getItem = (itemId) => items.find(i => i.id === itemId);

  const sortedDeals = summaries
    .filter(s => s.deal_score > 0)
    .sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pb-4 pt-safe-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-6 h-6 text-cyan-400" />
              Deals
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your best price discoveries</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : sortedDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 mt-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingDown className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Your best price discoveries will appear here.
          </p>
          <Link to="/scan" className="text-cyan-400 text-sm mt-3">
            Start Scanning
          </Link>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {sortedDeals.map((deal, i) => {
            const item = getItem(deal.identified_item_id);
            if (!item) return null;
            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link to={`/scan-result/${item.id}`}>
                  <GlassCard animate={false} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {item.image_primary_url ? (
                        <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-6 h-6 rounded bg-secondary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-heading font-bold text-cyan-400">
                          <CountUpNumber value={deal.lowest_price} />
                        </span>
                        {deal.high_price > deal.lowest_price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ${deal.high_price?.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        <DealScoreBadge score={deal.deal_score} label={deal.recommendation_label} />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}