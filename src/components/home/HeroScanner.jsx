import { motion } from 'framer-motion';
import { Camera, ScanBarcode, Upload, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  { icon: Camera, label: 'Camera', to: '/scan?mode=camera', color: 'from-cyan-500 to-cyan-600' },
  { icon: ScanBarcode, label: 'Barcode', to: '/scan?mode=barcode', color: 'from-violet-500 to-violet-600' },
  { icon: Upload, label: 'Upload', to: '/scan?mode=upload', color: 'from-emerald-500 to-emerald-600' },
  { icon: Search, label: 'Search', to: '/search', color: 'from-amber-500 to-amber-600' },
];

export default function HeroScanner() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl mx-4 mt-4 p-6"
      style={{
        background: 'linear-gradient(135deg, hsl(240 12% 10%) 0%, hsl(240 15% 6%) 100%)',
        border: '1px solid hsl(190 100% 50% / 0.15)',
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated glow background */}
      <motion.div
        className="absolute top-0 right-0 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(190 100% 50% / 0.1) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Scan beam */}
      <motion.div
        className="absolute left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(190 100% 50% / 0.4), transparent)' }}
        animate={{ y: [0, 120, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10">
        <h2 className="font-heading text-xl font-bold text-foreground">Start Scanning</h2>
        <p className="text-sm text-muted-foreground mt-1">Point at any product to identify and price it</p>

        <div className="grid grid-cols-4 gap-3 mt-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.to}>
                <motion.div
                  className="flex flex-col items-center gap-2"
                  whileTap={{ scale: 0.9 }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{action.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}