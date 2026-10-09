import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/http';
import { supabase } from '../lib/supabase';
import { handleBack } from '../native/back';

export function AccountPage() {
  const { profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState<'password' | 'delete' | null>(null);
  const mismatch = confirm.length > 0 && nextPassword !== confirm;

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase || nextPassword !== confirm) return;
    setBusy('password');
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email) throw new Error('Sign in again, then change your password.');
      const { error: signError } = await supabase.auth.signInWithPassword({ email: data.user.email, password: current });
      if (signError) throw new Error('That current password does not match.');
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) throw new Error(error.message);
      setCurrent('');
      setNextPassword('');
      setConfirm('');
      toast('Password updated');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function removeAccount(event: FormEvent) {
    event.preventDefault();
    if (!understood || deletePassword.length < 8) return;
    setBusy('delete');
    try {
      await api('/api/account', { method: 'DELETE', body: JSON.stringify({ password: deletePassword }) });
      await signOut();
      navigate('/welcome', { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pb-8 pt-8">
      <button type="button" className="text-sm text-muted" onClick={() => handleBack()}>← Back</button>
      <h1 className="mt-3 text-3xl font-semibold">Account and password</h1>
      <p className="mt-2 text-sm text-muted">{profile ? `@${profile.username}` : ''}</p>

      <form onSubmit={(event) => void changePassword(event)} className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <Field label="Current password" type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" />
        <Field label="New password" type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" />
        <Field label="Confirm new password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" hint={mismatch ? 'Those passwords do not match.' : undefined} />
        <Button type="submit" disabled={busy !== null || current.length < 8 || nextPassword.length < 8 || nextPassword !== confirm}>
          {busy === 'password' ? 'Saving…' : 'Update password'}
        </Button>
      </form>

      <form onSubmit={(event) => void removeAccount(event)} className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold text-danger">Delete account</h2>
        <p className="text-sm text-muted">This removes your login, profile, and the chats you created. It cannot be undone.</p>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
          <span>I understand this permanently deletes my Toodle account.</span>
        </label>
        <Field label="Password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" />
        <Button variant="danger" type="submit" disabled={busy !== null || !understood || deletePassword.length < 8}>
          {busy === 'delete' ? 'Deleting…' : 'Delete account'}
        </Button>
      </form>
    </div>
  );
}
