import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Smartphone, ShoppingBag, Package, Cpu, Shirt, Wrench, Sparkles, Store } from 'lucide-react';

const categories = [
  { icon: Smartphone, label: 'Electronics', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: ShoppingBag, label: 'Fashion', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Package, label: 'Home', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Cpu, label: 'Tech', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: Shirt, label: 'Apparel', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Wrench, label: 'Tools', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Sparkles, label: 'Collectibles', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Store, label: 'Thrift', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function ScanCategories() {
  return (
    <div className="px-4 mt-6">
      <h3 className="font-heading text-base font-semibold text-foreground mb-3">Scan Categories</h3>
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Link to={`/scan?category=${cat.label.toLowerCase()}`} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{cat.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}