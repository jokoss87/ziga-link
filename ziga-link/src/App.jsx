import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { UserProfileProvider } from '@/components/lib/UserProfileContext';
import { useUserProfileContext } from '@/components/lib/UserProfileContext';
import { SupportConfigProvider } from '@/components/lib/SupportConfigContext';
import Onboarding from './pages/Onboarding';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import BugDetail from './pages/BugDetail';
import JournalVie from './pages/JournalVie';
import Chat from './pages/Chat';
import ActivityDetail from './pages/ActivityDetail';
import UpdateManager from '@/components/UpdateManager';
import SupportPage from './pages/SupportPage';
import ActivitesSport from './pages/ActivitesSport';
import ActivitesDressage from './pages/ActivitesDressage';
import EncounterRatingPage from './pages/EncounterRatingPage';
import PublicProfile from './pages/PublicProfile';
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite';
import MentionsLegales from './pages/MentionsLegales';

// Dark mode sync with system preference
if (typeof window !== "undefined") {
  const applyDark = (e) => document.documentElement.classList.toggle("dark", e.matches);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  applyDark(mq);
  mq.addEventListener("change", applyDark);
}

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const OnboardingRedirect = () => {
  const { profile, loading } = useUserProfileContext();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      !loading &&
      profile !== null &&
      (profile.onboarding_step === 0 || profile.onboarding_step === undefined || profile.onboarding_step === null) &&
      location.pathname !== '/Onboarding'
    ) {
      navigate('/Onboarding', { replace: true });
    }
  }, [loading, profile, profile?.onboarding_step, location.pathname]);

  return null;
};

const pageVariants = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, x: -18, transition: { duration: 0.12, ease: "easeIn" } },
};

const PageWrapper = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ willChange: "transform, opacity" }}>
    {children}
  </motion.div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <>
    <OnboardingRedirect />
    <AnimatePresence mode="wait" initial={false}>
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={
        <PageWrapper>
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        </PageWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <PageWrapper>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </PageWrapper>
          }
        />
      ))}
      <Route path="/BugDetail" element={<PageWrapper><LayoutWrapper currentPageName="BugDetail"><BugDetail /></LayoutWrapper></PageWrapper>} />
      <Route path="/JournalVie" element={<PageWrapper><LayoutWrapper currentPageName="JournalVie"><JournalVie /></LayoutWrapper></PageWrapper>} />
      <Route path="/Chat" element={<PageWrapper><LayoutWrapper currentPageName="Chat"><Chat /></LayoutWrapper></PageWrapper>} />
      <Route path="/ActivityDetail" element={<PageWrapper><LayoutWrapper currentPageName="ActivityDetail"><ActivityDetail /></LayoutWrapper></PageWrapper>} />
      <Route path="/SupportPage" element={<PageWrapper><LayoutWrapper currentPageName="SupportPage"><SupportPage /></LayoutWrapper></PageWrapper>} />
      <Route path="/EncounterRatingPage" element={<PageWrapper><LayoutWrapper currentPageName="EncounterRatingPage"><EncounterRatingPage /></LayoutWrapper></PageWrapper>} />
      <Route path="/ActivitesSport" element={<PageWrapper><LayoutWrapper currentPageName="ActivitesSport"><ActivitesSport /></LayoutWrapper></PageWrapper>} />
      <Route path="/ActivitesDressage" element={<PageWrapper><LayoutWrapper currentPageName="ActivitesDressage"><ActivitesDressage /></LayoutWrapper></PageWrapper>} />
      <Route path="/PublicProfile" element={<PageWrapper><LayoutWrapper currentPageName="PublicProfile"><PublicProfile /></LayoutWrapper></PageWrapper>} />
      <Route path="/PolitiqueConfidentialite" element={<PageWrapper><LayoutWrapper currentPageName="PolitiqueConfidentialite"><PolitiqueConfidentialite /></LayoutWrapper></PageWrapper>} />
      <Route path="/MentionsLegales" element={<PageWrapper><LayoutWrapper currentPageName="MentionsLegales"><MentionsLegales /></LayoutWrapper></PageWrapper>} />
      <Route path="/Onboarding" element={<PageWrapper><Onboarding /></PageWrapper>} />
      <Route path="*" element={<PageWrapper><PageNotFound /></PageWrapper>} />
    </Routes>
    </AnimatePresence>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <UserProfileProvider>
      <SupportConfigProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
          <UpdateManager />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </SupportConfigProvider>
      </UserProfileProvider>
    </AuthProvider>
  )
}

export default App