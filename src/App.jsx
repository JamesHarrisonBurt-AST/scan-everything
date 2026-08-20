import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';

// Lazy load all pages for code splitting
const ScanResult = lazy(() => import('./pages/ScanResult'));
const Deals = lazy(() => import('./pages/Deals'));
const Vault = lazy(() => import('./pages/Vault'));
const Search = lazy(() => import('./pages/Search'));
const Compare = lazy(() => import('./pages/Compare'));
const PriceTracker = lazy(() => import('./pages/PriceTracker'));
const Analytics = lazy(() => import('./pages/Analytics'));
const VaultReport = lazy(() => import('./pages/VaultReport'));
const MarketTrends = lazy(() => import('./pages/MarketTrends'));
const BulkScan = lazy(() => import('./pages/BulkScan'));
const ARView = lazy(() => import('./pages/ARView'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(240 15% 4%)' }}>
    <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
  </div>
);

const PageMotion = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const LazyRoute = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    <PageMotion>{children}</PageMotion>
  </Suspense>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<Layout />}>
          {/* Tab paths render empty — TabKeepAlive in Layout handles them */}
          <Route index element={<></>} />
          <Route path="community" element={<></>} />
          <Route path="scan" element={<></>} />
          <Route path="sell-hub" element={<></>} />
          <Route path="profile" element={<></>} />
          {/* Non-tab pages — kept inside Layout so it stays mounted across transitions */}
          <Route path="deals" element={<LazyRoute><Deals /></LazyRoute>} />
          <Route path="vault" element={<LazyRoute><Vault /></LazyRoute>} />
          <Route path="scan-result/:id" element={<LazyRoute><ScanResult /></LazyRoute>} />
          <Route path="search" element={<LazyRoute><Search /></LazyRoute>} />
          <Route path="compare" element={<LazyRoute><Compare /></LazyRoute>} />
          <Route path="price-tracker" element={<LazyRoute><PriceTracker /></LazyRoute>} />
          <Route path="analytics" element={<LazyRoute><Analytics /></LazyRoute>} />
          <Route path="vault-report" element={<LazyRoute><VaultReport /></LazyRoute>} />
          <Route path="market-trends" element={<LazyRoute><MarketTrends /></LazyRoute>} />
          <Route path="bulk-scan" element={<LazyRoute><BulkScan /></LazyRoute>} />
          <Route path="ar-view" element={<LazyRoute><ARView /></LazyRoute>} />
          <Route path="privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
          <Route path="terms-of-use" element={<LazyRoute><TermsOfUse /></LazyRoute>} />
          <Route path="*" element={<LazyRoute><PageNotFound /></LazyRoute>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return <AnimatedRoutes />;
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
  );
}

export default App