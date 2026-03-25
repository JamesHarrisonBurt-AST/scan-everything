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
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="px-4 pt-12 pb-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="font-heading text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Scan Everything
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Your AI price & value scanner</p>
          </motion.div>
        </div>

        <HeroScanner />
        <RecentScansCarousel items={recentItems} />
        <ScanCategories />
        <InsightCards />

        {/* Bottom spacing */}
        <div className="h-8" />
      </motion.div>
    </>
  );
}