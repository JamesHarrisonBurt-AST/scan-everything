import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Aperture, Sparkles, Package, Target, ChevronRight } from 'lucide-react';

const SCREENS = [
  { icon: Aperture, title: 'Discover what\'s around you', subtitle: 'Point your camera at any object in the world and let AI identify it in seconds.', color: 'hsl(35 95% 55%)' },
  { icon: Sparkles, title: 'Understand what you\'re seeing', subtitle: 'Get instant details, interesting facts, and care tips about everything you discover.', color: 'hsl(175 65% 42%)' },
  { icon: Package, title: 'Build your collection', subtitle: 'Save discoveries, organize them into collections, and ask AI questions about each one.', color: 'hsl(340 70% 55%)' },
  { icon: Target, title: 'Complete challenges', subtitle: 'Earn XP, unlock achievements, and maintain your exploration streak.', color: 'hsl(160 70% 42%)' },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = SCREENS[step];
  const Icon = current.icon;
  const isLast = step === SCREENS.length - 1;

  const next = () => {
    if (isLast) { localStorage.setItem('onboarding_completed', 'true'); onComplete(); }
    else setStep(step + 1);
  };

  const skip = () => { localStorage.setItem('onboarding_completed', 'true'); onComplete(); };

  return (
    <div className="fixed inset-0 z-[200]" style={{ background: 'hsl(220 18% 5%)' }}>
      <button onClick={skip} className="absolute top-4 right-4 pt-safe z-10 text-xs text-muted-foreground px-3 py-2">Skip</button>
      <div className="flex flex-col items-center justify-center h-full px-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="flex flex-col items-center text-center">
            <motion.div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8" style={{ background: `${current.color}15`, border: `1px solid ${current.color}30` }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <Icon className="w-12 h-12" style={{ color: current.color }} />
            </motion.div>
            <h2 className="font-heading text-2xl font-extrabold text-foreground mb-3 max-w-xs">{current.title}</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{current.subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute bottom-0 left-0 right-0 pb-safe px-8 py-6">
        <div className="flex justify-center gap-2 mb-6">
          {SCREENS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? '24px' : '6px', background: i === step ? current.color : 'hsl(220 12% 20%)' }} />
          ))}
        </div>
        <motion.button onClick={next} className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-1 touch-target" style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`, color: 'white' }} whileTap={{ scale: 0.95 }}>
          {isLast ? 'Start Exploring' : 'Continue'} <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}