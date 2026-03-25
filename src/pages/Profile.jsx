import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ScanLine, DollarSign, Eye, Gem, Settings, ChevronRight, LogOut, Crown, Volume2, MapPin, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import GlassCard from '../components/GlassCard';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ scans: 0, vaultItems: 0, watchlistItems: 0 });

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);

      const [scans, vault, watchlist] = await Promise.all([
        base44.entities.ScanSession.list('-created_date', 1000),
        base44.entities.VaultItem.list('-created_date', 1000),
        base44.entities.WatchlistItem.filter({ active: true }, '-created_date', 1000),
      ]);

      setStats({
        scans: scans.length,
        vaultItems: vault.length,
        watchlistItems: watchlist.length,
      });
    }
    load();
  }, []);

  const statCards = [
    { label: 'Total Scans', value: stats.scans, icon: ScanLine, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Saved Items', value: stats.vaultItems, icon: Gem, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Watching', value: stats.watchlistItems, icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  const settingsGroups = [
    {
      title: 'Preferences',
      items: [
        { icon: ScanLine, label: 'Default Scan Mode', value: 'Camera' },
        { icon: Volume2, label: 'Voice Summaries', value: 'On' },
        { icon: MapPin, label: 'Currency', value: 'USD' },
        { icon: Bell, label: 'Notifications', value: 'Enabled' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Crown, label: 'Premium', value: 'Free', to: '/premium' },
        { icon: Settings, label: 'Help & Support' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-12 pb-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">Profile</h1>
      </div>

      {/* User card */}
      <div className="px-4">
        <GlassCard className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-heading font-semibold text-foreground">{user?.full_name || 'Scanner'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1 inline-block">
              Free Tier
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <GlassCard animate={false} className="flex flex-col items-center py-4">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Premium banner */}
      <div className="px-4 mt-4">
        <Link to="/premium">
          <motion.div
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(263 70% 20%) 0%, hsl(190 100% 15%) 100%)',
              border: '1px solid hsl(263 70% 40% / 0.3)',
            }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute top-0 right-0 w-32 h-32 rounded-full"
              style={{ background: 'radial-gradient(circle, hsl(190 100% 50% / 0.15) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <Crown className="w-6 h-6 text-amber-400 mb-2" />
            <p className="font-heading font-bold text-foreground text-sm">Upgrade to Premium</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Unlimited scans, deeper insights, premium voice</p>
          </motion.div>
        </Link>
      </div>

      {/* Settings */}
      {settingsGroups.map((group) => (
        <div key={group.title} className="px-4 mt-5">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-heading">{group.title}</h3>
          <div className="glass-card rounded-xl divide-y divide-border/50 overflow-hidden">
            {group.items.map((item) => {
              const Icon = item.icon;
              const Wrapper = item.to ? Link : 'div';
              return (
                <Wrapper key={item.label} to={item.to} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{item.label}</span>
                  {item.value && <span className="text-xs text-muted-foreground">{item.value}</span>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </Wrapper>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="px-4 mt-5 mb-8">
        <button
          onClick={() => base44.auth.logout()}
          className="flex items-center gap-3 px-4 py-3.5 w-full glass-card rounded-xl"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">Sign Out</span>
        </button>
      </div>
    </div>
  );
}