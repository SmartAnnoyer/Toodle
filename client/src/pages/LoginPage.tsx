import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Screen, Wordmark, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      const me = await refreshProfile();
      navigate(me && !me.onboarded ? '/welcome' : '/', { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <Screen className="app-bg grid place-items-center px-6 text-center">
        <p>Add Supabase keys to client/.env first.</p>
      </Screen>
    );
  }

  return (
    <Screen className="app-bg px-5 py-10">
      <form onSubmit={(event) => void submit(event)} className="mx-auto flex min-h-[80dvh] max-w-md flex-col">
        <Wordmark className="text-4xl" />
        <h1 className="mt-8 text-3xl font-semibold">Welcome back.</h1>
        <div className="mt-6 space-y-4">
          <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </div>
        <Button className="mt-8" type="submit" disabled={busy || password.length < 8}>{busy ? 'Signing in…' : 'Enter'}</Button>
        <Link to="/welcome" className="mt-4 text-center text-sm text-muted">New here? Make a username</Link>
      </form>
    </Screen>
  );
}
