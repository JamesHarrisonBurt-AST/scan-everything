import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Tag, FolderInput, Check, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickActionsSheet({ items, existingFolders, onClose, onDone }) {
  const [tab, setTab] = useState('tag');
  const [tagInput, setTagInput] = useState('');
  const [folderInput, setFolderInput] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [busy, setBusy] = useState(false);

  const isBulk = items.length > 1;
  const titles = items.map(i => i.item_title || 'Unknown').slice(0, 3).join(', ');

  const addTag = async () => {
    if (!tagInput.trim()) return;
    setBusy(true);
    try {
      await Promise.all(items.map(async (item) => {
        const existing = item.tags_json ? JSON.parse(item.tags_json) : [];
        const updated = [...new Set([...existing, tagInput.trim()])];
        await base44.entities.VaultItem.update(item.id, { tags_json: JSON.stringify(updated) });
      }));
      toast.success(`Tagged ${items.length} item${items.length > 1 ? 's' : ''} with "${tagInput.trim()}"`);
      onDone();
    } catch { toast.error('Failed to tag items'); }
    setBusy(false);
  };

  const moveToFolder = async () => {
    const folder = selectedFolder || folderInput.trim();
    if (!folder) return;
    setBusy(true);
    try {
      await Promise.all(items.map(item =>
        base44.entities.VaultItem.update(item.id, { folder })
      ));
      toast.success(`Moved ${items.length} item${items.length > 1 ? 's' : ''} to "${folder}"`);
      onDone();
    } catch { toast.error('Failed to move items'); }
    setBusy(false);
  };

  const deleteItems = async () => {
    setBusy(true);
    try {
      await Promise.all(items.map(item => base44.entities.VaultItem.delete(item.id)));
      toast.success(`Deleted ${items.length} item${items.length > 1 ? 's' : ''}`);
      onDone();
    } catch { toast.error('Failed to delete items'); }
    setBusy(false);
  };

  const tabs = [
    { id: 'tag', label: 'Tag', icon: Tag, color: 'text-cyan-400' },
    { id: 'folder', label: 'Folder', icon: FolderInput, color: 'text-violet-400' },
    { id: 'delete', label: 'Delete', icon: Trash2, color: 'text-red-400' },
  ];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full rounded-t-3xl overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))', border: '1px solid hsl(240 10% 22%)', borderBottom: 'none' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}>
        <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 rounded-full bg-muted" /></div>
        <div className="px-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">{isBulk ? `Quick Actions · ${items.length} items` : 'Quick Actions'}</h3>
            {!isBulk && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{titles}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(240 12% 14%)' }}>
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 px-5 pb-4">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: active ? 'hsl(240 12% 16%)' : 'hsl(240 12% 10%)',
                  border: active ? '1px solid hsl(240 10% 28%)' : '1px solid hsl(240 10% 16%)',
                  color: active ? t.color : 'hsl(220 10% 55%)',
                }}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-8">
          <AnimatePresence mode="wait">
            {tab === 'tag' && (
              <motion.div key="tag" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <p className="text-xs text-muted-foreground mb-2">Add a tag to {items.length} item{items.length > 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="e.g. vintage, electronics..."
                    className="flex-1 h-11 rounded-xl px-3 text-sm bg-muted border border-border/50 text-foreground outline-none" />
                  <motion.button onClick={addTag} disabled={!tagInput.trim() || busy}
                    className="px-4 h-11 rounded-xl text-sm font-bold flex items-center gap-1.5"
                    style={{ background: tagInput.trim() ? 'linear-gradient(135deg, #00d4ff, #0099bb)' : 'hsl(240 12% 14%)', color: tagInput.trim() ? '#061218' : 'hsl(220 10% 50%)' }}
                    whileTap={{ scale: 0.96 }}>
                    <Plus className="w-4 h-4" /> Tag
                  </motion.button>
                </div>
              </motion.div>
            )}

            {tab === 'folder' && (
              <motion.div key="folder" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <p className="text-xs text-muted-foreground mb-2">Move {items.length} item{items.length > 1 ? 's' : ''} to a folder</p>
                {existingFolders.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {existingFolders.map(f => (
                      <button key={f} onClick={() => setSelectedFolder(f)}
                        className="px-3 h-8 rounded-full text-xs font-medium flex items-center gap-1"
                        style={{
                          background: selectedFolder === f ? 'hsl(263 70% 58% / 0.2)' : 'hsl(240 12% 12%)',
                          border: selectedFolder === f ? '1px solid hsl(263 70% 58% / 0.4)' : '1px solid hsl(240 10% 18%)',
                          color: selectedFolder === f ? '#a78bfa' : 'hsl(220 10% 55%)',
                        }}>
                        {selectedFolder === f && <Check className="w-3 h-3" />} {f}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={folderInput} onChange={e => { setFolderInput(e.target.value); setSelectedFolder(''); }} placeholder="New folder name..."
                    className="flex-1 h-11 rounded-xl px-3 text-sm bg-muted border border-border/50 text-foreground outline-none" />
                  <motion.button onClick={moveToFolder} disabled={(!selectedFolder && !folderInput.trim()) || busy}
                    className="px-4 h-11 rounded-xl text-sm font-bold flex items-center gap-1.5"
                    style={{ background: (selectedFolder || folderInput.trim()) ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'hsl(240 12% 14%)', color: (selectedFolder || folderInput.trim()) ? '#fff' : 'hsl(220 10% 50%)' }}
                    whileTap={{ scale: 0.96 }}>
                    <FolderInput className="w-4 h-4" /> Move
                  </motion.button>
                </div>
              </motion.div>
            )}

            {tab === 'delete' && (
              <motion.div key="delete" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="rounded-xl p-4" style={{ background: 'hsl(0 84% 60% / 0.08)', border: '1px solid hsl(0 84% 60% / 0.2)' }}>
                  <p className="text-sm font-semibold text-red-400 mb-1">Delete {items.length} item{items.length > 1 ? 's' : ''}?</p>
                  <p className="text-xs text-muted-foreground">This permanently removes {isBulk ? 'these items' : 'this item'} from your vault. This cannot be undone.</p>
                </div>
                <motion.button onClick={deleteItems} disabled={busy}
                  className="w-full mt-3 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, hsl(0 84% 60%), hsl(0 70% 50%))', color: '#fff' }}
                  whileTap={{ scale: 0.97 }}>
                  <Trash2 className="w-4 h-4" /> Delete {items.length} Item{items.length > 1 ? 's' : ''}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}