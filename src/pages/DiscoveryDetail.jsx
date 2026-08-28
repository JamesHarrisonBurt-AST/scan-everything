import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, Sparkles, Send, Clock, AlertTriangle, Wrench, Lightbulb, Package, ChevronRight, FolderPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DiscoveryCard from '@/components/discovery/DiscoveryCard';
import { RARITY_STYLES } from '@/lib/gamification';

function parseArr(str) { try { return JSON.parse(str || '[]'); } catch { return []; } }

export default function DiscoveryDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [discovery, setDiscovery] = useState(null);
  const [related, setRelated] = useState([]);
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const items = await base44.entities.Discovery.filter({ id });
        if (items.length === 0) { setLoading(false); return; }
        const d = items[0];
        setDiscovery(d);
        setThreadId(d.ai_thread_id || null);
        if (d.ai_thread_id) {
          const msgs = await base44.entities.AIMessage.filter({ thread_id: d.ai_thread_id });
          setMessages(msgs);
        }
        if (d.category) {
          const rel = await base44.entities.Discovery.filter({ category: d.category });
          setRelated(rel.filter(r => r.id !== id).slice(0, 4));
        }
        const cols = await base44.entities.Collection.list('-created_date', 50);
        setCollections(cols);
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleFavorite = async () => {
    const prev = discovery;
    setDiscovery({ ...discovery, favorited: !discovery.favorited });
    try { await base44.entities.Discovery.update(discovery.id, { favorited: !discovery.favorited }); }
    catch { setDiscovery(prev); }
  };

  const share = async () => {
    if (navigator.share && discovery) {
      try { await navigator.share({ title: discovery.title, text: discovery.summary || discovery.description }); } catch {}
    }
  };

  const askQuestion = async (q) => {
    const query = q || question.trim();
    if (!query || asking) return;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: query, id: Date.now() }]);
    setAsking(true);
    try {
      const res = await base44.functions.invoke('askAboutDiscovery', { discovery_id: id, question: query, thread_id: threadId });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer, id: Date.now() + 1, thread_id: res.data.thread_id }]);
      if (!threadId) setThreadId(res.data.thread_id);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not answer that right now. Please try again.', id: Date.now() + 1 }]);
    }
    setAsking(false);
  };

  const addToCollection = async (collectionId) => {
    try {
      await base44.entities.CollectionItem.create({ collection_id: collectionId, discovery_id: id });
      setShowCollectionSheet(false);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!discovery) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Discovery not found</p>
        <button onClick={() => navigate('/')} className="text-amber-400 text-sm mt-2">Go Home</button>
      </div>
    );
  }

  const rarity = RARITY_STYLES[discovery.rarity] || RARITY_STYLES.common;
  const facts = parseArr(discovery.interesting_facts);
  const materials = parseArr(discovery.materials);
  const characteristics = parseArr(discovery.characteristics);
  const safety = parseArr(discovery.safety_notes);
  const maintenance = parseArr(discovery.maintenance_tips);
  const suggestions = parseArr(discovery.follow_up_suggestions);
  const confidenceColor = discovery.confidence_score >= 80 ? '#10b981' : discovery.confidence_score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-screen bg-background pb-8">
      <button onClick={() => navigate(-1)} style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }} className="fixed left-4 z-30 w-11 h-11 rounded-full glass-card flex items-center justify-center">
        <ArrowLeft className="w-4 h-4 text-foreground" />
      </button>

      {/* Hero image */}
      <div className="w-full aspect-[4/3] bg-muted relative overflow-hidden">
        {discovery.image_url ? <img src={discovery.image_url} alt={discovery.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground/20" /></div>}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(220 18% 5%) 0%, transparent 50%)' }} />
        <div className="absolute bottom-4 left-4 right-16">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{discovery.category}</span>
          <h1 className="font-heading text-xl font-extrabold text-foreground mt-0.5">{discovery.title}</h1>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 pt-safe">
          <button onClick={toggleFavorite} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
            <Heart className={`w-4 h-4 ${discovery.favorited ? 'text-rose-500 fill-rose-500' : 'text-foreground'}`} />
          </button>
          <button onClick={share} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
            <Share2 className="w-4 h-4 text-foreground" />
          </button>
          <button onClick={() => setShowCollectionSheet(true)} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
            <FolderPlus className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Confidence + Rarity */}
        <motion.div className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${confidenceColor}15`, border: `1px solid ${confidenceColor}30` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: confidenceColor }} />
            <span className="text-xs font-semibold" style={{ color: confidenceColor }}>{discovery.confidence_score}% confidence</span>
          </div>
          {discovery.rarity !== 'common' && (
            <span className="text-[11px] px-3 py-1.5 rounded-full" style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}30` }}>{rarity.label}</span>
          )}
          {discovery.xp_earned > 0 && <span className="text-[11px] text-amber-400 font-semibold">+{discovery.xp_earned} XP</span>}
        </motion.div>

        {/* What It Is */}
        {discovery.description && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-2">What It Is</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{discovery.description}</p>
          </div>
        )}

        {/* Key Details */}
        {(discovery.possible_brand || discovery.possible_model || discovery.estimated_era) && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Key Details</h3>
            <div className="space-y-2">
              {discovery.possible_brand && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Brand</span><span className="text-foreground font-medium">{discovery.possible_brand}</span></div>}
              {discovery.possible_model && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Model</span><span className="text-foreground font-medium">{discovery.possible_model}</span></div>}
              {discovery.estimated_era && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Era</span><span className="text-foreground font-medium">{discovery.estimated_era}</span></div>}
              {discovery.subcategory && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium">{discovery.subcategory}</span></div>}
            </div>
          </div>
        )}

        {/* Interesting Facts */}
        {facts.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-400" /> Interesting Facts</h3>
            <div className="space-y-2">
              {facts.map((f, i) => <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2"><span className="text-amber-400">•</span>{f}</p>)}
            </div>
          </div>
        )}

        {/* Materials & Characteristics */}
        {(materials.length > 0 || characteristics.length > 0) && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Materials & Characteristics</h3>
            {materials.length > 0 && <div className="mb-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Materials</p><div className="flex flex-wrap gap-1.5">{materials.map((m, i) => <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{m}</span>)}</div></div>}
            {characteristics.length > 0 && <div><p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Characteristics</p><div className="flex flex-wrap gap-1.5">{characteristics.map((c, i) => <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{c}</span>)}</div></div>}
          </div>
        )}

        {/* Maintenance */}
        {maintenance.length > 0 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5"><Wrench className="w-4 h-4 text-teal-400" /> Care & Maintenance</h3>
            <div className="space-y-2">{maintenance.map((m, i) => <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2"><span className="text-teal-400">•</span>{m}</p>)}</div>
          </div>
        )}

        {/* Safety */}
        {safety.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'hsl(0 70% 50% / 0.08)', border: '1px solid hsl(0 70% 50% / 0.2)' }}>
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-rose-400" /> Safety Information</h3>
            <div className="space-y-2">{safety.map((s, i) => <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2"><span className="text-rose-400">•</span>{s}</p>)}</div>
          </div>
        )}

        {/* Ask AI */}
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> Ask About This Object</h3>
          
          {messages.length === 0 && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.slice(0, 4).map((s, i) => (
                <button key={i} onClick={() => askQuestion(s)} className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: 'hsl(35 95% 55% / 0.08)', border: '1px solid hsl(35 95% 55% / 0.2)', color: 'hsl(35 95% 65%)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-amber-500/15 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {asking && <div className="flex justify-start"><div className="bg-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground">Thinking...</div></div>}
              <div ref={chatEndRef} />
            </div>
          )}

          <div className="flex gap-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askQuestion()} placeholder="Ask anything..." className="flex-1 px-3 h-10 rounded-xl text-xs text-foreground outline-none" style={{ background: 'hsl(220 12% 12%)', border: '1px solid hsl(220 12% 18%)' }} />
            <button onClick={() => askQuestion()} disabled={asking || !question.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Related Discoveries</h3>
            <div className="grid grid-cols-2 gap-3">
              {related.map((r, i) => <DiscoveryCard key={r.id} discovery={r} index={i} />)}
            </div>
          </div>
        )}
      </div>

      {/* Collection sheet */}
      {showCollectionSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowCollectionSheet(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div className="relative w-full rounded-t-3xl p-5 pb-safe" style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }} initial={{ y: '100%' }} animate={{ y: 0 }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <h3 className="font-heading font-bold text-foreground mb-3">Add to Collection</h3>
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No collections yet. Create one from the Discoveries tab.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {collections.map(c => (
                  <button key={c.id} onClick={() => addToCollection(c.id)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}>
                    <FolderPlus className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-foreground flex-1">{c.name}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowCollectionSheet(false)} className="w-full h-11 rounded-xl text-sm font-bold mt-3" style={{ background: 'hsl(220 12% 12%)', color: 'hsl(220 10% 60%)' }}>Cancel</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}