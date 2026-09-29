import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EMOJIS, REACTIONS, RENEW_OPTIONS } from '../constants';
import { Button, EmptyState, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useCountdown } from '../hooks/useCountdown';
import { useSocket } from '../hooks/useSocket';
import { nudge } from '../lib/feedback';
import { api } from '../lib/http';
import { formatClock, formatRemaining, humanDuration, serverNowMs } from '../lib/time';
import type { ChatMessage, GifResult } from '../types';

export function ChatPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const { banner } = useSocket();
  const { conversation, messages, typing, loading, error, streakPop, send, signalTyping } = useChat(id);
  const countdown = useCountdown(conversation?.status === 'active' ? conversation.expiresAt : null);
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [tick, setTick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    const handle = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, typing]);

  async function submit(body = text, extra?: { kind?: 'text' | 'gif' | 'sticker'; metadata?: Record<string, unknown> }) {
    const trimmed = body.trim();
    if (!trimmed && extra?.kind !== 'gif' && extra?.kind !== 'sticker') return;
    setSending(true);
    try {
      const result = await send(trimmed, { ...extra, replyToId: reply?.id });
      if (result.type === 'action') {
        if (result.action === 'rules') navigate(`/chat/${id}/rules`);
        if (result.action === 'renew') setRenewOpen(true);
        if (result.action === 'gif') setGifOpen(true);
        if (result.action === 'mood') navigate('/profile');
        if (result.action === 'streak') {
          const count = result.streak?.count ?? conversation?.streakCount ?? 0;
          toast(count > 0 ? `🔥 ${count} day streak` : 'No streak yet. Both of you have to show up.');
        }
        if (result.action === 'ghost') toast(result.ghostEnabled ? '🫥 Ghost mode is on' : 'Ghost mode is off');
      }
      if (result.streak?.increased) nudge([8, 20, 8]);
      setText('');
      setReply(null);
      setEmojiOpen(false);
      signalTyping(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    } finally {
      setSending(false);
    }
  }

  function onType(value: string) {
    setText(value);
    signalTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => signalTyping(false), 1200);
  }

  if (loading) return <div className="app-bg grid min-h-dvh place-items-center text-muted">Opening chat…</div>;
  if (!conversation || conversation.status !== 'active') {
    return (
      <div className="app-bg grid min-h-dvh place-items-center px-6">
        <EmptyState emoji="💨" title="Poof." body="That conversation is gone." action={<Link to="/" className="text-primary">Back home</Link>} />
      </div>
    );
  }

  const pending = conversation.pendingRenewal;
  const minePending = pending?.requestedBy === profile?.id;

  return (
    <div className="app-bg mx-auto flex h-dvh max-w-[820px] flex-col">
      <header className="px-4 pb-3 pt-4">
        {banner ? <p className="mb-2 text-center text-xs text-muted">{banner}</p> : null}
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/')} className="pt-1 text-lg">←</button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{conversation.otherUser.avatarEmoji} {conversation.otherUser.displayName}</p>
            <p className="text-sm text-muted">{conversation.otherUser.moodEmoji} {conversation.otherUser.moodText} · {conversation.otherUser.online ? 'online' : 'offline'}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {conversation.streakCount > 0 ? <span className="rounded-full bg-white/10 px-2 py-1">🔥 {conversation.streakCount} day streak</span> : null}
              {conversation.streakLost ? <span>💔 The streak didn't survive.</span> : null}
              {conversation.streakAtRisk && conversation.streakExpiresInSeconds != null ? (
                <span>🔥 Your streak expires in {formatRemaining(conversation.streakExpiresInSeconds)}</span>
              ) : null}
              {countdown ? <span>💣 This conversation ends in {countdown}</span> : null}
              {conversation.remainingMessages != null ? <span>💬 {conversation.remainingMessages} messages remaining</span> : null}
              {conversation.ghostMode ? <span>🫥 Ghost mode</span> : null}
            </div>
          </div>
          <Link to={`/chat/${id}/rules`} className="text-lg">⚙️</Link>
        </div>
        <AnimatePresence>
          {streakPop ? (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-center text-sm">🔥 Streak up</motion.div>
          ) : null}
        </AnimatePresence>
        {pending && !minePending ? (
          <div className="mt-3 rounded-2xl bg-white/10 p-3 text-sm">
            <p>♻️ They want to renew for {humanDuration(pending.durationSeconds)}.</p>
            <div className="mt-2 flex gap-2">
              <Button className="px-4 py-2" onClick={() => api(`/api/renewals/${pending.id}/accept`, { method: 'POST' }).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'))}>Accept</Button>
              <Button variant="ghost" className="px-4 py-2" onClick={() => api(`/api/renewals/${pending.id}/reject`, { method: 'POST' }).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'))}>Reject</Button>
            </div>
          </div>
        ) : null}
        {minePending ? <p className="mt-2 text-sm text-muted">Waiting on them to renew.</p> : null}
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-4 pb-3">
        {messages.length === 0 ? <p className="pt-16 text-center text-muted">Say the first thing.</p> : null}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === profile?.id}
            seen={Boolean(message.senderId === profile?.id && conversation.otherLastReadAt && conversation.otherLastReadAt >= message.createdAt)}
            selected={selected === message.id}
            tick={tick}
            onSelect={() => setSelected((current) => current === message.id ? null : message.id)}
            onReply={() => { setReply(message); setSelected(null); }}
            onDelete={() => {
              api(`/api/messages/${message.id}`, { method: 'DELETE' })
                .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}
            onReact={(emoji) => {
              api(`/api/messages/${message.id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) })
                .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}
          />
        ))}
        {typing ? <p className="text-sm text-muted">typing…</p> : null}
      </div>

      <div className="composer-safe border-t border-line px-3 pt-2">
        {reply ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm">
            <span className="truncate">Replying to {reply.body}</span>
            <button type="button" onClick={() => setReply(null)}>✕</button>
          </div>
        ) : null}
        {renewOpen ? (
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {RENEW_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                type="button"
                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm"
                onClick={() => {
                  api(`/api/conversations/${id}/renew`, { method: 'POST', body: JSON.stringify({ durationSeconds: option.seconds }) })
                    .then(() => { setRenewOpen(false); toast('Renewal sent'); })
                    .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {emojiOpen ? (
          <div className="mb-2 grid grid-cols-8 gap-1">
            {EMOJIS.map((emoji) => (
              <button key={emoji} type="button" className="text-2xl" onClick={() => onType(text + emoji)}>{emoji}</button>
            ))}
          </div>
        ) : null}
        {gifOpen ? <GifSheet onClose={() => setGifOpen(false)} onPick={(gif) => {
          void submit(gif.title || 'GIF', { kind: 'gif', metadata: { gifUrl: gif.url, previewUrl: gif.previewUrl, title: gif.title, mockId: gif.mock ? gif.id : undefined, label: gif.label } });
          setGifOpen(false);
        }} /> : null}
        {plusOpen ? (
          <div className="mb-2 flex gap-2">
            <Button variant="soft" className="px-4 py-2" onClick={() => navigate(`/chat/${id}/rules`)}>Rules</Button>
            <Button variant="soft" className="px-4 py-2" onClick={() => { setRenewOpen(true); setPlusOpen(false); }}>♻️ Renew</Button>
            <Button variant="soft" className="px-4 py-2" onClick={() => navigate('/shortcuts')}>Shortcuts</Button>
            <Button variant="danger" className="px-4 py-2" onClick={() => {
              api(`/api/conversations/${id}/leave`, { method: 'POST' })
                .then((result) => {
                  const vanished = (result as { vanished?: boolean }).vanished;
                  if (vanished) navigate('/');
                  else toast('You left. Ghost mode waits for both of you.');
                })
                .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}>Leave</Button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button type="button" className="pb-2 text-xl" onClick={() => setPlusOpen((open) => !open)}>+</button>
          <textarea
            value={text}
            rows={1}
            placeholder="Message..."
            onChange={(event) => onType(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            className="max-h-28 flex-1 resize-none rounded-3xl border border-line bg-elevated px-4 py-3 outline-none"
          />
          <button type="button" className="pb-2 text-xl" onClick={() => setEmojiOpen((open) => !open)}>😊</button>
          <button type="button" className="pb-2 text-sm font-semibold" onClick={() => setGifOpen((open) => !open)}>GIF</button>
          <button type="button" disabled={sending} className="pb-2 text-xl" onClick={() => void submit()}>➤</button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  seen,
  selected,
  tick,
  onSelect,
  onReply,
  onDelete,
  onReact,
}: {
  message: ChatMessage;
  mine: boolean;
  seen: boolean;
  selected: boolean;
  tick: number;
  onSelect: () => void;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  if (message.kind === 'system') {
    return <p className="py-2 text-center text-sm text-muted">{message.body}</p>;
  }
  const gifUrl = typeof message.metadata.gifUrl === 'string' ? message.metadata.gifUrl : '';
  const label = typeof message.metadata.label === 'string' ? message.metadata.label : '';
  const expiresLabel = message.expiresAt ? formatRemaining((new Date(message.expiresAt).getTime() - serverNowMs()) / 1000) : null;
  void tick;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <button type="button" onClick={onSelect} className={`max-w-[80%] rounded-[1.4rem] px-3 py-2 text-left ${mine ? 'bubble-mine' : 'bubble-theirs'}`}>
        {message.replyTo ? <p className="mb-1 truncate text-xs opacity-70">↩ {message.replyTo.body}</p> : null}
        {message.kind === 'gif' && gifUrl ? <img src={gifUrl} alt={message.body} className="mb-1 max-h-52 rounded-2xl" /> : null}
        {message.kind === 'gif' && !gifUrl ? <span className="block text-5xl">{label || '✨'}</span> : null}
        {message.kind === 'sticker' ? <span className="block text-5xl">{message.body}</span> : null}
        {message.kind === 'text' ? <span className="whitespace-pre-wrap">{message.body}</span> : null}
        <span className="mt-1 block text-[10px] opacity-60">{formatClock(message.createdAt)}{seen ? ' · Seen' : ''}</span>
        {expiresLabel ? <span className="block text-[10px] opacity-70">⏳ disappears in {expiresLabel}</span> : null}
        {message.reactions.length > 0 ? (
          <span className="mt-1 flex gap-1 text-xs">{message.reactions.map((reaction) => <span key={`${reaction.userId}${reaction.emoji}`}>{reaction.emoji}</span>)}</span>
        ) : null}
        {selected ? (
          <span className="mt-2 flex flex-wrap gap-2 text-xs">
            {REACTIONS.map((emoji) => <span key={emoji} onClick={(event) => { event.stopPropagation(); onReact(emoji); }}>{emoji}</span>)}
            <span onClick={(event) => { event.stopPropagation(); onReply(); }}>Reply</span>
            <span onClick={(event) => { event.stopPropagation(); void navigator.clipboard.writeText(message.body); }}>Copy</span>
            {mine ? <span onClick={(event) => { event.stopPropagation(); onDelete(); }}>Delete</span> : null}
          </span>
        ) : null}
      </button>
    </motion.div>
  );
}

function GifSheet({ onPick, onClose }: { onPick: (gif: GifResult) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      api<{ results: GifResult[] }>(`/api/gifs?q=${encodeURIComponent(query)}`)
        .then((result) => setGifs(result.results))
        .catch(() => setGifs([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <div className="mb-2 rounded-3xl border border-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search GIFs" className="flex-1 bg-transparent outline-none" />
        <button type="button" onClick={onClose}>✕</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {gifs.map((gif) => (
          <button key={gif.id} type="button" onClick={() => onPick(gif)} className="grid h-16 place-items-center overflow-hidden rounded-2xl bg-white/10 text-3xl">
            {gif.url ? <img src={gif.previewUrl || gif.url} alt={gif.title} className="h-full w-full object-cover" /> : gif.label}
          </button>
        ))}
      </div>
    </div>
  );
}
