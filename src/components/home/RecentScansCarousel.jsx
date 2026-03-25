import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlassCard from '../GlassCard';

export default function RecentScansCarousel({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-4 mt-6">
        <h3 className="font-heading text-base font-semibold text-foreground mb-3">Recent Scans</h3>
        <GlassCard className="flex flex-col items-center py-8">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <div className="w-5 h-5 rounded border-2 border-dashed border-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Point the camera at something interesting.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground">Recent Scans</h3>
        <Link to="/vault" className="text-xs text-cyan-400 flex items-center gap-0.5">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-none">
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            className="flex-shrink-0 w-36"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={`/scan-result/${item.id}`}>
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="h-24 bg-muted relative">
                  {item.image_primary_url ? (
                    <img src={item.image_primary_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 rounded bg-secondary" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.brand || item.category}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}