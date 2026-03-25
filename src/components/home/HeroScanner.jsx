import { useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Camera, ScanBarcode, Upload, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickActions = [
  { icon: Camera, label: 'Camera', to: '/scan?mode=camera', color: '#00d4ff', glow: 'hsl(190 100% 50% / 0.4)' },
  { icon: ScanBarcode, label: 'Barcode', to: '/scan?mode=barcode', color: '#8b5cf6', glow: 'hsl(263 70% 58% / 0.4)' },
  { icon: Upload, label: 'Upload', to: '/scan?mode=upload', color: '#10b981', glow: 'hsl(160 84% 39% / 0.4)' },
  { icon: Search, label: 'Search', to: '/search', color: '#f59e0b', glow: 'hsl(38 92% 50% / 0.4)' },
];

export default function HeroScanner() {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const rawX = useSpring(0, { stiffness: 120, damping: 20 });
  const rawY = useSpring(0, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(rawY, [-1, 1], [6, -6]);
  const rotateY = useTransform(rawX, [-1, 1], [-8, 8]);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    rawX.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    rawY.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  };

  return (
    <div className="px-4 mt-4" style={{ perspective: '1000px' }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, hsl(240 14% 11%) 0%, hsl(240 18% 7%) 60%, hsl(263 30% 9%) 100%)',
          border: '1px solid hsl(190 100% 60% / 0.12)',
          boxShadow: hovered
            ? '0 30px 80px hsl(190 100% 50% / 0.15), 0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 hsl(190 100% 80% / 0.06)'
            : '0 20px 60px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 hsl(190 100% 80% / 0.04)',
        }}
        className="relative overflow-hidden rounded-3xl p-6 transition-shadow duration-300"
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Deep ambient layers */}
        <motion.div
          className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(190 100% 50% / 0.08) 0%, transparent 65%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(263 70% 58% / 0.07) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Floating grid dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, hsl(190 100% 50% / 0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Scan beam */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(190 100% 60% / 0.6) 40%, hsl(190 100% 80% / 0.9) 50%, hsl(190 100% 60% / 0.6) 60%, transparent 100%)' }}
          animate={{ y: [-10, 140, -10] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative" style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
          {/* Title */}
          <div className="mb-5">
            <motion.h2
              className="font-heading text-2xl font-extrabold"
              style={{
                background: 'linear-gradient(135deg, hsl(190 100% 80%) 0%, #ffffff 50%, hsl(263 70% 80%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Start Scanning
            </motion.h2>
            <p className="text-xs text-muted-foreground mt-0.5 tracking-wide">AI-powered product identification & pricing</p>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} to={action.to}>
                  <motion.div
                    className="flex flex-col items-center gap-2"
                    whileTap={{ scale: 0.88, rotateZ: -2 }}
                    whileHover={{ y: -3 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        width: 52,
                        height: 52,
                        background: `linear-gradient(145deg, ${action.color}22, ${action.color}11)`,
                        border: `1px solid ${action.color}33`,
                        boxShadow: `0 8px 24px ${action.glow}, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 ${action.color}22`,
                      }}
                    >
                      <div className="absolute inset-0 rounded-2xl"
                        style={{ background: `radial-gradient(circle at 30% 30%, ${action.color}18, transparent 60%)` }}
                      />
                      <Icon className="w-5 h-5 relative z-10" style={{ color: action.color }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: 'hsl(220 10% 60%)' }}>{action.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}