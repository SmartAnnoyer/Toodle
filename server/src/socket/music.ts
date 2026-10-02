import type { Socket } from 'socket.io';
import { z } from 'zod';
import { SocketEvents } from '../constants/events.js';
import { conversationRoomSize, emitToConversation, emitToConversationEach } from './hub.js';
import { expireGuess, projectMusic, reduceMusic, type MusicCommand, type RoomMusic, type TrackCommand } from './musicState.js';

const rooms = new Map<string, RoomMusic>();

const trackSchema = z.object({
  trackId: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  artist: z.string().max(80).optional(),
  audioUrl: z.string().max(400),
  duration: z.number().positive().max(900),
  energy: z.string().max(20).optional(),
  mood: z.string().max(40).optional(),
});

const playSchema = z.object({
  conversationId: z.string().uuid(),
  track: trackSchema,
  position: z.number().min(0).max(900).optional(),
});

const roomSchema = z.object({ conversationId: z.string().uuid() });
const seekSchema = roomSchema.extend({ position: z.number() });
const controlSchema = roomSchema.extend({ control: z.enum(['both', 'hostOnly']) });
const queueRemoveSchema = roomSchema.extend({ trackId: z.string().min(1).max(80) });
const guessInviteSchema = roomSchema.extend({
  pickerId: z.string().uuid(),
  guesserId: z.string().uuid(),
});
const guessStartSchema = roomSchema.extend({
  track: trackSchema,
  seconds: z.number().int(),
  guesserId: z.string().uuid().optional(),
});
const guessSubmitSchema = roomSchema.extend({ text: z.string().min(1).max(80) });
const guessJudgeSchema = roomSchema.extend({ correct: z.boolean() });
const guessHintSchema = roomSchema.extend({ text: z.string().min(1).max(40) });
const guessNextSchema = roomSchema.extend({
  pickerId: z.string().uuid(),
  guesserId: z.string().uuid(),
});

function trackOf(input: z.infer<typeof trackSchema>): TrackCommand {
  return input;
}

export function musicRooms(): Iterable<RoomMusic> {
  return rooms.values();
}

function publish(conversationId: string, next: RoomMusic | null) {
  if (!next) {
    rooms.delete(conversationId);
    emitToConversation(conversationId, SocketEvents.MusicStop, { conversationId });
    return;
  }
  rooms.set(conversationId, next);
  emitToConversationEach(conversationId, SocketEvents.MusicSyncState, (userId) => projectMusic(next, userId));
}

function run(conversationId: string, command: MusicCommand, userId: string) {
  const expired = expireGuess(rooms.get(conversationId) ?? null, Date.now());
  const result = reduceMusic(expired.next, command, userId, Date.now(), conversationId);
  if (!result.changed && !expired.changed) return;
  publish(conversationId, result.next);
}

export function noteConversationLeft(conversationId: string, remaining: number) {
  if (remaining <= 0) rooms.delete(conversationId);
}

export function attachMusic(socket: Socket, userId: string) {
  const joined = (conversationId: string) => socket.rooms.has(`conversation:${conversationId}`);

  socket.on(SocketEvents.MusicSyncRequest, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    const conversationId = parsed.data.conversationId;
    const expired = expireGuess(rooms.get(conversationId) ?? null, Date.now());
    if (expired.changed) {
      publish(conversationId, expired.next);
      return;
    }
    const state = expired.next;
    socket.emit(SocketEvents.MusicSyncState, state ? projectMusic(state, userId) : { conversationId, state: null });
  });

  socket.on(SocketEvents.MusicPlay, (payload: unknown) => {
    const parsed = playSchema.safeParse(payload);
    if (parsed.success && joined(parsed.data.conversationId)) {
      run(parsed.data.conversationId, { type: 'play', track: trackOf(parsed.data.track), position: parsed.data.position }, userId);
      return;
    }
    const room = roomSchema.safeParse(payload);
    if (!room.success || !joined(room.data.conversationId)) return;
    run(room.data.conversationId, { type: 'resume' }, userId);
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

  socket.on(SocketEvents.MusicControl, (payload: unknown) => {
    const parsed = controlSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'control', control: parsed.data.control }, userId);
  });

  socket.on(SocketEvents.MusicQueueAdd, (payload: unknown) => {
    const parsed = playSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'queue-add', track: trackOf(parsed.data.track) }, userId);
  });

  socket.on(SocketEvents.MusicQueueRemove, (payload: unknown) => {
    const parsed = queueRemoveSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'queue-remove', trackId: parsed.data.trackId }, userId);
  });

  socket.on(SocketEvents.MusicNext, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'next' }, userId);
  });

  socket.on(SocketEvents.MusicGuessInvite, (payload: unknown) => {
    const parsed = guessInviteSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    if (parsed.data.pickerId !== userId && parsed.data.guesserId !== userId) return;
    run(parsed.data.conversationId, { type: 'guess-invite', pickerId: parsed.data.pickerId, guesserId: parsed.data.guesserId }, userId);
  });

  socket.on(SocketEvents.MusicGuessStart, (payload: unknown) => {
    const parsed = guessStartSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, {
      type: 'guess-start',
      track: trackOf(parsed.data.track),
      seconds: parsed.data.seconds,
      guesserId: parsed.data.guesserId,
    }, userId);
  });

  socket.on(SocketEvents.MusicGuessSubmit, (payload: unknown) => {
    const parsed = guessSubmitSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'guess-submit', text: parsed.data.text }, userId);
  });

  socket.on(SocketEvents.MusicGuessJudge, (payload: unknown) => {
    const parsed = guessJudgeSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'guess-judge', correct: parsed.data.correct }, userId);
  });

  socket.on(SocketEvents.MusicGuessHint, (payload: unknown) => {
    const parsed = guessHintSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'guess-hint', text: parsed.data.text }, userId);
  });

  socket.on(SocketEvents.MusicGuessReveal, (payload: unknown) => {
    const parsed = roomSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    run(parsed.data.conversationId, { type: 'guess-reveal' }, userId);
  });

  socket.on(SocketEvents.MusicGuessNext, (payload: unknown) => {
    const parsed = guessNextSchema.safeParse(payload);
    if (!parsed.success || !joined(parsed.data.conversationId)) return;
    if (parsed.data.pickerId !== userId && parsed.data.guesserId !== userId) return;
    run(parsed.data.conversationId, { type: 'guess-next', pickerId: parsed.data.pickerId, guesserId: parsed.data.guesserId }, userId);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (!room.startsWith('conversation:')) continue;
      const conversationId = room.slice('conversation:'.length);
      const size = conversationRoomSize(conversationId);
      if (size <= 1) {
        rooms.delete(conversationId);
        continue;
      }
      const current = rooms.get(conversationId);
      if (!current) continue;
      if (current.mode === 'guess' && current.game && !current.game.revealed && current.game.pickerId === userId) {
        publish(conversationId, null);
        continue;
      }
      publish(conversationId, {
        ...current,
        notice: 'friend-left',
        version: current.version + 1,
        updatedBy: userId,
      });
    }
  });
}
