import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, EmptyState, Wordmark } from '../components/ui';
import { SocketEvents } from '../constants';
import { useCountdown } from '../hooks/useCountdown';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/http';
import { formatAgo } from '../lib/time';
import type { ConversationSummary } from '../types';

export function HomePage() {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [inbox, notes] = await Promise.all([
        api<{ conversations: ConversationSummary[] }>('/api/conversations'),
        api<{ pendingRequests: number }>('/api/notifications'),
      ]);
      setConversations(inbox.conversations);
      setPending(notes.pendingRequests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { void load(); };
    socket.on(SocketEvents.ConversationUpdated, refresh);
    socket.on(SocketEvents.MessageNew, refresh);
    socket.on(SocketEvents.NotificationNew, refresh);
    socket.on(SocketEvents.ConversationExpired, refresh);
    return () => {
      socket.off(SocketEvents.ConversationUpdated, refresh);
      socket.off(SocketEvents.MessageNew, refresh);
      socket.off(SocketEvents.NotificationNew, refresh);
      socket.off(SocketEvents.ConversationExpired, refresh);
    };
  }, [socket]);

  const active = conversations.filter((chat) => chat.status === 'active');
  const gone = conversations.filter((chat) => chat.status !== 'active');

  return (
    <div className="px-4 pt-6">
      <header className="flex items-center justify-between">
        <Wordmark className="text-4xl" />
        <Link to="/notifications" className="glass rounded-full px-3 py-2 text-sm">🔔</Link>
      </header>
      <Link to="/find" className="glass mt-5 block rounded-[1.6rem] px-4 py-4 text-muted">Find someone to Toodle with</Link>
      {pending > 0 ? (
        <Link to="/requests" className="mt-3 block rounded-2xl bg-white/10 px-4 py-3 text-sm">👋 {pending} {pending === 1 ? 'person wants' : 'people want'} to Toodle</Link>
      ) : null}
      {error ? <p className="mt-6 text-center text-muted">{error}</p> : null}
      {loading ? <p className="mt-10 text-center text-muted">Loading chats…</p> : null}
      {!loading && active.length === 0 && gone.length === 0 ? (
        <EmptyState emoji="👀" title="It's suspiciously quiet here" body="Find someone and send a ping." action={<Link to="/find" className="text-primary">Find someone</Link>} />
      ) : null}
      <div className="mt-5 space-y-3">
        {active.map((chat) => <ChatCard key={chat.id} chat={chat} />)}
      </div>
      {gone.length > 0 ? (
        <div className="mt-8">
          <p className="mb-3 text-sm text-muted">Gone</p>
          {gone.map((chat) => <ChatCard key={chat.id} chat={chat} />)}
        </div>
      ) : null}
    </div>
  );
}

function ChatCard({ chat }: { chat: ConversationSummary }) {
  const countdown = useCountdown(chat.status === 'active' ? chat.expiresAt : null);
  const preview = chat.lastMessage
    ? chat.lastMessage.kind === 'gif' ? 'GIF' : chat.lastMessage.kind === 'sticker' ? 'Sticker' : chat.lastMessage.body
    : 'No messages yet';
  return (
    <Link to={`/chat/${chat.id}`} className="glass mb-3 flex items-center gap-3 rounded-[1.6rem] p-3">
      <Avatar emoji={chat.otherUser.avatarEmoji} online={chat.otherUser.online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">{chat.otherUser.displayName}</p>
          {chat.lastMessage ? <span className="text-xs text-muted">{formatAgo(chat.lastMessage.createdAt)}</span> : null}
        </div>
        <p className="truncate text-sm text-muted">{chat.otherUser.moodEmoji} {chat.otherUser.moodText}</p>
        <p className="truncate text-sm">{preview}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
          {chat.streakCount > 0 ? <span>🔥 {chat.streakCount}</span> : null}
          {chat.streakAtRisk && chat.streakExpiresInSeconds != null ? <span>🔥 streak fading</span> : null}
          {countdown ? <span>⏳ {countdown}</span> : null}
          {chat.remainingMessages != null ? <span>💬 {chat.remainingMessages}</span> : null}
        </div>
      </div>
      {chat.unreadCount > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1 text-xs text-white">{chat.unreadCount}</span> : null}
    </Link>
  );
}
