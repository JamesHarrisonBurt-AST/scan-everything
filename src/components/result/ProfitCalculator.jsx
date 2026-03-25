import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const PLATFORM_FEES = {
  eBay: 13.25,
  Mercari: 10,
  Depop: 10,
  Poshmark: 20,
  StockX: 9.5,
  Facebook: 5,
  OfferUp: 12.9,
  Custom: 0,
};

export default function ProfitCalculator({ priceSummary }) {
  const [open, setOpen] = useState(false);
  const [acquisition, setAcquisition] = useState(priceSummary?.observed_price?.toFixed(2) || priceSummary?.lowest_price?.toFixed(2) || '');
  const [shipping, setShipping] = useState('5.00');
  const [platform, setPlatform] = useState('eBay');
  const [customFee, setCustomFee] = useState('');
  const [sellPrice, setSellPrice] = useState(priceSummary?.median_price?.toFixed(2) || '');

  useEffect(() => {
    if (priceSummary) {
      if (!acquisition) setAcquisition(priceSummary.observed_price?.toFixed(2) || priceSummary.lowest_price?.toFixed(2) || '');
      if (!sellPrice) setSellPrice(priceSummary.median_price?.toFixed(2) || '');
    }
  }, [priceSummary]);

  const feeRate = platform === 'Custom' ? (parseFloat(customFee) || 0) : PLATFORM_FEES[platform];
  const acqNum = parseFloat(acquisition) || 0;
  const shipNum = parseFloat(shipping) || 0;
  const sellNum = parseFloat(sellPrice) || 0;
  const totalCost = acqNum + shipNum;
  const platformFeeAmt = sellNum * (feeRate / 100);
  const netProfit = sellNum - totalCost - platformFeeAmt;
  const margin = sellNum > 0 ? (netProfit / sellNum * 100) : 0;
  const roi = totalCost > 0 ? (netProfit / totalCost * 100) : 0;
  const isProfitable = netProfit > 0;

  const field = (label, value, onChange, prefix = '$', type = 'number') => (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 20%)' }}>
        {prefix && <span className="text-sm font-bold text-muted-foreground">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/30 min-w-0"
        />
      </div>
    </div>
  );

  return (
    <motion.div className="px-4 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
      <div className="glass-card rounded-2xl overflow-hidden" style={{ border: '1px solid hsl(38 92% 50% / 0.25)' }}>
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'hsl(38 92% 50% / 0.15)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
              <Calculator className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-heading font-semibold text-foreground">Profit Calculator</p>
              <p className="text-[10px] text-muted-foreground">Net margin after fees & shipping</p>
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/40 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {field('Acquisition Cost', acquisition, setAcquisition)}
                  {field('Shipping Cost', shipping, setShipping)}
                </div>

                {field('Sell Price', sellPrice, setSellPrice)}

                {/* Platform selector */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Platform & Fee</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(PLATFORM_FEES).map(p => (
                      <button
                        key={p}
                        onClick={() => setPlatform(p)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background: platform === p ? 'hsl(38 92% 50% / 0.2)' : 'hsl(240 12% 12%)',
                          color: platform === p ? '#fbbf24' : 'hsl(220 10% 55%)',
                          border: `1px solid ${platform === p ? 'hsl(38 92% 50% / 0.4)' : 'hsl(240 10% 18%)'}`,
                        }}
                      >
                        {p}{p !== 'Custom' ? ` ${PLATFORM_FEES[p]}%` : ''}
                      </button>
                    ))}
                  </div>
                  {platform === 'Custom' && (
                    <div className="mt-2">
                      {field('Custom Fee %', customFee, setCustomFee, '%')}
                    </div>
                  )}
                </div>

                {/* Results */}
                <div className="rounded-xl p-4 space-y-3" style={{ background: isProfitable ? 'hsl(160 84% 39% / 0.08)' : 'hsl(0 84% 60% / 0.08)', border: `1px solid ${isProfitable ? 'hsl(160 84% 39% / 0.25)' : 'hsl(0 84% 60% / 0.25)'}` }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-sm font-semibold text-foreground">${totalCost.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Platform Fee ({feeRate}%)</p>
                    <p className="text-sm font-semibold text-foreground">-${platformFeeAmt.toFixed(2)}</p>
                  </div>
                  <div className="h-px bg-border/40" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {isProfitable ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                      <p className="text-sm font-bold" style={{ color: isProfitable ? '#10b981' : '#f43f5e' }}>Net Profit</p>
                    </div>
                    <p className="text-lg font-heading font-bold" style={{ color: isProfitable ? '#10b981' : '#f43f5e' }}>
                      {isProfitable ? '+' : ''}{netProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="text-center p-2 rounded-lg" style={{ background: 'hsl(240 12% 10%)' }}>
                      <p className="text-[10px] text-muted-foreground">Margin</p>
                      <p className="text-sm font-bold" style={{ color: isProfitable ? '#10b981' : '#f43f5e' }}>{margin.toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: 'hsl(240 12% 10%)' }}>
                      <p className="text-[10px] text-muted-foreground">ROI</p>
                      <p className="text-sm font-bold" style={{ color: isProfitable ? '#10b981' : '#f43f5e' }}>{roi.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}