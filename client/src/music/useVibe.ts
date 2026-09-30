import { useEffect, useRef, useState } from 'react';
import { SocketEvents } from '../constants';
import { useSocket } from '../hooks/useSocket';
import { serverNowMs } from '../lib/time';
import { LOCAL_TRACKS } from './catalog';
import { musicPlayer } from './MusicManager';
import { searchTracks } from './MusicSearch';
import { livePosition, snapshotFrom } from './sync';
import type { MusicSnapshot, MusicTrack, SharedMusicState, ToodleMusicEvent } from './MusicTypes';

function isState(value: unknown): value is SharedMusicState {
  return Boolean(value && typeof value === 'object' && 'trackId' in value && 'version' in value);
}

export function useVibe({
  conversationId,
  myId,
  onEvent,
}: {
  conversationId: string;
  myId?: string;
  onEvent: (event: ToodleMusicEvent) => void;
}) {
  const { socket, status } = useSocket();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>(LOCAL_TRACKS);
  const [state, setState] = useState<SharedMusicState | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [tick, setTick] = useState(0);
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
      const previous = stateRef.current;
      const heard = await musicPlayer.follow(payload, serverNowMs());
      setNeedsTap(payload.status === 'playing' && !heard);
      if (payload.version === seen.current && previous?.status === payload.status && previous.trackId === payload.trackId) return;
      seen.current = payload.version;
      let event: ToodleMusicEvent | undefined;
      if (previous && previous.trackId !== payload.trackId) event = 'music_changed';
      else if (previous?.status !== 'playing' && payload.status === 'playing') {
        event = previous ? 'music_resumed' : 'music_started';
      } else if (!previous && payload.status === 'playing') event = 'music_started';
      else if (previous?.status === 'playing' && payload.status === 'paused') event = 'music_paused';
      else if (previous && Math.abs(previous.position - payload.position) > 0.75 && previous.trackId === payload.trackId && payload.updatedBy !== myId) {
        event = 'music_seeked';
      }
      stateRef.current = payload;
      setState(payload);
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

  async function play(track = tracks.find((item) => item.id === stateRef.current?.trackId) ?? tracks[0]) {
    if (!track) return;
    const current = stateRef.current;
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
  };
}
