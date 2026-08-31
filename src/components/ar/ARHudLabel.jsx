import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, X, ChevronRight } from 'lucide-react';

export const VALUE_STYLES = {
  'Everyday Item': { color: 'hsl(220 10% 65%)', bg: 'hsl(220 10% 20% / 0.4)', border: 'hsl(220 10% 30% / 0.5)' },
  'Notable Find': { color: 'hsl(175 65% 55%)', bg: 'hsl(175 65% 25% / 0.35)', border: 'hsl(175 65% 45% / 0.5)' },
  "Collector's Piece": { color: 'hsl(35 95% 60%)', bg: 'hsl(35 95% 25% / 0.35)', border: 'hsl(35 95% 55% / 0.5)' },
  'Rare Discovery': { color: 'hsl(340 70% 60%)', bg: 'hsl(340 70% 25% / 0.35)', border: 'hsl(340 70% 55% / 0.5)' },
};

const getValueStyle = (value) => VALUE_STYLES[value] || VALUE_STYLES['Everyday Item'];

export default function ARHudLabel({ result, onSave, onDismiss, onView, saving, saved }) {
  if (!result?.analysis) return null;
  const { analysis, image_url } = result;
  const valueStyle = getValueStyle(analysis.estimatedValue);
  const confidence = analysis.confidence || 0;

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Connecting line from center to label */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <motion.line
            x1="50%" y1="50%"
            x2="50%" y2="38%"
            stroke={valueStyle.color}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3 }}
            opacity="0.6"
          />
        </svg>

        {/* Floating label */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: '18%' }}
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        >
          <div
            className="rounded-2xl p-3.5 max-w-[280px] w-[280px]"
            style={{
              background: 'hsl(220 18% 5% / 0.82)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${valueStyle.border}`,
              boxShadow: `0 4px 30px ${valueStyle.bg}, 0 0 0 1px ${valueStyle.border}`,
            }}
          >
            {/* Top row: image thumb + name */}
            <div className="flex items-start gap-3">
              {image_url && (
                <img src={image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: valueStyle.color }}>
                  {analysis.category}
                </p>
                <p className="text-sm font-heading font-bold text-white truncate leading-tight">
                  {analysis.name}
                </p>
                {analysis.subcategory && (
                  <p className="text-[11px] text-white/50 truncate mt-0.5">{analysis.subcategory}</p>
                )}
              </div>
              <button
                onClick={onDismiss}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'hsl(220 12% 16% / 0.6)' }}
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            {/* Confidence bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(220 12% 16%)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: valueStyle.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: valueStyle.color }}>
                {confidence}%
              </span>
            </div>

            {/* Estimated value badge */}
            <div className="mt-2.5 flex items-center gap-2">
              <div
                className="flex-1 px-2.5 py-1.5 rounded-lg flex items-center justify-between"
                style={{ background: valueStyle.bg, border: `1px solid ${valueStyle.border}` }}
              >
                <span className="text-[10px] uppercase tracking-wider text-white/50">Est. Value</span>
                <span className="text-xs font-bold" style={{ color: valueStyle.color }}>
                  {analysis.estimatedValue || 'Everyday Item'}
                </span>
              </div>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <p className="text-[11px] text-white/60 mt-2 leading-relaxed line-clamp-2">
                {analysis.summary}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {saved ? (
                <button
                  onClick={onView}
                  className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1 touch-target"
                  style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}
                >
                  View <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 touch-target disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))', color: 'white' }}
                >
                  {saving ? (
                    <>
                      <motion.div className="w-3 h-3 border-1.5 border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" /> Save Discovery
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}