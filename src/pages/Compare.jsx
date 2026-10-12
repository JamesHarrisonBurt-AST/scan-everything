import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, GitCompare, Package, Check, Plus, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { RARITY_STYLES } from '@/lib/gamification';

function parseArr(str) { try { return JSON.parse(str || '[]'); } catch { return []; } }

function CompareSlot({ discovery, label, onPick, onClear, color }) {
  return (
    <div className="flex-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 text-center">{label}</p>
      {discovery ? (
        <div className="relative rounded-2xl overflow-hidden glass-card">
          <div className="w-full aspect-square" style={{ background: 'hsl(220 12% 14%)' }}>
            {discovery.image_url
              ? <img src={discovery.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-muted-foreground/20" /></div>}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-semibold text-foreground truncate">{discovery.title}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{discovery.category}</p>
          </div>
          <button
            onClick={onClear}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center touch-target"
            style={{ background: 'hsl(220 14% 8% / 0.8)', backdropFilter: 'blur(4px)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
      ) : (
        <button
          onClick={onPick}
          className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 touch-target"
          style={{ background: 'hsl(220 12% 10%)', border: `2px dashed ${color}40` }}
        >
          <Plus className="w-6 h-6" style={{ color: `${color}80` }} />
          <span className="text-[11px] font-medium" style={{ color: `${color}80` }}>Tap to select</span>
        </button>
      )}
    </div>
  );
}

function DetailRow({ label, valueA, valueB }) {
  if (!valueA && !valueB) return null;
  return (
    <div className="grid grid-cols-2 gap-2 py-2.5 border-b border-border/20">
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xs text-foreground">{valueA || '—'}</p>
      </div>
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-xs text-foreground">{valueB || '—'}</p>
      </div>
    </div>
  );
}

export default function Compare() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [discoveryA, setDiscoveryA] = useState(null);
  const [discoveryB, setDiscoveryB] = useState(null);
  const [allDiscoveries, setAllDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.Discovery.list('-created_date', 100);
        setAllDiscoveries(items);
        const aId = searchParams.get('a');
        const bId = searchParams.get('b');
        if (aId) {
          const found = items.find(d => d.id === aId);
          if (found) setDiscoveryA(found);
          else { try { setDiscoveryA(await base44.entities.Discovery.get(aId)); } catch {} }
        }
        if (bId) {
          const found = items.find(d => d.id === bId);
          if (found) setDiscoveryB(found);
          else { try { setDiscoveryB(await base44.entities.Discovery.get(bId)); } catch {} }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const selectDiscovery = (d) => {
    const newParams = new URLSearchParams(searchParams);
    if (picking === 'a') {
      setDiscoveryA(d);
      newParams.set('a', d.id);
    } else if (picking === 'b') {
      setDiscoveryB(d);
      newParams.set('b', d.id);
    }
    setSearchParams(newParams);
    setPicking(null);
    setSearch('');
  };

  const filtered = search.trim()
    ? allDiscoveries.filter(d => (d.title || '').toLowerCase().includes(search.toLowerCase()) || (d.category || '').toLowerCase().includes(search.toLowerCase()))
    : allDiscoveries;

  const showComparison = discoveryA && discoveryB;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-safe-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Compare</h1>
          <p className="text-xs text-muted-foreground">Side-by-side discovery comparison</p>
        </div>
      </div>

      {loading ? (
        <div className="px-4 flex gap-3">
          <div className="flex-1 aspect-square rounded-2xl glass-card animate-pulse" />
          <div className="flex-1 aspect-square rounded-2xl glass-card animate-pulse" />
        </div>
      ) : (
        <div className="px-4">
          {/* Slots */}
          <div className="flex gap-3 mb-6">
            <CompareSlot
              discovery={discoveryA}
              label="Discovery A"
              onPick={() => setPicking('a')}
              onClear={() => { setDiscoveryA(null); const p = new URLSearchParams(searchParams); p.delete('a'); setSearchParams(p); }}
              color="#f59e0b"
            />
            <CompareSlot
              discovery={discoveryB}
              label="Discovery B"
              onPick={() => setPicking('b')}
              onClear={() => { setDiscoveryB(null); const p = new URLSearchParams(searchParams); p.delete('b'); setSearchParams(p); }}
              color="#2dd4bf"
            />
          </div>

          {showComparison ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Comparison details */}
              <div className="glass-card rounded-2xl p-4">
                <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <GitCompare className="w-4 h-4 text-amber-400" /> Comparison
                </h3>

                <DetailRow label="Title" valueA={discoveryA.title} valueB={discoveryB.title} />
                <DetailRow label="Category" valueA={discoveryA.category} valueB={discoveryB.category} />
                <DetailRow label="Estimated Value" valueA={discoveryA.estimated_value} valueB={discoveryB.estimated_value} />
                <DetailRow
                  label="Rarity"
                  valueA={discoveryA.rarity ? (RARITY_STYLES[discoveryA.rarity] || RARITY_STYLES.common).label : null}
                  valueB={discoveryB.rarity ? (RARITY_STYLES[discoveryB.rarity] || RARITY_STYLES.common).label : null}
                />
                <DetailRow
                  label="Confidence"
                  valueA={discoveryA.confidence_score ? `${discoveryA.confidence_score}%` : null}
                  valueB={discoveryB.confidence_score ? `${discoveryB.confidence_score}%` : null}
                />
                <DetailRow label="Brand" valueA={discoveryA.possible_brand} valueB={discoveryB.possible_brand} />
                <DetailRow label="Model" valueA={discoveryA.possible_model} valueB={discoveryB.possible_model} />
                <DetailRow label="Era" valueA={discoveryA.estimated_era} valueB={discoveryB.estimated_era} />
                <DetailRow label="Subcategory" valueA={discoveryA.subcategory} valueB={discoveryB.subcategory} />
                <DetailRow
                  label="Materials"
                  valueA={parseArr(discoveryA.materials).join(', ') || null}
                  valueB={parseArr(discoveryB.materials).join(', ') || null}
                />
                <div className="grid grid-cols-2 gap-2 pt-3">
                  <button
                    onClick={() => navigate(`/discovery/${discoveryA.id}`)}
                    className="h-10 rounded-xl text-xs font-bold touch-target"
                    style={{ background: 'hsl(35 95% 55% / 0.12)', border: '1px solid hsl(35 95% 55% / 0.25)', color: 'hsl(35 95% 65%)' }}
                  >
                    View A
                  </button>
                  <button
                    onClick={() => navigate(`/discovery/${discoveryB.id}`)}
                    className="h-10 rounded-xl text-xs font-bold touch-target"
                    style={{ background: 'hsl(175 65% 42% / 0.12)', border: '1px solid hsl(175 65% 42% / 0.25)', color: 'hsl(175 65% 52%)' }}
                  >
                    View B
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <GitCompare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-heading font-semibold text-muted-foreground">Select two discoveries to compare</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Tap a slot above to choose</p>
            </div>
          )}
        </div>
      )}

      {/* Picker overlay */}
      <AnimatePresence>
        {picking && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPicking(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full rounded-t-3xl p-5 pb-safe max-h-[70vh] flex flex-col"
              style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-foreground">Select Discovery {picking.toUpperCase()}</h3>
                <button onClick={() => setPicking(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search discoveries..."
                  className="w-full pl-9 pr-3 h-10 rounded-xl text-sm text-foreground outline-none"
                  style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                />
              </div>
              <div className="overflow-y-auto space-y-2 flex-1">
                {filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No discoveries found</p>
                ) : (
                  filtered.map(d => {
                    const selected = (picking === 'a' && discoveryA?.id === d.id) || (picking === 'b' && discoveryB?.id === d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => selectDiscovery(d)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left touch-target"
                        style={{
                          background: selected ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 10%)',
                          border: selected ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)',
                        }}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'hsl(220 12% 14%)' }}>
                          {d.image_url
                            ? <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <Package className="w-5 h-5 text-muted-foreground/20 m-auto mt-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{d.category}</p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-amber-400" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}