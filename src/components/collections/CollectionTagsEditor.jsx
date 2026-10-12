import { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CollectionTagsEditor({ collection, onUpdated }) {
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(collection.tags || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (next) => {
    setSaving(true);
    try {
      await base44.entities.Collection.update(collection.id, { tags: JSON.stringify(next) });
      onUpdated?.(next);
    } catch {
      setTags(tags);
    }
    setSaving(false);
  };

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setInput('');
    persist(next);
  };

  const removeTag = (tag) => {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    persist(next);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Tag className="w-3 h-3 text-amber-400" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Tags</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.length === 0 ? (
          <span className="text-[11px] text-muted-foreground/50">No tags yet</span>
        ) : (
          tags.map(t => (
            <span key={t} className="text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'hsl(35 95% 55% / 0.1)', border: '1px solid hsl(35 95% 55% / 0.2)', color: 'hsl(35 95% 65%)' }}>
              {t}
              <button onClick={() => removeTag(t)} className="touch-target -mr-0.5"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTag()}
          placeholder="Add tag..."
          className="flex-1 px-3 h-9 rounded-xl text-xs text-foreground outline-none"
          style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
        />
        <button
          onClick={addTag}
          disabled={!input.trim() || saving}
          className="w-9 h-9 rounded-xl flex items-center justify-center touch-target"
          style={{
            background: input.trim() ? 'hsl(35 95% 55% / 0.15)' : 'hsl(220 12% 10%)',
            border: '1px solid hsl(220 12% 18%)',
          }}
        >
          <Plus className={`w-4 h-4 ${input.trim() ? 'text-amber-400' : 'text-muted-foreground/40'}`} />
        </button>
      </div>
    </div>
  );
}