import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Heart, Bell, BellOff, Layers3, X, FileText, Box, Zap, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import GlassCard from '../components/GlassCard';
import SellPriorityCard from '../components/vault/SellPriorityCard';
import VaultDashboard from '../components/vault/VaultDashboard';
import CompareSummaryTable from '../components/vault/CompareSummaryTable';
import QuickActionsSheet from '../components/vault/QuickActionsSheet';
import VaultExportButton from '../components/vault/VaultExportButton';
import PullToRefresh from '../components/PullToRefresh';
import VaultFilterBar from '../components/vault/VaultFilterBar';
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
  const [sortBy, setSortBy] = useState('recent');
  const [activeCategory, setActiveCategory] = useState('all');
  const [quickActionItems, setQuickActionItems] = useState(null);
  const pressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const existingFolders = [...new Set(vaultItems.map(v => v.folder).filter(Boolean))];
  const vaultCategories = [...new Set(vaultItems.map(v => v.category).filter(Boolean))].sort();

  const handlePressStart = (item) => {
    longPressFiredRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      setQuickActionItems([item]);
    }, 500);
  };
  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };
  const handleBulkActions = () => {
    const selected = vaultItems.filter(v => selectedForCompare.includes(v.identified_item_id || v.id));
    setQuickActionItems(selected);
  };

  const load = async () => {
    const [vault, watchlist] = await Promise.all([
      base44.entities.VaultItem.list('-created_date', 50),
      base44.entities.WatchlistItem.list('-created_date', 50),
    ]);
    setVaultItems(vault);
    setWatchlistItems(watchlist);
    setLoading(false);

    // Watchlist alert notifications
    if ('Notification' in window && watchlist.length > 0) {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') {
        const activeAlerts = watchlist.filter(w => w.active);

        // Price drop 10%+ below target
        activeAlerts.forEach(w => {
          if (w.current_best_price && w.target_price && w.current_best_price <= w.target_price * 0.9) {
            const dropPct = Math.round((1 - w.current_best_price / w.target_price) * 100);
            new Notification('📉 10%+ Price Drop!', {
              body: `${w.item_title} dropped ${dropPct}% to $${w.current_best_price.toFixed(2)}`,
              icon: w.item_image_url || undefined,
            });
          }
        });

        // Sentiment shift check (throttled — once per 24h per item)
        const sentimentKey = 'vault_sentiment_cache';
        const cache = JSON.parse(localStorage.getItem(sentimentKey) || '{}');
        const now = Date.now();
        const itemsToCheck = activeAlerts.filter(w =>
          w.item_title && (!cache[w.id] || now - cache[w.id].checkedAt > 24 * 60 * 60 * 1000)
        );

        if (itemsToCheck.length > 0 && itemsToCheck.length <= 10) {
          try {
            const res = await base44.integrations.Core.InvokeLLM({
              prompt: `Assess the current resale market sentiment for these items. For each, classify as "bullish" (prices rising, demand growing), "bearish" (prices falling, demand shrinking), or "neutral" (stable):\n${itemsToCheck.map(w => `- ${w.item_title}`).join('\n')}`,
              add_context_from_internet: true,
              model: 'gemini_3_flash',
              response_json_schema: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        sentiment: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
                      },
                    },
                  },
                },
              },
            });

            (res.items || []).forEach(s => {
              const w = itemsToCheck.find(x => x.item_title === s.title);
              if (!w) return;
              const prev = cache[w.id]?.sentiment;
              if (prev && prev !== s.sentiment) {
                new Notification('📊 Market Sentiment Shift!', {
                  body: `${w.item_title} shifted from ${prev} to ${s.sentiment}`,
                  icon: w.item_image_url || undefined,
                });
              }
              cache[w.id] = { sentiment: s.sentiment, checkedAt: now };
            });
            localStorage.setItem(sentimentKey, JSON.stringify(cache));
          } catch {}
        }
      }
    }
  };

  useEffect(() => { load(); }, []);

  const filteredItems = (() => {
    let items;
    if (activeFilter === 'all') items = vaultItems;
    else if (activeFilter === 'favorited') items = vaultItems.filter(v => v.favorited);
    else if (activeFilter === 'watching') items = watchlistItems.map(w => ({
      ...w,
      item_title: w.item_title,
      item_image_url: w.item_image_url,
      status: 'watching',
      best_price_found: w.current_best_price,
    }));
    else items = vaultItems.filter(v => v.status === activeFilter);

    if (activeCategory !== 'all' && activeFilter !== 'watching') {
      items = items.filter(v => v.category === activeCategory);
    }
    return items;
  })();

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'profit') return (b.best_price_found || 0) - (a.best_price_found || 0);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const toggleFavorite = async (vaultItem) => {
    const prevItems = vaultItems;
    setVaultItems(prev => prev.map(v => v.id === vaultItem.id ? { ...v, favorited: !v.favorited } : v));
    try {
      await base44.entities.VaultItem.update(vaultItem.id, { favorited: !vaultItem.favorited });
    } catch {
      setVaultItems(prevItems);
    }
  };

  const toggleCompareSelect = (id) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const toggleWatchlistAlert = async (item) => {
    const w = watchlistItems.find(x => x.id === item.id);
    if (!w) return;
    const newActive = !w.active;
    setWatchlistItems(prev => prev.map(x => x.id === w.id ? { ...x, active: newActive } : x));
    try {
      await base44.entities.WatchlistItem.update(w.id, { active: newActive });
    } catch {
      setWatchlistItems(prev => prev.map(x => x.id === w.id ? { ...x, active: !newActive } : x));
    }
  };

  return (
    <>
    <PullToRefresh onRefresh={load}>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-4 pb-3 pt-safe-12">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="touch-target">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
                <Archive className="w-6 h-6 text-violet-400" />
                Vault
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Your scanned finds and watchlist</p>
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            {!loading && vaultItems.length > 0 && <VaultExportButton vaultItems={vaultItems} />}
            <Link to="/price-tracker">
              <motion.div
                className="w-9 h-9 rounded-xl flex items-center justify-center touch-target"
                style={{ background: 'hsl(190 100% 50% / 0.1)', border: '1px solid hsl(190 100% 50% / 0.25)' }}
                whileTap={{ scale: 0.9 }}>
                <Bell className="w-4 h-4 text-cyan-400" />
              </motion.div>
            </Link>
            <motion.button
              onClick={() => { setCompareMode(!compareMode); setSelectedForCompare([]); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center touch-target"
              style={{
                background: compareMode ? 'hsl(263 70% 58% / 0.2)' : 'hsl(263 70% 58% / 0.08)',
                border: `1px solid ${compareMode ? 'hsl(263 70% 58% / 0.5)' : 'hsl(263 70% 58% / 0.2)'}`,
              }}
              whileTap={{ scale: 0.9 }}>
              <Layers3 className="w-4 h-4 text-violet-400" />
            </motion.button>
          </div>
        </div>

        {/* Compare / Report action bar */}
        <AnimatePresence>
          {compareMode && (
            <motion.div className="flex items-center gap-2 mt-3"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <p className="text-xs font-medium" style={{ color: 'hsl(263 70% 70%)' }}>
                {selectedForCompare.length}/4 selected
              </p>
              {selectedForCompare.length >= 1 && (
                <div className="ml-auto flex gap-2">
                  <motion.button
                    onClick={handleBulkActions}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold touch-target"
                    style={{ background: 'hsl(38 92% 50% / 0.15)', color: '#fbbf24', border: '1px solid hsl(38 92% 50% / 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}>
                    <Zap className="w-3 h-3" /> Quick Actions
                  </motion.button>
                  <motion.button
                    onClick={() => navigate(`/vault-report?ids=${selectedForCompare.join(',')}`)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold touch-target"
                    style={{ background: 'hsl(190 100% 50% / 0.15)', color: '#00d4ff', border: '1px solid hsl(190 100% 50% / 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}>
                    <FileText className="w-3 h-3" /> Report
                  </motion.button>
                  <motion.button
                    onClick={() => navigate(`/compare?ids=${selectedForCompare.join(',')}`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold touch-target"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff' }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}>
                    Compare →
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!loading && (
        <VaultFilterBar
          sortBy={sortBy}
          setSortBy={setSortBy}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          categories={vaultCategories}
        />
      )}

      {!loading && <VaultDashboard vaultItems={vaultItems} />}
      {!loading && <SellPriorityCard vaultItems={vaultItems} />}

      {compareMode && selectedForCompare.length >= 2 && (
        <CompareSummaryTable selectedIds={selectedForCompare} vaultItems={vaultItems} />
      )}

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
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 mt-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Archive className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground text-center">Your scanned finds will live here.</p>
          <Link to="/scan" className="text-violet-400 text-sm mt-3">Start Scanning</Link>
        </div>
      ) : (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {sortedItems.map((item, i) => {
            const compareId = item.identified_item_id || item.id;
            const isSelected = selectedForCompare.includes(compareId);
            return (
              <motion.div
                key={item.id}
                className="relative"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                onPointerDown={() => !compareMode && handlePressStart(item)}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
              >
                {compareMode && (
                  <motion.button
                    onClick={() => toggleCompareSelect(compareId)}
                    className="absolute top-2 left-2 z-20 w-6 h-6 rounded-lg flex items-center justify-center touch-target"
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
                  onClick={compareMode ? (e) => { e.preventDefault(); toggleCompareSelect(compareId); } : (e) => { if (longPressFiredRef.current) e.preventDefault(); }}
                >
                  <motion.div
                    animate={isSelected && compareMode ? { scale: 0.97 } : { scale: 1 }}
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
                        {!compareMode && (
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                            {item.target_price !== undefined && (
                              <button
                                onClick={(e) => { e.preventDefault(); toggleWatchlistAlert(item); }}
                                className="w-7 h-7 rounded-full glass-card flex items-center justify-center touch-target"
                              >
                                {item.active
                                  ? <Bell className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                                  : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                              </button>
                            )}
                            {item.favorited !== undefined && (
                              <button
                                onClick={(e) => { e.preventDefault(); toggleFavorite(item); }}
                                className="w-7 h-7 rounded-full glass-card flex items-center justify-center touch-target"
                              >
                                <Heart className={cn('w-3.5 h-3.5', item.favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
                              </button>
                            )}
                            {item.item_image_url && (
                              <button
                                onClick={(e) => { e.preventDefault(); navigate(`/ar-view?image=${encodeURIComponent(item.item_image_url)}&title=${encodeURIComponent(item.item_title || 'Item')}`); }}
                                className="w-7 h-7 rounded-full glass-card flex items-center justify-center touch-target"
                              >
                                <Box className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-foreground truncate">{item.item_title || 'Unknown Item'}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          {item.best_price_found ? (
                            <span className="text-xs text-cyan-400 font-semibold">${item.best_price_found.toFixed(2)}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">No price</span>
                          )}
                          {item.status && (
                            <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full', statusColors[item.status] || statusColors.scanned)}>
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
    </PullToRefresh>
    <AnimatePresence>
      {quickActionItems && (
        <QuickActionsSheet
          items={quickActionItems}
          existingFolders={existingFolders}
          onClose={() => setQuickActionItems(null)}
          onDone={() => { setQuickActionItems(null); load(); }}
        />
      )}
    </AnimatePresence>
    </>
  );
}