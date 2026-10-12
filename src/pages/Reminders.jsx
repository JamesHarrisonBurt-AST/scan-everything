import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, BellRing, Plus, X, Check, Trash2, Folder, Tag, Calendar, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isPast } from 'date-fns';

export default function Reminders() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Create form state
  const [type, setType] = useState('revisit_collection');
  const [collectionId, setCollectionId] = useState('');
  const [category, setCategory] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const [rems, cols] = await Promise.all([
        base44.entities.Reminder.list('-remind_at', 100),
        base44.entities.Collection.list('-created_date', 50),
      ]);
      setReminders(rems);
      setCollections(cols);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = reminders.filter(r => !r.completed);
  const completed = reminders.filter(r => r.completed);
  const overdue = active.filter(r => isPast(parseISO(r.remind_at)));

  const createReminder = async () => {
    if (!remindAt) return;
    setCreating(true);
    try {
      const title = type === 'revisit_collection'
        ? `Revisit ${collections.find(c => c.id === collectionId)?.name || 'collection'}`
        : `Scan more ${category || 'items'}`;
      await base44.entities.Reminder.create({
        title,
        type,
        collection_id: type === 'revisit_collection' ? collectionId : undefined,
        category: type === 'scan_category' ? category : undefined,
        remind_at: new Date(remindAt).toISOString(),
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setCollectionId('');
      setCategory('');
      setRemindAt('');
      setNotes('');
      load();
    } catch {}
    setCreating(false);
  };

  const toggleComplete = async (r) => {
    try {
      await base44.entities.Reminder.update(r.id, { completed: !r.completed });
      load();
    } catch {}
  };

  const deleteReminder = async (r) => {
    try {
      await base44.entities.Reminder.delete(r.id);
      load();
    } catch {}
  };

  const ReminderCard = ({ r }) => {
    const isOverdue = !r.completed && isPast(parseISO(r.remind_at));
    const Icon = r.type === 'revisit_collection' ? Folder : Tag;
    return (
      <motion.div
        className="rounded-xl p-3.5 flex items-start gap-3"
        style={{
          background: r.completed ? 'hsl(220 12% 8%)' : 'hsl(220 12% 10%)',
          border: isOverdue ? '1px solid hsl(340 70% 50% / 0.3)' : '1px solid hsl(220 12% 18%)',
          opacity: r.completed ? 0.6 : 1,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
          background: r.type === 'revisit_collection' ? 'hsl(35 95% 55% / 0.12)' : 'hsl(175 65% 42% / 0.12)',
        }}>
          <Icon className={`w-4 h-4 ${r.type === 'revisit_collection' ? 'text-amber-400' : 'text-teal-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${r.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{r.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {format(parseISO(r.remind_at), 'MMM d, h:mm a')}
            </span>
            {isOverdue && <span className="text-[10px] text-rose-400 font-semibold">Overdue</span>}
          </div>
          {r.notes && <p className="text-[11px] text-muted-foreground mt-1">{r.notes}</p>}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={() => toggleComplete(r)}
            className="w-8 h-8 rounded-lg flex items-center justify-center touch-target"
            style={{ background: r.completed ? 'hsl(220 12% 14%)' : 'hsl(160 70% 42% / 0.12)' }}
          >
            <Check className={`w-3.5 h-3.5 ${r.completed ? 'text-muted-foreground' : 'text-emerald-400'}`} />
          </button>
          <button
            onClick={() => deleteReminder(r)}
            className="w-8 h-8 rounded-lg flex items-center justify-center touch-target"
            style={{ background: 'hsl(340 70% 50% / 0.1)' }}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-safe-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-card flex items-center justify-center touch-target">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div>
            <h1 className="font-heading text-xl font-extrabold text-foreground">Reminders</h1>
            <p className="text-xs text-muted-foreground">{active.length} active{overdue.length > 0 && ` · ${overdue.length} overdue`}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center touch-target"
          style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {loading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl glass-card animate-pulse" />)}
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm font-heading font-semibold text-muted-foreground">No reminders yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Set a reminder to revisit collections or scan more</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BellRing className="w-3 h-3" /> Active
              </p>
              <div className="space-y-2">
                {active.map(r => <ReminderCard key={r.id} r={r} />)}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 touch-target"
              >
                <Check className="w-3 h-3" /> Completed ({completed.length})
              </button>
              <AnimatePresence>
                {showCompleted && (
                  <motion.div className="space-y-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {completed.map(r => <ReminderCard key={r.id} r={r} />)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Create sheet */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreate(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full rounded-t-3xl p-5 pb-safe max-h-[85vh] overflow-y-auto"
              style={{ background: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 20%)', borderBottom: 'none' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-bold text-foreground">New Reminder</h3>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(220 12% 14%)' }}>
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Type selector */}
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Type</p>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setType('revisit_collection')}
                  className="flex-1 h-12 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 touch-target"
                  style={type === 'revisit_collection'
                    ? { background: 'hsl(35 95% 55% / 0.12)', border: '1px solid hsl(35 95% 55% / 0.3)', color: 'hsl(35 95% 65%)' }
                    : { background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)', color: 'hsl(220 10% 60%)' }}
                >
                  <Folder className="w-4 h-4" /> Revisit Collection
                </button>
                <button
                  onClick={() => setType('scan_category')}
                  className="flex-1 h-12 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 touch-target"
                  style={type === 'scan_category'
                    ? { background: 'hsl(175 65% 42% / 0.12)', border: '1px solid hsl(175 65% 42% / 0.3)', color: 'hsl(175 65% 52%)' }
                    : { background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)', color: 'hsl(220 10% 60%)' }}
                >
                  <Tag className="w-4 h-4" /> Scan Category
                </button>
              </div>

              {/* Collection picker */}
              {type === 'revisit_collection' && (
                <div className="mb-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Collection</p>
                  {collections.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 text-center py-3">No collections yet</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                      {collections.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setCollectionId(c.id)}
                          className="flex-shrink-0 px-3 h-10 rounded-xl text-xs font-medium touch-target flex items-center gap-1.5"
                          style={collectionId === c.id
                            ? { background: 'hsl(35 95% 55% / 0.12)', border: '1px solid hsl(35 95% 55% / 0.3)', color: 'hsl(35 95% 65%)' }
                            : { background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)', color: 'hsl(220 10% 70%)' }}
                        >
                          <Folder className="w-3.5 h-3.5" /> {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Category input */}
              {type === 'scan_category' && (
                <div className="mb-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Category</p>
                  <input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Electronics, Books..."
                    className="w-full px-3 h-11 rounded-xl text-sm text-foreground outline-none"
                    style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                  />
                </div>
              )}

              {/* Date/time */}
              <div className="mb-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">When</p>
                <input
                  type="datetime-local"
                  value={remindAt}
                  onChange={e => setRemindAt(e.target.value)}
                  className="w-full px-3 h-11 rounded-xl text-sm text-foreground outline-none"
                  style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                />
              </div>

              {/* Notes */}
              <div className="mb-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Notes (optional)</p>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-3 h-11 rounded-xl text-sm text-foreground outline-none"
                  style={{ background: 'hsl(220 12% 10%)', border: '1px solid hsl(220 12% 18%)' }}
                />
              </div>

              <button
                onClick={createReminder}
                disabled={!remindAt || creating || (type === 'revisit_collection' && !collectionId) || (type === 'scan_category' && !category.trim())}
                className="w-full h-12 rounded-2xl text-sm font-bold touch-target"
                style={{
                  background: remindAt && !creating
                    ? 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))'
                    : 'hsl(220 12% 12%)',
                  color: remindAt && !creating ? 'white' : 'hsl(220 10% 40%)',
                }}
              >
                {creating ? 'Creating...' : 'Create Reminder'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}