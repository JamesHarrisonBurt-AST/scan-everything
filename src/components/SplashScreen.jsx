import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Particle = ({ delay, x, y }) => (
  <motion.div
    className="absolute w-1 h-1 rounded-full bg-cyan-500"
    initial={{ opacity: 0, scale: 0, x, y }}
    animate={{
      opacity: [0, 0.8, 0],
      scale: [0, 1.5, 0],
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
    }}
    transition={{ duration: 2, delay, ease: 'easeOut' }}
  />
);

const ScannerBracket = ({ position, delay }) => {
  const positions = {
    tl: 'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
    tr: 'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
    bl: 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
    br: 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
  };

  return (
    <motion.div
      className={`absolute w-8 h-8 border-cyan-500 ${positions[position]}`}
      initial={{ opacity: 0, scale: 1.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
    />
  );
};

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2600),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * 400 - 200,
    delay: Math.random() * 1.5,
  }));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden"
        exit={{ opacity: 0, filter: 'blur(20px)' }}
        transition={{ duration: 0.8 }}
      >
        {/* Particles */}
        {phase >= 1 && (
          <div className="absolute inset-0 flex items-center justify-center">
            {particles.map((p) => (
              <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
            ))}
          </div>
        )}

        {/* Radial glow */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(190 100% 50% / 0.15) 0%, transparent 70%)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 3, opacity: 1 } : {}}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Scanner beam */}
        {phase >= 2 && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-48 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(190 100% 50% / 0.8), transparent)',
            }}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: [- 100, 100], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        )}

        {/* Scanner brackets */}
        {phase >= 2 && (
          <div className="relative w-32 h-32 mb-8">
            <ScannerBracket position="tl" delay={0} />
            <ScannerBracket position="tr" delay={0.1} />
            <ScannerBracket position="bl" delay={0.2} />
            <ScannerBracket position="br" delay={0.3} />

            {/* Inner scan icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="w-12 h-12 rounded-lg border border-cyan-500/50 flex items-center justify-center glow-cyan">
                <motion.div
                  className="w-6 h-6 rounded-sm bg-gradient-to-br from-cyan-500 to-violet-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* App name */}
        {phase >= 3 && (
          <motion.h1
            className="font-heading text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-foreground to-violet-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Scan Everything
          </motion.h1>
        )}

        {/* Tagline */}
        {phase >= 4 && (
          <motion.p
            className="mt-3 text-sm text-muted-foreground tracking-widest uppercase font-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            See it. Price it. Value it.
          </motion.p>
        )}

        {/* Bottom pulse */}
        {phase >= 3 && (
          <motion.div
            className="absolute bottom-20 w-16 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(190 100% 50% / 0.5), transparent)',
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}