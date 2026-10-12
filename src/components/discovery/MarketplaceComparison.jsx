import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, TrendingUp, ExternalLink, RefreshCw, Loader2, DollarSign, Globe, WifiOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

function parseArr(str) { try { return JSON.parse(str || '[]'); } catch { return []; } }

const SOURCE_STYLES = {
  eBay: { color: '#e53236', bg: 'hsl(0 70% 50% / 0.1)' },
  Amazon: { color: '#ff9900', bg: 'hsl(30 80% 55% / 0.1)' },
  Etsy: { color: '#f1641e', bg: 'hsl(20 80% 50% / 0.1)' },
  Walmart: { color: '#0071ce', bg: 'hsl(210 100% 40% / 0.1)' },
  Other: { color: '#888', bg: 'hsl(220 12% 14%)' },
};

function getSourceStyle(source) {
  return SOURCE_STYLES[source] || SOURCE_STYLES.Other;
}

function formatPrice(price, currency) {
  if (!price) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export default function MarketplaceComparison({ discovery, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const listings = parseArr(discovery.marketplace_listings);
  const hasData = discovery.marketplace_searched_at && (listings.length > 0 || discovery.marketplace_lowest_price);

  const sortedListings = [...listings].sort((a, b) => (a.price || 0) - (b.price || 0));

  const search = async () => {
    if (!navigator.onLine) {
      setError('You are offline. Marketplace search requires internet.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('findMarketplaceDeals', { discovery_id: discovery.id });
      if (res.data?.error) throw new Error(res.data.error);
      onUpdate?.(res.data);
    } catch (e) {
      setError(e.message || 'Search failed. Try again.');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-amber-400" /> Marketplace Comparison
        </h3>
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">Searching marketplaces...</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">eBay, Amazon, Etsy, Walmart & more</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-amber-400" /> Marketplace Comparison
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Find the lowest price for this item across online marketplaces and see what it's worth.</p>
        {error && (
          <div className="rounded-lg p-2.5 mb-3 flex items-center gap-2" style={{ background: 'hsl(340 70% 25% / 0.15)', border: '1px solid hsl(340 70% 50% / 0.25)' }}>
            <WifiOff className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span className="text-[11px] text-rose-300">{error}</span>
          </div>
        )}
        <button
          onClick={search}
          className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-target"
          style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}
        >
          <DollarSign className="w-4 h-4" /> Find Lowest Price
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-amber-400" /> Marketplace Comparison
        </h3>
        <button
          onClick={search}
          disabled={loading}
          className="w-8 h-8 rounded-lg flex items-center justify-center touch-target"
          style={{ background: 'hsl(220 12% 14%)' }}
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-2.5 mb-3 flex items-center gap-2" style={{ background: 'hsl(340 70% 25% / 0.15)', border: '1px solid hsl(340 70% 50% / 0.25)' }}>
          <span className="text-[11px] text-rose-300">{error}</span>
        </div>
      )}

      {/* Price summary */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3" style={{ background: 'hsl(160 70% 42% / 0.1)', border: '1px solid hsl(160 70% 42% / 0.2)' }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Lowest Price</p>
          <p className="text-lg font-bold text-emerald-400">{formatPrice(discovery.marketplace_lowest_price, discovery.marketplace_currency)}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'hsl(35 95% 55% / 0.08)', border: '1px solid hsl(35 95% 55% / 0.2)' }}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Average</p>
          <p className="text-lg font-bold text-amber-400">{formatPrice(discovery.marketplace_avg_price, discovery.marketplace_currency)}</p>
        </div>
      </div>

      {/* Estimated worth */}
      {discovery.marketplace_worth_low > 0 && discovery.marketplace_worth_high > 0 && (
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2" style={{ background: 'hsl(175 65% 42% / 0.08)', border: '1px solid hsl(175 65% 42% / 0.2)' }}>
          <TrendingUp className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimated Worth</p>
            <p className="text-sm font-bold text-teal-400">
              {formatPrice(discovery.marketplace_worth_low, discovery.marketplace_currency)} — {formatPrice(discovery.marketplace_worth_high, discovery.marketplace_currency)}
            </p>
          </div>
        </div>
      )}

      {/* Listings */}
      {sortedListings.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> {sortedListings.length} Listings Found
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedListings.map((listing, i) => {
              const style = getSourceStyle(listing.source);
              return (
                <a
                  key={i}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl touch-target"
                  style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: style.bg }}>
                    <span className="text-[10px] font-bold" style={{ color: style.color }}>{listing.source?.slice(0, 3).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{listing.title || listing.source}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold" style={{ color: style.color }}>{formatPrice(listing.price, discovery.marketplace_currency)}</span>
                      {listing.condition && listing.condition !== 'unknown' && (
                        <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(220 12% 14%)' }}>{listing.condition}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {discovery.marketplace_searched_at && (
        <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
          Searched {format(parseISO(discovery.marketplace_searched_at), 'MMM d, h:mm a')}
        </p>
      )}
    </div>
  );
}