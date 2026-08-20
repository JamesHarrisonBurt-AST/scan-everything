import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ScanLine, Users, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/scan', icon: ScanLine, label: 'Scan', isCenter: true },
  { path: '/sell-hub', icon: ShoppingBag, label: 'Sell' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const tabPaths = ['/', '/community', '/scan', '/sell-hub', '/profile'];
const STORAGE_KEY = 'tab_last_paths';
const ACTIVE_TAB_KEY = 'tab_active_section';

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide tab bar on non-tab pages
  if (!tabPaths.includes(location.pathname)) return null;

  const handleTabClick = (e, tabPath) => {
    e.preventDefault();
    const activeTab = sessionStorage.getItem(ACTIVE_TAB_KEY) || '/';
    let paths = {};
    try { paths = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch {}

    if (tabPath === activeTab) {
      // Already viewing this tab — navigate back to its root
      navigate(tabPath);
      paths[tabPath] = tabPath;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
    } else {
      // Navigate to the last saved sub-path for this tab, or root
      const target = paths[tabPath] || tabPath;
      navigate(target);
    }
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
                <Link key={tab.path} to={tab.path} onClick={(e) => handleTabClick(e, tab.path)} className="relative -mt-6">
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg glow-cyan"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="block text-[11px] text-center mt-1 text-cyan-400 font-medium">
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link key={tab.path} to={tab.path} onClick={(e) => handleTabClick(e, tab.path)} className="flex flex-col items-center py-1 px-3 touch-target">
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
                  className={`text-[11px] mt-1 ${
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