import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background font-body">
      <main className="pb-safe-24" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}