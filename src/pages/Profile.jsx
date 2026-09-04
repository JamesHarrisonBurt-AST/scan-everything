import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Compass, Trophy, LogOut, ChevronRight, Bell, MapPin, Shield, FileText, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import XPBar from '@/components/gamification/XPBar';
import EmptyState from '@/components/common/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';
import { getUserField } from '@/lib/gamification';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [me, allAch, userAch] = await Promise.all([
        base44.auth.me(),
        base44.entities.Achievement.list(),
        base44.entities.UserAchievement.list(),
      ]);
      setUser(me);
      setAchievements(allAch);
      setEarned(userAch);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const xp = getUserField(user, 'xp') || 0;
  const streak = getUserField(user, 'streak_days') || 0;
  const totalDiscoveries = getUserField(user, 'total_discoveries') || 0;
  const uniqueCategories = (() => { try { return JSON.parse(getUserField(user, 'unique_categories') || '[]'); } catch { return []; } })();
  const earnedCodes = earned.map(e => e.achievement_code);

  const handleLogout = () => base44.auth.logout();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.auth.updateMe({
        xp: 0,
        streak_days: 0,
        total_discoveries: 0,
        unique_categories: '[]',
        level: 1,
        last_scan_date: null,
      });
      await base44.auth.logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <PullToRefresh onRefresh={load}>
      <div className="min-h-screen">
        <div className="px-4 pt-safe-12 pb-4">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Profile</h1>
        </div>

        {/* User card */}
        {!loading && user && (
          <motion.div className="px-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}>
                  <span className="text-xl font-heading font-bold text-white">{(user.full_name || user.email || '?')[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{user.full_name || 'Explorer'}</p>
                  <p className="text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <XPBar xp={xp} />
            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        {!loading && (
          <div className="px-4 mt-4 grid grid-cols-2 gap-3">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Compass className="w-4 h-4 text-amber-400" /><span className="text-[11px] text-muted-foreground">Discoveries</span></div>
              <p className="text-2xl font-extrabold font-heading text-foreground">{totalDiscoveries}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-rose-400" /><span className="text-[11px] text-muted-foreground">Day Streak</span></div>
              <p className="text-2xl font-extrabold font-heading text-foreground">{streak}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-amber-400" /><span className="text-[11px] text-muted-foreground">Achievements</span></div>
              <p className="text-2xl font-extrabold font-heading text-foreground">{earned.length}<span className="text-sm text-muted-foreground">/{achievements.length}</span></p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1"><Compass className="w-4 h-4 text-teal-400" /><span className="text-[11px] text-muted-foreground">Categories</span></div>
              <p className="text-2xl font-extrabold font-heading text-foreground">{uniqueCategories.length}</p>
            </div>
          </div>
        )}

        {/* Achievement showcase */}
        {!loading && achievements.length > 0 && (
          <div className="px-4 mt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Achievements</p>
            {earned.length === 0 ? (
              <EmptyState icon={Trophy} title="No badges yet" subtitle="Discover objects to unlock achievements" />
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {achievements.filter(a => earnedCodes.includes(a.code)).map(ach => (
                  <div key={ach.id} className="rounded-xl p-2 text-center" style={{ background: 'hsl(35 95% 55% / 0.08)', border: '1px solid hsl(35 95% 55% / 0.2)' }}>
                    <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-1" style={{ background: 'hsl(35 95% 55% / 0.15)' }}>
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-[10px] font-semibold text-foreground truncate">{ach.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="px-4 mt-6 mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Settings</p>
          <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={() => navigate('/privacy-policy')} className="w-full flex items-center gap-3 p-4 border-b border-border/30">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1 text-left">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
            <button onClick={() => navigate('/terms-of-use')} className="w-full flex items-center gap-3 p-4 border-b border-border/30">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1 text-left">Terms of Use</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 border-b border-border/30">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-rose-400 flex-1 text-left">Sign Out</span>
            </button>
            <button onClick={() => setShowDeleteDialog(true)} className="w-full flex items-center gap-3 p-4">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span className="text-sm text-rose-400 flex-1 text-left">Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently erase your profile data, including XP, streaks, achievements, and discovery stats. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PullToRefresh>
  );
}