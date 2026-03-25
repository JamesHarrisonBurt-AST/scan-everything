import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background font-body">
      <main className="pb-24">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}