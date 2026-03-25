import { useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ChevronRight, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';

function ScanCard({ item, index }) {
  const ref = useRef(null);
  const rawX = useSpring(0, { stiffness: 200, damping: 25 });
  const rawY = useSpring(0, { stiffness: 200, damping: 25 });
  const rotateX = useTransform(rawY, [-1, 1], [5, -5]);
  const rotateY = useTransform(rawX, [-1, 1], [-7, 7]);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  return (
    <motion.div
      className="flex-shrink-0 w-36"
      style={{ perspective: '600px' }}
      initial={{ opacity: 0, x: 30, rotateY: -15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/scan-result/${item.id}`}>
        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            background: 'linear-gradient(145deg, hsl(240 12% 10%), hsl(240 15% 7%))',
            border: '1px solid hsl(240 10% 20% / 0.6)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 hsl(240 10% 30% / 0.3)',
          }}
          className="rounded-2xl overflow-hidden"
          whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 4px 16px hsl(190 100% 50% / 0.08)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.2 }}
        >
          {/* Image area */}
          <div className="h-24 relative overflow-hidden">
            {item.image_primary_url ? (
              <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(240 15% 12%), hsl(240 12% 9%))' }}>
                <div className="w-8 h-8 rounded-xl border border-muted/30 flex items-center justify-center">
                  <ScanLine className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </div>
            )}
            {/* Depth overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
            {/* Top edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(240 10% 40% / 0.4), transparent)' }} />
          </div>

          {/* Info */}
          <div className="p-2.5" style={{ transform: 'translateZ(10px)' }}>
            <p className="text-xs font-semibold text-foreground truncate leading-tight">{item.title}</p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(220 10% 50%)' }}>{item.brand || item.category}</p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export default function RecentScansCarousel({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-4 mt-8">
        <SectionHeader title="Recent Scans" />
        <motion.div
          className="rounded-2xl flex flex-col items-center py-10"
          style={{
            background: 'linear-gradient(145deg, hsl(240 12% 9%), hsl(240 15% 6%))',
            border: '1px solid hsl(240 10% 16% / 0.5)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3), inset 0 1px 0 hsl(240 10% 25% / 0.2)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 22%)', boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 hsl(240 10% 30% / 0.2)' }}>
            <ScanLine className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nothing scanned yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Point at any product to start</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between px-4 mb-3">
        <SectionHeader title="Recent Scans" />
        <Link to="/vault" className="flex items-center gap-0.5 text-xs font-medium" style={{ color: 'hsl(190 100% 60%)' }}>
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {items.map((item, i) => (
          <ScanCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h3 className="font-heading text-base font-bold" style={{
      background: 'linear-gradient(90deg, hsl(210 20% 92%), hsl(220 10% 65%))',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}>
      {title}
    </h3>
  );
}