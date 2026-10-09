import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AVATARS, MOODS } from '../constants';
import { Button, Field, Screen, Wordmark, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/http';
import { MIN_AGE } from '../legal';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function WelcomePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { session, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldEnough, setOldEnough] = useState(false);
  const [avatar, setAvatar] = useState('✨');
  const [moodEmoji, setMoodEmoji] = useState('🫠');
  const [moodText, setMoodText] = useState('surviving');
  const [customMood, setCustomMood] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.onboarded) navigate('/', { replace: true });
  }, [profile, navigate]);

  useEffect(() => {
    if (!supabaseConfigured || username.trim().length < 3) {
      setUsernameState('');
      return;
    }
    const handle = window.setTimeout(() => {
      api<{ available: boolean; message?: string }>(`/api/usernames/${encodeURIComponent(username)}`)
        .then((result) => setUsernameState(result.available ? 'Available' : result.message || 'Taken'))
        .catch(() => setUsernameState(''));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [username]);

  if (!supabaseConfigured) {
    return (
      <Screen className="app-bg grid place-items-center px-6">
        <div className="glass max-w-md rounded-[2rem] p-8 text-center">
          <img src="/icon.jpg" alt="" className="mx-auto mb-5 h-28 w-28 rounded-[1.6rem] object-cover" />
          <Wordmark className="text-5xl" />
          <p className="mt-3 text-muted">Talk. Play. Poof.</p>
          <p className="mt-4 text-sm text-muted">Add your Supabase URL and anon key in client/.env, then restart.</p>
        </div>
      </Screen>
    );
  }

  async function finish() {
    if (!supabase || password !== confirmPassword || !oldEnough) return;
    setBusy(true);
    try {
      let active = session;
      if (!active) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim().toLowerCase(),
              display_name: displayName.trim(),
              avatar_emoji: avatar,
              mood_emoji: moodEmoji,
              mood_text: moodText.trim(),
              age_confirmed: true,
            },
          },
        });
        if (error) throw new Error(error.message);
        if (!data.session) {
          toast('Check your email to confirm, then log in. For local dev, turn off email confirmation.');
          return;
        }
        active = data.session;
      }
      await api('/api/profile/setup', {
        method: 'POST',
        body: JSON.stringify({
          username,
          displayName,
          avatarEmoji: avatar,
          moodEmoji,
          moodText,
        }),
      });
      await refreshProfile();
      navigate('/', { replace: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const canName = displayName.trim().length > 0;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canAccount = username.trim().length >= 3 && email.includes('@') && password.length >= 8 && password === confirmPassword && oldEnough && !usernameState.toLowerCase().includes('taken') && !usernameState.toLowerCase().includes('characters');

  return (
    <Screen className="app-bg overflow-y-auto px-5">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col py-6">
        <Wordmark className="text-3xl" />
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-1 flex-col">
          {step === 0 && (
            <div className="flex flex-1 flex-col items-center pt-6 text-center">
              <img src="/icon.jpg" alt="Toodle" className="mb-5 h-32 w-32 rounded-[1.8rem] object-cover shadow-card" />
              <h1 className="text-3xl font-semibold leading-tight">Welcome to Toodle 👋</h1>
              <p className="mt-3 text-lg text-muted">Talk. Play. Poof.</p>
              <Button className="mt-8 w-full" onClick={() => setStep(1)}>Let's go</Button>
              <Link to="/login" className="mt-4 text-sm text-muted">I already have a username</Link>
              <p className="mt-6 text-xs text-muted">
                <Link to="/privacy" className="underline">Privacy</Link>
                {' · '}
                <Link to="/terms" className="underline">Terms</Link>
              </p>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-1 flex-col">
              <h1 className="text-4xl font-semibold">What's your name?</h1>
              <div className="mt-6 flex flex-wrap gap-2">
                {AVATARS.map((item) => (
                  <button key={item} type="button" onClick={() => setAvatar(item)} className={`h-12 w-12 rounded-2xl text-2xl ${avatar === item ? 'bg-white/15 ring-2 ring-primary' : 'bg-surface'}`}>{item}</button>
                ))}
              </div>
              <div className="mt-6">
                <Field label="Display name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Akki" maxLength={32} autoFocus />
              </div>
              <div className="mt-auto flex gap-3 pt-8">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1" disabled={!canName} onClick={() => setStep(2)}>Next</Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-1 flex-col">
              <h1 className="text-4xl font-semibold">Pick your username.</h1>
              <p className="mt-2 text-sm text-muted">Email stays between you and Toodle. Nobody else sees it.</p>
              <div className="mt-6 space-y-4">
                <Field label="Username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="akki" hint={usernameState || '3–20 letters, numbers, underscores'} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@email.com" autoComplete="email" />
                <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                <Field label="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" hint={passwordMismatch ? 'Those passwords do not match.' : undefined} />
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={oldEnough} onChange={(event) => setOldEnough(event.target.checked)} />
                  <span>I am {MIN_AGE} or older, and I agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.</span>
                </label>
              </div>
              <div className="mt-auto flex gap-3 pt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" disabled={!canAccount} onClick={() => setStep(3)}>Next</Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-1 flex-col">
              <h1 className="text-4xl font-semibold">What's your mood?</h1>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood.text}
                    type="button"
                    onClick={() => { setCustomMood(false); setMoodEmoji(mood.emoji); setMoodText(mood.text); }}
                    className={`rounded-2xl border px-3 py-3 text-left text-sm ${!customMood && moodText === mood.text ? 'border-primary bg-white/10' : 'border-line bg-surface'}`}
                  >
                    {mood.emoji} {mood.text}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-3 text-left text-sm text-muted" onClick={() => setCustomMood(true)}>Or write your own</button>
              {customMood ? (
                <div className="mt-3">
                  <Field label="Custom mood" value={moodText} onChange={(event) => setMoodText(event.target.value)} placeholder="pretending to work" maxLength={48} />
                </div>
              ) : null}
              <div className="mt-auto flex gap-3 pt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1" disabled={moodText.trim().length < 1} onClick={() => setStep(4)}>Next</Button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="text-6xl">{avatar}</div>
              <h1 className="mt-4 text-4xl font-semibold">You're ready.</h1>
              <p className="mt-2 text-muted">{displayName} · @{username.replace(/^@/, '').toLowerCase()}</p>
              <p className="mt-1">{moodEmoji} {moodText}</p>
              <p className="mt-6 text-lg">Find someone to Toodle with.</p>
              <Button className="mt-8 w-full" disabled={busy} onClick={() => void finish()}>{busy ? 'Setting you up…' : "Let's Toodle"}</Button>
            </div>
          )}
        </motion.div>
      </div>
    </Screen>
  );
}
