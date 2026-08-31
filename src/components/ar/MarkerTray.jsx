import { Boxes, MapPin } from 'lucide-react';
import { RARITY_STYLES } from '@/lib/gamification';

export default function MarkerTray({ discoveries, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="w-5 h-5 mx-auto border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!discoveries || discoveries.length === 0) {
    return (
      <div className="py-3 text-center">
        <Boxes className="w-5 h-5 text-white/30 mx-auto mb-1" />
        <p className="text-xs text-white/50">Scan objects first to place them in your room</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <MapPin className="w-3 h-3 text-teal-400/60" />
        <span className="text-[10px] uppercase tracking-wider text-white/40">
          {selectedId ? 'Tap screen to place' : 'Select a discovery to pin'}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {discoveries.map(d => {
          const rarity = RARITY_STYLES[d.rarity] || RARITY_STYLES.common;
          const selected = d.id === selectedId;
          return (
            <button
              key={d.id}
              onClick={() => onSelect(selected ? null : d.id)}
              className="flex-shrink-0 rounded-2xl overflow-hidden touch-target"
              style={{
                border: `2px solid ${selected ? rarity.color : 'transparent'}`,
                boxShadow: selected ? `0 0 12px ${rarity.color}50` : 'none',
              }}
            >
              <div className="relative w-14 h-14">
                {d.image_url ? (
                  <img src={d.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'hsl(220 14% 10%)' }}>
                    <Boxes className="w-5 h-5" style={{ color: rarity.color }} />
                  </div>
                )}
                {selected && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${rarity.color}30` }}>
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}