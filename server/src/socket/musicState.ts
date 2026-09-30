export type RoomEnergy = 'calm' | 'normal' | 'energetic' | 'chaotic';

export interface RoomMusic {
  conversationId: string;
  trackId: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration: number;
  energy: RoomEnergy;
  mood?: string;
  status: 'playing' | 'paused';
  position: number;
  startedAt?: number;
  updatedBy: string;
  version: number;
  control: 'both';
}

export interface TrackCommand {
  trackId: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration: number;
  energy?: string;
  mood?: string;
}

export type MusicCommand =
  | { type: 'play'; track: TrackCommand; position?: number }
  | { type: 'pause' }
  | { type: 'seek'; position: number }
  | { type: 'change'; track: TrackCommand }
  | { type: 'stop' };

const ENERGIES = new Set<RoomEnergy>(['calm', 'normal', 'energetic', 'chaotic']);

export function liveMusicPosition(state: Pick<RoomMusic, 'position' | 'status' | 'startedAt' | 'duration'>, now: number): number {
  const duration = Math.max(0, state.duration);
  const parked = Math.min(duration, Math.max(0, state.position));
  if (state.status !== 'playing' || state.startedAt == null) return parked;
  return Math.min(duration, Math.max(0, parked + (now - state.startedAt) / 1000));
}

function allowed(track: TrackCommand): boolean {
  return track.audioUrl.startsWith('/audio/music/') && !track.audioUrl.includes('..') && track.duration > 0 && track.duration <= 180 && track.title.trim().length > 0;
}

function energyOf(value: string | undefined): RoomEnergy {
  return ENERGIES.has(value as RoomEnergy) ? value as RoomEnergy : 'normal';
}

function adopt(current: RoomMusic | null, track: TrackCommand, conversationId: string, userId: string, now: number, status: 'playing' | 'paused', position: number): RoomMusic {
  return {
    conversationId,
    trackId: track.trackId.slice(0, 80),
    title: track.title.trim().slice(0, 80),
    artist: track.artist?.trim().slice(0, 80),
    audioUrl: track.audioUrl,
    duration: track.duration,
    energy: energyOf(track.energy),
    mood: track.mood?.slice(0, 40),
    status,
    position: Math.min(track.duration, Math.max(0, position)),
    startedAt: status === 'playing' ? now : undefined,
    updatedBy: userId,
    version: (current?.version ?? 0) + 1,
    control: 'both',
  };
}

export function reduceMusic(current: RoomMusic | null, command: MusicCommand, userId: string, now: number, conversationId: string): { next: RoomMusic | null; changed: boolean } {
  if (command.type === 'stop') {
    return { next: null, changed: current != null };
  }
  if (command.type === 'pause') {
    if (!current || current.status === 'paused') return { next: current, changed: false };
    return {
      changed: true,
      next: {
        ...current,
        status: 'paused',
        position: liveMusicPosition(current, now),
        startedAt: undefined,
        updatedBy: userId,
        version: current.version + 1,
      },
    };
  }
  if (command.type === 'seek') {
    if (!current || !Number.isFinite(command.position)) return { next: current, changed: false };
    const position = Math.min(current.duration, Math.max(0, command.position));
    return {
      changed: true,
      next: {
        ...current,
        position,
        startedAt: current.status === 'playing' ? now : undefined,
        updatedBy: userId,
        version: current.version + 1,
      },
    };
  }
  if (!allowed(command.track)) return { next: current, changed: false };
  if (command.type === 'play' && current?.status === 'playing' && current.trackId === command.track.trackId) {
    return { next: current, changed: false };
  }
  const position = command.type === 'play'
    ? command.position ?? (current?.trackId === command.track.trackId ? liveMusicPosition(current, now) : 0)
    : 0;
  return {
    changed: true,
    next: adopt(current, command.track, conversationId, userId, now, 'playing', position),
  };
}
