import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon, ArrowLeft, Clock, TrendingUp, Smartphone, ShoppingBag, Gem, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const trendingCategories = [
  { icon: Smartphone, label: 'Electronics', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: ShoppingBag, label: 'Fashion', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Gem, label: 'Collectibles', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Package, label: 'Home Goods', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

const suggestions = [
  'iPhone 15 Pro Max',
  'Nike Air Jordan 1',
  'Sony WH-1000XM5',
  'Pokemon Charizard card',
  'Vintage Levis 501',
  'Dyson V15 Detect',
];

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recent_searches') || '[]'); }
    catch { return []; }
  });

  const handleSearch = (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 10);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
    navigate(`/scan?mode=text&query=${encodeURIComponent(q)}`);
  };

  const filteredSuggestions = query
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-heading text-lg font-bold text-foreground">Search</h1>
        </div>
      </div>

      <div className="px-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search any product, model, or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 bg-muted border-border/50 text-foreground h-12"
            autoFocus
          />
        </div>

        {/* Suggestions */}
        {filteredSuggestions.length > 0 && (
          <div className="mt-2 glass-card rounded-xl divide-y divide-border/30 overflow-hidden">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50"
              >
                <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && !query && (
        <div className="px-4 mt-6">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-heading">Recent Searches</h3>
          <div className="space-y-1">
            {recentSearches.map((s, i) => (
              <motion.button
                key={s}
                onClick={() => handleSearch(s)}
                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 hover:bg-muted/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">{s}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Trending categories */}
      {!query && (
        <div className="px-4 mt-6">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-heading">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Trending Categories
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {trendingCategories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.label}
                  onClick={() => handleSearch(cat.label)}
                  className="glass-card rounded-xl p-4 flex items-center gap-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                  </div>
                  <span className="text-sm text-foreground">{cat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular searches */}
      {!query && (
        <div className="px-4 mt-6">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-heading">Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="px-3 py-1.5 rounded-full bg-muted text-xs text-foreground hover:bg-muted/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}