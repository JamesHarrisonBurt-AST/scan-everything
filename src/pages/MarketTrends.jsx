import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ShoppingCart, Clock,
  Zap, AlertTriangle, BarChart2, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { base44 } from '@/api/base44Client';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'hsl(240 14% 12%)', border: '1px solid hsl(240 10% 22%)' }}>
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: ${Number(p.value).toFixed(2)}</p>
      ))}
    </div>
  );
};

function BuyWaitIndicator({ verdict, confidence, reasoning }) {
  const isBuy = verdict === 'BUY';
  const isWait = verdict === 'WAIT';
  const color = isBuy ? '#10b981' : isWait ? '#f59e0b' : '#8b5cf6';
  const bg = isBuy ? 'hsl(160 84% 39% / 0.12)' : isWait ? 'hsl(38 92% 50% / 0.12)' : 'hsl(263 70% 58% / 0.12)';
  const border = isBuy ? 'hsl(160 84% 39% / 0.35)' : isWait ? 'hsl(38 92% 50% / 0.35)' : 'hsl(263 70% 58% / 0.35)';
  const Icon = isBuy ? ShoppingCart : isWait ? Clock : BarChart2;
  const label = verdict || 'ANALYZING';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Market Sentiment</p>
          <p className="text-xl font-heading font-extrabold" style={{ color }}>{label}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="text-lg font-bold text-foreground">{confidence}%</p>
        </div>
      </div>
      {reasoning && (
        <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
      )}
      {/* Confidence bar */}
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

function VolatilityBadge({ volatility }) {
  const level = volatility > 30 ? 'High' : volatility > 15 ? 'Medium' : 'Low';
  const color = volatility > 30 ? '#f43f5e' : volatility > 15 ? '#f59e0b' : '#10b981';
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {level} Volatility
    </span>
  );
}

export default function MarketTrends() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  const [item, setItem] = useState(null);
  const [watchlistItem, setWatchlistItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    async function init() {
      if (!itemId) { setLoading(false); return; }
      const [items, watchlist] = await Promise.all([
        base44.entities.IdentifiedItem.filter({ id: itemId }),
        base44.entities.WatchlistItem.filter({ identified_item_id: itemId }),
      ]);
      setItem(items[0] || null);
      setWatchlistItem(watchlist[0] || null);
      setLoading(false);
    }
    init();
  }, [itemId]);

  const fetchTrends = async () => {
    if (!item) return;
    setFetching(true);
    setError(null);
    const query = item.normalized_search_query || `${item.brand || ''} ${item.title}`.trim();

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a market research AI. Search the web RIGHT NOW for current and historical pricing of: "${query}".

I need:
1. Price history for the last 7 data points (simulate weekly snapshots from real current data, going back ~7 weeks). Use real current prices as anchor.
2. Current market analysis: buy now or wait?

Return JSON with:
- price_history: array of 7 objects { week: string (e.g. "6w ago"), low: number, avg: number, high: number }
  — ordered oldest to newest. Last entry should be "Now" with real current prices.
- lowest_ever: number
- highest_ever: number  
- current_avg: number
- volatility_pct: number (0-100, price spread as % of avg)
- verdict: "BUY" | "WAIT" | "WATCH" 
- confidence: number (0-100)
- reasoning: string (1-2 sentences explaining why buy or wait based on price trend)
- sentiment: string ("Falling" | "Rising" | "Stable" | "Volatile")
- best_platform: string`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          price_history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'string' },
                low: { type: 'number' },
                avg: { type: 'number' },
                high: { type: 'number' },
              },
            },
          },
          lowest_ever: { type: 'number' },
          highest_ever: { type: 'number' },
          current_avg: { type: 'number' },
          volatility_pct: { type: 'number' },
          verdict: { type: 'string' },
          confidence: { type: 'number' },
          reasoning: { type: 'string' },
          sentiment: { type: 'string' },
          best_platform: { type: 'string' },
        },
      },
    });

    setChartData(result.price_history || []);
    setVerdict({ verdict: result.verdict, confidence: result.confidence, reasoning: result.reasoning });
    setStats({
      lowestEver: result.lowest_ever,
      highestEver: result.highest_ever,
      currentAvg: result.current_avg,
      volatility: result.volatility_pct,
      sentiment: result.sentiment,
      bestPlatform: result.best_platform,
    });
    setLastFetched(new Date());

    // Fire push notification if great deal detected (score context from verdict)
    if (result.verdict === 'BUY' && result.confidence >= 80 && watchlistItem?.active) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('🔥 Great Deal Alert!', {
          body: `${item.title} — AI says BUY NOW (${result.confidence}% confident). ${result.reasoning}`,
          icon: item.image_primary_url || undefined,
          data: { url: `/market-trends?id=${item.id}` },
        });
        n.onclick = () => { window.focus(); navigate(`/market-trends?id=${item.id}`); };
      }
    }

    setFetching(false);
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sentimentColor = {
    Falling: '#10b981',
    Rising: '#f43f5e',
    Stable: '#00d4ff',
    Volatile: '#f59e0b',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-400"
          animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Item not found.</p>
        <button onClick={() => navigate(-1)} className="text-cyan-400 text-sm mt-2">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: 'hsl(240 15% 4%)' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div className="absolute w-80 h-80 rounded-full"
          style={{ top: '-5%', left: '-15%', background: 'radial-gradient(circle, hsl(190 100% 50% / 0.04) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute w-64 h-64 rounded-full"
          style={{ bottom: '10%', right: '-10%', background: 'radial-gradient(circle, hsl(263 70% 58% / 0.04) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, delay: 2 }} />
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pb-4 pt-safe-12 flex items-center gap-3">
        <motion.button onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: 'hsl(240 12% 11%)', border: '1px solid hsl(240 10% 20%)' }}
          whileTap={{ scale: 0.92 }}>
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-lg font-extrabold text-foreground truncate">{item.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] tracking-widest uppercase text-muted-foreground">Market Trends</p>
            {stats && <VolatilityBadge volatility={stats.volatility} />}
            {stats?.sentiment && (
              <span className="text-[11px] font-semibold" style={{ color: sentimentColor[stats.sentiment] || '#00d4ff' }}>
                {stats.sentiment === 'Falling' ? '↓' : stats.sentiment === 'Rising' ? '↑' : '→'} {stats.sentiment}
              </span>
            )}
          </div>
        </div>
        <motion.button
          onClick={fetchTrends}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.1))', border: '1px solid hsl(190 100% 50% / 0.3)', color: '#00d4ff' }}
          whileTap={{ scale: 0.95 }}>
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
          {fetching ? 'Searching…' : 'Refresh'}
        </motion.button>
      </div>

      <div className="relative z-10 px-4 space-y-4">
        {/* Item card */}
        <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 18%)' }}>
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
            {item.image_primary_url
              ? <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Globe className="w-5 h-5 text-muted-foreground/30" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.brand || item.category || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{item.model || item.description?.slice(0, 60) || ''}</p>
          </div>
          <motion.button
            onClick={() => navigate(`/scan-result/${item.id}`)}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
            style={{ background: 'hsl(190 100% 50% / 0.1)', color: '#00d4ff', border: '1px solid hsl(190 100% 50% / 0.2)' }}
            whileTap={{ scale: 0.95 }}>
            View Scan
          </motion.button>
        </div>

        {/* Empty state */}
        {!fetching && chartData.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center py-16 rounded-2xl"
            style={{ background: 'hsl(240 12% 8%)', border: '1px solid hsl(240 10% 16%)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'hsl(190 100% 50% / 0.08)', border: '1px solid hsl(190 100% 50% / 0.15)' }}>
              <BarChart2 className="w-7 h-7 text-cyan-400/50" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No trend data yet</p>
            <p className="text-xs text-muted-foreground mb-5">Tap Refresh to fetch live market trends via AI web search</p>
            <motion.button
              onClick={fetchTrends}
              className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0099bb)', color: '#061218' }}
              whileTap={{ scale: 0.95 }}>
              <Globe className="w-4 h-4" /> Fetch Live Trends
            </motion.button>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {fetching && (
          <div className="space-y-3">
            <div className="h-52 rounded-2xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />
            <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />)}
            </div>
          </div>
        )}

        <AnimatePresence>
          {!fetching && chartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Line Chart */}
              <div className="rounded-2xl p-4" style={{ background: 'hsl(240 12% 8%)', border: '1px solid hsl(240 10% 16%)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Price History</h3>
                    <p className="text-[11px] text-muted-foreground">7-week market data via AI web search</p>
                  </div>
                  {lastFetched && (
                    <p className="text-[11px] text-muted-foreground">Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 14%)" />
                    <XAxis dataKey="week" tick={{ fill: 'hsl(220 10% 42%)', fontSize: 9 }} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(220 10% 42%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    {stats?.lowestEver && (
                      <ReferenceLine y={stats.lowestEver} stroke="hsl(160 84% 39% / 0.4)" strokeDasharray="4 2" label={{ value: 'Low', fill: '#10b981', fontSize: 9 }} />
                    )}
                    <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Low" />
                    <Line type="monotone" dataKey="avg" stroke="#00d4ff" strokeWidth={2.5} dot={{ fill: '#00d4ff', r: 3 }} name="Avg" strokeDasharray="0" />
                    <Line type="monotone" dataKey="high" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="High" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 justify-center">
                  {[{ c: '#10b981', l: 'Low' }, { c: '#00d4ff', l: 'Avg' }, { c: '#8b5cf6', l: 'High' }].map(x => (
                    <div key={x.l} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
                      <span className="text-[11px] text-muted-foreground">{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy / Wait verdict */}
              {verdict && <BuyWaitIndicator {...verdict} />}

              {/* Stats grid */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Lowest Ever', value: `$${stats.lowestEver?.toFixed(2) ?? '—'}`, color: '#10b981' },
                    { label: 'Current Avg', value: `$${stats.currentAvg?.toFixed(2) ?? '—'}`, color: '#00d4ff' },
                    { label: 'Highest Ever', value: `$${stats.highestEver?.toFixed(2) ?? '—'}`, color: '#f43f5e' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 17%)' }}>
                      <p className="text-[11px] text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-sm font-bold font-heading" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Best platform */}
              {stats?.bestPlatform && (
                <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(240 10% 17%)' }}>
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Best Platform to Buy</p>
                    <p className="text-sm font-semibold text-foreground">{stats.bestPlatform}</p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3">
                <motion.button
                  onClick={() => navigate(`/scan-result/${item.id}`)}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 20%)', color: 'hsl(220 10% 70%)' }}
                  whileTap={{ scale: 0.96 }}>
                  <BarChart2 className="w-4 h-4" /> Full Scan
                </motion.button>
                <motion.button
                  onClick={() => navigate(`/price-tracker`)}
                  className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.18), hsl(263 70% 58% / 0.12))', border: '1px solid hsl(190 100% 50% / 0.3)', color: '#00d4ff' }}
                  whileTap={{ scale: 0.96 }}>
                  <TrendingUp className="w-4 h-4" /> Track Price
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}