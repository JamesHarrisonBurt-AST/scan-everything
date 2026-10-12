import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Folder, ArrowUpDown, GitCompare, Package, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CollectionTagsEditor from './CollectionTagsEditor';
import { RARITY_STYLES } from '@/lib/gamification';

const SORT_OPTIONS = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'alpha', label: 'A-Z' },
  { id: 'rarity', label: 'Rarity' },
];

const RARITY_ORDER = { exceptional: 0, unusual: 1, interesting: 2, common: 3 };

export default function CollectionSheet({ collection, onClose, onViewAR }) {
  const navigate = useNavigate();
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortPref, setSortPref] = useState(collection.sort_preference || 'recent');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [tagCount, setTagCount] = useState(() => {
    try { return JSON.parse(collection.tags || '[]').length; } catch { return 0; }
  });

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.CollectionItem.filter({ collection_id: collection.id });
        if (items.length > 0) {
          const discs = await Promise.all(
            items.map(ci => base44.entities.Discovery.get(ci.discovery_id).catch(() => null))
          );
          setDiscoveries(discs.filter(Boolean));
        }
      } catch {}
      setLoading(false);
    })();
  }, [collection.id]);

  const sorted = useMemo(() => {
    const arr = [...discoveries];
    if (sortPref === 'recent') arr.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    else if (sortPref === 'oldest') arr.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    else if (sortPref === 'alpha') arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sortPref === 'rarity') arr.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 3) - (RARITY_ORDER[b.rarity] ?? 3));
    return arr;
  }, [discoveries, sortPref]);

  const changeSort = async (pref) => {
    setSortPref(pref);
    setShowSortMenu(false);
    try { await base44.entities.Collection.update(collection.id, { sort_preference: pref }); } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        className="relative w-full rounded-t-3xl p-5 pb-safe max-h-[85vh] overflow-y-auto"
        style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(35 95% 55% / 0.12)' }}>
              <Folder className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground text-lg">{collection.name}</h3>
              <p className="text-[11px] text-muted-foreground">{discoveries.length} items{tagCount > 0 && ` · ${tagCount} tags`}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <CollectionTagsEditor collection={collection} onUpdated={(next) => setTagCount(next.length)} />
        </div>

        {/* Sort + Compare */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 touch-target"
              style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)', color: 'hsl(220 10% 70%)' }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> {SORT_OPTIONS.find(s => s.id === sortPref)?.label}
            </button>
            {showSortMenu && (
              <div className="absolute top-11 left-0 right-0 rounded-xl overflow-hidden z-10" style={{ background: 'hsl(220 14% 12%)', border: '1px solid hsl(220 12% 20%)' }}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => changeSort(opt.id)}
                    className={`w-full px-3 py-2.5 text-xs text-left touch-target ${sortPref === opt.id ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}`}
                    style={{ borderBottom: '1px solid hsl(220 12% 16%)' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {discoveries.length >= 2 && (
            <button
              onClick={() => { navigate(`/compare?a=${sorted[0].id}&b=${sorted[1].id}`); onClose(); }}
              className="flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 touch-target"
              style={{ background: 'hsl(175 65% 42% / 0.12)', border: '1px solid hsl(175 65% 42% / 0.3)', color: 'hsl(175 65% 52%)' }}
            >
              <GitCompare className="w-3.5 h-3.5" /> Compare
            </button>
          )}
        </div>

        {/* Items */}
        {loading ? (
          <div className="space-y-2 mb-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl glass-card animate-pulse" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 mb-4">
            <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No items in this collection yet</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {sorted.map(d => {
              const rarity = RARITY_STYLES[d.rarity] || RARITY_STYLES.common;
              return (
                <button
                  key={d.id}
                  onClick={() => { navigate(`/discovery/${d.id}`); onClose(); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left touch-target"
                  style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'hsl(220 12% 14%)' }}>
                    {d.image_url
                      ? <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/20" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{d.category}</p>
                    {d.estimated_value && <span className="text-[10px] text-amber-400 font-medium">{d.estimated_value}</span>}
                  </div>
                  {d.rarity !== 'common' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: rarity.color, background: rarity.bg }}>{rarity.label}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </button>
              );
            })}
          </div>
        )}

        {/* View in AR */}
        <button
          onClick={onViewAR}
          className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 touch-target"
          style={{ background: 'linear-gradient(135deg, hsl(175 65% 42%), hsl(160 70% 35%))', color: 'white' }}
        >
          <MapPin className="w-4 h-4" /> View in AR Room
        </button>
      </motion.div>
    </div>
  );
}