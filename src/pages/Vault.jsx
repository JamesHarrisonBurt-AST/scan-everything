import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Heart, Eye, Star, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import GlassCard from '../components/GlassCard';
import { cn } from '@/lib/utils';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'favorited', label: 'Favorites' },
  { id: 'watching', label: 'Watching' },
  { id: 'bought', label: 'Bought' },
  { id: 'researching', label: 'Researching' },
];

const statusColors = {
  scanned: 'bg-muted text-muted-foreground',
  researching: 'bg-cyan-500/10 text-cyan-400',
  bought: 'bg-emerald-500/10 text-emerald-400',
  passed: 'bg-muted text-muted-foreground',
  sold: 'bg-violet-500/10 text-violet-400',
  watching: 'bg-amber-500/10 text-amber-400',
};

export default function Vault() {
  const [vaultItems, setVaultItems] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [vault, watchlist] = await Promise.all([
        base44.entities.VaultItem.list('-created_date', 50),
        base44.entities.WatchlistItem.filter({ active: true }, '-created_date', 20),
      ]);
      setVaultItems(vault);
      setWatchlistItems(watchlist);
      setLoading(false);
    }
    load();
  }, []);

  const filteredItems = (() => {
    if (activeFilter === 'all') return vaultItems;
    if (activeFilter === 'favorited') return vaultItems.filter(v => v.favorited);
    if (activeFilter === 'watching') return watchlistItems.map(w => ({
      ...w,
      item_title: w.item_title,
      item_image_url: w.item_image_url,
      status: 'watching',
      best_price_found: w.current_best_price,
    }));
    return vaultItems.filter(v => v.status === activeFilter);
  })();

  const toggleFavorite = async (vaultItem) => {
    await base44.entities.VaultItem.update(vaultItem.id, { favorited: !vaultItem.favorited });
    setVaultItems(prev => prev.map(v => v.id === vaultItem.id ? { ...v, favorited: !v.favorited } : v));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Archive className="w-6 h-6 text-violet-400" />
          Vault
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your scanned finds and watchlist</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-2 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all',
              activeFilter === f.id
                ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                : 'bg-muted text-muted-foreground border border-transparent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 mt-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Archive className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Your scanned finds will live here.
          </p>
          <Link to="/scan" className="text-violet-400 text-sm mt-3">
            Start Scanning
          </Link>
        </div>
      ) : (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {filteredItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={item.identified_item_id ? `/scan-result/${item.identified_item_id}` : '#'}>
                <GlassCard animate={false} className="p-0 overflow-hidden">
                  <div className="h-28 bg-muted relative">
                    {item.item_image_url ? (
                      <img src={item.item_image_url} alt={item.item_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 rounded bg-secondary" />
                      </div>
                    )}
                    {item.favorited !== undefined && (
                      <button
                        onClick={(e) => { e.preventDefault(); toggleFavorite(item); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full glass-card flex items-center justify-center"
                      >
                        <Heart className={cn('w-3.5 h-3.5', item.favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-foreground truncate">{item.item_title || 'Unknown Item'}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      {item.best_price_found ? (
                        <span className="text-xs text-cyan-400 font-semibold">${item.best_price_found.toFixed(2)}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No price</span>
                      )}
                      {item.status && (
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', statusColors[item.status] || statusColors.scanned)}>
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}