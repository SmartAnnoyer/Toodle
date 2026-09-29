import { useCallback, useEffect, useState } from 'react';
import { SocketEvents } from '../constants';
import { api } from '../lib/http';
import type { ChatMessage, ConversationDetail, ReplyPreview, SendResult } from '../types';
import { useAuth } from './useAuth';
import { emitAck, useSocket } from './useSocket';

type SendExtra = {
  kind?: 'text' | 'gif' | 'sticker';
  replyToId?: string;
  replyTo?: ReplyPreview | null;
  metadata?: Record<string, unknown>;
  clientId?: string;
  retry?: boolean;
};

function adoptIncoming(prev: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (prev.some((item) => item.id === message.id)) {
    return prev.map((item) => (item.id === message.id ? message : item));
  }
  const pending = prev.findIndex((item) =>
    item.localStatus === 'sending'
    && item.senderId === message.senderId
    && item.kind === message.kind
    && item.body === message.body,
  );
  if (pending >= 0) {
    const next = prev.slice();
    next[pending] = message;
    return next;
  }
  return [...prev, message];
}

function commitServer(prev: ChatMessage[], clientId: string, message: ChatMessage): ChatMessage[] {
  const rest = prev.filter((item) => item.clientId !== clientId && item.id !== message.id);
  return [...rest, message];
}

export function useChat(conversationId: string) {
  const { socket, status } = useSocket();
  const { profile } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streakPop, setStreakPop] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, history] = await Promise.all([
        api<ConversationDetail>(`/api/conversations/${conversationId}`),
        api<{ messages: ChatMessage[] }>(`/api/conversations/${conversationId}/messages`),
      ]);
      setConversation(detail);
      setMessages((current) => {
        const locals = current.filter((item) => item.localStatus);
        const kept = locals.filter((item) => {
          if (item.localStatus === 'failed') return !history.messages.some((remote) => remote.id === item.id);
          return !history.messages.some((remote) =>
            remote.id === item.id
            || (
              remote.senderId === item.senderId
              && remote.body === item.body
              && remote.kind === item.kind
              && Math.abs(new Date(remote.createdAt).getTime() - new Date(item.createdAt).getTime()) < 20_000
            ),
          );
        });
        return [...history.messages, ...kept];
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (status === 'connected') void load();
  }, [status, load]);

  useEffect(() => {
    if (!socket) return;
    socket.emit(SocketEvents.ConversationJoin, { conversationId });
    socket.emit(SocketEvents.MessageRead, { conversationId });

    const onNew = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => adoptIncoming(prev, message));
      if (message.streak?.increased) {
        setStreakPop(true);
        window.setTimeout(() => setStreakPop(false), 1400);
      }
      if (message.streak) {
        setConversation((current) => current ? { ...current, streakCount: message.streak?.count ?? current.streakCount } : current);
      }
      socket.emit(SocketEvents.MessageRead, { conversationId });
    };
    const onDelete = (payload: { conversationId: string; messageId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => prev.filter((item) => item.id !== payload.messageId));
    };
    const onReaction = (payload: { conversationId: string; messageId: string; reactions: ChatMessage['reactions'] }) => {
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) => prev.map((item) => item.id === payload.messageId ? { ...item, reactions: payload.reactions } : item));
    };
    const onRead = (payload: { conversationId: string; userId: string; lastReadAt: string }) => {
      if (payload.conversationId !== conversationId) return;
      setConversation((current) => {
        if (!current || payload.userId === current.otherUser.id) {
          return current ? { ...current, otherLastReadAt: payload.lastReadAt } : current;
        }
        return current;
      });
    };
    const onTyping = (payload: { conversationId: string; userId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setTyping(true);
    };
    const onTypingStop = (payload: { conversationId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setTyping(false);
    };
    const onUpdated = () => { void load(); };
    const onExpired = (payload: { conversationId: string }) => {
      if (payload.conversationId !== conversationId) return;
      setConversation((current) => current ? { ...current, status: 'expired' } : current);
      setMessages([]);
    };

    socket.on(SocketEvents.MessageNew, onNew);
    socket.on(SocketEvents.MessageDelete, onDelete);
    socket.on(SocketEvents.MessageReaction, onReaction);
    socket.on(SocketEvents.MessageRead, onRead);
    socket.on(SocketEvents.TypingStart, onTyping);
    socket.on(SocketEvents.TypingStop, onTypingStop);
    socket.on(SocketEvents.ConversationUpdated, onUpdated);
    socket.on(SocketEvents.ConversationExpired, onExpired);
    socket.on(SocketEvents.RenewRequest, onUpdated);
    socket.on(SocketEvents.RenewAccepted, onUpdated);
    socket.on(SocketEvents.RenewRejected, onUpdated);

    return () => {
      socket.emit(SocketEvents.ConversationLeave, { conversationId });
      socket.off(SocketEvents.MessageNew, onNew);
      socket.off(SocketEvents.MessageDelete, onDelete);
      socket.off(SocketEvents.MessageReaction, onReaction);
      socket.off(SocketEvents.MessageRead, onRead);
      socket.off(SocketEvents.TypingStart, onTyping);
      socket.off(SocketEvents.TypingStop, onTypingStop);
      socket.off(SocketEvents.ConversationUpdated, onUpdated);
      socket.off(SocketEvents.ConversationExpired, onExpired);
      socket.off(SocketEvents.RenewRequest, onUpdated);
      socket.off(SocketEvents.RenewAccepted, onUpdated);
      socket.off(SocketEvents.RenewRejected, onUpdated);
    };
  }, [socket, conversationId, load]);

  const send = useCallback(async (body: string, extra?: SendExtra) => {
    const trimmed = body.trim();
    const kind = extra?.kind ?? 'text';
    const clientId = extra?.clientId ?? crypto.randomUUID();
    const command = kind === 'text' && trimmed.startsWith('/');
    if (!command) {
      const optimistic: ChatMessage = {
        id: clientId,
        clientId,
        conversationId,
        senderId: profile?.id ?? null,
        body: trimmed || (kind === 'gif' ? 'GIF' : '✨'),
        kind,
        metadata: extra?.metadata ?? {},
        replyTo: extra?.replyTo ?? null,
        reactions: [],
        expiresAt: null,
        createdAt: new Date().toISOString(),
        localStatus: 'sending',
      };
      setMessages((prev) => (
        extra?.retry
          ? prev.map((item) => item.clientId === clientId ? { ...item, localStatus: 'sending' } : item)
          : [...prev, optimistic]
      ));
    }
    const payload = {
      conversationId,
      body,
      kind: extra?.kind,
      replyToId: extra?.replyToId,
      metadata: extra?.metadata,
    };
    try {
      const result = socket && status === 'connected'
        ? await emitAck<SendResult & { ok: boolean; error?: string }>(socket, SocketEvents.MessageSend, payload)
        : await api<SendResult>(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ body, kind: extra?.kind, replyToId: extra?.replyToId, metadata: extra?.metadata }),
        });
      if (result.ok === false) throw new Error(result.error || 'Toodle tripped. Try again.');
      if (!command) {
        if (result.type === 'action' || !result.message) {
          setMessages((prev) => prev.filter((item) => item.clientId !== clientId));
        } else {
          setMessages((prev) => commitServer(prev, clientId, result.message as ChatMessage));
        }
      }
      return result;
    } catch (error) {
      if (!command) {
        setMessages((prev) => prev.map((item) => item.clientId === clientId ? { ...item, localStatus: 'failed' } : item));
      }
      throw error;
    }
  }, [conversationId, profile?.id, socket, status]);

  const signalTyping = useCallback((active: boolean) => {
    if (!socket || status !== 'connected') return;
    socket.emit(active ? SocketEvents.TypingStart : SocketEvents.TypingStop, { conversationId });
  }, [conversationId, socket, status]);

  return { conversation, messages, typing, loading, error, streakPop, reload: load, send, signalTyping, setConversation };
}
