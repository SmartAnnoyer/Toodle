import { useEffect, useRef, useState } from 'react';
import { SocketEvents } from '../constants';
import { useSocket } from '../hooks/useSocket';
import { apiUrl } from '../lib/http';
import { serverNowMs } from '../lib/time';
import { LOCAL_TRACKS } from './catalog';
import { musicPlayer } from './MusicManager';
import { searchTracks } from './MusicSearch';
import { livePosition, snapshotFrom } from './sync';
import type { MusicSnapshot, MusicTrack, SharedMusicState, ToodleMusicEvent } from './MusicTypes';

function isState(value: unknown): value is SharedMusicState {
  if (!value || typeof value !== 'object') return false;
  const body = value as SharedMusicState;
  return typeof body.version === 'number' && typeof body.conversationId === 'string' && (typeof body.trackId === 'string' || body.mystery === true || body.mode === 'guess');
}

function playbackUrl(url?: string) {
  if (!url) return undefined;
  if (url.startsWith('/api/')) return `${apiUrl()}${url}`;
  return url;
}

function safeView(payload: SharedMusicState): SharedMusicState {
  const audioUrl = playbackUrl(payload.audioUrl);
  if (payload.mystery && !payload.revealed) {
    const hiddenUrl = audioUrl?.includes('/api/music/mystery/') ? audioUrl : undefined;
    return {
      ...payload,
      title: undefined,
      artist: undefined,
      trackId: undefined,
      mood: undefined,
      artwork: undefined,
      queue: [],
      audioUrl: hiddenUrl,
    };
  }
  return { ...payload, audioUrl };
}

export function useVibe({
  conversationId,
  myId,
  friendId,
  onEvent,
}: {
  conversationId: string;
  myId?: string;
  friendId?: string;
  onEvent: (event: ToodleMusicEvent) => void;
}) {
  const { socket, status } = useSocket();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>(LOCAL_TRACKS);
  const [state, setState] = useState<SharedMusicState | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [tick, setTick] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = Number(globalThis.localStorage?.getItem('toodle-vibe-volume'));
    return Number.isFinite(saved) && saved >= 0 ? saved : 0.85;
  });
  const stateRef = useRef<SharedMusicState | null>(null);
  const seen = useRef(0);
  const onEventRef = useRef(onEvent);
  const near = useRef(false);
  const played = useRef(0);
  const longFired = useRef(false);
  onEventRef.current = onEvent;

  function remember(next: SharedMusicState | null, event?: ToodleMusicEvent) {
    const previous = stateRef.current;
    stateRef.current = next;
    setState(next);
    setTick((value) => value + 1);
    if (!next) {
      played.current = 0;
      longFired.current = false;
      near.current = false;
    }
    if (!event) return;
    if (event === 'music_changed' || event === 'music_started') {
      near.current = false;
    }
    if (previous?.trackId === next?.trackId && previous?.status === next?.status && event === 'music_started') return;
    onEventRef.current(event);
  }

  useEffect(() => {
    let gone = false;
    void searchTracks(query).then((found) => {
      if (!gone) setTracks(found);
    });
    return () => {
      gone = true;
    };
  }, [query]);

  useEffect(() => () => {
    musicPlayer.stop();
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const apply = async (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const body = payload as SharedMusicState & { state?: null; conversationId?: string };
      if ('state' in body && body.state === null) {
        if (body.conversationId === conversationId) {
          seen.current = 0;
          musicPlayer.stop();
          remember(null);
        }
        return;
      }
      if (!isState(payload) || payload.conversationId !== conversationId) return;
      if (payload.version < seen.current) return;
      const view = safeView(payload);
      const previous = stateRef.current;
      if (!view.audioUrl) musicPlayer.stop();
      const heard = view.audioUrl ? await musicPlayer.follow(view, serverNowMs()) : true;
      setNeedsTap(view.status === 'playing' && !heard);
      if (payload.version === seen.current && previous?.status === view.status && previous.trackId === view.trackId && previous.notice === view.notice) return;
      seen.current = payload.version;
      let event: ToodleMusicEvent | undefined;
      if (previous && previous.trackId && view.trackId && previous.trackId !== view.trackId) event = 'music_changed';
      else if (previous?.status !== 'playing' && view.status === 'playing') {
        event = previous ? 'music_resumed' : 'music_started';
      } else if (!previous && view.status === 'playing') event = 'music_started';
      else if (previous?.status === 'playing' && view.status === 'paused') event = 'music_paused';
      else if (previous && view.trackId && Math.abs(previous.position - view.position) > 0.75 && previous.trackId === view.trackId && view.updatedBy !== myId) {
        event = 'music_seeked';
      }
      stateRef.current = view;
      setState(view);
      setTick((value) => value + 1);
      if (event) onEventRef.current(event);
    };
    socket.on(SocketEvents.MusicSyncState, apply);
    const onStop = (payload: { conversationId?: string }) => {
      if (payload?.conversationId !== conversationId) return;
      seen.current = 0;
      musicPlayer.stop();
      remember(null);
    };
    socket.on(SocketEvents.MusicStop, onStop);
    const request = () => {
      socket.emit(SocketEvents.ConversationJoin, { conversationId });
      socket.emit(SocketEvents.MusicSyncRequest, { conversationId });
    };
    request();
    socket.on('connect', request);
    const sync = window.setInterval(() => {
      if (stateRef.current?.status === 'playing') socket.emit(SocketEvents.MusicSyncRequest, { conversationId });
    }, 8000);
    return () => {
      socket.off(SocketEvents.MusicSyncState, apply);
      socket.off(SocketEvents.MusicStop, onStop);
      socket.off('connect', request);
      window.clearInterval(sync);
    };
  }, [socket, conversationId, myId]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      const current = stateRef.current;
      if (!current || current.status !== 'playing') return;
      const position = livePosition(current, serverNowMs());
      played.current += 4;
      if (!near.current && current.duration - position < 4 && position > 1) {
        near.current = true;
        onEventRef.current('music_near_end');
      }
      if (!longFired.current && played.current >= 36) {
        longFired.current = true;
        onEventRef.current('music_long_play');
      }
    }, 4000);
    return () => window.clearInterval(handle);
  }, [conversationId]);

  function emitTrack(event: string, track: MusicTrack, position: number | undefined, duration: number) {
    socket?.emit(SocketEvents.ConversationJoin, { conversationId });
    socket?.emit(event, {
      conversationId,
      position,
      track: {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        audioUrl: track.audioUrl,
        duration,
        energy: track.energy,
        mood: track.mood,
      },
    });
  }

  async function play(track?: MusicTrack) {
    const current = stateRef.current;
    if (!track && current) {
      const heard = await musicPlayer.resume();
      setNeedsTap(!heard);
      remember({ ...current, status: 'playing', startedAt: serverNowMs(), updatedBy: myId }, current.status === 'paused' ? 'music_resumed' : undefined);
      socket?.emit(SocketEvents.MusicPlay, { conversationId });
      return;
    }
    const chosen = track ?? tracks.find((item) => item.id === current?.trackId) ?? tracks[0];
    if (!chosen) return;
    track = chosen;
    const position = current?.trackId === track.id ? musicPlayer.position() : 0;
    const starting = !current || current.status !== 'playing' || current.trackId !== track.id;
    const heard = await musicPlayer.start(track, position);
    const duration = musicPlayer.duration() || track.duration;
    if (!(duration > 0)) return;
    setNeedsTap(!heard);
    const event: ToodleMusicEvent = current && current.trackId !== track.id ? 'music_changed' : current?.status === 'paused' ? 'music_resumed' : 'music_started';
    remember({
      conversationId,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      audioUrl: track.audioUrl,
      duration,
      energy: track.energy,
      mood: track.mood,
      status: 'playing',
      position,
      startedAt: serverNowMs(),
      updatedBy: myId,
      version: seen.current,
      control: 'both',
    }, starting ? event : undefined);
    emitTrack(current && current.trackId !== track.id ? SocketEvents.MusicChange : SocketEvents.MusicPlay, track, position, duration);
  }

  function pause() {
    const current = stateRef.current;
    if (!current) return;
    musicPlayer.pause();
    remember({ ...current, status: 'paused', position: musicPlayer.position(), startedAt: undefined, updatedBy: myId }, 'music_paused');
    socket?.emit(SocketEvents.MusicPause, { conversationId });
  }

  function seek(position: number) {
    const current = stateRef.current;
    if (!current) return;
    const audio = position;
    void musicPlayer.follow({ ...current, position: audio, startedAt: current.status === 'playing' ? serverNowMs() : undefined }, serverNowMs());
    socket?.emit(SocketEvents.MusicSeek, { conversationId, position: audio });
  }

  function stop() {
    musicPlayer.stop();
    setNeedsTap(false);
    remember(null);
    socket?.emit(SocketEvents.MusicStop, { conversationId });
  }

  async function hear() {
    const ok = await musicPlayer.resume();
    setNeedsTap(!ok);
  }

  function change(track: MusicTrack) {
    void play(track);
  }

  function emitRoom(event: string, extra?: Record<string, unknown>) {
    socket?.emit(SocketEvents.ConversationJoin, { conversationId });
    socket?.emit(event, { conversationId, ...extra });
  }

  function setControl(control: 'both' | 'hostOnly') {
    emitRoom(SocketEvents.MusicControl, { control });
  }

  function queueAdd(track: MusicTrack) {
    emitTrack(SocketEvents.MusicQueueAdd, track, undefined, track.duration || 180);
  }

  function queueRemove(trackId: string) {
    emitRoom(SocketEvents.MusicQueueRemove, { trackId });
  }

  function next() {
    const current = stateRef.current;
    if (current?.queue && current.queue.length > 0) {
      emitRoom(SocketEvents.MusicNext);
      return;
    }
    const list = tracks;
    if (list.length === 0 || current?.mystery) return;
    const index = Math.max(0, list.findIndex((track) => track.id === current?.trackId));
    const upcoming = list[(index + 1) % list.length];
    if (upcoming) void play(upcoming);
  }

  function previous() {
    const current = stateRef.current;
    if (current?.mystery) return;
    const list = tracks;
    if (list.length === 0) return;
    const index = Math.max(0, list.findIndex((track) => track.id === current?.trackId));
    const upcoming = list[(index - 1 + list.length) % list.length];
    if (upcoming) void play(upcoming);
  }

  function inviteGuess(picker: 'me' | 'them') {
    if (!myId || !friendId) return;
    const pickerId = picker === 'me' ? myId : friendId;
    const guesserId = picker === 'me' ? friendId : myId;
    emitRoom(SocketEvents.MusicGuessInvite, { pickerId, guesserId });
    setExpanded(true);
  }

  async function startGuess(track: MusicTrack, seconds = 60) {
    if (!friendId) return;
    const heard = await musicPlayer.start(track, 0, false);
    const duration = musicPlayer.duration() || track.duration;
    if (!(duration > 0)) return;
    setNeedsTap(!heard);
    setExpanded(true);
    socket?.emit(SocketEvents.ConversationJoin, { conversationId });
    socket?.emit(SocketEvents.MusicGuessStart, {
      conversationId,
      seconds,
      guesserId: friendId,
      track: {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        audioUrl: track.audioUrl,
        duration,
        energy: track.energy,
        mood: track.mood,
      },
    });
  }

  function submitGuess(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    emitRoom(SocketEvents.MusicGuessSubmit, { text: trimmed });
  }

  function giveHint(kind: 'letter' | 'mood') {
    emitRoom(SocketEvents.MusicGuessHint, { kind });
  }

  function reveal() {
    emitRoom(SocketEvents.MusicGuessReveal);
  }

  function nextRound(picker: 'me' | 'them') {
    if (!myId || !friendId) return;
    const pickerId = picker === 'me' ? myId : friendId;
    const guesserId = picker === 'me' ? friendId : myId;
    emitRoom(SocketEvents.MusicGuessNext, { pickerId, guesserId });
  }

  function setVolume(next: number) {
    setVolumeState(next);
    musicPlayer.setVolume(next);
    globalThis.localStorage?.setItem('toodle-vibe-volume', String(next));
  }

  const snapshot: MusicSnapshot = snapshotFrom(stateRef.current);

  return {
    expanded,
    toggle: () => setExpanded((open) => !open),
    collapse: () => setExpanded(false),
    query,
    setQuery,
    tracks,
    state,
    tick,
    snapshot,
    reconnecting: status === 'disconnected',
    needsTap,
    hear: () => void hear(),
    play: () => void play(),
    pause,
    seek,
    change,
    stop,
    next,
    previous,
    setControl,
    queueAdd,
    queueRemove,
    inviteGuess,
    startGuess: (track: MusicTrack, seconds?: number) => void startGuess(track, seconds),
    submitGuess,
    giveHint,
    reveal,
    nextRound,
    volume,
    setVolume,
    friendReady: Boolean(friendId),
  };
}
