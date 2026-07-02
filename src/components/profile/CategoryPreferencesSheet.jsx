import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['Electronics', 'Clothing', 'Shoes', 'Toys', 'Books', 'Collectibles', 'Furniture', 'Sports', 'Tools'];

export default function CategoryPreferencesSheet({ user, onClose }) {
  const [followed, setFollowed] = useState([]);
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CategoryFollow.list().then(list => {
      setFollows(list);
      setFollowed(list.map(f => f.category));
      setLoading(false);
    });
  }, []);

  const toggle = async (cat) => {
    if (followed.includes(cat)) {
      const match = follows.find(f => f.category === cat);
      if (match) await base44.entities.CategoryFollow.delete(match.id);
      setFollows(prev => prev.filter(f => f.category !== cat));
      setFollowed(prev => prev.filter(c => c !== cat));
    } else {
      const created = await base44.entities.CategoryFollow.create({ category: cat, user_email: user?.email || '' });
      setFollows(prev => [...prev, created]);
      setFollowed(prev => [...prev, cat]);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full rounded-t-3xl p-6 max-h-[75vh] overflow-y-auto"
        style={{ background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))', border: '1px solid hsl(240 10% 22%)', borderBottom: 'none', boxShadow: '0 -24px 70px rgba(0,0,0,0.6)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-heading font-bold text-foreground">Followed Categories</p>
            <p className="text-xs text-muted-foreground mt-0.5">Get notified about hot deals in these categories</p>
          </div>
          <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(240 12% 14%)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </motion.button>
        </div>

        {!loading && (
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => {
              const isFollowed = followed.includes(cat);
              return (
                <motion.button key={cat} onClick={() => toggle(cat)}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl"
                  style={{ background: isFollowed ? 'hsl(263 70% 58% / 0.12)' : 'hsl(240 12% 10%)', border: isFollowed ? '1px solid hsl(263 70% 58% / 0.3)' : '1px solid hsl(240 10% 18%)' }}
                  whileTap={{ scale: 0.95 }}>
                  <Star className={`w-3.5 h-3.5 ${isFollowed ? 'text-violet-400 fill-violet-400' : 'text-muted-foreground'}`} />
                  <span className="text-xs font-semibold text-foreground">{cat}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}