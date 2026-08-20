import { motion } from 'framer-motion';
import { Camera, ScanBarcode, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const modes = [
  { id: 'camera', icon: Camera, label: 'Camera' },
  { id: 'barcode', icon: ScanBarcode, label: 'Barcode' },
  { id: 'upload', icon: Upload, label: 'Upload' },
  { id: 'text', icon: FileText, label: 'Text' },
];

export default function ScanModeSelector({ activeMode, onModeChange }) {
  return (
    <div className="flex gap-2 px-4">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;
        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all',
              isActive
                ? 'bg-cyan-500/15 border border-cyan-500/30'
                : 'bg-muted/50 border border-transparent'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className={cn('w-5 h-5', isActive ? 'text-cyan-400' : 'text-muted-foreground')} />
            <span className={cn('text-[11px]', isActive ? 'text-cyan-400 font-medium' : 'text-muted-foreground')}>
              {mode.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}