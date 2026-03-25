import { Link, useLocation } from 'react-router-dom';
import { Home, ScanLine, Zap, Archive, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/deals', icon: Zap, label: 'Deals' },
  { path: '/scan', icon: ScanLine, label: 'Scan', isCenter: true },
  { path: '/vault', icon: Archive, label: 'Vault' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomTabBar() {
  const location = useLocation();

  // Hide tab bar on scan result pages
  if (location.pathname.startsWith('/scan-result')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="glass-card border-t border-border/50 px-2 pb-6 pt-2">
        <nav className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === '/' 
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            const Icon = tab.icon;

            if (tab.isCenter) {
              return (
                <Link key={tab.path} to={tab.path} className="relative -mt-6">
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg glow-cyan"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="block text-[10px] text-center mt-1 text-cyan-400 font-medium">
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link key={tab.path} to={tab.path} className="flex flex-col items-center py-1 px-3">
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-muted-foreground'
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
                      layoutId="tab-indicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive ? 'text-cyan-400 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}