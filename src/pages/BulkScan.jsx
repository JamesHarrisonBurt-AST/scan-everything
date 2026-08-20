import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Image, Package, Check, X, Loader2, Plus, Archive, Eye, Zap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

const STAGES = { IDLE: 'idle', UPLOADING: 'uploading', ANALYZING: 'analyzing', REVIEW: 'review', SAVING: 'saving', DONE: 'done' };

export default function BulkScan() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [stage, setStage] = useState(STAGES.IDLE);
  const [imageUrl, setImageUrl] = useState(null);
  const [identified, setIdentified] = useState([]); // [{title, brand, category, price_low, price_avg, price_high, condition, selected, action}]
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setStage(STAGES.UPLOADING);
    setProgress('Uploading image…');

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setStage(STAGES.ANALYZING);
    setProgress('AI is scanning for items…');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert product identification AI. Analyze this photo of a rack, shelf, table, or collection of items.
Identify EVERY individual distinct item you can see. For each item, estimate its current resale market price.

Return a JSON object with:
- items: array of objects, each with:
  - title: string (specific product name)
  - brand: string
  - category: string (e.g. "Electronics", "Clothing", "Toys", "Books", "Collectibles", "Shoes")
  - condition: string ("mint", "excellent", "good", "fair")
  - price_low: number (USD lowest market price)
  - price_avg: number (USD average market price)
  - price_high: number (USD highest/retail market price)
  - deal_score: number 0-100 (how good a deal if bought at thrift/low price)
  - notes: string (brief note about the item's value or rarity)

Identify as many items as possible. Return at least 1 and up to 20 items.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                brand: { type: 'string' },
                category: { type: 'string' },
                condition: { type: 'string' },
                price_low: { type: 'number' },
                price_avg: { type: 'number' },
                price_high: { type: 'number' },
                deal_score: { type: 'number' },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const items = (result.items || []).map((it, i) => ({
      ...it,
      id: i,
      selected: true,
      action: 'vault',
    }));
    setIdentified(items);
    setStage(STAGES.REVIEW);
  };

  const toggleItem = (id) => setIdentified(prev => prev.map(it => it.id === id ? { ...it, selected: !it.selected } : it));
  const setAction = (id, action) => setIdentified(prev => prev.map(it => it.id === id ? { ...it, action } : it));

  const saveAll = async () => {
    const toSave = identified.filter(it => it.selected);
    if (!toSave.length) return;
    setStage(STAGES.SAVING);
    setProgress(`Saving ${toSave.length} items…`);

    for (const it of toSave) {
      // Create identified item
      const item = await base44.entities.IdentifiedItem.create({
        title: it.title,
        brand: it.brand || '',
        category: it.category || '',
        condition_guess: it.condition || '',
        image_primary_url: imageUrl || '',
        normalized_search_query: `${it.brand || ''} ${it.title}`.trim(),
        description: it.notes || '',
      });

      await base44.entities.PriceSummary.create({
        identified_item_id: item.id,
        lowest_price: it.price_low || 0,
        average_price: it.price_avg || 0,
        high_price: it.price_high || 0,
        deal_score: it.deal_score || 50,
        recommendation_label: it.deal_score > 75 ? 'Great Deal' : it.deal_score > 50 ? 'Fair Price' : 'Research More',
      });

      if (it.action === 'vault') {
        await base44.entities.VaultItem.create({
          identified_item_id: item.id,
          status: 'scanned',
          item_title: it.title,
          item_image_url: imageUrl || '',
          best_price_found: it.price_low || 0,
          value_label: it.deal_score > 75 ? 'Great Deal' : 'Fair',
          category: it.category || '',
        });
      } else {
        await base44.entities.WatchlistItem.create({
          identified_item_id: item.id,
          item_title: it.title,
          item_image_url: imageUrl || '',
          category: it.category || '',
          current_best_price: it.price_low || 0,
          active: true,
        });
      }
    }

    setStage(STAGES.DONE);
  };

  const scoreColor = (s) => s > 75 ? '#10b981' : s > 50 ? '#00d4ff' : '#f59e0b';

  return (
    <div className="min-h-screen pb-10" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-safe-12">
        <motion.button onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)' }}
          whileTap={{ scale: 0.92 }}>
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Bulk Scan</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Scan a shelf or rack — AI finds everything</p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* IDLE */}
        {stage === STAGES.IDLE && (
          <motion.div key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 space-y-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'hsl(240 12% 8%)', border: '1px solid hsl(240 10% 16%)' }}>
              <div className="aspect-video flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.12), hsl(263 70% 58% / 0.08))', border: '1px solid hsl(190 100% 50% / 0.2)' }}>
                  <Package className="w-7 h-7 text-cyan-400" />
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-foreground">Photo of Multiple Items</p>
                  <p className="text-xs text-muted-foreground mt-1">Snap a shelf, rack, or table — AI identifies each item individually</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-3 py-6 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.12), hsl(190 100% 50% / 0.06))', border: '1px solid hsl(190 100% 50% / 0.25)' }}
                whileTap={{ scale: 0.95 }}>
                <Camera className="w-6 h-6 text-cyan-400" />
                <span className="text-sm font-semibold text-foreground">Take Photo</span>
              </motion.button>
              <motion.button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-3 py-6 rounded-2xl"
                style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 20%)' }}
                whileTap={{ scale: 0.95 }}>
                <Image className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Upload Photo</span>
              </motion.button>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 17%)' }}>
              <p className="text-xs font-semibold text-foreground">Works best with:</p>
              {['Thrift store racks & shelves', 'Garage sale tables', 'Your collection spread out', 'Retail store sections'].map(tip => (
                <div key={tip} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* UPLOADING / ANALYZING */}
        {(stage === STAGES.UPLOADING || stage === STAGES.ANALYZING) && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center px-6 mt-20 gap-6">
            <motion.div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 flex items-center justify-center"
              animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <div className="w-14 h-14 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent" />
            </motion.div>
            <div className="text-center">
              <p className="font-heading font-bold text-foreground">{progress}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stage === STAGES.ANALYZING ? 'Identifying items and fetching prices…' : 'Please wait'}
              </p>
            </div>
            {imageUrl && (
              <div className="w-48 h-32 rounded-xl overflow-hidden">
                <img src={imageUrl} alt="scan" className="w-full h-full object-cover opacity-60" />
              </div>
            )}
          </motion.div>
        )}

        {/* SAVING */}
        {stage === STAGES.SAVING && (
          <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center px-6 mt-20 gap-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <p className="font-heading font-bold text-foreground">{progress}</p>
          </motion.div>
        )}

        {/* DONE */}
        {stage === STAGES.DONE && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center px-6 mt-20 gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'hsl(160 84% 39% / 0.12)', border: '2px solid hsl(160 84% 39% / 0.4)' }}>
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="font-heading text-xl font-extrabold text-foreground">All Saved!</p>
              <p className="text-xs text-muted-foreground mt-1">Items added to your Vault &amp; Watchlist</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button onClick={() => navigate('/vault')}
                className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00d4ff, #0099bb)', color: '#061218' }}
                whileTap={{ scale: 0.96 }}>
                <Archive className="w-4 h-4" /> View Vault
              </motion.button>
              <motion.button onClick={() => { setStage(STAGES.IDLE); setImageUrl(null); setIdentified([]); }}
                className="flex-1 h-12 rounded-2xl text-sm font-bold"
                style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 20%)', color: 'hsl(220 10% 65%)' }}
                whileTap={{ scale: 0.96 }}>
                Scan Again
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* REVIEW */}
        {stage === STAGES.REVIEW && (
          <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 space-y-4">
            {imageUrl && (
              <div className="w-full h-40 rounded-2xl overflow-hidden">
                <img src={imageUrl} alt="scanned" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-bold text-foreground">{identified.length} Items Found</p>
                <p className="text-xs text-muted-foreground">Toggle to select, set action per item</p>
              </div>
              <div className="flex gap-2">
                <motion.button onClick={() => setIdentified(prev => prev.map(it => ({ ...it, selected: true })))}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg font-semibold text-cyan-400"
                  style={{ background: 'hsl(190 100% 50% / 0.08)', border: '1px solid hsl(190 100% 50% / 0.2)' }}
                  whileTap={{ scale: 0.94 }}>All</motion.button>
                <motion.button onClick={() => setIdentified(prev => prev.map(it => ({ ...it, selected: false })))}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg font-semibold text-muted-foreground"
                  style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 19%)' }}
                  whileTap={{ scale: 0.94 }}>None</motion.button>
              </div>
            </div>

            <div className="space-y-2">
              {identified.map((it) => (
                <motion.div key={it.id}
                  className="rounded-2xl p-3 transition-all"
                  style={{
                    background: it.selected ? 'hsl(240 12% 10%)' : 'hsl(240 12% 7%)',
                    border: it.selected ? '1px solid hsl(190 100% 50% / 0.25)' : '1px solid hsl(240 10% 14%)',
                    opacity: it.selected ? 1 : 0.5,
                  }}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <motion.button onClick={() => toggleItem(it.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: it.selected ? 'hsl(190 100% 50% / 0.15)' : 'hsl(240 12% 14%)', border: it.selected ? '1px solid hsl(190 100% 50% / 0.4)' : '1px solid hsl(240 10% 22%)' }}
                      whileTap={{ scale: 0.88 }}>
                      {it.selected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{it.title}</p>
                        {it.deal_score > 75 && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">HOT</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{it.brand} · {it.category} · {it.condition}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-bold" style={{ color: scoreColor(it.deal_score) }}>
                          ${it.price_low?.toFixed(0) ?? '?'} – ${it.price_high?.toFixed(0) ?? '?'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">avg ${it.price_avg?.toFixed(0) ?? '?'}</span>
                        <span className="text-[11px] font-bold" style={{ color: scoreColor(it.deal_score) }}>
                          {it.deal_score}/100
                        </span>
                      </div>
                      {it.notes && <p className="text-[11px] text-muted-foreground mt-1 truncate">{it.notes}</p>}
                    </div>

                    {/* Action toggle */}
                    {it.selected && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <motion.button onClick={() => setAction(it.id, 'vault')}
                          className="text-[11px] px-2 py-1 rounded-lg font-bold"
                          style={{ background: it.action === 'vault' ? 'hsl(190 100% 50% / 0.15)' : 'hsl(240 12% 13%)', border: it.action === 'vault' ? '1px solid hsl(190 100% 50% / 0.3)' : '1px solid hsl(240 10% 20%)', color: it.action === 'vault' ? '#00d4ff' : 'hsl(220 10% 50%)' }}
                          whileTap={{ scale: 0.88 }}>
                          Vault
                        </motion.button>
                        <motion.button onClick={() => setAction(it.id, 'watch')}
                          className="text-[11px] px-2 py-1 rounded-lg font-bold"
                          style={{ background: it.action === 'watch' ? 'hsl(263 70% 58% / 0.12)' : 'hsl(240 12% 13%)', border: it.action === 'watch' ? '1px solid hsl(263 70% 58% / 0.3)' : '1px solid hsl(240 10% 20%)', color: it.action === 'watch' ? '#a78bfa' : 'hsl(220 10% 50%)' }}
                          whileTap={{ scale: 0.88 }}>
                          Watch
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3 pb-4">
              <motion.button onClick={() => { setStage(STAGES.IDLE); setImageUrl(null); setIdentified([]); }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)' }}
                whileTap={{ scale: 0.92 }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
              <motion.button onClick={saveAll}
                disabled={!identified.some(it => it.selected)}
                className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: identified.some(it => it.selected) ? 'linear-gradient(135deg, #00d4ff, #7c3aed)' : 'hsl(240 12% 13%)', color: identified.some(it => it.selected) ? 'white' : 'hsl(220 10% 40%)' }}
                whileTap={{ scale: 0.96 }}>
                <Zap className="w-4 h-4" />
                Save {identified.filter(it => it.selected).length} Item{identified.filter(it => it.selected).length !== 1 ? 's' : ''}
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}