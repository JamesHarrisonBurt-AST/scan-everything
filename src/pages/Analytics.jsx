import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, TrendingDown, Package, ArrowLeft } from 'lucide-react';
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
    }
    load();
  }, []);

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
        </div>
      )}
    </div>
  );
}