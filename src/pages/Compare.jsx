import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, TrendingUp, TrendingDown, Minus, Star, ShieldCheck, DollarSign, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// ── 3D tilt card ──────────────────────────────────────────────────────────────
function TiltCard({ children, className = '', style = {}, depth = 20 }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 160, damping: 22 });
  const rawY = useSpring(0, { stiffness: 160, damping: 22 });
  const rotateX = useTransform(rawY, [-1, 1], [depth / 2, -depth / 2]);
  const rotateY = useTransform(rawX, [-1, 1], [-depth, depth]);

  return (
    <div style={{ perspective: '900px' }}>
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
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Comparison column card ────────────────────────────────────────────────────
function CompareColumn({ item, summary, assessment, onRemove, accentColor, index }) {
  const score = summary?.deal_score ?? 0;
  const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#00d4ff' : score >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -20 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 w-48"
    >
      <TiltCard
        depth={14}
        style={{
          background: `linear-gradient(145deg, hsl(240 14% 11%), hsl(240 18% 7%))`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 20,
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 4px 20px ${accentColor}18, inset 0 1px 0 ${accentColor}15`,
        }}
      >
        {/* Remove */}
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: 'hsl(240 12% 14%)', border: '1px solid hsl(240 10% 22%)' }}
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Image */}
        <div className="h-32 rounded-t-[19px] overflow-hidden relative">
          {item.image_primary_url ? (
            <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentColor}15, hsl(240 14% 9%))` }}>
              <Layers className="w-8 h-8" style={{ color: `${accentColor}60` }} />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))' }} />
          {/* Accent top border */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
        </div>

        <div className="p-3 space-y-3" style={{ transform: 'translateZ(12px)' }}>
          <div>
            <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{item.title}</p>
            {item.brand && <p className="text-[10px] mt-0.5" style={{ color: accentColor + 'bb' }}>{item.brand}</p>}
          </div>

          {/* Price */}
          <div className="rounded-xl p-2.5 text-center"
            style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}20` }}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Best Price</p>
            <p className="text-base font-extrabold font-heading" style={{ color: accentColor }}>
              {summary?.lowest_price ? `$${summary.lowest_price.toFixed(2)}` : '—'}
            </p>
            {summary?.high_price && summary.high_price > (summary.lowest_price || 0) && (
              <p className="text-[9px] text-muted-foreground line-through">${summary.high_price.toFixed(2)}</p>
            )}
          </div>

          {/* Deal Score */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Deal Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: scoreColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, delay: 0.4 + index * 0.1, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{score}</span>
            </div>
          </div>

          {/* Condition */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Condition</p>
            <p className="text-xs text-foreground/80">{item.condition_guess || '—'}</p>
          </div>

          {/* Value Verdict */}
          {assessment?.value_verdict && (
            <div className="rounded-lg px-2 py-1.5 text-center"
              style={{ background: 'hsl(263 70% 58% / 0.1)', border: '1px solid hsl(263 70% 58% / 0.2)' }}>
              <p className="text-[10px] font-semibold" style={{ color: '#a78bfa' }}>{assessment.value_verdict}</p>
            </div>
          )}

          {/* Resale Score */}
          {assessment?.resale_potential_score != null && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Resale Potential</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'hsl(263 70% 58%)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${assessment.resale_potential_score}%` }}
                    transition={{ duration: 1, delay: 0.6 + index * 0.1, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[10px] font-bold text-violet-400">{assessment.resale_potential_score}</span>
              </div>
            </div>
          )}
        </div>
      </TiltCard>
    </motion.div>
  );
}

// ── Item Picker ───────────────────────────────────────────────────────────────
function ItemPicker({ allItems, selected, onAdd, onClose }) {
  const available = allItems.filter(i => !selected.includes(i.id));
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-h-[70vh] rounded-t-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, hsl(240 14% 11%), hsl(240 18% 7%))',
          border: '1px solid hsl(240 10% 20%)',
          borderBottom: 'none',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-foreground">Add to Compare</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'hsl(240 12% 14%)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-8 space-y-2" style={{ maxHeight: '55vh' }}>
          {available.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">No more items to add</p>
          )}
          {available.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => { onAdd(item.id); onClose(); }}
              className="w-full flex items-center gap-3 rounded-2xl p-3 text-left"
              style={{
                background: 'hsl(240 12% 13%)',
                border: '1px solid hsl(240 10% 18%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                {item.image_primary_url
                  ? <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Layers className="w-5 h-5 text-muted-foreground/30" /></div>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.brand || item.category || ''}</p>
              </div>
              <Plus className="w-4 h-4 text-cyan-400 flex-shrink-0 ml-auto" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Summary Table ─────────────────────────────────────────────────────────────
function SummaryTable({ cols }) {
  if (cols.length < 2) return null;
  const rows = [
    { label: 'Lowest Price', fn: (c) => c.summary?.lowest_price ? `$${c.summary.lowest_price.toFixed(2)}` : '—' },
    { label: 'Avg Price', fn: (c) => c.summary?.average_price ? `$${c.summary.average_price.toFixed(2)}` : '—' },
    { label: 'High Price', fn: (c) => c.summary?.high_price ? `$${c.summary.high_price.toFixed(2)}` : '—' },
    { label: 'Deal Score', fn: (c) => c.summary?.deal_score ? `${c.summary.deal_score}/100` : '—' },
    { label: 'Verdict', fn: (c) => c.summary?.recommendation_label || '—' },
    { label: 'Resale Score', fn: (c) => c.assessment?.resale_potential_score != null ? `${c.assessment.resale_potential_score}/100` : '—' },
    { label: 'Rarity', fn: (c) => c.assessment?.rarity_signal_score != null ? `${c.assessment.rarity_signal_score}/100` : '—' },
    { label: 'Condition', fn: (c) => c.item.condition_guess || '—' },
    { label: 'Category', fn: (c) => c.item.category || '—' },
  ];

  const accentColors = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b'];

  return (
    <motion.div
      className="mx-4 mt-6 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, hsl(240 14% 10%), hsl(240 18% 7%))',
        border: '1px solid hsl(240 10% 18%)',
        boxShadow: '0 16px 50px rgba(0,0,0,0.5), inset 0 1px 0 hsl(240 10% 25% / 0.3)',
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      {/* Header row */}
      <div className="grid border-b border-border/30" style={{ gridTemplateColumns: `120px repeat(${cols.length}, 1fr)` }}>
        <div className="p-3" />
        {cols.map((col, ci) => (
          <div key={col.item.id} className="p-3 text-center border-l border-border/20">
            <p className="text-[10px] font-bold truncate" style={{ color: accentColors[ci % accentColors.length] }}>
              {col.item.brand || col.item.title.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>
      {rows.map((row, ri) => (
        <div
          key={row.label}
          className="grid border-b border-border/20 last:border-0"
          style={{ gridTemplateColumns: `120px repeat(${cols.length}, 1fr)`, background: ri % 2 === 0 ? 'transparent' : 'hsl(240 12% 8% / 0.4)' }}
        >
          <div className="p-3 flex items-center">
            <p className="text-[10px] text-muted-foreground font-medium">{row.label}</p>
          </div>
          {cols.map((col, ci) => {
            const val = row.fn(col);
            const allVals = cols.map(c => row.fn(c)).filter(v => v !== '—' && !isNaN(parseFloat(v)));
            const numVal = parseFloat(val);
            const isNumeric = !isNaN(numVal) && allVals.length > 1;
            const numVals = allVals.map(v => parseFloat(v));
            const isBest = isNumeric && (
              row.label.includes('Price') ? numVal === Math.min(...numVals) : numVal === Math.max(...numVals)
            );
            return (
              <div key={col.item.id} className="p-3 text-center border-l border-border/20 flex items-center justify-center gap-1">
                <p className={`text-xs font-semibold ${isBest ? 'text-emerald-400' : 'text-foreground/70'}`}>{val}</p>
                {isBest && <TrendingDown className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      ))}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const ACCENT_COLORS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b'];

export default function Compare() {
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [assessments, setAssessments] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pre-selected from query param ?ids=a,b
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids')?.split(',').filter(Boolean) || [];
    base44.entities.IdentifiedItem.list('-created_date', 100).then(items => {
      setAllItems(items);
      setSelectedIds(ids.filter(id => items.some(i => i.id === id)).slice(0, 4));
      setLoading(false);
    });
  }, []);

  // Load summaries/assessments as items are added
  useEffect(() => {
    selectedIds.forEach(async (id) => {
      if (!summaries[id]) {
        const res = await base44.entities.PriceSummary.filter({ identified_item_id: id });
        if (res[0]) setSummaries(p => ({ ...p, [id]: res[0] }));
      }
      if (!assessments[id]) {
        const res = await base44.entities.ValueAssessment.filter({ identified_item_id: id });
        if (res[0]) setAssessments(p => ({ ...p, [id]: res[0] }));
      }
    });
  }, [selectedIds]);

  const cols = selectedIds
    .map(id => ({ item: allItems.find(i => i.id === id), summary: summaries[id], assessment: assessments[id] }))
    .filter(c => c.item);

  const removeItem = (id) => setSelectedIds(prev => prev.filter(p => p !== id));
  const addItem = (id) => setSelectedIds(prev => [...prev, id].slice(0, 4));

  return (
    <div className="min-h-screen" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Fixed ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <motion.div className="absolute w-80 h-80 rounded-full"
          style={{ top: '-5%', left: '-15%', background: 'radial-gradient(circle, hsl(190 100% 50% / 0.05) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute w-64 h-64 rounded-full"
          style={{ bottom: '10%', right: '-10%', background: 'radial-gradient(circle, hsl(263 70% 58% / 0.05) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 12, repeat: Infinity, delay: 2 }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pb-4 pt-safe-12 flex items-center gap-3">
        <motion.button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 touch-target"
          style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          whileTap={{ scale: 0.92 }}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <div>
          <h1 className="font-heading text-xl font-extrabold"
            style={{ background: 'linear-gradient(135deg, hsl(190 100% 75%), #fff, hsl(263 70% 78%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Compare
          </h1>
          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Side-by-side analysis</p>
        </div>
        {selectedIds.length < 4 && (
          <motion.button
            onClick={() => setShowPicker(true)}
            className="ml-auto flex items-center gap-2 px-4 h-10 rounded-2xl text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.1))',
              border: '1px solid hsl(190 100% 50% / 0.25)',
              color: '#00d4ff',
              boxShadow: '0 4px 16px hsl(190 100% 50% / 0.1)',
            }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -1 }}
          >
            <Plus className="w-4 h-4" /> Add
          </motion.button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <motion.div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
        </div>
      ) : cols.length === 0 ? (
        <div className="relative z-10 flex flex-col items-center justify-center px-8 mt-24">
          <motion.div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}
            animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <Layers className="w-9 h-9 text-muted-foreground/40" />
          </motion.div>
          <p className="text-base font-semibold text-foreground">Nothing to compare yet</p>
          <p className="text-sm text-muted-foreground mt-1 text-center">Add items from your vault to start comparing</p>
          <motion.button onClick={() => setShowPicker(true)}
            className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)', color: '#0a0a14', boxShadow: '0 8px 24px hsl(190 100% 50% / 0.3)' }}
            whileTap={{ scale: 0.95 }}>
            + Add Items
          </motion.button>
        </div>
      ) : (
        <div className="relative z-10">
          {/* Side-by-side columns */}
          <div className="flex gap-4 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <AnimatePresence mode="popLayout">
              {cols.map((col, i) => (
                <CompareColumn
                  key={col.item.id}
                  item={col.item}
                  summary={col.summary}
                  assessment={col.assessment}
                  accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                  index={i}
                  onRemove={() => removeItem(col.item.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Summary Table */}
          <SummaryTable cols={cols} />
          <div className="h-12" />
        </div>
      )}

      {/* Item Picker Sheet */}
      <AnimatePresence>
        {showPicker && (
          <ItemPicker
            allItems={allItems}
            selected={selectedIds}
            onAdd={addItem}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}