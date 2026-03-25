import { motion } from 'framer-motion';
import { ArrowLeft, Crown, ScanLine, Zap, Gem, Volume2, Palette, Filter, BarChart3, Infinity, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Infinity, label: 'Unlimited Scans', desc: 'No daily scan limits' },
  { icon: Zap, label: 'Enhanced Price Intel', desc: 'Deeper multi-source comparison' },
  { icon: Gem, label: 'Collectible Mode', desc: 'Advanced value & rarity detection' },
  { icon: Volume2, label: 'Premium Voice', desc: 'Narrated scan summaries' },
  { icon: Filter, label: 'Pro Vault Filters', desc: 'Advanced sorting & search' },
  { icon: BarChart3, label: 'Scan Insights', desc: 'Monthly savings dashboard' },
  { icon: Palette, label: 'Premium Themes', desc: 'Exclusive visual styles' },
];

const plans = [
  { id: 'monthly', label: 'Monthly', price: '$4.99', period: '/month', popular: false },
  { id: 'annual', label: 'Annual', price: '$29.99', period: '/year', popular: true, savings: 'Save 50%' },
];

export default function Premium() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-12 left-4 z-30 w-9 h-9 rounded-full glass-card flex items-center justify-center"
      >
        <ArrowLeft className="w-4 h-4 text-foreground" />
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden pt-20 pb-10 px-6 text-center">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, hsl(263 70% 20% / 0.5) 0%, transparent 60%)',
          }}
        />
        <motion.div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(190 100% 50% / 0.08) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 mx-auto flex items-center justify-center shadow-lg mb-5"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Crown className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Scan Everything Pro</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
            Unlock the full power of AI-powered scanning and price intelligence
          </p>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-4">
        <div className="glass-card rounded-2xl p-5 glow-violet">
          <h3 className="text-sm font-heading font-semibold text-foreground mb-4">Premium Features</h3>
          <div className="space-y-3.5">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.label}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{feat.label}</p>
                    <p className="text-[11px] text-muted-foreground">{feat.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Free vs Premium</h3>
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 text-center py-2 border-b border-border/30">
            <span className="text-[10px] text-muted-foreground">Feature</span>
            <span className="text-[10px] text-muted-foreground">Free</span>
            <span className="text-[10px] text-amber-400">Premium</span>
          </div>
          {[
            ['Daily Scans', '5', '∞'],
            ['Price Compare', 'Basic', 'Advanced'],
            ['Value Scanner', 'Limited', 'Full'],
            ['Voice Summary', '—', '✓'],
            ['Vault Filters', 'Basic', 'Pro'],
          ].map(([feat, free, premium]) => (
            <div key={feat} className="grid grid-cols-3 text-center py-2.5 border-b border-border/20">
              <span className="text-xs text-foreground text-left pl-4">{feat}</span>
              <span className="text-xs text-muted-foreground">{free}</span>
              <span className="text-xs text-cyan-400">{premium}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="px-4 mt-6 space-y-3">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            className={`glass-card rounded-xl p-4 flex items-center gap-4 cursor-pointer ${
              plan.popular ? 'border-cyan-500/30 glow-cyan' : ''
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                {plan.popular && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Best Value
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-heading font-bold text-foreground">{plan.price}</span>
                <span className="text-xs text-muted-foreground">{plan.period}</span>
              </div>
              {plan.savings && (
                <span className="text-[10px] text-emerald-400">{plan.savings}</span>
              )}
            </div>
            <div className={`w-5 h-5 rounded-full border-2 ${plan.popular ? 'border-cyan-400 bg-cyan-400' : 'border-muted-foreground/30'} flex items-center justify-center`}>
              {plan.popular && <Check className="w-3 h-3 text-background" />}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-4 mt-6 mb-8">
        <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white font-heading font-semibold text-base">
          Start Free Trial
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          7-day free trial • Cancel anytime
        </p>
      </div>
    </div>
  );
}