import type { MusicSnapshot, SharedMusicState } from './MusicTypes';

export function livePosition(state: Pick<SharedMusicState, 'position' | 'status' | 'startedAt' | 'duration'>, now: number): number {
  const duration = Math.max(0, state.duration);
  const parked = Math.min(duration, Math.max(0, state.position));
  if (state.status !== 'playing' || state.startedAt == null) return parked;
  return Math.min(duration, Math.max(0, parked + (now - state.startedAt) / 1000));
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
  if (state.status === 'playing') return `You + ${friendName} are vibing`;
  if (state.updatedBy && myId && state.updatedBy === myId) return 'You paused';
  return `${friendName} paused`;
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
