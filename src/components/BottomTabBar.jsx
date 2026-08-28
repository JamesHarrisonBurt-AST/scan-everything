import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, LayoutGrid, Aperture, Target, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Compass, label: 'Explore' },
  { path: '/discoveries', icon: LayoutGrid, label: 'Finds' },
  { path: '/ar-camera', icon: Aperture, label: 'Discover', isCenter: true },
  { path: '/challenges', icon: Target, label: 'Quests' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const tabPaths = ['/', '/discoveries', '/challenges', '/profile'];
const STORAGE_KEY = 'tab_last_paths';
const ACTIVE_TAB_KEY = 'tab_active_section';

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (!tabPaths.includes(location.pathname)) return null;

  const handleTabClick = (e, tabPath) => {
    e.preventDefault();
    const activeTab = sessionStorage.getItem(ACTIVE_TAB_KEY) || '/';
    let paths = {};
    try { paths = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch {}

    if (tabPath === activeTab) {
      navigate(tabPath);
      paths[tabPath] = tabPath;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
    } else {
      const target = paths[tabPath] || tabPath;
      navigate(target);
    }
  };

  const handleCenterClick = (e) => {
    e.preventDefault();
    navigate('/ar-camera');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="glass-card border-t border-border/50 px-2 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}>
        <nav className="flex items-center justify-around max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            const Icon = tab.icon;

            if (tab.isCenter) {
              return (
                <button key={tab.path} onClick={handleCenterClick} className="relative -mt-6 bg-transparent border-none cursor-pointer">
                  <motion.div
                    className="w-14 h-14 rounded-full flex items-center justify-center glow-amber"
                    style={{ background: 'linear-gradient(135deg, hsl(35 95% 55%), hsl(25 90% 45%))' }}
                    whileTap={{ scale: 0.88 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <span className="block text-[11px] text-center mt-1 font-medium" style={{ color: 'hsl(35 95% 65%)' }}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <Link key={tab.path} to={tab.path} onClick={(e) => handleTabClick(e, tab.path)} className="flex flex-col items-center py-1 px-3 touch-target">
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-muted-foreground'
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                      layoutId="tab-indicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1 ${
                    isActive ? 'text-amber-400 font-medium' : 'text-muted-foreground'
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