import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Hand, MapPin, Save, Eye } from 'lucide-react';

const STEPS = [
  { icon: Hand, title: 'Select a Discovery', description: 'Pick any scanned object from the tray at the bottom of the screen.', color: '#2dd4bf' },
  { icon: MapPin, title: 'Tap to Place', description: 'Tap anywhere in your room to pin a 3D marker at that spot.', color: '#f59e0b' },
  { icon: Eye, title: 'Tap a Marker', description: 'Tap any placed marker to see its details or remove it.', color: '#c084fc' },
  { icon: Save, title: 'Save Your Layout', description: 'Save markers to a collection to revisit them in your room anytime.', color: '#34d399' },
];

export default function MarkerTutorial({ onDismiss }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'hsl(220 18% 5% / 0.85)', backdropFilter: 'blur(8px)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="relative w-full max-w-sm rounded-3xl p-6" style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)' }} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 25 }}>
        <button onClick={onDismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
          <X className="w-4 h-4 text-white/60" />
        </button>

        <div className="flex flex-col items-center text-center pt-2">
          <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${current.color}20`, border: `1px solid ${current.color}40` }} key={step} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Icon className="w-8 h-8" style={{ color: current.color }} />
          </motion.div>
          <h3 className="font-heading font-bold text-foreground text-lg mb-1">{current.title}</h3>
          <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">{current.description}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 my-5">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 20 : 6, background: i === step ? current.color : 'hsl(220 12% 18%)' }} />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 h-11 rounded-xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 12%)', color: 'hsl(220 10% 60%)' }}>Back</button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 h-11 rounded-xl text-sm font-bold touch-target" style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`, color: 'white' }}>Next</button>
          ) : (
            <button onClick={onDismiss} className="flex-1 h-11 rounded-xl text-sm font-bold touch-target" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}>Got it!</button>
          )}
        </div>

        <button onClick={onDismiss} className="w-full text-center text-xs text-muted-foreground mt-3 py-1">Skip tutorial</button>
      </motion.div>
    </motion.div>
  );
}