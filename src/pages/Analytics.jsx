import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, TrendingUp, TrendingDown, Package, ArrowLeft, Globe, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { base44 } from '@/api/base44Client';
import GlassCard from '../components/GlassCard';

const COLORS = ['#00d4ff', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs border border-border/50">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: ${Number(p.value).toFixed(2)}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [volatilityData, setVolatilityData] = useState([]);
  const [stats, setStats] = useState({ totalValue: 0, avgDeal: 0, topCategory: '', totalItems: 0 });
  const [marketPrices, setMarketPrices] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    async function load() {
      const [items, summaries, vault] = await Promise.all([
        base44.entities.IdentifiedItem.list('-created_date', 100),
        base44.entities.PriceSummary.list('-created_date', 100),
        base44.entities.VaultItem.list('-created_date', 100),
      ]);

      // Build trend data: group by day (last 14 days)
      const days = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        days[key] = { date: key, lowest: 0, average: 0, high: 0, count: 0 };
      }
      summaries.forEach(s => {
        const item = items.find(it => it.id === s.identified_item_id);
        if (!item) return;
        const key = new Date(item.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (days[key]) {
          days[key].lowest = (days[key].lowest * days[key].count + (s.lowest_price || 0)) / (days[key].count + 1);
          days[key].average = (days[key].average * days[key].count + (s.average_price || 0)) / (days[key].count + 1);
          days[key].high = (days[key].high * days[key].count + (s.high_price || 0)) / (days[key].count + 1);
          days[key].count++;
        }
      });
      const trend = Object.values(days).map(d => ({
        date: d.date,
        Low: parseFloat(d.lowest.toFixed(2)),
        Avg: parseFloat(d.average.toFixed(2)),
        High: parseFloat(d.high.toFixed(2)),
      }));
      setTrendData(trend);

      // Category breakdown
      const catMap = {};
      items.forEach(item => {
        if (!item.category) return;
        catMap[item.category] = (catMap[item.category] || 0) + 1;
      });
      const catArr = Object.entries(catMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      setCategoryData(catArr);

      // Volatility: (high - low) / avg per category
      const volatMap = {};
      summaries.forEach(s => {
        const item = items.find(it => it.id === s.identified_item_id);
        const cat = item?.category || 'Unknown';
        if (!volatMap[cat]) volatMap[cat] = { spread: [], avg: [] };
        if (s.high_price && s.lowest_price && s.average_price && s.average_price > 0) {
          volatMap[cat].spread.push(s.high_price - s.lowest_price);
          volatMap[cat].avg.push(s.average_price);
        }
      });
      const volatArr = Object.entries(volatMap)
        .map(([cat, d]) => ({
          category: cat.length > 12 ? cat.slice(0, 12) + '…' : cat,
          volatility: d.avg.length > 0
            ? parseFloat((d.spread.reduce((a, b) => a + b, 0) / d.spread.length /
                (d.avg.reduce((a, b) => a + b, 0) / d.avg.length) * 100).toFixed(1))
            : 0,
        }))
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, 6);
      setVolatilityData(volatArr);

      // Summary stats
      const totalValue = vault.reduce((sum, v) => sum + (v.best_price_found || 0), 0);
      const dealScores = summaries.map(s => s.deal_score).filter(Boolean);
      const avgDeal = dealScores.length ? dealScores.reduce((a, b) => a + b, 0) / dealScores.length : 0;
      const topCategory = catArr[0]?.name || '—';
      setStats({ totalValue, avgDeal: Math.round(avgDeal), topCategory, totalItems: vault.length });

      setLoading(false);

      // Keep top items for market price lookup
      const top = items.slice(0, 8);
      setTopItems(top);
    }
    load();
  }, []);

  const fetchMarketPrices = async () => {
    if (topItems.length === 0) return;
    setMarketLoading(true);
    setMarketError(null);
    try {
      const results = await Promise.all(
        topItems.map(async (item) => {
          const query = item.normalized_search_query || `${item.brand || ''} ${item.title}`.trim();
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Search the web right now for the current market price of: "${query}". 
Find the lowest price, highest price, and average/typical price available online today across major marketplaces (eBay, Amazon, StockX, Mercari, etc.).
Return ONLY a JSON object with these fields:
- lowest_price (number, USD)
- highest_price (number, USD)  
- average_price (number, USD)
- best_source (string, marketplace name where lowest price found)
- price_range_label (string, short human-readable summary like "$45 - $120")
- last_updated (string, "today" or date)
- hot_deal (boolean, true if lowest is significantly below average)`,
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: {
              type: 'object',
              properties: {
                lowest_price: { type: 'number' },
                highest_price: { type: 'number' },
                average_price: { type: 'number' },
                best_source: { type: 'string' },
                price_range_label: { type: 'string' },
                last_updated: { type: 'string' },
                hot_deal: { type: 'boolean' },
              },
            },
          });
          return { item, ...result };
        })
      );
      setMarketPrices(results);
    } catch (e) {
      setMarketError('Failed to fetch live market prices. Try again.');
    }
    setMarketLoading(false);
  };

  const statCards = [
    { label: 'Vault Value', value: `$${stats.totalValue.toFixed(0)}`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Avg Deal Score', value: `${stats.avgDeal}/100`, icon: BarChart2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Top Category', value: stats.topCategory || '—', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-500/10', small: true },
    { label: 'Items Tracked', value: stats.totalItems, icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-safe-12">
        <button onClick={() => navigate(-1)} className="touch-target">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-violet-400" />
            Analytics
          </h1>
          <p className="text-xs text-muted-foreground">Price trends & market insights</p>
        </div>
      </div>

      {loading ? (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="glass-card rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="px-4 space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <GlassCard animate={false} className="flex flex-col gap-2">
                    <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className={`font-heading font-bold ${s.small ? 'text-sm' : 'text-xl'} text-foreground truncate`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* Price Trend Chart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard animate={false}>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Price Trends (14 days)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 16%)" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(220 10% 45%)', fontSize: 9 }} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: 'hsl(220 10% 45%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Low" stroke="#00d4ff" strokeWidth={1.5} fill="url(#gradLow)" dot={false} />
                  <Area type="monotone" dataKey="Avg" stroke="#10b981" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="High" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#gradHigh)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center">
                {[{c:'#00d4ff',l:'Low'},{c:'#10b981',l:'Avg'},{c:'#8b5cf6',l:'High'}].map(x => (
                  <div key={x.l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{background: x.c}} />
                    <span className="text-[10px] text-muted-foreground">{x.l}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Category Volatility */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard animate={false}>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-1">Category Volatility</h3>
              <p className="text-[10px] text-muted-foreground mb-4">Price spread as % of average</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={volatilityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 16%)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: 'hsl(220 10% 45%)', fontSize: 9 }} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(220 10% 45%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="glass-card rounded-lg px-3 py-2 text-xs border border-border/50">
                      <p className="text-muted-foreground">{label}</p>
                      <p className="text-amber-400">Volatility: {payload[0].value}%</p>
                    </div>
                  ) : null} />
                  <Bar dataKey="volatility" radius={[4, 4, 0, 0]}>
                    {volatilityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>

          {/* Category Distribution */}
          {categoryData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <GlassCard animate={false}>
                <h3 className="font-heading font-semibold text-sm text-foreground mb-4">Category Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend
                      formatter={(value) => <span style={{ color: 'hsl(220 10% 65%)', fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </GlassCard>
            </motion.div>
          )}

          {/* Live Market Prices via Web Search */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard animate={false} className="border border-cyan-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">Live Market Prices</h3>
                    <p className="text-[10px] text-muted-foreground">AI web search — real-time lowest & highest</p>
                  </div>
                </div>
                <motion.button
                  onClick={fetchMarketPrices}
                  disabled={marketLoading || topItems.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'linear-gradient(135deg, hsl(190 100% 50% / 0.15), hsl(263 70% 58% / 0.1))', border: '1px solid hsl(190 100% 50% / 0.3)', color: '#00d4ff' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className={`w-3 h-3 ${marketLoading ? 'animate-spin' : ''}`} />
                  {marketLoading ? 'Searching…' : 'Refresh'}
                </motion.button>
              </div>

              {marketError && (
                <p className="text-xs text-red-400 mb-3">{marketError}</p>
              )}

              {marketLoading && marketPrices.length === 0 && (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'hsl(240 12% 10%)' }} />
                  ))}
                </div>
              )}

              {!marketLoading && marketPrices.length === 0 && !marketError && (
                <div className="text-center py-6">
                  <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Tap Refresh to fetch live prices for your scanned items</p>
                  {topItems.length === 0 && <p className="text-xs text-muted-foreground/60 mt-1">Scan some items first</p>}
                </div>
              )}

              {marketPrices.length > 0 && (
                <div className="space-y-2">
                  {marketPrices.map((entry, i) => {
                    const isExpanded = expandedItem === i;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl overflow-hidden"
                        style={{ background: 'hsl(240 12% 9%)', border: entry.hot_deal ? '1px solid hsl(160 84% 39% / 0.4)' : '1px solid hsl(240 10% 18%)' }}
                      >
                        <button
                          className="w-full flex items-center gap-3 p-3 text-left"
                          onClick={() => setExpandedItem(isExpanded ? null : i)}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            {entry.item.image_primary_url
                              ? <img src={entry.item.image_primary_url} alt={entry.item.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/30" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{entry.item.title}</p>
                            <p className="text-[11px] font-bold text-cyan-400 mt-0.5">{entry.price_range_label || '—'}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {entry.hot_deal && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">HOT</span>
                            )}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 border-t border-border/30 pt-3 grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded-lg" style={{ background: 'hsl(240 12% 12%)' }}>
                                  <p className="text-[10px] text-muted-foreground">Lowest</p>
                                  <p className="text-sm font-bold text-emerald-400">${entry.lowest_price?.toFixed(2) ?? '—'}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg" style={{ background: 'hsl(240 12% 12%)' }}>
                                  <p className="text-[10px] text-muted-foreground">Average</p>
                                  <p className="text-sm font-bold text-cyan-400">${entry.average_price?.toFixed(2) ?? '—'}</p>
                                </div>
                                <div className="text-center p-2 rounded-lg" style={{ background: 'hsl(240 12% 12%)' }}>
                                  <p className="text-[10px] text-muted-foreground">Highest</p>
                                  <p className="text-sm font-bold text-violet-400">${entry.highest_price?.toFixed(2) ?? '—'}</p>
                                </div>
                              </div>
                              {entry.best_source && (
                                <div className="px-3 pb-3 flex items-center gap-1.5">
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-[10px] text-muted-foreground">Best price on <span className="text-cyan-400">{entry.best_source}</span></p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  );
}