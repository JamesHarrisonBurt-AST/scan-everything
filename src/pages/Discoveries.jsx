import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Folder, Heart, Clock, LayoutGrid, X, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DiscoveryCard from '@/components/discovery/DiscoveryCard';
import EmptyState from '@/components/common/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';

const FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'favorites', label: 'Favorites', icon: Heart },
];

export default function Discoveries() {
  const [discoveries, setDiscoveries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const load = async () => {
    try {
      const [discs, cols] = await Promise.all([
        base44.entities.Discovery.list('-created_date', 200),
        base44.entities.Collection.list('-created_date', 50),
      ]);
      setDiscoveries(discs);
      setCollections(cols);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(discoveries.map(d => d.category).filter(Boolean))].sort(), [discoveries]);

  const filtered = useMemo(() => {
    let items = discoveries;
    if (activeFilter === 'favorites') items = items.filter(d => d.favorited);
    else if (activeFilter === 'recent') items = items.slice(0, 20);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.possible_brand || '').toLowerCase().includes(q) ||
        (d.possible_model || '').toLowerCase().includes(q) ||
        (d.tags || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [discoveries, activeFilter, search]);

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      await base44.entities.Collection.create({ name: newCollectionName.trim() });
      setNewCollectionName('');
      setShowNewCollection(false);
      load();
    } catch {}
  };

  return (
    <>
      <PullToRefresh onRefresh={load}>
        <div className="min-h-screen">
          <div className="px-4 pt-safe-12 pb-3">
            <h1 className="font-heading text-2xl font-extrabold text-foreground">My Discoveries</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{discoveries.length} objects found</p>
          </div>

          {/* Search */}
          <div className="px-4 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discoveries..." className="w-full pl-9 pr-3 h-10 rounded-xl text-sm text-foreground outline-none" style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }} />
            </div>
          </div>

          {/* Collections */}
          <div className="px-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Collections</p>
              <button onClick={() => setShowNewCollection(true)} className="text-[11px] text-amber-400 flex items-center gap-0.5"><Plus className="w-3 h-3" /> New</button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {collections.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/50 px-1">No collections yet</p>
              ) : (
                collections.map(c => (
                  <div key={c.id} className="flex-shrink-0 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}>
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-foreground">{c.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 flex gap-2 mb-4 overflow-x-auto scrollbar-none">
            {FILTERS.map(f => {
              const Icon = f.icon;
              return (
                <button key={f.id} onClick={() => setActiveFilter(f.id)} className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target ${activeFilter === f.id ? 'text-amber-400' : 'text-muted-foreground'}`} style={{ background: activeFilter === f.id ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 10%)', border: activeFilter === f.id ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)' }}>
                  <Icon className="w-3.5 h-3.5" /> {f.label}
                </button>
              );
            })}
            {categories.length > 0 && categories.map(cat => (
              <button key={cat} onClick={() => setActiveFilter(cat)} className={`px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target capitalize ${activeFilter === cat ? 'text-amber-400' : 'text-muted-foreground'}`} style={{ background: activeFilter === cat ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 10%)', border: activeFilter === cat ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)' }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="px-4 grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="aspect-square rounded-2xl glass-card animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Package} title={search ? "No results" : "No discoveries yet"} subtitle={search ? "Try a different search term" : "Start exploring to build your collection"} actionLabel={search ? undefined : "Start Exploring"} onAction={search ? undefined : () => window.location.href = '/ar-camera'} />
          ) : (
            <div className="px-4 grid grid-cols-2 gap-3">
              {filtered.map((d, i) => <DiscoveryCard key={d.id} discovery={d} index={i} />)}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* New Collection Modal */}
      {showNewCollection && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowNewCollection(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div className="relative w-full rounded-t-3xl p-5 pb-safe" style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }} initial={{ y: '100%' }} animate={{ y: 0 }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground mb-3">New Collection</h3>
            <input value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} placeholder="Collection name..." className="w-full px-4 h-11 rounded-xl text-sm text-foreground outline-none mb-3" style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }} onKeyDown={e => e.key === 'Enter' && createCollection()} />
            <div className="flex gap-3">
              <button onClick={() => setShowNewCollection(false)} className="flex-1 h-11 rounded-xl text-sm font-bold" style={{ background: 'hsl(220 12% 12%)', color: 'hsl(220 10% 60%)' }}>Cancel</button>
              <button onClick={createCollection} disabled={!newCollectionName.trim()} className="flex-1 h-11 rounded-xl text-sm font-bold" style={{ background: newCollectionName.trim() ? 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' : 'hsl(220 12% 12%)', color: newCollectionName.trim() ? 'white' : 'hsl(220 10% 40%)' }}>Create</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}