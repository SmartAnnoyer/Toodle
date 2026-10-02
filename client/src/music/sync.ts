import type { MusicSnapshot, SharedMusicState } from './MusicTypes';

export function livePosition(state: Pick<SharedMusicState, 'position' | 'status' | 'startedAt' | 'duration' | 'mode' | 'revealed' | 'clipSeconds'>, now: number): number {
  const clip = state.mode === 'guess' && !state.revealed && state.clipSeconds && state.clipSeconds > 0 ? state.clipSeconds : 0;
  const span = clip > 0 ? clip : Math.max(0, state.duration);
  const parked = Math.max(0, state.position);
  const base = span > 0 ? Math.min(parked, span) : parked;
  if (state.status !== 'playing' || state.startedAt == null) return base;
  const next = base + (now - state.startedAt) / 1000;
  if (span <= 0) return Math.max(0, next);
  return next % span;
}

export type DriftFix = 'ignore' | 'smooth' | 'hard';

export function driftFix(differenceSeconds: number): DriftFix {
  const gap = Math.abs(differenceSeconds);
  if (gap < 0.3) return 'ignore';
  if (gap <= 1) return 'smooth';
  return 'hard';
}

export function correctTime(local: number, remote: number): number | null {
  const fix = driftFix(remote - local);
  if (fix === 'ignore') return null;
  if (fix === 'smooth') return local + (remote - local) * 0.45;
  return remote;
}

export function vibePresence(state: SharedMusicState | null, myId: string | undefined, friendName: string): string {
  if (!state) return '';
  if (state.mode === 'guess' && state.mystery) return 'Mystery vibe';
  if (state.status === 'playing') return `You + ${friendName} are vibing`;
  if (state.updatedBy && myId && state.updatedBy === myId) return 'You paused';
  return `${friendName} paused`;
}

export function vibeNotice(code: string | undefined, mine: boolean, friendName: string): string {
  const who = mine ? 'You' : friendName;
  if (code === 'paused') return `${who} paused the vibe`;
  if (code === 'seek') return `${who} jumped in the song`;
  if (code === 'skipped') return `${who} changed the song`;
  if (code === 'started') return `${who} started the vibe`;
  if (code === 'friend-left') return `${friendName} left the vibe`;
  if (code === 'guess') return 'A guess is waiting.';
  if (code === 'wrong') return 'Not quite. Keep listening.';
  if (code === 'correct') return 'Got it.';
  if (code === 'reveal') return 'The song is out.';
  if (code === 'hint') return 'A hint just dropped.';
  if (code === 'guess-start') return 'Mystery song started.';
  if (code === 'guess-wait') return 'Waiting on a song pick.';
  if (code === 'switch') return 'New round. Your turn to switch it up.';
  if (code === 'queued') return `${who} updated the queue`;
  return '';
}

export function snapshotFrom(state: SharedMusicState | null): MusicSnapshot {
  if (!state) return { status: 'idle', energy: 'normal' };
  return {
    status: state.status,
    energy: state.energy,
    mood: state.mood,
    trackId: state.trackId,
    title: state.title,
  };
}
