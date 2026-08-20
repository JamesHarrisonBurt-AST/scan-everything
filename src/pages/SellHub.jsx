import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, X, Check, DollarSign, Eye, Archive,
  ExternalLink, Trash2, Package, Tag, ChevronRight, Zap, Camera, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import PullToRefresh from '../components/PullToRefresh';

const PLATFORMS = [
  { name: 'eBay', color: '#0064d2', hint: 'Best for electronics & collectibles' },
  { name: 'Mercari', color: '#ff4f4f', hint: 'Fast sales, low fees' },
  { name: 'Poshmark', color: '#cc2c7a', hint: 'Best for clothing & shoes' },
  { name: 'Facebook', color: '#1877f2', hint: 'Great for local pickup' },
  { name: 'Depop', color: '#ff2300', hint: 'Trending streetwear' },
  { name: 'StockX', color: '#00de00', hint: 'Sneakers & streetwear' },
  { name: 'OfferUp', color: '#09b300', hint: 'Local sales, easy' },
  { name: 'Craigslist', color: '#7c6ae6', hint: 'Local, no fees' },
];

const STATUS_STYLES = {
  draft: { color: 'hsl(220 10% 55%)', bg: 'hsl(240 12% 13%)', border: 'hsl(240 10% 20%)', label: 'Draft' },
  active: { color: '#10b981', bg: 'hsl(160 84% 39% / 0.1)', border: 'hsl(160 84% 39% / 0.3)', label: 'Active' },
  sold: { color: '#00d4ff', bg: 'hsl(190 100% 50% / 0.1)', border: 'hsl(190 100% 50% / 0.3)', label: 'Sold' },
  archived: { color: 'hsl(220 10% 40%)', bg: 'hsl(240 12% 10%)', border: 'hsl(240 10% 16%)', label: 'Archived' },
};

const CONDITIONS = ['mint', 'excellent', 'good', 'fair', 'parts'];

function ListingForm({ vaultItems, onClose, onSaved }) {
  const [step, setStep] = useState(1); // 1=item, 2=details, 3=platforms
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', asking_price: '', condition: 'good', category: '' });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [conditionDrawerOpen, setConditionDrawerOpen] = useState(false);

  const pickVaultItem = (v) => {
    setSelectedVaultItem(v);
    setForm(f => ({
      ...f,
      title: v.item_title || '',
      asking_price: v.best_price_found ? String(Math.round(v.best_price_found * 0.85)) : '',
      category: v.category || '',
    }));
    if (v.item_image_url) setImagePreview(v.item_image_url);
    setStep(2);
  };

  const generateDescription = async () => {
    if (!form.title) return;
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a short, compelling product listing description for: "${form.title}" in ${form.condition} condition.
2-3 sentences, professional, honest, highlights value. No fluff.`,
    });
    setForm(f => ({ ...f, description: res }));
    setAiLoading(false);
  };

  const togglePlatform = (name) => setSelectedPlatforms(prev =>
    prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
  );

  const save = async () => {
    if (!form.title || !form.asking_price) return;
    setSaving(true);
    let image_url = selectedVaultItem?.item_image_url || '';
    if (imageFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = file_url;
    }
    const me = await base44.auth.me();
    await base44.entities.SellListing.create({
      identified_item_id: selectedVaultItem?.identified_item_id || '',
      title: form.title,
      description: form.description,
      asking_price: parseFloat(form.asking_price),
      condition: form.condition,
      category: form.category,
      image_url,
      platforms_json: JSON.stringify(selectedPlatforms),
      status: selectedPlatforms.length > 0 ? 'active' : 'draft',
      seller_name: me?.full_name || me?.email?.split('@')[0] || 'Seller',
    });
    setSaving(false);
    onSaved();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full rounded-t-3xl max-h-[90vh] overflow-y-auto flex flex-col"
        style={{ background: 'hsl(240 14% 9%)', border: '1px solid hsl(240 10% 20%)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-center justify-between"
          style={{ background: 'hsl(240 14% 9%)', borderBottom: '1px solid hsl(240 10% 16%)' }}>
          <div className="w-10 h-1 rounded-full bg-muted absolute top-2 left-1/2 -translate-x-1/2" />
          <div>
            <p className="font-heading font-bold text-foreground">New Listing</p>
            <p className="text-[11px] text-muted-foreground">Step {step} of 3</p>
          </div>
          <div className="flex items-center gap-2">
            {[1,2,3].map(s => (
              <div key={s} className="h-1.5 w-8 rounded-full transition-all"
                style={{ background: s <= step ? '#00d4ff' : 'hsl(240 10% 20%)' }} />
            ))}
            <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center ml-2"
              style={{ background: 'hsl(240 12% 14%)' }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </div>
        </div>

        <div className="px-5 py-4 flex-1">
          {/* Step 1: Pick from vault or manual */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Pick from your Vault or create manually</p>
              <div className="space-y-2">
                {vaultItems.slice(0, 10).map(v => (
                  <motion.button key={v.id} onClick={() => pickVaultItem(v)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }}
                    whileTap={{ scale: 0.98 }}>
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {v.item_image_url
                        ? <img src={v.item_image_url} alt={v.item_title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{v.item_title || 'Untitled'}</p>
                      {v.best_price_found && <p className="text-xs text-cyan-400">${v.best_price_found.toFixed(2)}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </motion.button>
                ))}
              </div>
              <div className="border-t border-border/30 pt-3">
                <motion.button onClick={() => setStep(2)}
                  className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 20%)', color: 'hsl(220 10% 60%)' }}
                  whileTap={{ scale: 0.96 }}>
                  <Plus className="w-4 h-4" /> Create Manually
                </motion.button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Image */}
              <label className="block cursor-pointer">
                <div className="w-full h-36 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: 'hsl(240 12% 11%)', border: '2px dashed hsl(240 10% 22%)' }}>
                  {imagePreview
                    ? <img src={imagePreview} className="w-full h-full object-cover" alt="preview" />
                    : <div className="flex flex-col items-center gap-2"><Camera className="w-6 h-6 text-muted-foreground/40" /><p className="text-xs text-muted-foreground">Add photo</p></div>}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={e => { setImageFile(e.target.files?.[0]); setImagePreview(URL.createObjectURL(e.target.files?.[0])); }} />
              </label>

              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Title *"
                className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none"
                style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />

              <div className="relative">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none resize-none"
                  style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />
                <motion.button onClick={generateDescription} disabled={!form.title || aiLoading}
                  className="absolute right-3 bottom-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background: 'hsl(190 100% 50% / 0.1)', color: '#00d4ff', border: '1px solid hsl(190 100% 50% / 0.2)' }}
                  whileTap={{ scale: 0.9 }}>
                  {aiLoading ? <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" /> : <Zap className="w-3 h-3" />}
                  AI Write
                </motion.button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input type="number" value={form.asking_price} onChange={e => setForm(f => ({ ...f, asking_price: e.target.value }))}
                    placeholder="Price *"
                    className="w-full pl-8 pr-3 py-3 rounded-xl text-sm text-foreground outline-none"
                    style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }} />
                </div>
                <div>
                  <button type="button" onClick={() => setConditionDrawerOpen(true)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-foreground outline-none capitalize flex items-center justify-between h-12"
                    style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }}>
                    {form.condition}
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <Drawer open={conditionDrawerOpen} onOpenChange={setConditionDrawerOpen}>
                    <DrawerContent style={{ background: 'hsl(240 14% 9%)', border: '1px solid hsl(240 10% 20%)' }}>
                      <DrawerHeader>
                        <DrawerTitle className="text-foreground font-heading">Condition</DrawerTitle>
                      </DrawerHeader>
                      <div className="px-4 pb-8 space-y-2">
                        {CONDITIONS.map(c => (
                          <button key={c} type="button"
                            onClick={() => { setForm(f => ({ ...f, condition: c })); setConditionDrawerOpen(false); }}
                            className="w-full p-3 rounded-xl text-left capitalize text-sm"
                            style={{
                              background: form.condition === c ? 'hsl(190 100% 50% / 0.12)' : 'hsl(240 12% 10%)',
                              border: form.condition === c ? '1px solid hsl(190 100% 50% / 0.3)' : '1px solid hsl(240 10% 18%)',
                              color: form.condition === c ? '#00d4ff' : 'hsl(220 10% 65%)',
                            }}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
              </div>

              <motion.button onClick={() => setStep(3)}
                disabled={!form.title || !form.asking_price}
                className="w-full h-12 rounded-2xl text-sm font-bold"
                style={{ background: form.title && form.asking_price ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'hsl(240 12% 13%)', color: form.title && form.asking_price ? 'white' : 'hsl(220 10% 40%)' }}
                whileTap={{ scale: 0.96 }}>
                Next → Choose Platforms
              </motion.button>
            </div>
          )}

          {/* Step 3: Platforms */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Where to sell?</p>
                <p className="text-xs text-muted-foreground mb-3">Select all platforms you want to list on</p>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(p => {
                    const sel = selectedPlatforms.includes(p.name);
                    return (
                      <motion.button key={p.name} onClick={() => togglePlatform(p.name)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                        style={{ background: sel ? `${p.color}18` : 'hsl(240 12% 10%)', border: sel ? `1px solid ${p.color}50` : '1px solid hsl(240 10% 18%)' }}
                        whileTap={{ scale: 0.95 }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.hint}</p>
                        </div>
                        {sel && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 17%)' }}>
                <p className="text-xs font-semibold text-foreground">Summary</p>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Item</span><span className="text-foreground font-medium truncate max-w-[60%] text-right">{form.title}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Price</span><span className="text-emerald-400 font-bold">${parseFloat(form.asking_price || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Condition</span><span className="text-foreground capitalize">{form.condition}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Platforms</span><span className="text-cyan-400 font-medium">{selectedPlatforms.length > 0 ? selectedPlatforms.join(', ') : 'None (save as draft)'}</span></div>
              </div>

              <div className="flex gap-3">
                <motion.button onClick={() => setStep(2)}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)' }}
                  whileTap={{ scale: 0.92 }}>
                  <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
                </motion.button>
                <motion.button onClick={save} disabled={saving}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: saving ? 'hsl(240 12% 13%)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: saving ? 'hsl(220 10% 40%)' : 'white' }}
                  whileTap={{ scale: 0.96 }}>
                  {saving ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <><Tag className="w-4 h-4" />{selectedPlatforms.length > 0 ? 'List Now' : 'Save Draft'}</>}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ListingCard({ listing, onDelete, onStatusChange }) {
  const st = STATUS_STYLES[listing.status] || STATUS_STYLES.draft;
  const platforms = (() => { try { return JSON.parse(listing.platforms_json || '[]'); } catch { return []; } })();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'hsl(240 12% 8%)', border: `1px solid ${st.border}`, boxShadow: '0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 hsl(240 10% 20% / 0.3)' }}>

      {/* Showcase image */}
      <div className="w-full aspect-[4/5] relative overflow-hidden bg-muted">
        {listing.image_url
          ? <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-muted-foreground/25" /></div>}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)' }} />

        <span className="absolute top-2.5 left-2.5 text-[11px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
          {st.label}
        </span>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-white/60 uppercase tracking-wider">Price</span>
            <p className="text-2xl font-extrabold font-heading text-white drop-shadow-md leading-none">${listing.asking_price?.toFixed(2)}</p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize backdrop-blur-sm"
            style={{ background: 'hsl(240 15% 6% / 0.65)', color: 'hsl(210 20% 90%)', border: '1px solid hsl(240 10% 40% / 0.4)' }}>
            {listing.condition}
          </span>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <p className="text-sm font-bold text-foreground truncate">{listing.title}</p>

        {platforms.length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-2">
            {platforms.slice(0, 3).map(p => {
              const platform = PLATFORMS.find(pl => pl.name === p);
              return (
                <span key={p} className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${platform?.color || '#666'}15`, color: platform?.color || '#666', border: `1px solid ${platform?.color || '#666'}30` }}>
                  {p}
                </span>
              );
            })}
            {platforms.length > 3 && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-muted-foreground" style={{ background: 'hsl(240 12% 13%)' }}>
                +{platforms.length - 3}
              </span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-2">Not listed anywhere yet</p>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {listing.status !== 'sold' && (
            <motion.button onClick={() => onStatusChange(listing, 'sold')}
              className="flex-1 h-8 rounded-lg text-[11px] font-bold"
              style={{ background: 'hsl(190 100% 50% / 0.08)', border: '1px solid hsl(190 100% 50% / 0.2)', color: '#00d4ff' }}
              whileTap={{ scale: 0.94 }}>
              Mark Sold
            </motion.button>
          )}
          {listing.status === 'draft' && (
            <motion.button onClick={() => onStatusChange(listing, 'active')}
              className="flex-1 h-8 rounded-lg text-[11px] font-bold"
              style={{ background: 'hsl(160 84% 39% / 0.08)', border: '1px solid hsl(160 84% 39% / 0.2)', color: '#10b981' }}
              whileTap={{ scale: 0.94 }}>
              Activate
            </motion.button>
          )}
          <motion.button onClick={() => onDelete(listing)}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.2)' }}
            whileTap={{ scale: 0.92 }}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default function SellHub() {
  const [listings, setListings] = useState([]);
  const [vaultItems, setVaultItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    async function load() {
      const [ls, vault] = await Promise.all([
        base44.entities.SellListing.list('-created_date', 100),
        base44.entities.VaultItem.list('-created_date', 50),
      ]);
      setListings(ls);
      setVaultItems(vault);
      setLoading(false);
    }
    load();
  }, []);

  const reload = async () => {
    const ls = await base44.entities.SellListing.list('-created_date', 100);
    setListings(ls);
  };

  const handleDelete = async (listing) => {
    await base44.entities.SellListing.delete(listing.id);
    setListings(prev => prev.filter(l => l.id !== listing.id));
  };

  const handleStatusChange = async (listing, status) => {
    const prev = listings;
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status } : l));
    try {
      await base44.entities.SellListing.update(listing.id, { status });
    } catch {
      setListings(prev);
    }
  };

  const TABS = [
    { key: 'active', label: 'Active', count: listings.filter(l => l.status === 'active').length },
    { key: 'draft', label: 'Drafts', count: listings.filter(l => l.status === 'draft').length },
    { key: 'sold', label: 'Sold', count: listings.filter(l => l.status === 'sold').length },
  ];

  const filtered = listings.filter(l => l.status === activeTab);

  const totalSold = listings.filter(l => l.status === 'sold').reduce((acc, l) => acc + (l.asking_price || 0), 0);

  return (
    <>
    <PullToRefresh onRefresh={reload}>
    <div className="min-h-screen pb-28" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Header */}
      <div className="px-4 pb-3 pt-safe-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-foreground flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-400" /> Sell Hub
            </h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">Manage your selling channels</p>
          </div>
          <motion.button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.15), hsl(190 100% 50% / 0.08))', border: '1px solid hsl(160 84% 39% / 0.3)', color: '#10b981' }}
            whileTap={{ scale: 0.95 }}>
            <Plus className="w-3.5 h-3.5" /> New Listing
          </motion.button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="px-4 grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Active', value: listings.filter(l => l.status === 'active').length, color: '#10b981' },
            { label: 'Drafts', value: listings.filter(l => l.status === 'draft').length, color: 'hsl(220 10% 55%)' },
            { label: 'Total Sold', value: `$${totalSold.toFixed(0)}`, color: '#00d4ff' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 17%)' }}>
              <p className="text-lg font-extrabold font-heading" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Platform quick links */}
      <div className="px-4 mb-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Selling Channels</p>
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
            {PLATFORMS.map(p => (
              <div key={p.name} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${p.color}10`, border: `1px solid ${p.color}25` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-xs font-semibold text-foreground">{p.name}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-4">
        {TABS.map(tab => (
          <motion.button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold"
            style={{
              background: activeTab === tab.key ? 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.08))' : 'hsl(240 12% 10%)',
              border: activeTab === tab.key ? '1px solid hsl(190 100% 50% / 0.3)' : '1px solid hsl(240 10% 18%)',
              color: activeTab === tab.key ? '#00d4ff' : 'hsl(220 10% 55%)',
            }}
            whileTap={{ scale: 0.94 }}>
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: activeTab === tab.key ? 'hsl(190 100% 50% / 0.2)' : 'hsl(240 12% 14%)', color: 'inherit' }}>
                {tab.count}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Listings — marketplace grid */}
      <div className="px-4">
        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="aspect-square rounded-2xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-semibold text-foreground">No {activeTab} listings</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === 'active' ? 'Create a listing and start selling' : activeTab === 'draft' ? 'Your drafts will appear here' : 'Sold items will appear here'}
            </p>
            {activeTab !== 'sold' && (
              <motion.button onClick={() => setShowForm(true)}
                className="mt-4 px-5 h-10 rounded-xl text-sm font-bold flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #00d4ff)', color: 'white' }}
                whileTap={{ scale: 0.96 }}>
                <Plus className="w-4 h-4" /> New Listing
              </motion.button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(listing => (
              <ListingCard key={listing.id} listing={listing} onDelete={handleDelete} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

    </div>
    </PullToRefresh>
    <AnimatePresence>
      {showForm && (
        <ListingForm
          vaultItems={vaultItems}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reload(); }}
        />
      )}
    </AnimatePresence>
    </>
  );
}