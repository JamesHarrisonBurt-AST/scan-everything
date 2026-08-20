import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, TrendingUp, MapPin, ThumbsUp, Plus, Filter, Camera,
  X, Check, Star, ChevronDown, Sparkles, Package
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '../components/PullToRefresh';

const CATEGORIES = ['All', 'Electronics', 'Clothing', 'Shoes', 'Toys', 'Books', 'Collectibles', 'Furniture', 'Sports', 'Tools'];

function DealCard({ deal, onUpvote, followedCategories }) {
  const savings = deal.market_value && deal.price_found ? deal.market_value - deal.price_found : null;
  const savingsPct = savings && deal.market_value ? Math.round((savings / deal.market_value) * 100) : null;
  const isFollowed = followedCategories.includes(deal.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'hsl(240 12% 8%)', border: `1px solid ${deal.deal_score > 80 ? 'hsl(160 84% 39% / 0.3)' : 'hsl(240 10% 16%)'}` }}>
      {deal.image_url && (
        <div className="w-full h-44 overflow-hidden relative">
          <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {deal.deal_score > 80 && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'hsl(160 84% 39% / 0.85)', color: '#fff' }}>
              <Sparkles className="w-3 h-3" /> HOT DEAL
            </div>
          )}
          {deal.verified && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'hsl(190 100% 50% / 0.85)', color: '#061218' }}>
              <Check className="w-3 h-3" /> Verified
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-foreground truncate">{deal.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: isFollowed ? 'hsl(263 70% 58% / 0.15)' : 'hsl(240 12% 14%)', color: isFollowed ? '#a78bfa' : 'hsl(220 10% 55%)', border: isFollowed ? '1px solid hsl(263 70% 58% / 0.3)' : '1px solid hsl(240 10% 20%)' }}>
                {deal.category}
              </span>
              {deal.location_label && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />{deal.location_label}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-extrabold font-heading text-emerald-400">${deal.price_found?.toFixed(2)}</p>
            {savingsPct && <p className="text-[11px] text-muted-foreground">{savingsPct}% off retail</p>}
          </div>
        </div>

        {deal.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{deal.description}</p>
        )}

        {deal.store_name && (
          <p className="text-[11px] text-cyan-400 mt-1.5">@ {deal.store_name}</p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white">
              {deal.poster_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-[11px] text-muted-foreground">{deal.poster_name || 'Anonymous'}</span>
          </div>
          <motion.button
            onClick={() => onUpvote(deal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: 'hsl(190 100% 50% / 0.08)', border: '1px solid hsl(190 100% 50% / 0.2)' }}
            whileTap={{ scale: 0.92 }}>
            <ThumbsUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">{deal.upvotes || 0}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function PostDealSheet({ onClose, onPosted, user }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'Electronics', price_found: '', market_value: '', store_name: '', location_label: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useState(null);

  const handleImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!form.title || !form.price_found) return;
    setSaving(true);
    let image_url = '';
    if (imageFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = file_url;
    }
    const pf = parseFloat(form.price_found);
    const mv = parseFloat(form.market_value) || 0;
    const deal_score = mv > 0 ? Math.min(100, Math.round(((mv - pf) / mv) * 100 + 50)) : 50;

    await base44.entities.CommunityDeal.create({
      title: form.title,
      description: form.description,
      category: form.category,
      price_found: pf,
      market_value: mv || undefined,
      store_name: form.store_name,
      location_label: form.location_label,
      image_url,
      upvotes: 0,
      poster_name: user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
      deal_score,
    });
    setSaving(false);
    onPosted();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full rounded-t-3xl max-h-[85vh] overflow-y-auto"
        style={{ background: 'hsl(240 14% 9%)', border: '1px solid hsl(240 10% 20%)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="sticky top-0 px-5 pt-5 pb-3 flex items-center justify-between"
          style={{ background: 'hsl(240 14% 9%)', borderBottom: '1px solid hsl(240 10% 16%)' }}>
          <div className="w-10 h-1 rounded-full bg-muted absolute top-2 left-1/2 -translate-x-1/2" />
          <p className="font-heading font-bold text-foreground">Post a Deal</p>
          <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'hsl(240 12% 14%)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Image picker */}
          <label className="block cursor-pointer">
            <div className="w-full h-32 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'hsl(240 12% 11%)', border: '2px dashed hsl(240 10% 22%)' }}>
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="preview" /> : (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Add photo</p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </label>

          {[
            { key: 'title', placeholder: 'Item name / title *', required: true },
            { key: 'description', placeholder: 'Description (optional)' },
            { key: 'store_name', placeholder: 'Store name (e.g. Goodwill)' },
            { key: 'location_label', placeholder: 'Location (e.g. Brooklyn, NY)' },
          ].map(f => (
            <input key={f.key} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40"
              style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />
          ))}

          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.price_found} onChange={e => setForm(p => ({ ...p, price_found: e.target.value }))}
              placeholder="Price you found *"
              className="px-4 py-3 rounded-xl text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
              style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />
            <input type="number" value={form.market_value} onChange={e => setForm(p => ({ ...p, market_value: e.target.value }))}
              placeholder="Market value"
              className="px-4 py-3 rounded-xl text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
              style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />
          </div>

          {/* Category */}
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.filter(c => c !== 'All').map(cat => (
              <motion.button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
                className="py-2 rounded-xl text-xs font-semibold"
                style={{ background: form.category === cat ? 'hsl(190 100% 50% / 0.12)' : 'hsl(240 12% 11%)', border: form.category === cat ? '1px solid hsl(190 100% 50% / 0.3)' : '1px solid hsl(240 10% 18%)', color: form.category === cat ? '#00d4ff' : 'hsl(220 10% 55%)' }}
                whileTap={{ scale: 0.94 }}>
                {cat}
              </motion.button>
            ))}
          </div>

          <motion.button onClick={submit} disabled={!form.title || !form.price_found || saving}
            className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mt-2"
            style={{ background: form.title && form.price_found && !saving ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'hsl(240 12% 13%)', color: form.title && form.price_found && !saving ? 'white' : 'hsl(220 10% 40%)' }}
            whileTap={{ scale: 0.96 }}>
            {saving ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Posting…</> : <><Sparkles className="w-4 h-4" /> Post Deal</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Community() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [followedCategories, setFollowedCategories] = useState([]);
  const [showPost, setShowPost] = useState(false);
  const [user, setUser] = useState(null);
  const [showFollowedOnly, setShowFollowedOnly] = useState(false);

  const load = async () => {
    const [me, allDeals, follows] = await Promise.all([
      base44.auth.me(),
      base44.entities.CommunityDeal.list('-upvotes', 50),
      base44.entities.CategoryFollow.list(),
    ]);
    setUser(me);
    setDeals(allDeals);
    const cats = follows.map(f => f.category);
    setFollowedCategories(cats);
    setLoading(false);

    // Notify about new deals in followed categories
    if ('Notification' in window && cats.length > 0) {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') {
        const seenKey = 'community_seen_deal_ids';
        const seen = JSON.parse(localStorage.getItem(seenKey) || '[]');
        const newMatches = allDeals.filter(d => !seen.includes(d.id) && cats.includes(d.category));
        newMatches.forEach(d => {
          const n = new Notification(`🔥 New ${d.category} Deal!`, {
            body: `${d.title} — $${d.price_found?.toFixed(2)}`,
            icon: d.image_url || undefined,
          });
          n.onclick = () => window.focus();
        });
        localStorage.setItem(seenKey, JSON.stringify(allDeals.map(d => d.id)));
      }
    }
  };

  useEffect(() => { load(); }, []);

  const toggleFollow = async (cat) => {
    if (cat === 'All') return;
    if (followedCategories.includes(cat)) {
      const follows = await base44.entities.CategoryFollow.filter({ category: cat });
      if (follows[0]) await base44.entities.CategoryFollow.delete(follows[0].id);
      setFollowedCategories(prev => prev.filter(c => c !== cat));
    } else {
      await base44.entities.CategoryFollow.create({ category: cat, user_email: user?.email || '' });
      setFollowedCategories(prev => [...prev, cat]);
    }
  };

  const handleUpvote = async (deal) => {
    const prevDeals = deals;
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, upvotes: (d.upvotes || 0) + 1 } : d));
    try {
      await base44.entities.CommunityDeal.update(deal.id, { upvotes: (deal.upvotes || 0) + 1 });
    } catch {
      setDeals(prevDeals);
    }
  };

  const filtered = deals.filter(d => {
    const catMatch = activeCategory === 'All' || d.category === activeCategory;
    const followMatch = !showFollowedOnly || followedCategories.includes(d.category);
    return catMatch && followMatch;
  });

  return (
    <>
    <PullToRefresh onRefresh={load}>
    <div className="min-h-screen pb-28" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Header */}
      <div className="px-4 pb-3 pt-safe-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-violet-400" /> Community
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">Hot deals found by real people</p>
          </div>
          <motion.button onClick={() => setShowPost(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.1))', border: '1px solid hsl(190 100% 50% / 0.3)', color: '#00d4ff' }}
            whileTap={{ scale: 0.95 }}>
            <Plus className="w-3.5 h-3.5" /> Post Deal
          </motion.button>
        </div>
      </div>

      {/* Category filters */}
      <div className="overflow-x-auto px-4 pb-3">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {CATEGORIES.map(cat => {
            const isFollowed = cat !== 'All' && followedCategories.includes(cat);
            const isActive = activeCategory === cat;
            return (
              <div key={cat} className="flex items-center gap-1">
                <motion.button onClick={() => setActiveCategory(cat)}
                  className="px-3 h-8 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, hsl(190 100% 50% / 0.2), hsl(263 70% 58% / 0.1))' : 'hsl(240 12% 10%)',
                    border: isActive ? '1px solid hsl(190 100% 50% / 0.35)' : '1px solid hsl(240 10% 18%)',
                    color: isActive ? '#00d4ff' : 'hsl(220 10% 55%)'
                  }}
                  whileTap={{ scale: 0.94 }}>
                  {cat}
                </motion.button>
                {cat !== 'All' && (
                  <motion.button onClick={() => toggleFollow(cat)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background: isFollowed ? 'hsl(263 70% 58% / 0.12)' : 'hsl(240 12% 10%)', border: isFollowed ? '1px solid hsl(263 70% 58% / 0.3)' : '1px solid hsl(240 10% 18%)' }}
                    whileTap={{ scale: 0.88 }}>
                    <Star className={`w-3 h-3 ${isFollowed ? 'text-violet-400 fill-violet-400' : 'text-muted-foreground'}`} />
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      {followedCategories.length > 0 && (
        <div className="px-4 pb-3 flex items-center gap-3">
          <motion.button onClick={() => setShowFollowedOnly(!showFollowedOnly)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold"
            style={{ background: showFollowedOnly ? 'hsl(263 70% 58% / 0.12)' : 'hsl(240 12% 10%)', border: showFollowedOnly ? '1px solid hsl(263 70% 58% / 0.3)' : '1px solid hsl(240 10% 18%)', color: showFollowedOnly ? '#a78bfa' : 'hsl(220 10% 55%)' }}
            whileTap={{ scale: 0.94 }}>
            <Star className="w-3 h-3" /> Following Only
          </motion.button>
          <p className="text-[11px] text-muted-foreground">Following {followedCategories.length} categories</p>
        </div>
      )}

      {/* Feed */}
      <div className="px-4 space-y-4">
        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />)}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold text-foreground">No deals yet</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to post a deal!</p>
            <motion.button onClick={() => setShowPost(true)}
              className="mt-4 px-5 h-10 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: 'white' }}
              whileTap={{ scale: 0.96 }}>
              <Plus className="w-4 h-4" /> Post First Deal
            </motion.button>
          </div>
        )}
        {!loading && filtered.map(deal => (
          <DealCard key={deal.id} deal={deal} onUpvote={handleUpvote} followedCategories={followedCategories} />
        ))}
      </div>

    </div>
    </PullToRefresh>
    <AnimatePresence>
      {showPost && (
        <PostDealSheet
          user={user}
          onClose={() => setShowPost(false)}
          onPosted={async () => {
            setShowPost(false);
            const fresh = await base44.entities.CommunityDeal.list('-upvotes', 50);
            setDeals(fresh);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}