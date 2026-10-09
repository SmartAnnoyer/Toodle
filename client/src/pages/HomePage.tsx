import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button, ConfirmBar, EmptyState, InfinityMark, Wordmark, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { SocketEvents } from '../constants';
import { useCountdown } from '../hooks/useCountdown';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/http';
import { formatAgo } from '../lib/time';
import type { ConversationSummary } from '../types';
import { useBackLayer } from '../native/back';

const HIDDEN_KEY = 'toodle-hidden-chats';

function readHidden(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '{}') as unknown;
    if (!raw || typeof raw !== 'object') return {};
    return raw as Record<string, string>;
  } catch {
    return {};
  }
}

function hideChat(id: string, updatedAt: string) {
  const map = readHidden();
  map[id] = updatedAt;
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(map));
}

function unhideChat(id: string) {
  const map = readHidden();
  delete map[id];
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(map));
}

function visibleChats(chats: ConversationSummary[]) {
  const hidden = readHidden();
  return chats.filter((chat) => {
    const at = hidden[chat.id];
    return !at || chat.updatedAt > at;
  });
}

export function HomePage() {
  const { socket } = useSocket();
  const { signOut } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<null | { title: string; confirm: string; run: () => void }>(null);
  useBackLayer(ask != null, () => setAsk(null), 100);

  async function load() {
    try {
      const [inbox, requests] = await Promise.all([
        api<{ conversations: ConversationSummary[] }>('/api/conversations'),
        api<{ incoming: { id: string }[] }>('/api/requests'),
      ]);
      setConversations(visibleChats(inbox.conversations));
      setPending(requests.incoming.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function forget(chat: ConversationSummary) {
    hideChat(chat.id, chat.updatedAt);
    setConversations((current) => current.filter((item) => item.id !== chat.id));
  }

  function restore(chat: ConversationSummary) {
    unhideChat(chat.id);
    void load();
    toast('Toodle tripped. Try again.');
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
      <header>
        <Wordmark className="text-4xl" />
      </header>
      <Link to="/find" className="glass mt-5 block rounded-[1.6rem] px-4 py-4 text-muted">Find someone to Toodle with</Link>
      {pending > 0 ? (
        <Link to="/requests" className="og-note mt-3 block rounded-2xl bg-white/10 px-4 py-3 text-sm">👋 {pending} {pending === 1 ? 'person wants' : 'people want'} to Toodle</Link>
      ) : null}
      {error ? (
        <div className="mt-6 text-center">
          <p className="text-muted">{error}</p>
          <Button className="mt-4" variant="danger" onClick={() => void signOut()}>Log out</Button>
        </div>
      ) : null}
      {loading ? <InfinityMark /> : null}
      {!loading && active.length === 0 && gone.length === 0 ? (
        <EmptyState emoji="👀" title="It's suspiciously quiet here" body="Find someone and send a ping." action={<Link to="/find" className="text-primary">Find someone</Link>} />
      ) : null}
      <div className="mt-5 space-y-3">
        {active.map((chat) => (
          <ChatCard
            key={chat.id}
            chat={chat}
            onDelete={() => setAsk({
              title: 'Delete this chat?',
              confirm: 'Delete',
              run: () => {
                forget(chat);
                void api(`/api/conversations/${chat.id}/leave`, { method: 'POST' }).catch(() => restore(chat));
              },
            })}
            onBlock={() => setAsk({
              title: `Block ${chat.otherUser.displayName}?`,
              confirm: 'Block',
              run: () => {
                forget(chat);
                void api('/api/safety/block', { method: 'POST', body: JSON.stringify({ userId: chat.otherUser.id }) })
                  .then(() => api(`/api/conversations/${chat.id}/leave`, { method: 'POST' }).catch(() => undefined))
                  .catch(() => restore(chat));
              },
            })}
          />
        ))}
      </div>
      {gone.length > 0 ? (
        <div className="mt-8">
          <p className="mb-3 text-sm text-muted">Gone</p>
          {gone.map((chat) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              onDelete={() => setAsk({
                title: 'Delete this chat?',
                confirm: 'Delete',
                run: () => {
                  forget(chat);
                  void api(`/api/conversations/${chat.id}/leave`, { method: 'POST' }).catch(() => restore(chat));
                },
              })}
              onBlock={() => setAsk({
                title: `Block ${chat.otherUser.displayName}?`,
                confirm: 'Block',
                run: () => {
                  forget(chat);
                  void api('/api/safety/block', { method: 'POST', body: JSON.stringify({ userId: chat.otherUser.id }) })
                    .then(() => api(`/api/conversations/${chat.id}/leave`, { method: 'POST' }).catch(() => undefined))
                    .catch(() => restore(chat));
                },
              })}
            />
          ))}
        </div>
      ) : null}
      {ask ? (
        <ConfirmBar
          title={ask.title}
          confirm={ask.confirm}
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            const run = ask.run;
            setAsk(null);
            run();
          }}
        />
      ) : null}
    </div>
  );
}

function ChatCard({ chat, onDelete, onBlock }: { chat: ConversationSummary; onDelete: () => void; onBlock: () => void }) {
  const navigate = useNavigate();
  const countdown = useCountdown(chat.status === 'active' ? chat.expiresAt : null);
  const drag = useRef({ x: 0, y: 0, origin: 0, active: false, axis: '' as '' | 'x' | 'y' });
  const [shift, setShift] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pressed, setPressed] = useState(false);
  const preview = chat.lastMessage
    ? chat.lastMessage.kind === 'gif' ? 'GIF' : chat.lastMessage.kind === 'sticker' ? 'Sticker' : chat.lastMessage.body
    : 'No messages yet';

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, origin: shift, active: true, axis: '' };
    setDragging(true);
    setPressed(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.current.axis === 'y') {
        drag.current.active = false;
        setDragging(false);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setShift(Math.max(-156, Math.min(0, drag.current.origin + dx)));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    const axis = drag.current.axis;
    const origin = drag.current.origin;
    drag.current.active = false;
    setDragging(false);
    setPressed(false);
    if (axis === 'y') return;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22 && origin > -40) {
      setShift(0);
      navigate(`/chat/${chat.id}`);
      return;
    }
    if (axis === 'x') {
      setShift(origin + dx < -72 ? -156 : 0);
      return;
    }
    if (origin < -40) {
      setShift(0);
    }
  }

  return (
    <div className="relative mb-3 overflow-hidden rounded-[1.6rem]">
      <div className="absolute inset-y-0 right-0 flex w-[156px]">
        <button type="button" className="flex-1 bg-ink/80 text-sm font-semibold" onClick={onBlock}>Block</button>
        <button type="button" className="flex-1 bg-danger text-sm font-semibold text-white" onClick={onDelete}>Delete</button>
      </div>
      <div
        className="glass relative flex touch-pan-y select-none items-center gap-3 p-3"
        style={{ transform: `translateX(${shift}px) scale(${pressed && shift === 0 ? 0.98 : 1})`, transition: dragging ? 'none' : 'transform 80ms ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current.active = false; setDragging(false); setPressed(false); setShift(0); }}
      >
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
      </div>
    </div>
  );
}
