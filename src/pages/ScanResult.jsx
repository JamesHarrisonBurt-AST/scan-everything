import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ResultHeader from '../components/result/ResultHeader';
import PricePanel from '../components/result/PricePanel';
import ListingsPanel from '../components/result/ListingsPanel';
import ValuePanel from '../components/result/ValuePanel';
import ResultActions from '../components/result/ResultActions';
import ListingDraftPanel from '../components/result/ListingDraftPanel';
import ProfitCalculator from '../components/result/ProfitCalculator';
import ShimmerLoader from '../components/ShimmerLoader';
import DepthReveal from '../components/result/DepthReveal';

export default function ScanResult() {
  const navigate = useNavigate();
  const itemId = window.location.pathname.split('/').pop();

  const [item, setItem] = useState(null);
  const [priceSummary, setPriceSummary] = useState(null);
  const [listings, setListings] = useState([]);
  const [valueAssessment, setValueAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [items, summaries, priceResults, assessments] = await Promise.all([
        base44.entities.IdentifiedItem.filter({ id: itemId }),
        base44.entities.PriceSummary.filter({ identified_item_id: itemId }),
        base44.entities.PriceResult.filter({ identified_item_id: itemId }),
        base44.entities.ValueAssessment.filter({ identified_item_id: itemId }),
      ]);

      setItem(items[0] || null);
      setPriceSummary(summaries[0] || null);
      setListings(priceResults || []);
      setValueAssessment(assessments[0] || null);
      setLoading(false);
    }
    loadData();
  }, [itemId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <motion.div
          className="w-16 h-16 rounded-full border-2 border-cyan-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="w-full h-full rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent" />
        </motion.div>
        <ShimmerLoader className="w-48 mt-6" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Item not found</p>
        <button onClick={() => navigate('/')} className="text-cyan-400 text-sm mt-2">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Back button overlay */}
      <button
        onClick={() => navigate(-1)}
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        className="fixed left-4 z-30 w-11 h-11 rounded-full glass-card flex items-center justify-center"
      >
        <ArrowLeft className="w-4 h-4 text-foreground" />
      </button>

      <ResultHeader item={item} priceSummary={priceSummary} />

      {/* Description */}
      {item.description && (
        <motion.div
          className="px-4 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-2 font-heading">What It Is</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            {item.condition_guess && (
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-foreground">Condition:</span> {item.condition_guess}
              </p>
            )}
          </div>
        </motion.div>
      )}

      <DepthReveal delay={0.4}>
        <PricePanel priceSummary={priceSummary} />
      </DepthReveal>
      <DepthReveal delay={0.5}>
        <ListingsPanel listings={listings} />
      </DepthReveal>
      <DepthReveal delay={0.6}>
        <ValuePanel assessment={valueAssessment} />
      </DepthReveal>
      <DepthReveal delay={0.7}>
        <ProfitCalculator priceSummary={priceSummary} />
      </DepthReveal>
      <DepthReveal delay={0.8}>
        <ListingDraftPanel item={item} priceSummary={priceSummary} assessment={valueAssessment} />
      </DepthReveal>
      <DepthReveal delay={0.9}>
        <ResultActions item={item} priceSummary={priceSummary} />
      </DepthReveal>
    </div>
  );
}