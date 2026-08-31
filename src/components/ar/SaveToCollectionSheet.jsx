import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Folder, Plus } from 'lucide-react';

export default function SaveToCollectionSheet({ collections, markerCount, saving, onSave, onSaveNew, onClose }) {
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-foreground">Save to Collection</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{markerCount} marker{markerCount !== 1 ? 's' : ''} will be saved with their AR positions</p>

        {showNew ? (
          <div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Collection name..."
              className="w-full px-4 h-11 rounded-xl text-sm text-foreground outline-none mb-3"
              style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && newName.trim() && onSaveNew(newName.trim())}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNew(false)} className="flex-1 h-11 rounded-xl text-sm font-bold touch-target" style={{ background: 'hsl(220 12% 12%)', color: 'hsl(220 10% 60%)' }}>Cancel</button>
              <button
                onClick={() => newName.trim() && onSaveNew(newName.trim())}
                disabled={!newName.trim() || saving}
                className="flex-1 h-11 rounded-xl text-sm font-bold touch-target"
                style={{ background: newName.trim() ? 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' : 'hsl(220 12% 12%)', color: newName.trim() ? 'white' : 'hsl(220 10% 40%)' }}
              >
                {saving ? 'Saving...' : 'Create & Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-3 max-h-[280px] overflow-y-auto">
              {collections.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No collections yet — create one below</p>
              ) : (
                collections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSave(c.id)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 h-12 rounded-xl touch-target"
                    style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                  >
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{c.name}</span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowNew(true)}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-bold touch-target"
              style={{ background: 'hsl(35 95% 55% / 0.12)', border: '1px solid hsl(35 95% 55% / 0.3)', color: 'hsl(35 95% 65%)' }}
            >
              <Plus className="w-4 h-4" /> New Collection
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}