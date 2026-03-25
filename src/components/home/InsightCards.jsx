import { useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingDown, Gem, Lightbulb, DollarSign } from 'lucide-react';

const insights = [
  {
    icon: TrendingDown,
    title: "Today's Best Deal",
    subtitle: 'Found prices 40% lower online',
    color: '#00d4ff',
    glow: 'hsl(190 100% 50% / 0.15)',
    from: 'hsl(190 100% 50% / 0.12)',
    to: 'hsl(190 100% 50% / 0.04)',
  },
  {
    icon: Gem,
    title: 'Potential Hidden Value',
    subtitle: 'An item you scanned may be collectible',
    color: '#8b5cf6',
    glow: 'hsl(263 70% 58% / 0.15)',
    from: 'hsl(263 70% 58% / 0.12)',
    to: 'hsl(263 70% 58% / 0.04)',
  },
  {
    icon: Lightbulb,
    title: 'AI Shopping Tip',
    subtitle: 'Compare prices before buying electronics in-store',
    color: '#f59e0b',
    glow: 'hsl(38 92% 50% / 0.15)',
    from: 'hsl(38 92% 50% / 0.12)',
    to: 'hsl(38 92% 50% / 0.04)',
  },
  {
    icon: DollarSign,
    title: 'Monthly Savings',
    subtitle: 'Scan more to discover better deals',
    color: '#10b981',
    glow: 'hsl(160 84% 39% / 0.15)',
    from: 'hsl(160 84% 39% / 0.12)',
    to: 'hsl(160 84% 39% / 0.04)',
  },
];

function InsightCard({ item, index }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 180, damping: 22 });
  const rawY = useSpring(0, { stiffness: 180, damping: 22 });
  const rotateX = useTransform(rawY, [-1, 1], [3, -3]);
  const rotateY = useTransform(rawX, [-1, 1], [-5, 5]);
  const Icon = item.icon;

  return (
    <motion.div
      style={{ perspective: '800px' }}
      initial={{ opacity: 0, x: -20, rotateY: 8 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        ref={ref}
        onMouseMove={(e) => {
          const rect = ref.current.getBoundingClientRect();
          rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
          rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
        }}
        onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: `linear-gradient(135deg, ${item.from}, hsl(240 14% 9%), ${item.to})`,
          border: `1px solid ${item.color}1a`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 ${item.color}12`,
        }}
        className="rounded-2xl p-4 flex items-center gap-4"
        whileHover={{
          y: -2,
          boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 4px 16px ${item.glow}, inset 0 1px 0 ${item.color}20`,
        }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {/* Icon with depth */}
        <motion.div
          className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(145deg, ${item.color}20, ${item.color}08)`,
            border: `1px solid ${item.color}25`,
            boxShadow: `0 4px 16px ${item.glow}, inset 0 1px 0 ${item.color}20`,
            transform: 'translateZ(16px)',
          }}
          whileHover={{ scale: 1.08 }}
        >
          <div className="absolute inset-0 rounded-xl"
            style={{ background: `radial-gradient(circle at 30% 25%, ${item.color}20, transparent 60%)` }}
          />
          <Icon className="w-5 h-5 relative z-10" style={{ color: item.color }} />
        </motion.div>

        <div className="min-w-0" style={{ transform: 'translateZ(8px)' }}>
          <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
          <p className="text-xs mt-0.5 leading-relaxed truncate" style={{ color: 'hsl(220 10% 52%)' }}>
            {item.subtitle}
          </p>
        </div>

        {/* Right accent line */}
        <div className="flex-shrink-0 w-px h-8 ml-auto rounded-full"
          style={{ background: `linear-gradient(to bottom, transparent, ${item.color}40, transparent)` }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function InsightCards() {
  return (
    <div className="px-4 mt-8 space-y-3">
      <h3 className="font-heading text-base font-bold mb-4" style={{
        background: 'linear-gradient(90deg, hsl(210 20% 92%), hsl(220 10% 65%))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Insights
      </h3>
      {insights.map((item, i) => (
        <InsightCard key={item.title} item={item} index={i} />
      ))}
    </div>
  );
}