import type { Socket } from 'socket.io';
import { z } from 'zod';
import { SocketEvents } from '../constants/events.js';
import { emitToConversation } from './hub.js';
import { reduceMusic, type MusicCommand, type RoomMusic, type TrackCommand } from './musicState.js';

const rooms = new Map<string, RoomMusic>();

const trackSchema = z.object({
  trackId: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  artist: z.string().max(80).optional(),
  audioUrl: z.string().max(180),
  duration: z.number().positive().max(180),
  energy: z.string().max(20).optional(),
  mood: z.string().max(40).optional(),
});

const playSchema = z.object({
  conversationId: z.string().uuid(),
  track: trackSchema,
  position: z.number().min(0).max(180).optional(),
});

const roomSchema = z.object({ conversationId: z.string().uuid() });
const seekSchema = roomSchema.extend({ position: z.number() });

function trackOf(input: z.infer<typeof trackSchema>): TrackCommand {
  return input;
}

function publish(conversationId: string, next: RoomMusic | null) {
  if (!next) {
    rooms.delete(conversationId);
    emitToConversation(conversationId, SocketEvents.MusicStop, { conversationId });
    return;
  }
  rooms.set(conversationId, next);
  emitToConversation(conversationId, SocketEvents.MusicSyncState, next);
}

function run(conversationId: string, command: MusicCommand, userId: string) {
  const result = reduceMusic(rooms.get(conversationId) ?? null, command, userId, Date.now(), conversationId);
  if (!result.changed) return;
  publish(conversationId, result.next);
}

export function attachMusic(socket: Socket, userId: string) {
  const joined = (conversationId: string) => socket.rooms.has(`conversation:${conversationId}`);

  socket.on(SocketEvents.MusicSyncRequest, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    const state = rooms.get(parsed.data.conversationId) ?? null;
    socket.emit(SocketEvents.MusicSyncState, state ? state : { conversationId: parsed.data.conversationId, state: null });
  });

  socket.on(SocketEvents.MusicPlay, (payload: unknown) => {
    const parsed = playSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'play', track: trackOf(parsed.data.track), position: parsed.data.position }, userId);
  });

  socket.on(SocketEvents.MusicPause, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'pause' }, userId);
  });

  socket.on(SocketEvents.MusicSeek, (payload: unknown) => {
    const parsed = seekSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'seek', position: parsed.data.position }, userId);
  });

  socket.on(SocketEvents.MusicChange, (payload: unknown) => {
    const parsed = playSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'change', track: trackOf(parsed.data.track) }, userId);
  });

  socket.on(SocketEvents.MusicStop, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'stop' }, userId);
  });
}
