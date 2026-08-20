import { motion } from 'framer-motion';
import { TrendingUp, Clock } from 'lucide-react';

export default function VaultFilterBar({ sortBy, setSortBy, activeCategory, setActiveCategory, categories }) {
  const profitActive = sortBy === 'profit' && activeCategory === 'all';
  const recentActive = sortBy === 'recent' && activeCategory === 'all';

  return (
    <div className="px-4 mb-3">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1" style={{ minWidth: 'max-content' }}>
        <motion.button
          onClick={() => { setSortBy('profit'); setActiveCategory('all'); }}
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{
            background: profitActive ? 'linear-gradient(135deg, hsl(160 84% 39% / 0.18), hsl(160 84% 39% / 0.06))' : 'hsl(240 12% 10%)',
            border: profitActive ? '1px solid hsl(160 84% 39% / 0.4)' : '1px solid hsl(240 10% 18%)',
            color: profitActive ? '#34d399' : 'hsl(220 10% 55%)',
          }}
          whileTap={{ scale: 0.94 }}>
          <TrendingUp className="w-3 h-3" /> Top Profit
        </motion.button>
        <motion.button
          onClick={() => { setSortBy('recent'); setActiveCategory('all'); }}
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap"
          style={{
            background: recentActive ? 'linear-gradient(135deg, hsl(190 100% 50% / 0.18), hsl(190 100% 50% / 0.06))' : 'hsl(240 12% 10%)',
            border: recentActive ? '1px solid hsl(190 100% 50% / 0.4)' : '1px solid hsl(240 10% 18%)',
            color: recentActive ? '#00d4ff' : 'hsl(220 10% 55%)',
          }}
          whileTap={{ scale: 0.94 }}>
          <Clock className="w-3 h-3" /> Recent
        </motion.button>
        {categories.length > 0 && <div className="w-px h-4 bg-border/40 mx-0.5" />}
        {categories.map(cat => (
          <motion.button
            key={cat}
            onClick={() => { setActiveCategory(activeCategory === cat ? 'all' : cat); setSortBy('recent'); }}
            className="px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap"
            style={{
              background: activeCategory === cat ? 'linear-gradient(135deg, hsl(263 70% 58% / 0.18), hsl(263 70% 58% / 0.06))' : 'hsl(240 12% 10%)',
              border: activeCategory === cat ? '1px solid hsl(263 70% 58% / 0.4)' : '1px solid hsl(240 10% 18%)',
              color: activeCategory === cat ? '#a78bfa' : 'hsl(220 10% 55%)',
            }}
            whileTap={{ scale: 0.94 }}>
            {cat}
          </motion.button>
        ))}
      </div>
    </div>
  );
}