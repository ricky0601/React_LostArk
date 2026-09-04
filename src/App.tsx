import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer';
import { LoadingIndicator } from './components/Loading';
import { RouteSeo } from './components/RouteSeo';
import { ROUTES } from './utils/routes';
import { AuthProvider } from './context/AuthContext';
import { PwaChunkProvider, usePwaChunk } from './context/PwaChunkContext';
import { ThemeProvider } from './context/ThemeContext';

const Home = React.lazy(() => import(/* webpackChunkName: "route-home" */ './pages/Home'));
const Character = React.lazy(() => import(/* webpackChunkName: "route-character" */ './pages/Character'));
const Simulation = React.lazy(() => import(/* webpackChunkName: "route-simulation" */ './pages/Simulation'));
const SpecSimulator = React.lazy(() => import(/* webpackChunkName: "route-spec-simulator" */ './pages/SpecSimulator'));
const Expedition = React.lazy(() => import(/* webpackChunkName: "route-expedition" */ './pages/Expedition'));
const Compare = React.lazy(() => import(/* webpackChunkName: "route-compare" */ './pages/Compare'));
const Enhancement = React.lazy(() => import(/* webpackChunkName: "route-enhancement" */ './pages/Enhancement'));
const Spending = React.lazy(() => import(/* webpackChunkName: "route-spending" */ './pages/Spending'));
const Market = React.lazy(() => import(/* webpackChunkName: "route-market" */ './pages/Market'));
const Changelog = React.lazy(() => import(/* webpackChunkName: "route-changelog" */ './pages/Changelog'));
const Policy = React.lazy(() => import(/* webpackChunkName: "route-policy" */ './pages/Policy'));
const AuthCallback = React.lazy(() => import(/* webpackChunkName: "route-auth-callback" */ './pages/AuthCallback'));
const AccountSettings = React.lazy(() => import(/* webpackChunkName: "route-account" */ './pages/AccountSettings'));
const NotFound = React.lazy(() => import(/* webpackChunkName: "route-not-found" */ './pages/NotFound'));

const ChunkErrorBanner: React.FC = () => {
  const { chunkErrorOccurred, clearChunkError } = usePwaChunk();
  if (!chunkErrorOccurred) return null;

  const handleReload = () => {
    clearChunkError();
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-500/95 px-4 py-2 text-white shadow-md dark:bg-amber-600/95">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 text-center text-sm font-medium sm:flex-row">
        <span>새 버전이 배포되었습니다. 안정적인 사용을 위해 새로고침해 주세요.</span>
        <button
          type="button"
          onClick={handleReload}
          className="min-h-9 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          새로고침
        </button>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <div className="flex min-h-screen flex-col bg-gray-50 font-[Pretendard,sans-serif] transition-colors duration-300 dark:bg-la-dark">
        <RouteSeo />
        <ChunkErrorBanner />
        <div className="flex flex-1 flex-col [&>div]:min-h-0 [&>div]:flex-1">
          <React.Suspense
            fallback={
              <LoadingIndicator
                message="페이지 불러오는 중..."
                className="mx-auto mt-8 max-w-7xl"
              />
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/character" element={<Character />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/spec-simulator" element={<SpecSimulator />} />
              <Route path="/expedition" element={<Expedition />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/enhancement" element={<Enhancement />} />
              <Route path="/market" element={<Market />} />
              <Route path="/spending" element={<Spending />} />
              <Route path={ROUTES.changelog} element={<Changelog />} />
              <Route path={ROUTES.policy} element={<Policy />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path={ROUTES.account} element={<AccountSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </React.Suspense>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

const App: React.FC = () => (
  <PwaChunkProvider>
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  </PwaChunkProvider>
);

export default App;
