import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ children, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const pull = useMotionValue(0);
  const startY = useRef(null);
  const containerRef = useRef(null);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const opacity = useTransform(pull, [0, 40, 80], [0, 0.5, 1]);
  const scale = useTransform(pull, [0, 40, 80], [0.5, 0.8, 1]);

  useEffect(() => {
    const onStart = (e) => {
      if (!containerRef.current?.offsetParent) return;
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };

    const onMove = (e) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        e.preventDefault();
        pull.set(Math.min(delta * 0.4, 80));
      }
    };

    const onEnd = async () => {
      if (startY.current === null) return;
      const current = pull.get();
      startY.current = null;
      if (current > 55 && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        animate(pull, 45, { duration: 0.2 });
        try { await onRefreshRef.current(); } catch { /* ignore */ }
        refreshingRef.current = false;
        setRefreshing(false);
        animate(pull, 0, { duration: 0.3 });
      } else {
        animate(pull, 0, { duration: 0.3 });
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [pull]);

  return (
    <div ref={containerRef} className="relative">
      <motion.div style={{ opacity, y: pull }} className="absolute left-1/2 -translate-x-1/2 top-2 z-50 pointer-events-none">
        <motion.div style={{ scale }} animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
          <RefreshCw className="w-5 h-5 text-cyan-400" />
        </motion.div>
      </motion.div>
      <motion.div style={{ y: pull }}>
        {children}
      </motion.div>
    </div>
  );
}