import type { Server } from 'socket.io';
import { z } from 'zod';
import { SocketEvents } from '../constants/events.js';
import { db } from '../lib/db.js';
import { friendlyMessage } from '../lib/errors.js';
import { markRead, sendMessage } from '../services/messages.js';
import { partnerIds, setPresence } from '../services/profiles.js';
import { loadMembers } from '../services/conversationStore.js';
import { emitToUsers, userSocketCount } from './hub.js';
import { attachMusic } from './music.js';

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().max(2000).optional(),
  kind: z.enum(['text', 'gif', 'sticker']).optional(),
  replyToId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function registerSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        next(new Error('unauthorized'));
        return;
      }
      const { data, error } = await db().auth.getUser(token);
      if (error || !data.user) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.userId = data.user.id;
      next();
    } catch (error) {
      console.error('socket auth', error);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    void setPresence(userId, 'online').then(async () => {
      const partners = await partnerIds(userId);
      emitToUsers(partners, SocketEvents.PresenceUpdate, { userId, online: true });
    });

    socket.on(SocketEvents.ConversationJoin, async (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      const members = await loadMembers(payload.conversationId).catch(() => []);
      if (!members.some((member) => member.user_id === userId)) return;
      socket.join(`conversation:${payload.conversationId}`);
    });

    socket.on(SocketEvents.ConversationLeave, (payload: { conversationId?: string }) => {
      if (payload?.conversationId) socket.leave(`conversation:${payload.conversationId}`);
    });

    socket.on(SocketEvents.MessageSend, async (payload: unknown, ack?: (result: unknown) => void) => {
      const parsed = sendSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'That message did not look right.' });
        return;
      }
      try {
        const result = await sendMessage(userId, parsed.data.conversationId, parsed.data);
        ack?.({ ok: true, ...result });
      } catch (error) {
        ack?.({ ok: false, error: friendlyMessage(error) });
      }
    });

    socket.on(SocketEvents.TypingStart, (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      socket.to(`conversation:${payload.conversationId}`).emit(SocketEvents.TypingStart, {
        conversationId: payload.conversationId,
        userId,
      });
    });

    socket.on(SocketEvents.TypingStop, (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      socket.to(`conversation:${payload.conversationId}`).emit(SocketEvents.TypingStop, {
        conversationId: payload.conversationId,
        userId,
      });
    });

    socket.on(SocketEvents.MessageRead, async (payload: { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      try {
        await markRead(userId, payload.conversationId);
      } catch (error) {
        console.error('read', error);
      }
    });

    attachMusic(socket, userId);

    socket.on('disconnect', async () => {
      if (userSocketCount(userId) > 0) return;
      await setPresence(userId, 'offline');
      const partners = await partnerIds(userId);
      emitToUsers(partners, SocketEvents.PresenceUpdate, { userId, online: false });
    });
  });
}
