import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
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

export default function PriceHistoryChart({ item }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendPct, setTrendPct] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    const query = item.normalized_search_query || `${item.brand || ''} ${item.title}`.trim();

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a market research AI. Search the web for current and historical pricing of: "${query}".

Generate 7 weekly price snapshots going back ~7 weeks, ordered oldest to newest. The last entry should be "Now" with real current prices. Use real current market data as the anchor and estimate the weekly progression.

Return JSON with:
- price_history: array of 7 objects { week: string (e.g. "7w ago", "6w ago", ..., "Now"), low: number, avg: number, high: number }
  ordered oldest to newest.`,
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
          },
        },
      });

      const history = result.price_history || [];
      setChartData(history);

      if (history.length >= 2) {
        const first = history[0].avg;
        const last = history[history.length - 1].avg;
        if (first > 0) {
          setTrendPct(((last - first) / first) * 100);
        }
      }
    } catch {
      setError('Unable to load price history');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [item?.id]);

  if (loading) {
    return (
      <div className="px-4 mt-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-medium text-foreground">7-Week Price History</span>
          </div>
          <div className="h-44 rounded-lg animate-pulse" style={{ background: 'hsl(240 10% 12%)' }} />
        </div>
      </div>
    );
  }

  if (error || chartData.length === 0) {
    return (
      <div className="px-4 mt-4">
        <div className="glass-card rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Price history unavailable</span>
          </div>
          <button onClick={fetchHistory} className="touch-target w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'hsl(240 12% 14%)' }}>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>
    );
  }

  const isGaining = trendPct > 2;
  const isLosing = trendPct < -2;
  const trendColor = isGaining ? '#10b981' : isLosing ? '#f43f5e' : '#00d4ff';
  const TrendIcon = isGaining ? TrendingUp : isLosing ? TrendingDown : Minus;
  const trendLabel = isGaining ? 'Gaining Value' : isLosing ? 'Losing Value' : 'Stable';

  return (
    <div className="px-4 mt-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-foreground">7-Week Price History</span>
          </div>
          {trendPct !== null && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${trendColor}15`, border: `1px solid ${trendColor}30` }}>
              <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
              <span className="text-[11px] font-bold" style={{ color: trendColor }}>
                {trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mb-3">{trendLabel} · AI-sourced weekly market data</p>

        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 14%)" />
            <XAxis dataKey="week" tick={{ fill: 'hsl(220 10% 42%)', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: 'hsl(220 10% 42%)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="avg" stroke="none" fill="url(#avgGradient)" />
            <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 2.5 }} name="Low" />
            <Line type="monotone" dataKey="avg" stroke="#00d4ff" strokeWidth={2.5} dot={{ fill: '#00d4ff', r: 3 }} name="Avg" />
            <Line type="monotone" dataKey="high" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 2.5 }} name="High" />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex gap-4 mt-2 justify-center">
          {[{ c: '#10b981', l: 'Low' }, { c: '#00d4ff', l: 'Avg' }, { c: '#8b5cf6', l: 'High' }].map(x => (
            <div key={x.l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: x.c }} />
              <span className="text-[11px] text-muted-foreground">{x.l}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}