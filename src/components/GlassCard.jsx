import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function GlassCard({ children, className, glow, animate = true, ...props }) {
  const glowClass = glow === 'cyan' ? 'glow-cyan' : glow === 'violet' ? 'glow-violet' : glow === 'emerald' ? 'glow-emerald' : '';

  const Comp = animate ? motion.div : 'div';
  const animProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  } : {};

  return (
    <Comp
      className={cn('glass-card rounded-xl p-4', glowClass, className)}
      {...animProps}
      {...props}
    >
      {children}
    </Comp>
  );
}