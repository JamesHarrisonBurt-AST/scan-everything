import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GridLine = ({ x, y, isVertical, delay }) => (
  <motion.div
    className={`absolute ${isVertical ? 'w-px h-full top-0' : 'h-px w-full left-0'} bg-cyan-500/10`}
    style={isVertical ? { left: `${x}%` } : { top: `${y}%` }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.5, 0] }}
    transition={{ duration: 3, delay, repeat: Infinity, repeatDelay: 2 }}
  />
);

const Orb = ({ color, x, y, size, delay }) => (
  <motion.div
    className="absolute rounded-full"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      transform: 'translate(-50%, -50%)',
    }}
    initial={{ opacity: 0, scale: 0.3 }}
    animate={{ opacity: [0, 0.6, 0.3, 0.6], scale: [0.3, 1.2, 1, 1.3] }}
    transition={{ duration: 4, delay, ease: 'easeOut' }}
  />
);

const ScanCorner = ({ pos, delay }) => {
  const corners = {
    tl: 'top-0 left-0 border-t-[2px] border-l-[2px] rounded-tl-2xl',
    tr: 'top-0 right-0 border-t-[2px] border-r-[2px] rounded-tr-2xl',
    bl: 'bottom-0 left-0 border-b-[2px] border-l-[2px] rounded-bl-2xl',
    br: 'bottom-0 right-0 border-b-[2px] border-r-[2px] rounded-br-2xl',
  };
  return (
    <motion.div
      className={`absolute w-10 h-10 border-cyan-400 ${corners[pos]}`}
      initial={{ opacity: 0, scale: 1.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
};

const DataLine = ({ top, delay }) => (
  <motion.div
    className="absolute left-0 right-0 flex justify-end pr-4"
    style={{ top }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.7, 0] }}
    transition={{ duration: 2, delay }}
  >
    <span className="font-body text-[8px] tracking-widest text-cyan-500/50 font-light">
      {Math.random().toString(36).substring(2, 10).toUpperCase()}
    </span>
  </motion.div>
);

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1700),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3200),
      setTimeout(() => onComplete(), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'hsl(240 15% 3%)' }}
        exit={{ opacity: 0, filter: 'blur(30px)', scale: 1.05 }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
      >
        {/* Grid lines */}
        {phase >= 1 && [12, 25, 50, 75, 88].map((x, i) => (
          <GridLine key={`v${i}`} x={x} isVertical delay={i * 0.1} />
        ))}
        {phase >= 1 && [15, 30, 50, 70, 85].map((y, i) => (
          <GridLine key={`h${i}`} y={y} isVertical={false} delay={0.3 + i * 0.1} />
        ))}

        {/* Floating data snippets */}
        {phase >= 2 && [
          { top: '22%', delay: 0.2 },
          { top: '35%', delay: 0.5 },
          { top: '65%', delay: 0.3 },
          { top: '78%', delay: 0.7 },
        ].map((d, i) => <DataLine key={i} {...d} />)}

        {/* Deep orbs */}
        {phase >= 1 && (
          <>
            <Orb color="hsl(190 100% 50% / 0.15)" x={20} y={30} size="350px" delay={0} />
            <Orb color="hsl(263 70% 58% / 0.12)" x={80} y={70} size="300px" delay={0.5} />
            <Orb color="hsl(190 100% 50% / 0.08)" x={60} y={20} size="250px" delay={0.8} />
          </>
        )}

        {/* Scanner frame */}
        {phase >= 2 && (
          <motion.div
            className="relative w-44 h-44 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ScanCorner pos="tl" delay={0} />
            <ScanCorner pos="tr" delay={0.08} />
            <ScanCorner pos="bl" delay={0.16} />
            <ScanCorner pos="br" delay={0.24} />

            {/* Scan beam */}
            <motion.div
              className="absolute left-4 right-4 h-[1px] overflow-visible"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(190 100% 60% / 0.9), transparent)' }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, 144, 0], opacity: [0, 1, 1, 1, 0] }}
              transition={{ duration: 1.8, ease: 'easeInOut', delay: 0.3 }}
            >
              <div
                className="absolute inset-x-0 h-8 -top-4"
                style={{ background: 'linear-gradient(180deg, transparent, hsl(190 100% 50% / 0.06), transparent)' }}
              />
            </motion.div>

            {/* Center icon */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative">
                <motion.div
                  className="w-16 h-16 rounded-2xl border border-cyan-500/30 flex items-center justify-center"
                  style={{ background: 'hsl(240 15% 6%)' }}
                  animate={{ borderColor: ['hsl(190 100% 50% / 0.3)', 'hsl(190 100% 50% / 0.6)', 'hsl(190 100% 50% / 0.3)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.div
                    className="w-8 h-8 rounded-xl"
                    style={{ background: 'linear-gradient(135deg, hsl(190 100% 50%), hsl(263 70% 58%))' }}
                    animate={{ rotate: [0, 90, 180, 270, 360] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
                {/* Pulse rings */}
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-2xl border border-cyan-500/20"
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1 + i * 0.4, opacity: 0 }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* App name */}
        {phase >= 3 && (
          <motion.div
            className="text-center relative"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Glow text shadow */}
            <div
              className="absolute inset-0 font-heading text-4xl font-extrabold tracking-tight text-transparent select-none blur-2xl"
              style={{ color: 'hsl(190 100% 70%)' }}
              aria-hidden
            >
              Scan Everything
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight relative"
              style={{
                background: 'linear-gradient(135deg, hsl(190 100% 75%) 0%, hsl(210 30% 95%) 40%, hsl(263 70% 75%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Scan Everything
            </h1>
          </motion.div>
        )}

        {/* Tagline */}
        {phase >= 4 && (
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="font-body text-[11px] tracking-[0.35em] uppercase text-muted-foreground font-light">
              See it · Price it · Value it
            </p>
          </motion.div>
        )}

        {/* Bottom progress line */}
        {phase >= 4 && (
          <motion.div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}

        {/* Version */}
        {phase >= 5 && (
          <motion.p
            className="absolute bottom-10 font-body text-[9px] tracking-widest text-muted-foreground/30 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            v1.0 · AI-Powered
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}