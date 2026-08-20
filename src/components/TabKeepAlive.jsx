import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

const Home = lazy(() => import('@/pages/Home'));
const Community = lazy(() => import('@/pages/Community'));
const Scan = lazy(() => import('@/pages/Scan'));
const SellHub = lazy(() => import('@/pages/SellHub'));
const Profile = lazy(() => import('@/pages/Profile'));

const TABS = {
  '/': Home,
  '/community': Community,
  '/scan': Scan,
  '/sell-hub': SellHub,
  '/profile': Profile,
};

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
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