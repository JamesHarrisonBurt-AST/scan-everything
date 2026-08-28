import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

const Explore = lazy(() => import('@/pages/Explore'));
const Discoveries = lazy(() => import('@/pages/Discoveries'));
const Challenges = lazy(() => import('@/pages/Challenges'));
const Profile = lazy(() => import('@/pages/Profile'));

const TABS = {
  '/': Explore,
  '/discoveries': Discoveries,
  '/challenges': Challenges,
  '/profile': Profile,
};

const STORAGE_KEY = 'tab_last_paths';
const ACTIVE_TAB_KEY = 'tab_active_section';

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
  </div>
);

export default function TabKeepAlive() {
  const location = useLocation();
  const [visited, setVisited] = useState(() => new Set(['/']));

  const currentPath = location.pathname;
  const isTabPath = Object.prototype.hasOwnProperty.call(TABS, currentPath);

  useEffect(() => {
    if (isTabPath) {
      setVisited(prev => (prev.has(currentPath) ? prev : new Set(prev).add(currentPath)));
      sessionStorage.setItem(ACTIVE_TAB_KEY, currentPath);
      try {
        const paths = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        paths[currentPath] = currentPath;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
      } catch {}
    } else {
      const activeTab = sessionStorage.getItem(ACTIVE_TAB_KEY) || '/';
      try {
        const paths = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        paths[activeTab] = currentPath;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
      } catch {}
    }
  }, [currentPath, isTabPath]);

  return (
    <>
      {Object.entries(TABS).map(([path, Component]) => {
        if (!visited.has(path)) return null;
        const isActive = isTabPath && currentPath === path;
        return (
          <div key={path} style={{ display: isActive ? 'block' : 'none' }}>
            <Suspense fallback={<PageLoader />}>
              <Component />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}