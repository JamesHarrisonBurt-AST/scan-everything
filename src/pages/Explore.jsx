import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Aperture, Flame, Target, ChevronRight, Trophy, Compass } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import XPBar from '@/components/gamification/XPBar';
import DiscoveryCard from '@/components/discovery/DiscoveryCard';
import EmptyState from '@/components/common/EmptyState';
import Onboarding from '@/components/Onboarding';
import { getUserField } from '@/lib/gamification';

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(null);
  const [recentDiscoveries, setRecentDiscoveries] = useState([]);
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_completed'));

  useEffect(() => {
    async function load() {
      try {
        const [me, challenges, discoveries, earned, allAch] = await Promise.all([
          base44.auth.me(),
          base44.entities.Challenge.filter({ active: true }),
          base44.entities.Discovery.list('-created_date', 6),
          base44.entities.UserAchievement.list(),
          base44.entities.Achievement.list(),
        ]);
        setUser(me);
        setChallenge(challenges[0] || null);
        setRecentDiscoveries(discoveries);
        setEarnedAchievements(earned);
        setAllAchievements(allAch);
        if (challenges[0]) {
          const progress = await base44.entities.ChallengeProgress.filter({ challenge_id: challenges[0].id });
          setChallengeProgress(progress[0] || null);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const xp = getUserField(user, 'xp') || 0;
  const streak = getUserField(user, 'streak_days') || 0;
  const totalDiscoveries = getUserField(user, 'total_discoveries') || 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-safe-12 pb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{greeting}</p>
          <h1 className="font-heading text-2xl font-extrabold text-foreground mt-0.5">
            {getUserField(user, 'level') ? `Level ${getUserField(user, 'level')}` : 'Welcome'}
          </h1>
        </motion.div>
        {!loading && xp > 0 && <div className="mt-3"><XPBar xp={xp} /></div>}
      </div>

      {/* Big AR Discover Button */}
      <div className="px-4">
        <motion.button
          onClick={() => navigate('/ar-camera')}
          className="w-full rounded-3xl overflow-hidden relative touch-target"
          style={{ minHeight: '180px' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(35 95% 55% / 0.3), transparent 60%)' }} />
          <div className="relative flex flex-col items-center justify-center py-8">
            <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <Aperture className="w-12 h-12 text-white mb-2" />
            </motion.div>
            <p className="font-heading text-xl font-extrabold text-white">DISCOVER</p>
            <p className="text-xs text-white/80 mt-0.5">Point your camera at anything</p>
          </div>
        </motion.button>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <motion.div className="px-4 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="glass-card rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(35 95% 55% / 0.12)' }}>
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{streak} day streak</p>
              <p className="text-[11px] text-muted-foreground">Keep exploring to maintain it</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Today's Quest */}
      {challenge && (
        <motion.div className="px-4 mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Today's Quest</p>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(175 65% 42% / 0.12)' }}>
                <Target className="w-5 h-5 text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{challenge.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{challenge.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(((challengeProgress?.progress_count || 0) / challenge.target_count) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{challengeProgress?.progress_count || 0}/{challenge.target_count}</span>
                  <span className="text-[11px] text-amber-400 font-semibold">+{challenge.xp_reward} XP</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Discoveries */}
      <div className="mt-6">
        <div className="px-4 flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Recent Discoveries</p>
          {recentDiscoveries.length > 0 && (
            <button onClick={() => navigate('/discoveries')} className="text-[11px] text-amber-400 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {loading ? (
          <div className="px-4 flex gap-3 overflow-x-auto scrollbar-none">
            {[1,2,3].map(i => <div key={i} className="w-32 h-32 rounded-2xl glass-card animate-pulse flex-shrink-0" />)}
          </div>
        ) : recentDiscoveries.length === 0 ? (
          <div className="px-4">
            <EmptyState icon={Compass} title="Your world is waiting" subtitle="Start discovering objects around you" actionLabel="Start Exploring" onAction={() => navigate('/ar-camera')} />
          </div>
        ) : (
          <div className="px-4 flex gap-3 overflow-x-auto scrollbar-none pb-2">
            {recentDiscoveries.map((d, i) => (
              <div key={d.id} className="w-32 flex-shrink-0"><DiscoveryCard discovery={d} index={i} /></div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      {allAchievements.length > 0 && (
        <motion.div className="px-4 mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Achievements</p>
            <span className="text-[11px] text-muted-foreground">{earnedAchievements.length}/{allAchievements.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
            {allAchievements.slice(0, 7).map((ach) => {
              const earned = earnedAchievements.some(ea => ea.achievement_code === ach.code);
              return (
                <div key={ach.id} className="flex-shrink-0 w-20 text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-1" style={{ background: earned ? 'hsl(35 95% 55% / 0.12)' : 'hsl(220 12% 12%)', border: earned ? '1px solid hsl(35 95% 55% / 0.3)' : '1px solid hsl(220 12% 18%)' }}>
                    <Trophy className={`w-6 h-6 ${earned ? 'text-amber-400' : 'text-muted-foreground/30'}`} />
                  </div>
                  <p className={`text-[11px] truncate ${earned ? 'text-foreground' : 'text-muted-foreground/50'}`}>{ach.title}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      {!loading && totalDiscoveries > 0 && (
        <div className="px-4 mt-6 grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold font-heading text-amber-400">{totalDiscoveries}</p>
            <p className="text-[11px] text-muted-foreground">Discoveries</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold font-heading text-teal-400">{earnedAchievements.length}</p>
            <p className="text-[11px] text-muted-foreground">Achievements</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <p className="text-lg font-extrabold font-heading text-rose-400">{streak}</p>
            <p className="text-[11px] text-muted-foreground">Day Streak</p>
          </div>
        </div>
      )}
    </div>
  );
}