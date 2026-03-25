import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Heart, Bell, Layers3, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [vaultItems, setVaultItems] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);

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

  const toggleCompareSelect = (id) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pb-3 pt-safe-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="w-6 h-6 text-violet-400" />
              Vault
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your scanned finds and watchlist</p>
          </div>
          {/* Quick action buttons */}
          <div className="flex gap-2 mt-1">
            <Link to="/price-tracker">
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'hsl(190 100% 50% / 0.1)', border: '1px solid hsl(190 100% 50% / 0.25)', boxShadow: '0 4px 12px hsl(190 100% 50% / 0.08)' }}
                whileTap={{ scale: 0.9 }}>
                <Bell className="w-4 h-4 text-cyan-400" />
              </motion.div>
            </Link>
            <motion.button
              onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: compareMode ? 'hsl(263 70% 58% / 0.2)' : 'hsl(263 70% 58% / 0.08)',
                border: `1px solid ${compareMode ? 'hsl(263 70% 58% / 0.5)' : 'hsl(263 70% 58% / 0.2)'}`,
                boxShadow: compareMode ? '0 0 16px hsl(263 70% 58% / 0.2)' : 'none',
              }}
              whileTap={{ scale: 0.9 }}>
              <Layers3 className="w-4 h-4 text-violet-400" />
            </motion.button>
          </div>
        </div>

        {/* Compare mode bar */}
        <AnimatePresence>
          {compareMode && (
            <motion.div className="flex items-center gap-2 mt-3"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-xs font-medium" style={{ color: 'hsl(263 70% 70%)' }}>
                {selectedForCompare.length}/4 selected
              </p>
              {selectedForCompare.length >= 2 && (
                <motion.button
                  onClick={() => navigate(`/compare?ids=${selectedForCompare.join(',')}`)}
                  className="ml-auto px-4 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', boxShadow: '0 4px 14px hsl(263 70% 58% / 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}>
                  Compare Now →
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
          <p className="text-sm text-muted-foreground text-center">Your scanned finds will live here.</p>
          <Link to="/scan" className="text-violet-400 text-sm mt-3">Start Scanning</Link>
        </div>
      ) : (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {filteredItems.map((item, i) => {
            const compareId = item.identified_item_id || item.id;
            const isSelected = selectedForCompare.includes(compareId);
            return (
              <motion.div
                key={item.id}
                className="relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                {/* Compare checkbox */}
                {compareMode && (
                  <motion.button
                    onClick={() => toggleCompareSelect(compareId)}
                    className="absolute top-2 left-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{
                      background: isSelected ? 'hsl(263 70% 58%)' : 'hsl(240 12% 12% / 0.9)',
                      border: `1px solid ${isSelected ? 'hsl(263 70% 58%)' : 'hsl(240 10% 28%)'}`,
                      boxShadow: isSelected ? '0 0 12px hsl(263 70% 58% / 0.5)' : 'none',
                    }}
                    whileTap={{ scale: 0.85 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                    {isSelected && <X className="w-3 h-3 text-white" />}
                  </motion.button>
                )}

                <Link
                  to={compareMode ? '#' : (item.identified_item_id ? `/scan-result/${item.identified_item_id}` : '#')}
                  onClick={compareMode ? (e) => { e.preventDefault(); toggleCompareSelect(compareId); } : undefined}
                >
                  <motion.div
                    animate={isSelected && compareMode ? { scale: 0.97, borderColor: 'hsl(263 70% 58% / 0.5)' } : { scale: 1 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      borderRadius: 16,
                      border: isSelected && compareMode ? '1.5px solid hsl(263 70% 58% / 0.5)' : '1px solid transparent',
                      boxShadow: isSelected && compareMode ? '0 0 20px hsl(263 70% 58% / 0.15)' : 'none',
                    }}>
                    <GlassCard animate={false} className="p-0 overflow-hidden rounded-2xl">
                      <div className="h-28 bg-muted relative">
                        {item.item_image_url ? (
                          <img src={item.item_image_url} alt={item.item_title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-8 h-8 rounded bg-secondary" />
                          </div>
                        )}
                        {item.favorited !== undefined && !compareMode && (
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
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}