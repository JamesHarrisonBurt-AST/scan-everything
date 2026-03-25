import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, BellOff, TrendingDown, TrendingUp, Target, ChevronRight, X, Check, Layers, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

function TiltCard({ children, style = {}, className = '' }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 150, damping: 22 });
  const rawY = useSpring(0, { stiffness: 150, damping: 22 });
  const rotateX = useTransform(rawY, [-1, 1], [4, -4]);
  const rotateY = useTransform(rawX, [-1, 1], [-6, 6]);
  return (
    <div style={{ perspective: '700px' }}>
      <motion.div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current.getBoundingClientRect();
          rawX.set(((e.clientX - r.left) / r.width - 0.5) * 2);
          rawY.set(((e.clientY - r.top) / r.height - 0.5) * 2);
        }}
        onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d', ...style }}
        className={className}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function ThresholdEditor({ item, watchlistItem, onSave, onClose }) {
  const [value, setValue] = useState(watchlistItem?.target_price?.toString() || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const price = parseFloat(value);
    if (watchlistItem) {
      await base44.entities.WatchlistItem.update(watchlistItem.id, { target_price: price });
    } else {
      await base44.entities.WatchlistItem.create({
        identified_item_id: item.id,
        item_title: item.title,
        item_image_url: item.image_primary_url,
        category: item.category,
        target_price: price,
        active: true,
      });
    }
    setSaving(false);
    onSave();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full rounded-t-3xl p-6"
        style={{
          background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))',
          border: '1px solid hsl(240 10% 22%)',
          borderBottom: 'none',
          boxShadow: '0 -24px 70px rgba(0,0,0,0.6)',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
            {item.image_primary_url
              ? <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Layers className="w-5 h-5 text-muted-foreground/30" /></div>}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">Set price alert threshold</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Alert me when price drops below</p>
        <div className="flex items-center gap-3 rounded-2xl p-4 mb-5"
          style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(190 100% 50% / 0.2)', boxShadow: '0 0 24px hsl(190 100% 50% / 0.06)' }}>
          <span className="text-2xl font-heading font-extrabold text-cyan-400">$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-transparent text-2xl font-heading font-extrabold text-foreground outline-none placeholder:text-muted-foreground/30"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold text-muted-foreground"
            style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 20%)' }}>
            Cancel
          </button>
          <motion.button
            onClick={save}
            disabled={!value || saving}
            className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            style={{
              background: saving ? 'hsl(240 12% 14%)' : 'linear-gradient(135deg, #00d4ff, #0099bb)',
              color: saving ? 'hsl(220 10% 50%)' : '#061218',
              boxShadow: saving ? 'none' : '0 8px 24px hsl(190 100% 50% / 0.3)',
            }}
            whileTap={{ scale: 0.96 }}>
            {saving ? <motion.div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              : <><Check className="w-4 h-4" /> Set Alert</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrackerCard({ watchlistItem, item, summary, onEdit, onToggle, index }) {
  const isUnderTarget = summary?.lowest_price && watchlistItem.target_price && summary.lowest_price <= watchlistItem.target_price;
  const priceDiff = summary?.lowest_price && watchlistItem.target_price
    ? watchlistItem.target_price - summary.lowest_price : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -24, rotateY: -8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      exit={{ opacity: 0, x: 24, scale: 0.9 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <TiltCard
        style={{
          background: isUnderTarget
            ? 'linear-gradient(135deg, hsl(160 84% 39% / 0.12), hsl(240 14% 9%))'
            : 'linear-gradient(145deg, hsl(240 14% 11%), hsl(240 18% 7%))',
          border: `1px solid ${isUnderTarget ? 'hsl(160 84% 39% / 0.4)' : 'hsl(240 10% 20%)'}`,
          borderRadius: 20,
          boxShadow: isUnderTarget
            ? '0 12px 40px hsl(160 84% 39% / 0.15), 0 4px 16px rgba(0,0,0,0.4)'
            : '0 8px 30px rgba(0,0,0,0.4), inset 0 1px 0 hsl(240 10% 25% / 0.2)',
        }}
      >
        {isUnderTarget && (
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[19px]"
            style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
        )}

        <div className="p-4 flex items-start gap-3" style={{ transform: 'translateZ(14px)' }}>
          {/* Image */}
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative"
            style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
            {item?.image_primary_url
              ? <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Layers className="w-5 h-5 text-muted-foreground/30" />
                </div>}
            {isUnderTarget && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'hsl(160 84% 39% / 0.7)' }}>
                <Check className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight truncate">{watchlistItem.item_title}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">${watchlistItem.target_price?.toFixed(2)}</span>
              </div>
              {summary?.lowest_price && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <div className="flex items-center gap-0.5">
                    {isUnderTarget ? <TrendingDown className="w-3 h-3 text-emerald-400" /> : <TrendingUp className="w-3 h-3 text-amber-400" />}
                    <span className={`text-xs font-semibold ${isUnderTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ${summary.lowest_price.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
            {priceDiff !== null && (
              <p className="text-[10px] mt-1" style={{ color: isUnderTarget ? '#10b981' : 'hsl(220 10% 50%)' }}>
                {isUnderTarget ? `✓ $${priceDiff.toFixed(2)} under your target!` : `$${Math.abs(priceDiff).toFixed(2)} above target`}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <motion.button
              onClick={() => onToggle(watchlistItem)}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: watchlistItem.active ? 'hsl(190 100% 50% / 0.12)' : 'hsl(240 12% 13%)',
                border: `1px solid ${watchlistItem.active ? 'hsl(190 100% 50% / 0.3)' : 'hsl(240 10% 20%)'}`,
              }}
              whileTap={{ scale: 0.88 }}>
              {watchlistItem.active
                ? <Bell className="w-3.5 h-3.5 text-cyan-400" />
                : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
            </motion.button>
            <motion.button
              onClick={() => onEdit(watchlistItem, item)}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'hsl(240 12% 13%)', border: '1px solid hsl(240 10% 20%)' }}
              whileTap={{ scale: 0.88 }}>
              <Target className="w-3.5 h-3.5 text-violet-400" />
            </motion.button>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

export default function PriceTracker() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [items, setItems] = useState({});
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { watchlistItem, item }
  const [addingItemId, setAddingItemId] = useState(null);
  const [allIdentified, setAllIdentified] = useState([]);
  const [showAddPicker, setShowAddPicker] = useState(false);

  const load = async () => {
    const [wl, identified, summariesAll] = await Promise.all([
      base44.entities.WatchlistItem.list('-created_date', 50),
      base44.entities.IdentifiedItem.list('-created_date', 100),
      base44.entities.PriceSummary.list('-updated_date', 100),
    ]);
    setWatchlist(wl);
    setAllIdentified(identified);
    const itemMap = {};
    identified.forEach(i => { itemMap[i.id] = i; });
    setItems(itemMap);
    const sumMap = {};
    summariesAll.forEach(s => { sumMap[s.identified_item_id] = s; });
    setSummaries(sumMap);

    // Browser notifications for triggered alerts
    if ('Notification' in window && Notification.permission === 'granted') {
      wl.forEach(w => {
        const s = sumMap[w.identified_item_id];
        if (w.active && s?.lowest_price && w.target_price && s.lowest_price <= w.target_price) {
          new Notification('Price Alert! 🎯', {
            body: `${w.item_title} dropped to $${s.lowest_price.toFixed(2)} (your target: $${w.target_price.toFixed(2)})`,
            icon: w.item_image_url || undefined,
          });
        }
        // Great deal alert
        if (w.active && s?.deal_score >= 75 && s?.recommendation_label) {
          const label = s.recommendation_label.toLowerCase();
          if (label.includes('great') || label.includes('hot') || label.includes('below market')) {
            new Notification('🔥 Great Deal Detected!', {
              body: `${w.item_title} — Deal Score ${s.deal_score}/100: ${s.recommendation_label}`,
              icon: w.item_image_url || undefined,
            });
          }
        }
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (w) => {
    await base44.entities.WatchlistItem.update(w.id, { active: !w.active });
    setWatchlist(prev => prev.map(x => x.id === w.id ? { ...x, active: !x.active } : x));
  };

  const alerts = watchlist.filter(w => {
    const s = summaries[w.identified_item_id];
    return w.active && s?.lowest_price && w.target_price && s.lowest_price <= w.target_price;
  });

  const greatDeals = watchlist.filter(w => {
    const s = summaries[w.identified_item_id];
    if (!w.active || !s) return false;
    const label = (s.recommendation_label || '').toLowerCase();
    return s.deal_score >= 75 && (label.includes('great') || label.includes('hot') || label.includes('below market'));
  });

  const notTracked = allIdentified.filter(i => !watchlist.some(w => w.identified_item_id === i.id));

  return (
    <div className="min-h-screen" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div className="absolute w-72 h-72 rounded-full"
          style={{ top: 0, right: '-10%', background: 'radial-gradient(circle, hsl(190 100% 50% / 0.05) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pb-4 pt-safe-12 flex items-center gap-3">
        <motion.button onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center touch-target"
          style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          whileTap={{ scale: 0.92 }}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <div>
          <h1 className="font-heading text-xl font-extrabold"
            style={{ background: 'linear-gradient(135deg, hsl(190 100% 75%), #fff, hsl(263 70% 78%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Price Tracker
          </h1>
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Follow & alert</p>
        </div>
        <motion.button onClick={() => setShowAddPicker(true)}
          className="ml-auto flex items-center gap-2 px-4 h-10 rounded-2xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.1))', border: '1px solid hsl(190 100% 50% / 0.25)', color: '#00d4ff' }}
          whileTap={{ scale: 0.95 }}>
          <Bell className="w-4 h-4" /> Track
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
        </div>
      ) : (
        <div className="relative z-10 px-4 space-y-3">
          {/* Great deals banner */}
          {greatDeals.length > 0 && (
            <motion.div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.12), hsl(38 92% 50% / 0.04))', border: '1px solid hsl(38 92% 50% / 0.35)', boxShadow: '0 8px 24px hsl(38 92% 50% / 0.08)' }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(38 92% 50% / 0.2)', border: '1px solid hsl(38 92% 50% / 0.3)' }}>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-400">🔥 {greatDeals.length} Great Deal{greatDeals.length > 1 ? 's' : ''} Detected!</p>
                <p className="text-xs text-amber-400/70">{greatDeals.map(d => d.item_title).join(', ')}</p>
              </div>
            </motion.div>
          )}

          {/* Active alerts banner */}
          {alerts.length > 0 && (
            <motion.div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.15), hsl(160 84% 39% / 0.05))', border: '1px solid hsl(160 84% 39% / 0.4)', boxShadow: '0 8px 24px hsl(160 84% 39% / 0.1)' }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(160 84% 39% / 0.2)', border: '1px solid hsl(160 84% 39% / 0.3)' }}>
                <Bell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400">{alerts.length} Price Alert{alerts.length > 1 ? 's' : ''} Triggered!</p>
                <p className="text-xs text-emerald-400/70">{alerts.map(a => a.item_title).join(', ')}</p>
              </div>
            </motion.div>
          )}

          {watchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20">
              <motion.div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
                animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Bell className="w-9 h-9 text-muted-foreground/30" />
              </motion.div>
              <p className="text-base font-semibold text-foreground">No tracked items</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">Follow items to get price drop alerts</p>
            </div>
          ) : (
            <AnimatePresence>
              {watchlist.map((w, i) => (
                <TrackerCard
                  key={w.id}
                  watchlistItem={w}
                  item={items[w.identified_item_id]}
                  summary={summaries[w.identified_item_id]}
                  onEdit={(wItem, item) => setEditing({ watchlistItem: wItem, item })}
                  onToggle={toggleActive}
                  index={i}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Add from identified items picker */}
      <AnimatePresence>
        {showAddPicker && (
          <motion.div className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddPicker(false)} />
            <motion.div className="relative w-full max-h-[70vh] rounded-t-3xl overflow-hidden"
              style={{ background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))', border: '1px solid hsl(240 10% 22%)', borderBottom: 'none', boxShadow: '0 -24px 70px rgba(0,0,0,0.6)' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted" /></div>
              <div className="px-5 pb-3 flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground">Track an Item</h3>
                <button onClick={() => setShowAddPicker(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(240 12% 14%)' }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="overflow-y-auto px-4 pb-8 space-y-2" style={{ maxHeight: '55vh' }}>
                {notTracked.map(item => (
                  <motion.button key={item.id} onClick={() => { setAddingItemId(item.id); setShowAddPicker(false); }}
                    className="w-full flex items-center gap-3 rounded-2xl p-3 text-left"
                    style={{ background: 'hsl(240 12% 13%)', border: '1px solid hsl(240 10% 18%)' }}
                    whileTap={{ scale: 0.97 }}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      {item.image_primary_url ? <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Layers className="w-5 h-5 text-muted-foreground/30" /></div>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.brand || item.category || ''}</p>
                    </div>
                    <Bell className="w-4 h-4 text-cyan-400 ml-auto flex-shrink-0" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Threshold editor */}
      <AnimatePresence>
        {(editing || addingItemId) && (
          <ThresholdEditor
            item={editing?.item || allIdentified.find(i => i.id === addingItemId)}
            watchlistItem={editing?.watchlistItem || null}
            onSave={() => { setEditing(null); setAddingItemId(null); load(); }}
            onClose={() => { setEditing(null); setAddingItemId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}