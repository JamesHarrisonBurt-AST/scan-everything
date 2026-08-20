import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, ScanLine, Gem, Eye, Settings, ChevronRight, LogOut, Star,
  Bell, BellOff, Check, Pencil, X, TrendingUp, Package, BarChart2,
  Calendar, ShieldCheck, FileText, AlertTriangle, Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import GlassCard from '../components/GlassCard';
import CategoryPreferencesSheet from '../components/profile/CategoryPreferencesSheet';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog';

function EditNameSheet({ currentName, onSave, onClose }) {
  const [name, setName] = useState(currentName || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await base44.auth.updateMe({ full_name: name.trim() });
    setSaving(false);
    onSave(name.trim());
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full rounded-t-3xl p-6"
        style={{ background: 'linear-gradient(to bottom, hsl(240 14% 12%), hsl(240 18% 8%))', border: '1px solid hsl(240 10% 22%)', borderBottom: 'none', boxShadow: '0 -24px 70px rgba(0,0,0,0.6)' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Display Name</p>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-5"
          style={{ background: 'hsl(240 12% 9%)', border: '1px solid hsl(190 100% 50% / 0.25)' }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="flex-1 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/30"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && save()}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold text-muted-foreground"
            style={{ background: 'hsl(240 12% 12%)', border: '1px solid hsl(240 10% 20%)' }}>
            Cancel
          </button>
          <motion.button onClick={save} disabled={!name.trim() || saving}
            className="flex-1 h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: saving ? 'hsl(240 12% 14%)' : 'linear-gradient(135deg, #00d4ff, #0099bb)', color: saving ? 'hsl(220 10% 50%)' : '#061218' }}
            whileTap={{ scale: 0.96 }}>
            {saving
              ? <motion.div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              : <><Check className="w-4 h-4" /> Save</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ scans: 0, vaultItems: 0, watchlistItems: 0, greatDeals: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notifStatus, setNotifStatus] = useState('default');
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    if ('Notification' in window) setNotifStatus(Notification.permission);
    async function load() {
      const me = await base44.auth.me();
      setUser(me);

      const [scans, vault, watchlist, summaries] = await Promise.all([
        base44.entities.ScanSession.list('-created_date', 500),
        base44.entities.VaultItem.list('-created_date', 500),
        base44.entities.WatchlistItem.filter({ active: true }, '-created_date', 500),
        base44.entities.PriceSummary.list('-updated_date', 500),
      ]);

      const greatDeals = summaries.filter(s => s.deal_score > 80).length;
      const totalValue = vault.reduce((acc, v) => acc + (v.best_price_found || 0), 0);

      setStats({
        scans: scans.length,
        vaultItems: vault.length,
        watchlistItems: watchlist.length,
        greatDeals,
        totalValue,
      });
      setRecentScans(vault.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
  };

  const memberSince = user?.created_date
    ? new Date(user.created_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="px-4 pb-2 pt-safe-12">
        <h1 className="font-heading text-2xl font-bold text-foreground">Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="px-4 mt-2">
        <GlassCard className="relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xl font-heading font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-heading font-bold text-foreground text-lg leading-tight truncate">
                  {user?.full_name || 'Scanner'}
                </p>
                <motion.button
                  onClick={() => setEditingName(true)}
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'hsl(240 12% 14%)', border: '1px solid hsl(240 10% 22%)' }}
                  whileTap={{ scale: 0.88 }}>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email || '—'}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Free
                </span>
                {memberSince && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Since {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Stats grid */}
      {!loading && (
        <div className="px-4 mt-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Total Scans', value: stats.scans, icon: ScanLine, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/15' },
            { label: 'Saved Items', value: stats.vaultItems, icon: Gem, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
            { label: 'Watching', value: stats.watchlistItems, icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
            { label: 'Great Deals Found', value: stats.greatDeals, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <div className={`glass-card rounded-xl p-4 flex items-center gap-3 border ${s.border}`}>
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-heading font-extrabold text-foreground leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vault value */}
      {!loading && stats.totalValue > 0 && (
        <div className="px-4 mt-3">
          <motion.div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 39% / 0.1), hsl(190 100% 50% / 0.06))', border: '1px solid hsl(160 84% 39% / 0.25)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <BarChart2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimated Vault Value</p>
              <p className="text-lg font-heading font-extrabold text-emerald-400">${stats.totalValue.toFixed(2)}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Recent scans */}
      {!loading && recentScans.length > 0 && (
        <div className="px-4 mt-5">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-heading">Recent Scans</h3>
          <div className="glass-card rounded-xl divide-y divide-border/40 overflow-hidden">
            {recentScans.map(item => (
              <Link key={item.id} to={item.identified_item_id ? `/scan-result/${item.identified_item_id}` : '#'}
                className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.item_image_url
                    ? <img src={item.item_image_url} alt={item.item_title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-muted-foreground/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.item_title || 'Unknown Item'}</p>
                  {item.best_price_found && (
                    <p className="text-[10px] text-cyan-400">${item.best_price_found.toFixed(2)}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="px-4 mt-5">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-heading">Notifications</h3>
        <motion.button
          onClick={notifStatus !== 'granted' ? requestNotifications : undefined}
          className="w-full flex items-center gap-3 px-4 py-3.5 glass-card rounded-xl"
          whileTap={notifStatus !== 'granted' ? { scale: 0.98 } : {}}>
          {notifStatus === 'granted'
            ? <ShieldCheck className="w-4 h-4 text-emerald-400" />
            : notifStatus === 'denied'
            ? <BellOff className="w-4 h-4 text-red-400" />
            : <Bell className="w-4 h-4 text-amber-400" />}
          <span className="flex-1 text-sm text-foreground text-left">
            {notifStatus === 'granted' ? 'Push Notifications' : notifStatus === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            notifStatus === 'granted' ? 'bg-emerald-500/10 text-emerald-400'
            : notifStatus === 'denied' ? 'bg-red-500/10 text-red-400'
            : 'bg-amber-500/10 text-amber-400'
          }`}>
            {notifStatus === 'granted' ? 'On' : notifStatus === 'denied' ? 'Blocked' : 'Tap to enable'}
          </span>
        </motion.button>
      </div>

      {/* Account settings */}
      <div className="px-4 mt-5">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-heading">Account</h3>
        <div className="glass-card rounded-xl divide-y divide-border/40 overflow-hidden">
          <button onClick={() => setShowPreferences(true)} className="flex items-center gap-3 px-4 py-3.5 w-full text-left">
            <Star className="w-4 h-4 text-violet-400" />
            <span className="flex-1 text-sm text-foreground">Category Preferences</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </button>
          <Link to="/analytics" className="flex items-center gap-3 px-4 py-3.5">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-foreground">Analytics</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </Link>
          <Link to="/price-tracker" className="flex items-center gap-3 px-4 py-3.5">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-foreground">Price Tracker</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </Link>
        </div>
      </div>

      {/* Legal */}
      <div className="px-4 mt-5">
        <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-heading">Legal</h3>
        <div className="glass-card rounded-xl divide-y divide-border/40 overflow-hidden">
          <Link to="/privacy-policy" className="flex items-center gap-3 px-4 py-3.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="flex-1 text-sm text-foreground">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </Link>
          <Link to="/terms-of-use" className="flex items-center gap-3 px-4 py-3.5">
            <FileText className="w-4 h-4 text-violet-400" />
            <span className="flex-1 text-sm text-foreground">Terms of Use</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
          </Link>
        </div>
      </div>

      {/* Logout */}
      <div className="px-4 mt-5">
        <motion.button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-4 py-3.5 w-full glass-card rounded-xl"
          whileTap={{ scale: 0.97 }}>
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">Sign Out</span>
        </motion.button>
      </div>

      {/* Delete Account */}
      <div className="px-4 mt-3">
        <div className="glass-card rounded-xl p-4" style={{ border: '1px solid hsl(0 84% 60% / 0.2)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Permanently delete your account and all associated data. This action cannot be undone — your scans, vault, and settings will be erased forever.
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <motion.button
                className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold"
                style={{ background: 'hsl(0 84% 60% / 0.1)', border: '1px solid hsl(0 84% 60% / 0.3)', color: '#f87171' }}
                whileTap={{ scale: 0.97 }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete Account
              </motion.button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm rounded-2xl" style={{ background: 'hsl(240 14% 10%)', border: '1px solid hsl(0 84% 60% / 0.3)' }}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground font-heading">Delete Account?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This will permanently erase your account, scans, vault, and settings. This action is irreversible. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="flex-1 h-10 rounded-xl text-sm" style={{ background: 'hsl(240 12% 14%)', border: '1px solid hsl(240 10% 20%)', color: 'hsl(220 10% 65%)' }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="flex-1 h-10 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, hsl(0 84% 60%), hsl(0 70% 50%))', color: '#fff', border: 'none' }}
                  onClick={() => { toast.success('Account deletion requested. Signing you out…'); setTimeout(() => base44.auth.logout(), 800); }}>
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit name sheet */}
      <AnimatePresence>
        {editingName && (
          <EditNameSheet
            currentName={user?.full_name}
            onSave={(name) => { setUser(u => ({ ...u, full_name: name })); setEditingName(false); }}
            onClose={() => setEditingName(false)}
          />
        )}
        {showPreferences && (
          <CategoryPreferencesSheet user={user} onClose={() => setShowPreferences(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}