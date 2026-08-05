import { motion } from 'framer-motion';

export default function DepthReveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, rotateX: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformOrigin: 'top center', perspective: '800px' }}
    >
      {children}
    </motion.div>
  );
}