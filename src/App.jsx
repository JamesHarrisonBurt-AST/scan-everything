import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Home from './pages/Home';
import Scan from './pages/Scan';
import ScanResult from './pages/ScanResult';
import Deals from './pages/Deals';
import Vault from './pages/Vault';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Premium from './pages/Premium';
import Compare from './pages/Compare';
import PriceTracker from './pages/PriceTracker';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/scan" element={<Scan />} />
      <Route path="/scan-result/:id" element={<ScanResult />} />
      <Route path="/search" element={<Search />} />
      <Route path="/premium" element={<Premium />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/price-tracker" element={<PriceTracker />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App