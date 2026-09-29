import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/http';
import { supabase } from '../lib/supabase';
import type { Me } from '../types';

interface AuthValue {
  session: Session | null;
  profile: Me | null;
  loading: boolean;
  refreshProfile: () => Promise<Me | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return null;
    try {
      const me = await api<Me>('/api/profile/me');
      setProfile(me);
      return me;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await refreshProfile();
      if (active) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo<AuthValue>(() => ({
    session,
    profile,
    loading,
    refreshProfile,
    signOut: async () => {
      setProfile(null);
      setSession(null);
      await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
    },
  }), [session, profile, loading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Auth missing');
  return value;
}
