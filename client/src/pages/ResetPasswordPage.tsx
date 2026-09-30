import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Screen, Wordmark, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || password !== confirm) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      toast('Password updated');
      navigate('/', { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return <Screen className="app-bg grid place-items-center px-6 text-center"><p>Add Supabase keys to client/.env first.</p></Screen>;
  }

  return (
    <Screen className="app-bg px-5 py-10">
      <form onSubmit={(event) => void submit(event)} className="mx-auto flex min-h-[80dvh] max-w-md flex-col">
        <Wordmark className="text-4xl" />
        <h1 className="mt-8 text-3xl font-semibold">Choose a new password</h1>
        {session ? (
          <div className="mt-6 space-y-4">
            <Field label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
            <Field label="Confirm password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" hint={mismatch ? 'Those passwords do not match.' : undefined} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Open the reset link from your email on this device, then choose a new password.</p>
        )}
        {session ? (
          <Button className="mt-8" type="submit" disabled={busy || password.length < 8 || password !== confirm}>
            {busy ? 'Saving…' : 'Save password'}
          </Button>
        ) : null}
      </form>
    </Screen>
  );
}
