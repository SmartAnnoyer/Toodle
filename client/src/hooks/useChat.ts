import { useCallback, useEffect, useState } from 'react';
import { SocketEvents } from '../constants';
import { api } from '../lib/http';
import type { ChatMessage, ConversationDetail, SendResult } from '../types';
import { emitAck, useSocket } from './useSocket';

export function useChat(conversationId: string) {
  const { socket, status } = useSocket();
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
      setMessages(history.messages);
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
      setMessages((prev) => prev.some((item) => item.id === message.id) ? prev : [...prev, message]);
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

  const send = useCallback(async (body: string, extra?: { kind?: 'text' | 'gif' | 'sticker'; replyToId?: string; metadata?: Record<string, unknown> }) => {
    const payload = { conversationId, body, ...extra };
    if (socket && status === 'connected') {
      const result = await emitAck<SendResult & { ok: boolean; error?: string }>(socket, SocketEvents.MessageSend, payload);
      if (!result.ok) throw new Error(result.error || 'Toodle tripped. Try again.');
      return result;
    }
    return api<SendResult>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, ...extra }),
    });
  }, [conversationId, socket, status]);

  const signalTyping = useCallback((active: boolean) => {
    if (!socket || status !== 'connected') return;
    socket.emit(active ? SocketEvents.TypingStart : SocketEvents.TypingStop, { conversationId });
  }, [conversationId, socket, status]);

  return { conversation, messages, typing, loading, error, streakPop, reload: load, send, signalTyping, setConversation };
}
