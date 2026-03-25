import { motion } from 'framer-motion';

const Corner = ({ position }) => {
  const pos = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0',
    bl: 'bottom-0 left-0',
    br: 'bottom-0 right-0',
  };

  const borders = {
    tl: 'border-t-2 border-l-2 rounded-tl-lg',
    tr: 'border-t-2 border-r-2 rounded-tr-lg',
    bl: 'border-b-2 border-l-2 rounded-bl-lg',
    br: 'border-b-2 border-r-2 rounded-br-lg',
  };

  return (
    <motion.div
      className={`absolute ${pos[position]} w-10 h-10 border-cyan-400 ${borders[position]}`}
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 2, repeat: Infinity, delay: position === 'tl' ? 0 : position === 'tr' ? 0.2 : position === 'bl' ? 0.4 : 0.6 }}
    />
  );
};

export default function ScannerViewfinder({ isScanning, hint }) {
  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto">
      {/* Scanning area */}
      <div className="relative w-full h-full">
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />

        {/* Scan beam */}
        {isScanning && (
          <motion.div
            className="absolute left-2 right-2 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(190 100% 50% / 0.6), transparent)',
            }}
            animate={{ y: [0, 260, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Pulse rings */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-24 h-24 rounded-full border border-cyan-500/30"
              animate={{ scale: [0.8, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-24 h-24 rounded-full border border-cyan-500/20"
              animate={{ scale: [0.8, 1.6], opacity: [0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </div>
        )}

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-3 h-3 rounded-full bg-cyan-500/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Hint text */}
      {hint && (
        <motion.p
          className="absolute -bottom-8 left-0 right-0 text-center text-xs text-cyan-400/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={hint}
        >
          {hint}
        </motion.p>
      )}
    </div>
  );
}