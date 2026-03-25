import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import HeroScanner from '../components/home/HeroScanner';
import RecentScansCarousel from '../components/home/RecentScansCarousel';
import InsightCards from '../components/home/InsightCards';
import ScanCategories from '../components/home/ScanCategories';
import SplashScreen from '../components/SplashScreen';

export default function Home() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splash_shown');
  });
  const [recentItems, setRecentItems] = useState([]);

  useEffect(() => {
    base44.entities.IdentifiedItem.list('-created_date', 10)
      .then(setRecentItems)
      .catch(() => {});
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 0.6 }}
        style={{ background: 'hsl(240 15% 4%)' }}
        className="min-h-screen"
      >
        {/* Ambient background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{
              top: '-10%', left: '-20%',
              background: 'radial-gradient(circle, hsl(190 100% 50% / 0.04) 0%, transparent 65%)',
            }}
            animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full"
            style={{
              bottom: '20%', right: '-10%',
              background: 'radial-gradient(circle, hsl(263 70% 58% / 0.04) 0%, transparent 65%)',
            }}
            animate={{ scale: [1, 1.2, 1], y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        {/* Header */}
        <div className="relative z-10 px-4 pb-2 pt-safe-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-heading text-3xl font-extrabold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, hsl(190 100% 75%) 0%, #ffffff 45%, hsl(263 70% 78%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Scan Everything
            </h1>
            <p className="text-xs mt-0.5 tracking-widest uppercase font-light" style={{ color: 'hsl(220 10% 45%)' }}>
              AI · Price · Value
            </p>
          </motion.div>
        </div>

        <div className="relative z-10">
          <HeroScanner />
          <RecentScansCarousel items={recentItems} />
          <ScanCategories />
          <InsightCards />
          <div className="h-6" />
        </div>
      </motion.div>
    </>
  );
}