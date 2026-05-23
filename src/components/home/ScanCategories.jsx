import { useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Smartphone, ShoppingBag, Package, Cpu, Shirt, Wrench, Sparkles, Store, Layers } from 'lucide-react';

const categories = [
  { icon: Smartphone, label: 'Electronics', color: '#00d4ff', glow: 'hsl(190 100% 50% / 0.25)', to: '/scan?category=electronics' },
  { icon: ShoppingBag, label: 'Fashion', color: '#8b5cf6', glow: 'hsl(263 70% 58% / 0.25)', to: '/scan?category=fashion' },
  { icon: Package, label: 'Home', color: '#10b981', glow: 'hsl(160 84% 39% / 0.25)', to: '/scan?category=home' },
  { icon: Cpu, label: 'Tech', color: '#f59e0b', glow: 'hsl(38 92% 50% / 0.25)', to: '/scan?category=tech' },
  { icon: Shirt, label: 'Apparel', color: '#00d4ff', glow: 'hsl(190 100% 50% / 0.25)', to: '/scan?category=apparel' },
  { icon: Wrench, label: 'Tools', color: '#8b5cf6', glow: 'hsl(263 70% 58% / 0.25)', to: '/scan?category=tools' },
  { icon: Sparkles, label: 'Collectibles', color: '#10b981', glow: 'hsl(160 84% 39% / 0.25)', to: '/scan?category=collectibles' },
  { icon: Layers, label: 'Bulk Scan', color: '#f59e0b', glow: 'hsl(38 92% 50% / 0.25)', to: '/bulk-scan' },
];

function CategoryTile({ cat, index }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 250, damping: 20 });
  const rawY = useSpring(0, { stiffness: 250, damping: 20 });
  const rotateX = useTransform(rawY, [-1, 1], [6, -6]);
  const rotateY = useTransform(rawX, [-1, 1], [-8, 8]);
  const Icon = cat.icon;

  return (
    <motion.div
      style={{ perspective: '400px' }}
      initial={{ opacity: 0, scale: 0.75, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={cat.to}>
        <motion.div
          ref={ref}
          onMouseMove={(e) => {
            const rect = ref.current.getBoundingClientRect();
            rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
            rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
          }}
          onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
          className="flex flex-col items-center gap-2"
          style={{ transformStyle: 'preserve-3d', rotateX, rotateY }}
          whileTap={{ scale: 0.88 }}
          whileHover={{ y: -3 }}
        >
          {/* Icon tile */}
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${cat.color}18, ${cat.color}08)`,
              border: `1px solid ${cat.color}28`,
              boxShadow: `0 6px 20px ${cat.glow}, 0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 ${cat.color}18`,
              transform: 'translateZ(12px)',
            }}
          >
            {/* Glossy top-left sheen */}
            <div className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl"
              style={{ background: `linear-gradient(to bottom, ${cat.color}12, transparent)` }}
            />
            <div className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 30% 25%, ${cat.color}20, transparent 55%)` }}
            />
            <Icon className="w-6 h-6 relative z-10" style={{ color: cat.color }} />
          </motion.div>

          <span className="text-[10px] font-medium tracking-wide" style={{ color: 'hsl(220 10% 55%)' }}>
            {cat.label}
          </span>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function ScanCategories() {
  return (
    <div className="px-4 mt-8">
      <h3 className="font-heading text-base font-bold mb-4" style={{
        background: 'linear-gradient(90deg, hsl(210 20% 92%), hsl(220 10% 65%))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Categories
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {categories.map((cat, i) => (
          <CategoryTile key={cat.label} cat={cat} index={i} />
        ))}
      </div>
    </div>
  );
}