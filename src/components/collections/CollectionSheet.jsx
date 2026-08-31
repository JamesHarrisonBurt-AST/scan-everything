import { motion } from 'framer-motion';
import { X, MapPin, Folder } from 'lucide-react';

export default function CollectionSheet({ collection, onClose, onViewAR }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        className="relative w-full rounded-t-3xl p-5 pb-safe"
        style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(35 95% 55% / 0.12)' }}>
              <Folder className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-heading font-bold text-foreground text-lg">{collection.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">View your saved discoveries mapped out in your physical room with AR markers.</p>
        <button
          onClick={onViewAR}
          className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 touch-target"
          style={{ background: 'linear-gradient(135deg, hsl(175 65% 42%), hsl(160 70% 35%))', color: 'white' }}
        >
          <MapPin className="w-4 h-4" /> View in AR Room
        </button>
      </motion.div>
    </div>
  );
}