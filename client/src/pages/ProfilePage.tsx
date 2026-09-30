import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AVATARS, MOODS } from '../constants';
import { Avatar, Button, Field, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/http';
import { readSoundPrefs, writeSoundEnabled, writeSoundVolume } from '../toodle/audio/ToodleAudioState';
import { CHAOS_OPTIONS, readChaos, writeChaos } from '../toodle/settings';
import type { ChaosLevel } from '../toodle/types';

export function ProfilePage() {
  const { profile, loading, refreshProfile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [moodEmoji, setMoodEmoji] = useState(profile?.moodEmoji ?? '🫠');
  const [moodText, setMoodText] = useState(profile?.moodText ?? 'surviving');
  const [avatar, setAvatar] = useState(profile?.avatarEmoji ?? '✨');
  const [busy, setBusy] = useState(false);
  const [chaos, setChaos] = useState<ChaosLevel>(readChaos);
  const [soundsOn, setSoundsOn] = useState(() => readSoundPrefs().enabled);
  const [soundVolume, setSoundVolume] = useState(() => readSoundPrefs().volume);

  if (loading) return <p className="px-4 pt-10 text-muted">Loading you…</p>;
  if (!profile) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="text-muted">Your session wandered off. Sign in again.</p>
        <Button className="mt-5" variant="danger" onClick={() => void signOut().then(() => navigate('/welcome'))}>Log out</Button>
      </div>
    );
  }

  async function save() {
    setBusy(true);
    try {
      await api('/api/profile/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, username, moodEmoji, moodText, avatarEmoji: avatar }),
      });
      await refreshProfile();
      toast('Saved');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pt-8">
      <div className="flex flex-col items-center text-center">
        <Avatar emoji={avatar} size="lg" />
        <h1 className="mt-3 text-3xl font-semibold">{profile.displayName}</h1>
        <p className="text-muted">@{profile.username}</p>
        <p className="mt-2">{profile.moodEmoji} {profile.moodText}</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="glass rounded-[1.4rem] p-4 text-center">
          <p className="text-2xl">🔥 {profile.bestStreak}</p>
          <p className="text-sm text-muted">{profile.activeStreaks} active streaks</p>
        </div>
        <div className="glass rounded-[1.4rem] p-4 text-center">
          <p className="text-2xl">⚡ {profile.shortcutCount}</p>
          <p className="text-sm text-muted">shortcuts</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {AVATARS.map((item) => (
          <button key={item} type="button" onClick={() => setAvatar(item)} className={`h-11 w-11 rounded-2xl text-xl ${avatar === item ? 'ring-2 ring-primary' : 'bg-surface'}`}>{item}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <Field label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <Field label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
        <Field label="Mood" value={moodText} onChange={(event) => setMoodText(event.target.value)} maxLength={48} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {MOODS.map((mood) => (
          <button key={mood.text} type="button" className="shrink-0 rounded-full border border-line px-3 py-2 text-sm" onClick={() => { setMoodEmoji(mood.emoji); setMoodText(mood.text); }}>{mood.emoji} {mood.text}</button>
        ))}
      </div>
      <label className="mt-4 flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
        Show online status
        <input
          type="checkbox"
          checked={profile.showOnline}
          onChange={(event) => {
            api('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ showOnline: event.target.checked }) })
              .then(() => refreshProfile())
              .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
          }}
        />
      </label>
      <div className="mt-4">
        <p className="mb-2 text-sm text-muted">Toodle reactions</p>
        <div className="grid grid-cols-2 gap-2">
          {CHAOS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => { setChaos(option.id); writeChaos(option.id); }}
              className={`rounded-2xl border px-3 py-3 text-sm ${chaos === option.id ? 'border-primary bg-white/10' : 'border-line'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-4 flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-sm">
        Toodle sounds
        <input
          type="checkbox"
          checked={soundsOn}
          onChange={(event) => {
            setSoundsOn(event.target.checked);
            writeSoundEnabled(event.target.checked);
          }}
        />
      </label>
      {soundsOn ? (
        <label className="mt-3 block text-sm text-muted">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={soundVolume}
            aria-label="Toodle volume"
            className="mt-2 w-full"
            onChange={(event) => {
              const next = Number(event.target.value);
              setSoundVolume(next);
              writeSoundVolume(next);
            }}
          />
        </label>
      ) : null}
      <p className="mt-3 text-sm text-muted">Your email stays hidden. Only your username is public.</p>
      <div className="mt-5 flex flex-col gap-3">
        <Button disabled={busy} onClick={() => void save()}>Save</Button>
        <Button variant="soft" onClick={toggle}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</Button>
        <Button variant="ghost" onClick={() => navigate('/shortcuts')}>Manage shortcuts</Button>
        <Button variant="ghost" onClick={() => navigate('/account')}>Account and password</Button>
        <p className="text-center text-xs text-muted">
          <Link to="/privacy" className="underline">Privacy</Link>
          {' · '}
          <Link to="/terms" className="underline">Terms</Link>
        </p>
        <Button variant="danger" onClick={() => void signOut().then(() => navigate('/welcome'))}>Log out</Button>
      </div>
    </div>
  );
}
