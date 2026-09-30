import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Field, Screen, Wordmark, useToast } from '../components/ui';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw new Error(error.message);
      setSent(true);
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
        <h1 className="mt-8 text-3xl font-semibold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted">We will email a link to choose a new one. The link expires.</p>
        {sent ? (
          <p className="mt-6 text-sm">If that email has a Toodle account, the reset link is on its way. Open it on this device.</p>
        ) : (
          <div className="mt-6">
            <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </div>
        )}
        {sent ? null : <Button className="mt-8" type="submit" disabled={busy || !email.includes('@')}>{busy ? 'Sending…' : 'Send reset link'}</Button>}
        <Link to="/login" className="mt-4 text-center text-sm text-muted">Back to login</Link>
      </form>
    </Screen>
  );
}
