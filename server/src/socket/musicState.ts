import { randomBytes } from 'node:crypto';
import { guessMatches, hintLine } from './guessMatch.js';

export type RoomEnergy = 'calm' | 'normal' | 'energetic' | 'chaotic';
export type MusicControl = 'both' | 'hostOnly';

export interface TrackCommand {
  trackId: string;
  title: string;
  artist?: string;
  audioUrl: string;
  duration: number;
  energy?: string;
  mood?: string;
}

export interface QueuedTrack extends TrackCommand {
  addedBy: string;
}

export interface GuessRound {
  pickerId: string;
  guesserId: string;
  round: number;
  hidden: boolean;
  revealed: boolean;
  revealAt: number | null;
  hints: string[];
  hintKinds: string[];
  scores: Record<string, number>;
  winnerId?: string;
  token: string;
  lastGuess?: { userId: string; text: string; correct: boolean };
  track?: TrackCommand;
}

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
  control: MusicControl;
  mode: 'listen' | 'guess';
  hostId: string;
  queue: QueuedTrack[];
  notice?: string;
  game?: GuessRound;
}

export type MusicCommand =
  | { type: 'play'; track: TrackCommand; position?: number }
  | { type: 'resume' }
  | { type: 'pause' }
  | { type: 'seek'; position: number }
  | { type: 'change'; track: TrackCommand }
  | { type: 'stop' }
  | { type: 'control'; control: MusicControl }
  | { type: 'queue-add'; track: TrackCommand }
  | { type: 'queue-remove'; trackId: string }
  | { type: 'next' }
  | { type: 'guess-invite'; pickerId: string; guesserId: string }
  | { type: 'guess-start'; track: TrackCommand; seconds: number; guesserId?: string }
  | { type: 'guess-submit'; text: string }
  | { type: 'guess-hint'; kind: 'letter' | 'mood' }
  | { type: 'guess-reveal' }
  | { type: 'guess-next'; pickerId: string; guesserId: string };

export interface PublicMusic {
  conversationId: string;
  mode: 'listen' | 'guess';
  status: 'playing' | 'paused';
  position: number;
  startedAt?: number;
  duration: number;
  version: number;
  updatedBy?: string;
  control: MusicControl;
  hostId: string;
  energy: RoomEnergy;
  notice?: string;
  queue: { trackId: string; title: string; artist?: string; addedBy: string }[];
  mystery?: boolean;
  revealed?: boolean;
  role?: 'picker' | 'guesser';
  round?: number;
  revealAt?: number | null;
  hints?: string[];
  scores?: Record<string, number>;
  lastGuess?: { userId: string; text: string; correct: boolean };
  pickerId?: string;
  guesserId?: string;
  waiting?: boolean;
  sealed?: boolean;
  trackId?: string;
  title?: string;
  artist?: string;
  audioUrl?: string;
  mood?: string;
}

const ENERGIES = new Set<RoomEnergy>(['calm', 'normal', 'energetic', 'chaotic']);

export function liveMusicPosition(state: Pick<RoomMusic, 'position' | 'status' | 'startedAt' | 'duration'>, now: number): number {
  const duration = Math.max(0, state.duration);
  const parked = Math.max(0, state.position);
  const base = duration > 0 ? Math.min(parked, duration) : parked;
  if (state.status !== 'playing' || state.startedAt == null) return base;
  const next = base + (now - state.startedAt) / 1000;
  if (duration <= 0) return Math.max(0, next);
  return next % duration;
}

function allowed(track: TrackCommand): boolean {
  return track.audioUrl.startsWith('/audio/music/')
    && !track.audioUrl.includes('..')
    && !track.audioUrl.includes('\\')
    && track.duration > 0
    && track.duration <= 900
    && track.title.trim().length > 0;
}

function energyOf(value: string | undefined): RoomEnergy {
  return ENERGIES.has(value as RoomEnergy) ? value as RoomEnergy : 'normal';
}

function bump(current: RoomMusic, userId: string, notice: string, patch: Partial<RoomMusic>): RoomMusic {
  return { ...current, ...patch, updatedBy: userId, notice, version: current.version + 1 };
}

function locked(current: RoomMusic | null, userId: string, command: MusicCommand): boolean {
  if (!current || current.control !== 'hostOnly' || current.hostId === userId) return false;
  return command.type !== 'stop' && command.type !== 'control' && command.type !== 'guess-submit';
}

function adopt(current: RoomMusic | null, track: TrackCommand, conversationId: string, userId: string, now: number, status: 'playing' | 'paused', position: number, notice: string): RoomMusic {
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
    control: current?.control ?? 'both',
    mode: 'listen',
    hostId: current?.hostId ?? userId,
    queue: current?.queue ?? [],
    notice,
    game: undefined,
  };
}

function freshGame(pickerId: string, guesserId: string, round: number, scores: Record<string, number>): GuessRound {
  return {
    pickerId,
    guesserId,
    round,
    hidden: true,
    revealed: false,
    revealAt: null,
    hints: [],
    hintKinds: [],
    scores,
    token: randomBytes(24).toString('hex'),
  };
}

function reveal(current: RoomMusic, userId: string, notice: string): RoomMusic {
  if (!current.game) return current;
  const track = current.game.track;
  return bump(current, userId, notice, {
    mode: 'guess',
    status: current.status,
    title: track?.title ?? current.title,
    artist: track?.artist ?? current.artist,
    trackId: track?.trackId ?? current.trackId,
    audioUrl: track?.audioUrl ?? current.audioUrl,
    game: { ...current.game, hidden: false, revealed: true, track },
  });
}

export function reduceMusic(current: RoomMusic | null, command: MusicCommand, userId: string, now: number, conversationId: string): { next: RoomMusic | null; changed: boolean } {
  const expired = expireGuess(current, now);
  const state = expired.next;
  if (locked(state, userId, command)) return { next: state, changed: expired.changed };

  if (command.type === 'stop') return { next: null, changed: state != null };
  if (command.type === 'control') {
    if (!state || state.control === command.control) return { next: state, changed: expired.changed };
    return { changed: true, next: bump(state, userId, 'control', { control: command.control }) };
  }
  if (command.type === 'resume') {
    if (!state || state.status === 'playing' || state.duration <= 0) return { next: state, changed: expired.changed };
    return {
      changed: true,
      next: bump(state, userId, 'started', {
        status: 'playing',
        position: liveMusicPosition(state, now),
        startedAt: now,
      }),
    };
  }
  if (command.type === 'pause') {
    if (!state || state.status === 'paused') return { next: state, changed: expired.changed };
    return {
      changed: true,
      next: bump(state, userId, 'paused', {
        status: 'paused',
        position: liveMusicPosition(state, now),
        startedAt: undefined,
      }),
    };
  }
  if (command.type === 'seek') {
    if (!state || !Number.isFinite(command.position)) return { next: state, changed: expired.changed };
    const position = Math.min(state.duration, Math.max(0, command.position));
    return {
      changed: true,
      next: bump(state, userId, 'seek', {
        position,
        startedAt: state.status === 'playing' ? now : undefined,
      }),
    };
  }
  if (command.type === 'queue-add') {
    if (!state || state.mode === 'guess' || !allowed(command.track) || state.queue.length >= 20) return { next: state, changed: expired.changed };
    return { changed: true, next: bump(state, userId, 'queued', { queue: [...state.queue, { ...command.track, addedBy: userId }] }) };
  }
  if (command.type === 'queue-remove') {
    if (!state) return { next: state, changed: expired.changed };
    const queue = state.queue.filter((item) => item.trackId !== command.trackId);
    if (queue.length === state.queue.length) return { next: state, changed: expired.changed };
    return { changed: true, next: bump(state, userId, 'queued', { queue }) };
  }
  if (command.type === 'next') {
    if (!state || state.queue.length === 0) return { next: state, changed: expired.changed };
    const [head, ...queue] = state.queue;
    if (!head || !allowed(head)) return { next: state, changed: expired.changed };
    return { changed: true, next: { ...adopt(state, head, conversationId, userId, now, 'playing', 0, 'skipped'), queue } };
  }
  if (command.type === 'guess-invite') {
    if (!command.pickerId || !command.guesserId || command.pickerId === command.guesserId) return { next: state, changed: expired.changed };
    const scores = state?.game?.scores ?? {};
    const round = state?.game ? state.game.round : 1;
    const next = adopt(state, {
      trackId: 'mystery',
      title: 'Mystery',
      audioUrl: '/audio/music/mystery.mp3',
      duration: 1,
    }, conversationId, userId, now, 'paused', 0, 'guess-wait');
    next.mode = 'guess';
    next.trackId = '';
    next.title = '';
    next.artist = undefined;
    next.audioUrl = '';
    next.duration = 0;
    next.game = freshGame(command.pickerId, command.guesserId, round, scores);
    return { changed: true, next };
  }
  if (command.type === 'guess-start') {
    if (!allowed(command.track)) return { next: state, changed: expired.changed };
    const pickerId = state?.game?.pickerId ?? userId;
    if (state?.game && pickerId !== userId) return { next: state, changed: expired.changed };
    const guesserId = state?.game?.guesserId ?? command.guesserId;
    if (!guesserId || guesserId === userId) return { next: state, changed: expired.changed };
    const seconds = [0, 30, 45, 60, 90].includes(command.seconds) ? command.seconds : 60;
    const game = freshGame(pickerId, guesserId, state?.game?.round ?? 1, state?.game?.scores ?? {});
    game.track = command.track;
    game.revealAt = seconds > 0 ? now + seconds * 1000 : null;
    const next = adopt(state, command.track, conversationId, userId, now, 'playing', 0, 'guess-start');
    next.mode = 'guess';
    next.hostId = state?.hostId ?? userId;
    next.queue = [];
    next.game = game;
    return { changed: true, next };
  }
  if (command.type === 'guess-submit') {
    const game = state?.game;
    if (!state || !game || game.revealed || game.guesserId !== userId || !game.track) return { next: state, changed: expired.changed };
    const text = command.text.trim().slice(0, 80);
    if (text.length < 2) return { next: state, changed: expired.changed };
    const correct = guessMatches(text, game.track.title, game.track.artist);
    if (!correct) {
      return {
        changed: true,
        next: bump(state, userId, 'wrong', { game: { ...game, lastGuess: { userId, text, correct: false } } }),
      };
    }
    const scores = { ...game.scores, [userId]: (game.scores[userId] ?? 0) + 1 };
    const opened = reveal(state, userId, 'correct');
    return {
      changed: true,
      next: {
        ...opened,
        game: opened.game ? { ...opened.game, scores, winnerId: userId, lastGuess: { userId, text, correct: true } } : opened.game,
      },
    };
  }
  if (command.type === 'guess-hint') {
    const game = state?.game;
    if (!state || !game || game.revealed || game.pickerId !== userId || !game.track) return { next: state, changed: expired.changed };
    if (game.hintKinds.includes(command.kind)) return { next: state, changed: expired.changed };
    const line = hintLine(command.kind, game.track.title, game.track.mood);
    if (!line) return { next: state, changed: expired.changed };
    return {
      changed: true,
      next: bump(state, userId, 'hint', {
        game: { ...game, hintKinds: [...game.hintKinds, command.kind], hints: [...game.hints, line] },
      }),
    };
  }
  if (command.type === 'guess-reveal') {
    if (!state?.game || state.game.revealed || state.game.pickerId !== userId) return { next: state, changed: expired.changed };
    return { changed: true, next: reveal(state, userId, 'reveal') };
  }
  if (command.type === 'guess-next') {
    if (!state?.game) return { next: state, changed: expired.changed };
    if (command.pickerId !== state.game.pickerId && command.pickerId !== state.game.guesserId) return { next: state, changed: expired.changed };
    const scores = state.game.scores;
    const next = bump(state, userId, 'switch', {
      mode: 'guess',
      status: 'paused',
      position: 0,
      startedAt: undefined,
      trackId: '',
      title: '',
      artist: undefined,
      audioUrl: '',
      duration: 0,
      game: freshGame(command.pickerId, command.guesserId, state.game.round + 1, scores),
    });
    return { changed: true, next };
  }

  if (!allowed(command.track)) return { next: state, changed: expired.changed };
  if (state?.mode === 'guess' && state.game && !state.game.revealed && state.game.pickerId !== userId) {
    return { next: state, changed: expired.changed };
  }
  if (command.type === 'play' && state?.status === 'playing' && state.trackId === command.track.trackId && state.mode === 'listen') {
    return { next: state, changed: expired.changed };
  }
  const position = command.type === 'play'
    ? command.position ?? (state?.trackId === command.track.trackId ? liveMusicPosition(state, now) : 0)
    : 0;
  const notice = command.type === 'change' ? 'skipped' : 'started';
  return { changed: true, next: adopt(state, command.track, conversationId, userId, now, 'playing', position, notice) };
}

export function expireGuess(current: RoomMusic | null, now: number): { next: RoomMusic | null; changed: boolean } {
  const game = current?.game;
  if (!current || !game || game.revealed || game.revealAt == null || now < game.revealAt) return { next: current, changed: false };
  return { next: reveal(current, game.pickerId, 'reveal'), changed: true };
}

export function projectMusic(state: RoomMusic, userId: string): PublicMusic {
  const game = state.game;
  const guesser = Boolean(game && game.guesserId === userId && game.hidden && !game.revealed);
  const base: PublicMusic = {
    conversationId: state.conversationId,
    mode: state.mode,
    status: state.status,
    position: state.position,
    startedAt: state.startedAt,
    duration: guesser ? state.duration : state.duration,
    version: state.version,
    updatedBy: state.updatedBy,
    control: state.control,
    hostId: state.hostId,
    energy: guesser ? 'normal' : state.energy,
    notice: state.notice,
    queue: guesser ? [] : state.queue.map((item) => ({
      trackId: item.trackId,
      title: item.title,
      artist: item.artist,
      addedBy: item.addedBy,
    })),
  };
  if (!game) {
    return {
      ...base,
      trackId: state.trackId,
      title: state.title,
      artist: state.artist,
      audioUrl: state.audioUrl,
      mood: state.mood,
    };
  }
  const shared = {
    ...base,
    mystery: game.hidden && !game.revealed,
    revealed: game.revealed,
    role: game.pickerId === userId ? 'picker' as const : 'guesser' as const,
    round: game.round,
    revealAt: game.revealAt,
    hints: game.hints,
    scores: game.scores,
    lastGuess: game.lastGuess,
    pickerId: game.pickerId,
    guesserId: game.guesserId,
    waiting: !game.track,
    sealed: game.hidden && !game.revealed,
  };
  if (guesser) {
    return {
      ...shared,
      audioUrl: game.track ? `/api/music/mystery/${game.token}` : undefined,
    };
  }
  const track = game.track;
  return {
    ...shared,
    trackId: track?.trackId ?? (game.revealed ? state.trackId : undefined),
    title: track?.title ?? (game.revealed ? state.title : undefined),
    artist: track?.artist ?? state.artist,
    audioUrl: track?.audioUrl ?? state.audioUrl,
    mood: track?.mood ?? state.mood,
    mystery: false,
  };
}

export function mysteryAudio(rooms: Iterable<RoomMusic>, token: string): string | null {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  for (const room of rooms) {
    if (room.game?.token === token && room.game.track?.audioUrl) return room.game.track.audioUrl;
  }
  return null;
}
