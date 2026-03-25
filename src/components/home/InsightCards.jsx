import { motion } from 'framer-motion';
import { TrendingDown, Gem, Lightbulb, DollarSign } from 'lucide-react';
import GlassCard from '../GlassCard';

const insights = [
  {
    icon: TrendingDown,
    title: "Today's Best Deal",
    subtitle: 'Found prices 40% lower online',
    accent: 'cyan',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Gem,
    title: 'Potential Hidden Value',
    subtitle: 'An item you scanned may be collectible',
    accent: 'violet',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    icon: Lightbulb,
    title: 'AI Shopping Tip',
    subtitle: 'Compare prices before buying electronics in-store',
    accent: 'amber',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  {
    icon: DollarSign,
    title: 'Monthly Savings',
    subtitle: 'Scan more to discover better deals',
    accent: 'emerald',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
];

export default function InsightCards() {
  return (
    <div className="px-4 mt-6 space-y-3">
      <h3 className="font-heading text-base font-semibold text-foreground">Insights</h3>
      {insights.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <GlassCard animate={false} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}