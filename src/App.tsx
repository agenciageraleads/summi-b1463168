
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const SalesLandingPage = lazy(() => import("./pages/SalesLandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const CompleteSignupPage = lazy(() => import("./pages/CompleteSignupPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const BetaPage = lazy(() => import("./pages/BetaPage"));
const ReleasesPage = lazy(() => import("./pages/ReleasesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminBetaUsersPage = lazy(() => import("./pages/AdminBetaUsersPage"));
const AdminAnnouncementsPage = lazy(() => import("./pages/AdminAnnouncementsPage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const LGPDPage = lazy(() => import("./pages/LGPDPage"));
const OnboardingFlow = lazy(() =>
  import("./components/Onboarding/OnboardingFlow").then((module) => ({
    default: module.OnboardingFlow,
  })),
);

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
    Carregando...
  </div>
);

const PROTECTED_ROUTE_PREFIXES = [
  "/login",
  "/register",
  "/complete-signup",
  "/reset-password",
  "/dashboard",
  "/settings",
  "/subscription",
  "/feedback",
  "/referrals",
  "/beta",
  "/releases",
  "/whatsapp",
  "/whatsapp-v2",
  "/whatsapp-connection",
  "/admin",
];

function OnboardingFlowGate() {
  const { pathname } = useLocation();
  const shouldLoadOnboarding = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!shouldLoadOnboarding) return null;

  return (
    <Suspense fallback={null}>
      <OnboardingFlow />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <>
      <OnboardingFlowGate />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<SalesLandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-signup" element={<CompleteSignupPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/lgpd" element={<LGPDPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <DashboardPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <Navigate to="/settings?tab=connection" replace />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp-v2"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <Navigate to="/settings?tab=connection" replace />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whatsapp-connection"
            element={
              <ProtectedRoute>
                <Navigate to="/settings?tab=connection" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <FeedbackPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <ReferralsPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/beta"
            element={
              <ProtectedRoute>
                <SubscriptionGuard>
                  <BetaPage />
                </SubscriptionGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/releases"
            element={
              <ProtectedRoute>
                <ReleasesPage />
              </ProtectedRoute>
            }
          />

          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/beta-users" element={<AdminBetaUsersPage />} />
          <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />

          <Route path="/convite/:referralCode" element={<ReferralPage />} />
          <Route path="/r/:referralCode" element={<ReferralPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

function AppRouter() {
  const { pathname } = useLocation();
  const shouldLoadAuth = PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!shouldLoadAuth) {
    return <AppRoutes />;
  }

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen">
            <AppRouter />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
