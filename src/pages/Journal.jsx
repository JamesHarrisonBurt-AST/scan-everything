import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Package, WifiOff, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOnlineStatus, getCachedDiscoveries, cacheDiscovery } from '@/lib/offlineCache';
import { isToday, isYesterday, isThisWeek, isThisMonth, format, parseISO } from 'date-fns';

function dateGroup(dateStr) {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return 'This Week';
    if (isThisMonth(date)) return 'This Month';
    return 'Older';
  } catch {
    return 'Older';
  }
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

export default function Journal() {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.Discovery.list('-created_date', 200);
        setDiscoveries(items);
        items.forEach(cacheDiscovery);
      } catch {
        if (!online) setDiscoveries(getCachedDiscoveries());
      }
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(() => [...new Set(discoveries.map(d => d.category).filter(Boolean))].sort(), [discoveries]);
  const locations = useMemo(() => [...new Set(discoveries.map(d => d.location_label).filter(Boolean))].sort(), [discoveries]);

  const filtered = useMemo(() => {
    let items = discoveries;
    if (category !== 'all') items = items.filter(d => d.category === category);
    if (location !== 'all') items = items.filter(d => d.location_label === location);
    return items;
  }, [discoveries, category, location]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(d => {
      const g = dateGroup(d.created_date);
      if (!groups[g]) groups[g] = [];
      groups[g].push(d);
    });
    return GROUP_ORDER.filter(g => groups[g]?.length).map(g => ({ label: g, items: groups[g] }));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-safe-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-extrabold text-foreground">Journal</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} entries</p>
        </div>
      </div>

      {!online && (
        <div className="mx-4 mb-3 rounded-xl p-3 flex items-center gap-2" style={{ background: 'hsl(340 70% 25% / 0.15)', border: '1px solid hsl(340 70% 50% / 0.25)' }}>
          <WifiOff className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs text-rose-300">Offline — showing cached discoveries</span>
        </div>
      )}

      {/* Category filter */}
      <div className="px-4 mb-2 flex gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setCategory('all')}
          className={`px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target ${category === 'all' ? 'text-amber-400' : 'text-muted-foreground'}`}
          style={{ background: category === 'all' ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 10%)', border: category === 'all' ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)' }}
        >
          All Categories
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target capitalize ${category === cat ? 'text-amber-400' : 'text-muted-foreground'}`}
            style={{ background: category === cat ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 10%)', border: category === cat ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)' }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Location filter */}
      {locations.length > 0 && (
        <div className="px-4 mb-4 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setLocation('all')}
            className={`px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target flex items-center gap-1 ${location === 'all' ? 'text-teal-400' : 'text-muted-foreground'}`}
            style={{ background: location === 'all' ? 'hsl(175 65% 42% / 0.12)' : 'hsl(220 12% 10%)', border: location === 'all' ? '1px solid hsl(175 65% 42% / 0.3)' : '1px solid hsl(220 12% 18%)' }}
          >
            <MapPin className="w-3 h-3" /> All Locations
          </button>
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`px-3 h-9 rounded-xl text-xs font-semibold whitespace-nowrap touch-target ${location === loc ? 'text-teal-400' : 'text-muted-foreground'}`}
              style={{ background: location === loc ? 'hsl(175 65% 42% / 0.12)' : 'hsl(220 12% 10%)', border: location === loc ? '1px solid hsl(175 65% 42% / 0.3)' : '1px solid hsl(220 12% 18%)' }}
            >
              {loc}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl glass-card animate-pulse" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Calendar className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-heading font-semibold text-muted-foreground">No entries</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Scan objects to fill your journal</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map((d, i) => (
                  <motion.button
                    key={d.id}
                    onClick={() => navigate(`/discovery/${d.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl glass-card text-left touch-target"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'hsl(220 12% 14%)' }}>
                      {d.image_url
                        ? <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.title}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{d.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(d.created_date), 'MMM d, h:mm a')}</span>
                        {d.location_label && (
                          <span className="text-[10px] text-teal-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{d.location_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}