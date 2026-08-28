import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Trophy, Flame, Lock, Check, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/common/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [ch, ach, userAch, allProgress] = await Promise.all([
        base44.entities.Challenge.filter({ active: true }),
        base44.entities.Achievement.list(),
        base44.entities.UserAchievement.list(),
        base44.entities.ChallengeProgress.list(),
      ]);
      setChallenges(ch);
      setAchievements(ach);
      setEarned(userAch);
      setProgress(allProgress);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const earnedCodes = earned.map(e => e.achievement_code);

  return (
    <PullToRefresh onRefresh={load}>
      <div className="min-h-screen">
        <div className="px-4 pt-safe-12 pb-3">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Quests & Achievements</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Complete challenges and unlock badges</p>
        </div>

        {/* Daily Quests */}
        <div className="px-4 mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Daily Quests</p>
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-xl glass-card animate-pulse" />)}</div>
          ) : challenges.length === 0 ? (
            <EmptyState icon={Target} title="No active quests" subtitle="Check back tomorrow for new challenges" />
          ) : (
            <div className="space-y-2">
              {challenges.map((ch, i) => {
                const prog = progress.find(p => p.challenge_id === ch.id);
                const pct = Math.min(((prog?.progress_count || 0) / ch.target_count) * 100, 100);
                const isComplete = prog?.completed;
                return (
                  <motion.div key={ch.id} className="glass-card rounded-xl p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{ch.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ch.description}</p>
                      </div>
                      {isComplete ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(160 70% 42% / 0.15)' }}>
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-400 font-semibold flex-shrink-0">+{ch.xp_reward} XP</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: isComplete ? 'hsl(160 70% 42%)' : 'hsl(175 65% 42%)' }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{prog?.progress_count || 0}/{ch.target_count}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="px-4 mt-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Achievements</p>
            <span className="text-[11px] text-muted-foreground">{earned.length}/{achievements.length}</span>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square rounded-2xl glass-card animate-pulse" />)}</div>
          ) : achievements.length === 0 ? (
            <EmptyState icon={Trophy} title="No achievements yet" subtitle="Start discovering to unlock badges" />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {achievements.map((ach, i) => {
                const isEarned = earnedCodes.includes(ach.code);
                return (
                  <motion.div key={ach.id} className="rounded-2xl p-3 text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} style={{ background: isEarned ? 'hsl(35 95% 55% / 0.08)' : 'hsl(220 12% 8%)', border: isEarned ? '1px solid hsl(35 95% 55% / 0.25)' : '1px solid hsl(220 12% 16%)' }}>
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-2" style={{ background: isEarned ? 'hsl(35 95% 55% / 0.15)' : 'hsl(220 12% 12%)' }}>
                      {isEarned ? <Trophy className="w-6 h-6 text-amber-400" /> : <Lock className="w-5 h-5 text-muted-foreground/30" />}
                    </div>
                    <p className={`text-[11px] font-semibold truncate ${isEarned ? 'text-foreground' : 'text-muted-foreground/50'}`}>{ach.title}</p>
                    <p className={`text-[10px] mt-0.5 line-clamp-2 ${isEarned ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>{ach.description}</p>
                    {isEarned && <span className="text-[10px] text-amber-400 font-semibold mt-1 block">+{ach.xp_reward} XP</span>}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}