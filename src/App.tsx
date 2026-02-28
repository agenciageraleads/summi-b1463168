
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SalesLandingPage from "./pages/SalesLandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CompleteSignupPage from "./pages/CompleteSignupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import FeedbackPage from "./pages/FeedbackPage";
import ReferralsPage from "./pages/ReferralsPage";
import BetaPage from "./pages/BetaPage";
import ReleasesPage from "./pages/ReleasesPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminBetaUsersPage from "./pages/AdminBetaUsersPage";
import AdminAnnouncementsPage from "./pages/AdminAnnouncementsPage";
import ReferralPage from '@/pages/ReferralPage';
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import LGPDPage from "./pages/LGPDPage";
import { OnboardingFlow } from "./components/Onboarding/OnboardingFlow";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen">
              <OnboardingFlow />
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

                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <DashboardPage />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/whatsapp" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <Navigate to="/settings?tab=connection" replace />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/whatsapp-v2" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <Navigate to="/settings?tab=connection" replace />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/whatsapp-connection" element={
                  <ProtectedRoute>
                    <Navigate to="/settings?tab=connection" replace />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                } />
                <Route path="/feedback" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <FeedbackPage />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/referrals" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <ReferralsPage />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />
                <Route path="/beta" element={
                  <ProtectedRoute>
                    <SubscriptionGuard>
                      <BetaPage />
                    </SubscriptionGuard>
                  </ProtectedRoute>
                } />

                <Route path="/releases" element={
                  <ProtectedRoute>
                    <ReleasesPage />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/beta-users" element={<AdminBetaUsersPage />} />
                <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />

                {/* Rotas de convite - ambas funcionam */}
                <Route path="/convite/:referralCode" element={<ReferralPage />} />
                <Route path="/r/:referralCode" element={<ReferralPage />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
