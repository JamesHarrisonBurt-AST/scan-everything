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
const ARCamera = lazy(() => import('./pages/ARCamera'));
const DiscoveryDetail = lazy(() => import('./pages/DiscoveryDetail'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));
const OAuthConsent = lazy(() => import('./pages/OAuthConsent'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(220 18% 5%)' }}>
    <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
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
          <Route path="discoveries" element={<></>} />
          <Route path="challenges" element={<></>} />
          <Route path="profile" element={<></>} />
          {/* Non-tab pages */}
          <Route path="discovery/:id" element={<LazyRoute><DiscoveryDetail /></LazyRoute>} />
          <Route path="ar-camera" element={<LazyRoute><ARCamera /></LazyRoute>} />
          <Route path="privacy-policy" element={<LazyRoute><PrivacyPolicy /></LazyRoute>} />
          <Route path="terms-of-use" element={<LazyRoute><TermsOfUse /></LazyRoute>} />
          <Route path="oauth-consent" element={<LazyRoute><OAuthConsent /></LazyRoute>} />
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