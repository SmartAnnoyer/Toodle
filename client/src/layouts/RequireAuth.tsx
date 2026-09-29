import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Wordmark } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { supabaseConfigured } from '../lib/supabase';

export function RequireAuth() {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (!supabaseConfigured) return <Navigate to="/welcome" replace />;
  if (loading) {
    return (
      <div className="app-bg grid min-h-dvh place-items-center">
        <Wordmark className="text-5xl" />
      </div>
    );
  }
  if (!session) return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  if (profile && !profile.onboarded && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }
  return <Outlet />;
}
