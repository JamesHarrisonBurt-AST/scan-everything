import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, Camera, ScanBarcode, Upload, FileText, Sparkles,
  Archive, Users, TrendingUp, ChevronRight, Zap,
} from 'lucide-react';

const STEPS = [
  {
    icon: ScanLine,
    title: 'Scan Anything',
    subtitle: 'Point. Shoot. Know.',
    description: 'Identify any real-world object and instantly get its value, best prices, and resale potential — powered by AI vision and live web search.',
    color: '#00d4ff',
    visual: 'scanner',
  },
  {
    icon: Camera,
    title: 'Multiple Scan Modes',
    subtitle: 'Camera · Barcode · Text · Upload',
    description: 'Use live camera, scan barcodes, type a search, or upload a photo. Switch between Product, Vehicle, Plant, Electronics, Clothing, Collectible, and Document modes for tailored analysis.',
    color: '#8b5cf6',
    visual: 'modes',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Insights',
    subtitle: 'Identification · Pricing · Value',
    description: 'Get structured results with brand, model, market prices across retailers, deal scores, value assessments, and 7-week price history charts.',
    color: '#10b981',
    visual: 'insights',
  },
  {
    icon: Archive,
    title: 'Vault & Community',
    subtitle: 'Save · Compare · Share',
    description: 'Build your collection in the Vault, compare items side by side, post deals to the Community, and sell across multiple platforms with AI-written listings.',
    color: '#f59e0b',
    visual: 'vault',
  },
];

function StepVisual({ step }) {
  const { visual, color } = step;

  if (visual === 'scanner') {
    return (
      <div className="relative w-40 h-40 mx-auto">
        {[['top-0 left-0', 'border-t-2 border-l-2 rounded-tl-2xl'], ['top-0 right-0', 'border-t-2 border-r-2 rounded-tr-2xl'], ['bottom-0 left-0', 'border-b-2 border-l-2 rounded-bl-2xl'], ['bottom-0 right-0', 'border-b-2 border-r-2 rounded-br-2xl']].map(([pos, border], i) => (
          <motion.div key={i} className={`absolute ${pos} w-10 h-10 ${border}`} style={{ borderColor: color }}
            initial={{ opacity: 0, scale: 1.5 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
        ))}
        <motion.div className="absolute left-3 right-3 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
          animate={{ y: [0, 136, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
            <ScanLine className="w-7 h-7" style={{ color }} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (visual === 'modes') {
    const modeIcons = [Camera, ScanBarcode, FileText, Upload];
    return (
      <div className="grid grid-cols-2 gap-3 w-44 mx-auto">
        {modeIcons.map((Icon, i) => (
          <motion.div key={i} className="aspect-square rounded-2xl flex items-center justify-center"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}>
            <Icon className="w-7 h-7" style={{ color }} />
          </motion.div>
        ))}
      </div>
    );
  }

  if (visual === 'insights') {
    return (
      <div className="w-48 mx-auto space-y-2">
        {[
          { label: 'Identified', icon: Sparkles },
          { label: 'Price Range', icon: TrendingUp },
          { label: 'Value Score', icon: Zap },
        ].map((item, i) => (
          <motion.div key={item.label} className="flex items-center gap-2 p-2.5 rounded-xl"
            style={{ background: `${color}10`, border: `1px solid ${color}20` }}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}>
            <item.icon className="w-4 h-4" style={{ color }} />
            <div className="flex-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
                <motion.div className="h-full rounded-full" style={{ background: color }}
                  initial={{ width: 0 }} animate={{ width: `${70 + i * 10}%` }} transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }} />
              </div>
            </div>
            <span className="text-[11px] font-medium" style={{ color }}>{item.label}</span>
          </motion.div>
        ))}
      </div>
    );
  }

  if (visual === 'vault') {
    const vaultIcons = [Archive, Users, TrendingUp];
    return (
      <div className="grid grid-cols-3 gap-2 w-52 mx-auto">
        {vaultIcons.map((Icon, i) => (
          <motion.div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl"
            style={{ background: `${color}10`, border: `1px solid ${color}20` }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}>
            <Icon className="w-6 h-6" style={{ color }} />
            <div className="w-full h-1 rounded-full" style={{ background: `${color}30` }} />
          </motion.div>
        ))}
      </div>
    );
  }

  return null;
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const skip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: 'hsl(240 15% 4%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400, height: 400, top: '-15%', left: '50%', transform: 'translateX(-50%)',
          background: `radial-gradient(circle, ${current.color}15 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Skip button */}
      <button
        onClick={skip}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)', background: 'hsl(240 12% 10%)' }}
      >
        Skip
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center"
          >
            {/* Visual */}
            <div className="mb-8">
              <StepVisual step={current} />
            </div>

            {/* Icon + title */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${current.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: current.color }} />
              </div>
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: current.color }}>
                {current.subtitle}
              </p>
            </div>

            <h2 className="font-heading text-2xl font-extrabold text-foreground mb-3">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{current.description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-8 pb-8 relative z-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              animate={{ width: i === step ? 24 : 6, background: i === step ? current.color : 'hsl(240 10% 20%)' }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Action button */}
        <motion.button
          onClick={() => isLast ? finish() : setStep(step + 1)}
          className="w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`, color: 'white' }}
          whileTap={{ scale: 0.97 }}
        >
          {isLast ? (
            <><Zap className="w-4 h-4" /> Start Scanning</>
          ) : (
            <>Next <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}