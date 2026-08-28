import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'hsl(220 12% 12%)', border: '1px solid hsl(220 12% 18%)' }}
      >
        {Icon && <Icon className="w-7 h-7 text-muted-foreground/40" />}
      </motion.div>
      <p className="text-sm font-heading font-semibold text-foreground mb-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground max-w-[220px]">{subtitle}</p>}
      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          className="mt-5 px-5 h-10 rounded-xl text-sm font-bold flex items-center gap-2 touch-target"
          style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}
          whileTap={{ scale: 0.95 }}
        >
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}