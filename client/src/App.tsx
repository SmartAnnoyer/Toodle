import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { AuthProvider } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './hooks/useTheme';
import { AppShell } from './layouts/AppShell';
import { RequireAuth } from './layouts/RequireAuth';
import { supabase } from './lib/supabase';
import { AccountPage } from './pages/AccountPage';
import { ChatPage } from './pages/ChatPage';
import { FindPage } from './pages/FindPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HomePage } from './pages/HomePage';
import { DeleteAccountPage, PrivacyPage, TermsPage } from './pages/LegalPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RequestsPage } from './pages/RequestsPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RulesPage } from './pages/RulesPage';
import { ShortcutsPage } from './pages/ShortcutsPage';
import { WelcomePage } from './pages/WelcomePage';

function RecoveryGate() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!supabase) return;
    if (window.location.hash.includes('type=recovery') && window.location.pathname !== '/reset-password') {
      navigate(`/reset-password${window.location.hash}`, { replace: true });
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
              <RecoveryGate />
              <Routes>
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/delete-account" element={<DeleteAccountPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/requests" element={<RequestsPage />} />
                    <Route path="/find" element={<FindPage />} />
                    <Route path="/shortcuts" element={<ShortcutsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/account" element={<AccountPage />} />
                  </Route>
                  <Route path="/chat/:id" element={<ChatPage />} />
                  <Route path="/chat/:id/rules" element={<RulesPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
