import { motion } from 'framer-motion';
import { ExternalLink, Store } from 'lucide-react';
import GlassCard from '../GlassCard';

export default function ListingsPanel({ listings }) {
  if (!listings || listings.length === 0) return null;

  return (
    <div className="px-4 mt-4">
      <h3 className="text-sm font-medium text-foreground mb-3 font-heading">Similar Listings</h3>
      <div className="space-y-2">
        {listings.map((listing, i) => (
          <motion.div
            key={listing.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard animate={false} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {listing.listing_title || listing.source_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-cyan-400 font-semibold">${listing.price_amount?.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">{listing.source_name}</span>
                  {listing.condition_label && (
                    <span className="text-[10px] text-muted-foreground">• {listing.condition_label}</span>
                  )}
                </div>
              </div>
              {listing.product_url && (
                <a
                  href={listing.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}