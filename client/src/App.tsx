import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/ui';
import { AuthProvider } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './hooks/useTheme';
import { AppShell } from './layouts/AppShell';
import { RequireAuth } from './layouts/RequireAuth';
import { ChatPage } from './pages/ChatPage';
import { FindPage } from './pages/FindPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { RequestsPage } from './pages/RequestsPage';
import { RulesPage } from './pages/RulesPage';
import { ShortcutsPage } from './pages/ShortcutsPage';
import { WelcomePage } from './pages/WelcomePage';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/requests" element={<RequestsPage />} />
                    <Route path="/find" element={<FindPage />} />
                    <Route path="/shortcuts" element={<ShortcutsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
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
