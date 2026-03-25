import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PLATFORMS = {
  eBay: { color: '#e53238', bg: '#e5323812' },
  Mercari: { color: '#ff4d6d', bg: '#ff4d6d12' },
  Depop: { color: '#ff2300', bg: '#ff230012' },
  Poshmark: { color: '#c2185b', bg: '#c2185b12' },
  StockX: { color: '#00b140', bg: '#00b14012' },
  Facebook: { color: '#1877f2', bg: '#1877f212' },
  OfferUp: { color: '#34a853', bg: '#34a85312' },
  Craigslist: { color: '#6200ee', bg: '#6200ee12' },
};

export default function ListingDraftPanel({ item, priceSummary, assessment }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (draft) return; // already generated
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert resale seller. Generate an optimized product listing for the following item.

Item: ${item.title}
Brand: ${item.brand || 'N/A'}
Model: ${item.model || 'N/A'}
Category: ${item.category || 'N/A'}
Condition: ${item.condition_guess || 'Unknown'}
Description: ${item.description || 'N/A'}
Value Verdict: ${assessment?.value_verdict || 'N/A'}
Resale Score: ${assessment?.resale_potential_score || 0}/100
Rarity Score: ${assessment?.rarity_signal_score || 0}/100
Best Price Found: $${priceSummary?.lowest_price || 0}
Market Average: $${priceSummary?.median_price || 0}
Deal Score: ${priceSummary?.deal_score || 50}/100
Recommendation: ${priceSummary?.recommendation_label || 'Fair Price'}

Output a JSON object with:
- title: short punchy listing title (max 80 chars)
- description: compelling 3-4 sentence listing body, mention condition, highlights, and value
- suggested_price: number (optimal asking price based on market)
- hashtags: array of 10 relevant hashtags (no # symbol)
- platforms: array of 2-4 recommended platforms from this list: eBay, Mercari, Depop, Poshmark, StockX, Facebook, OfferUp, Craigslist
- platform_tips: object mapping each platform to a one-line tip for selling there
- urgency_hook: short one-liner to add urgency (e.g. "Only 3 left on eBay!")`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          suggested_price: { type: 'number' },
          hashtags: { type: 'array', items: { type: 'string' } },
          platforms: { type: 'array', items: { type: 'string' } },
          platform_tips: { type: 'object' },
          urgency_hook: { type: 'string' },
        },
      },
    });
    setDraft(result);
    setLoading(false);
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !draft && !loading) generate();
  };

  const copyDescription = () => {
    const text = `${draft.title}\n\n${draft.description}\n\n${draft.urgency_hook}\n\n#${draft.hashtags.join(' #')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div className="px-4 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
      <div
        className="glass-card rounded-2xl overflow-hidden"
        style={{ border: '1px solid hsl(263 70% 40% / 0.3)' }}
      >
        {/* Header toggle */}
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(263 70% 58% / 0.3), hsl(190 100% 50% / 0.2))', border: '1px solid hsl(263 70% 58% / 0.3)' }}>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-heading font-semibold text-foreground">AI Listing Generator</p>
              <p className="text-[10px] text-muted-foreground">Optimized resale copy + platform tips</p>
            </div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/40 p-4 space-y-4">
                {loading && (
                  <div className="flex flex-col items-center py-6 gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-full border-2 border-t-violet-400 border-violet-500/20"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.p
                      className="text-xs text-muted-foreground"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Crafting your listing...
                    </motion.p>
                  </div>
                )}

                {draft && (
                  <>
                    {/* Suggested Price */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Suggested Price</p>
                      <p className="font-heading font-bold text-lg text-cyan-400">${draft.suggested_price?.toFixed(2)}</p>
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Listing Title</p>
                      <p className="text-sm font-medium text-foreground leading-snug">{draft.title}</p>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Description</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{draft.description}</p>
                      {draft.urgency_hook && (
                        <p className="text-xs text-amber-400 mt-2 font-medium">⚡ {draft.urgency_hook}</p>
                      )}
                    </div>

                    {/* Hashtags */}
                    {draft.hashtags?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Hashtags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {draft.hashtags.map(tag => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'hsl(263 70% 58% / 0.12)', color: 'hsl(263 70% 70%)', border: '1px solid hsl(263 70% 58% / 0.25)' }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Platforms */}
                    {draft.platforms?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Best Platforms</p>
                        <div className="space-y-2">
                          {draft.platforms.map(p => {
                            const style = PLATFORMS[p] || { color: '#00d4ff', bg: '#00d4ff12' };
                            return (
                              <div key={p} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: style.bg, border: `1px solid ${style.color}30` }}>
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: style.color }} />
                                <div>
                                  <p className="text-xs font-semibold" style={{ color: style.color }}>{p}</p>
                                  {draft.platform_tips?.[p] && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{draft.platform_tips[p]}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Copy button */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={copyDescription}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                        style={{ background: copied ? 'hsl(160 84% 39% / 0.2)' : 'linear-gradient(135deg, hsl(263 70% 58% / 0.25), hsl(190 100% 50% / 0.15))', color: copied ? '#10b981' : '#a78bfa', border: `1px solid ${copied ? '#10b98140' : 'hsl(263 70% 58% / 0.3)'}` }}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy Full Listing'}
                      </button>
                      <button
                        onClick={() => { setDraft(null); generate(); }}
                        className="px-3 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
                        style={{ background: 'hsl(240 10% 12%)', border: '1px solid hsl(240 10% 18%)' }}
                      >
                        ↺ Regenerate
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}