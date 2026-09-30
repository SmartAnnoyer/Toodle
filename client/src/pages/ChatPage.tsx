import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EMOJIS, MOODS, REACTIONS, RENEW_OPTIONS } from '../constants';
import { ChatRules } from '../components/RulesEditor';
import { Button, ConfirmBar, EmptyState, useToast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useCountdown } from '../hooks/useCountdown';
import { useSocket } from '../hooks/useSocket';
import { nudge } from '../lib/feedback';
import { api } from '../lib/http';
import { formatClock, formatRemaining, humanDuration, serverNowMs } from '../lib/time';
import type { ChatMessage, GifResult } from '../types';
import { VibePanel } from '../music/VibePanel';
import { useVibe } from '../music/useVibe';
import type { MusicSnapshot, ToodleMusicEvent } from '../music/MusicTypes';
import { readChaos } from '../toodle/settings';
import { ToodlePresence } from '../toodle/ToodlePresence';
import { useToodleChat } from '../toodle/useToodleChat';

type Drawer = 'emoji' | 'gif' | 'sticker' | 'more' | 'renew' | null;

const GHOST_PULL = 96;
const pendingGhostLeave = new Map<string, number>();

export function ChatPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, refreshProfile } = useAuth();
  const { banner, status } = useSocket();
  const { conversation, messages, typing, loading, error, streakPop, send, signalTyping, react, discard, setConversation } = useChat(id);
  const countdown = useCountdown(conversation?.status === 'active' ? conversation.expiresAt : null);
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [customMood, setCustomMood] = useState('');
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [ghostPull, setGhostPull] = useState(0);
  const [tick, setTick] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [ask, setAsk] = useState<null | { title: string; confirm: string; run: () => void }>(null);
  useEffect(() => {
    setPicked([]);
    setAsk(null);
  }, [id]);
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const lastContactTap = useRef(0);
  const enterGhostRef = useRef<() => void>(() => {});
  const ghostLock = useRef(false);
  const rejoined = useRef(false);
  const typingTimer = useRef<number | null>(null);
  const musicRef = useRef<MusicSnapshot | null>(null);
  const noteMusic = useRef<(event: ToodleMusicEvent) => void>(() => {});
  const vibe = useVibe({
    conversationId: id,
    myId: profile?.id,
    onEvent: (event) => noteMusic.current(event),
  });
  musicRef.current = vibe.snapshot;
  const toodle = useToodleChat({
    conversation,
    messages,
    myId: profile?.id,
    moodText: profile?.moodText,
    draft: text,
    partnerTyping: typing,
    streakPop,
    paused: Boolean(error) || drawer === 'renew' || rulesOpen,
    musicRef,
    musicTick: vibe.tick,
  });
  noteMusic.current = toodle.noteMusic;

  useEffect(() => {
    rejoined.current = false;
  }, [id]);

  useEffect(() => {
    if (!conversation?.youLeft || rejoined.current) return;
    rejoined.current = true;
    void api(`/api/conversations/${id}/rejoin`, { method: 'POST' }).catch(() => undefined);
  }, [conversation?.youLeft, id]);

  useEffect(() => {
    const pending = pendingGhostLeave.get(id);
    if (pending) {
      window.clearTimeout(pending);
      pendingGhostLeave.delete(id);
    }
    const conversationId = id;
    const ghost = Boolean(conversation?.ghostMode);
    return () => {
      if (!ghost) return;
      const handle = window.setTimeout(() => {
        pendingGhostLeave.delete(conversationId);
        void api(`/api/conversations/${conversationId}/leave`, { method: 'POST' }).catch(() => undefined);
      }, 350);
      pendingGhostLeave.set(conversationId, handle);
    };
  }, [conversation?.ghostMode, id]);

  useEffect(() => {
    const handle = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(handle);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length, typing]);

  useEffect(() => {
    const node = scroller.current;
    if (!node || !toodle.beat) return;
    const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 180;
    if (nearBottom) node.scrollTo({ top: node.scrollHeight });
  }, [toodle.beat]);

  useEffect(() => {
    const node = frame.current;
    const viewport = window.visualViewport;
    if (!node || !viewport) return;
    const apply = () => {
      node.style.setProperty('--chat-height', `${viewport.height}px`);
      node.style.setProperty('--chat-shift', `${viewport.offsetTop}px`);
    };
    apply();
    viewport.addEventListener('resize', apply);
    viewport.addEventListener('scroll', apply);
    return () => {
      viewport.removeEventListener('resize', apply);
      viewport.removeEventListener('scroll', apply);
    };
  }, [conversation?.status, loading]);

  useEffect(() => {
    const node = scroller.current;
    if (!node || conversation?.status !== 'active' || conversation.ghostMode) return;
    const pull = { y: 0, active: false, amount: 0 };
    const atBottom = () => node.scrollHeight - node.scrollTop - node.clientHeight < 36;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      pull.y = event.touches[0].clientY;
      pull.active = atBottom();
      pull.amount = 0;
    };
    const move = (event: TouchEvent) => {
      if (!pull.active || event.touches.length !== 1) return;
      const travel = pull.y - event.touches[0].clientY;
      if (travel <= 12 || !atBottom()) {
        if (pull.amount !== 0) {
          pull.amount = 0;
          setGhostPull(0);
        }
        return;
      }
      const amount = Math.min(112, (travel - 12) * 0.36);
      pull.amount = amount;
      setGhostPull(amount);
      if (amount > 6) event.preventDefault();
    };
    const end = () => {
      if (pull.amount >= GHOST_PULL) enterGhostRef.current();
      pull.active = false;
      pull.amount = 0;
      setGhostPull(0);
    };
    node.addEventListener('touchstart', start, { passive: true });
    node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end);
    node.addEventListener('touchcancel', end);
    return () => {
      node.removeEventListener('touchstart', start);
      node.removeEventListener('touchmove', move);
      node.removeEventListener('touchend', end);
      node.removeEventListener('touchcancel', end);
    };
  }, [conversation?.ghostMode, conversation?.status, id]);

  async function enterGhost() {
    if (!conversation || conversation.ghostMode || ghostLock.current) return;
    ghostLock.current = true;
    setConversation((current) => current ? { ...current, ghostMode: true } : current);
    try {
      await api(`/api/conversations/${id}/rules`, {
        method: 'PUT',
        body: JSON.stringify({ ruleType: 'ghost_mode', enabled: true, configuration: {} }),
      });
      toast('Ghost mode is on. This chat disappears when you both leave.');
    } catch (err) {
      setConversation((current) => current ? { ...current, ghostMode: false } : current);
      toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    } finally {
      ghostLock.current = false;
    }
  }
  enterGhostRef.current = () => { void enterGhost(); };

  function toggleDrawer(next: Drawer) {
    setMoodOpen(false);
    setContactOpen(false);
    setDrawer((current) => current === next ? null : next);
  }

  async function pickMood(emoji: string, textValue: string) {
    const moodText = textValue.trim();
    if (!moodText) return;
    setMoodOpen(false);
    try {
      await api('/api/profile/me', { method: 'PATCH', body: JSON.stringify({ moodEmoji: emoji, moodText }) });
      await refreshProfile();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
    }
  }

  function openContact() {
    const now = Date.now();
    if (now - lastContactTap.current < 320) {
      lastContactTap.current = 0;
      setMoodOpen(false);
      setDrawer(null);
      setContactOpen(true);
      return;
    }
    lastContactTap.current = now;
  }

  async function submit(body = text, extra?: { kind?: 'text' | 'gif' | 'sticker'; metadata?: Record<string, unknown> }) {
    const trimmed = body.trim();
    if (!trimmed && extra?.kind !== 'gif' && extra?.kind !== 'sticker') return;
    if (trimmed) toodle.notice(trimmed);
    const fromComposer = body === text;
    const replyTo = reply ? {
      id: reply.id,
      body: reply.body,
      senderName: reply.senderId === profile?.id ? profile.displayName : conversation?.otherUser.displayName ?? '',
    } : null;
    const replyToId = reply?.id;
    setText('');
    setReply(null);
    setDrawer(null);
    signalTyping(false);
    if (fromComposer) composer.current?.focus({ preventScroll: true });
    try {
      const result = await send(trimmed, { ...extra, replyToId, replyTo });
      if (result.type === 'action') {
        if (result.action === 'rules') setRulesOpen(true);
        if (result.action === 'renew') setDrawer('renew');
        if (result.action === 'gif') setDrawer('gif');
        if (result.action === 'mood') setMoodOpen(true);
        if (result.action === 'streak') {
          const count = result.streak?.count ?? conversation?.streakCount ?? 0;
          toast(count > 0 ? `🔥 ${count} day streak` : 'No streak yet. Both of you have to show up.');
        }
        if (result.action === 'ghost') toast(result.ghostEnabled ? '🫥 Ghost mode is on' : 'Ghost mode is off');
      }
      if (result.streak?.increased) nudge([8, 20, 8]);
    } catch (err) {
      if (fromComposer && trimmed.startsWith('/')) setText(trimmed);
      toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.');
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
        <div className="mt-6">
          <ToodlePresence inline beat={{ event: 'CONVERSATION_EXPIRING', pose: 'dramatic', line: 'Well... that was fun.', spot: 'composer', ms: 4000, priority: 90 }} />
        </div>
      </div>
    );
  }

  const pending = conversation.pendingRenewal;
  const minePending = pending?.requestedBy === profile?.id;
  const lastVoice = [...messages].reverse().find((message) => message.kind !== 'system');
  const glance: 'left' | 'right' | 'center' = vibe.expanded && !text.trim() && !typing
    ? 'center'
    : typing
    ? 'left'
    : text.trim()
      ? 'right'
      : !lastVoice
        ? 'center'
        : lastVoice.senderId === profile?.id
          ? 'right'
          : 'left';

  const mediaKind = drawer === 'sticker' ? 'sticker' : 'gif';

  return (
    <div ref={frame} className="chat-frame app-bg mx-auto flex max-w-[820px] flex-col">
      <header className="relative z-20 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {banner ? <p className="mb-2 text-center text-xs text-muted">{banner}</p> : null}
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => navigate('/')} className="chat-tool shrink-0 text-lg" aria-label="Back">←</button>
          <button type="button" onClick={openContact} className="min-w-0 flex-1 touch-manipulation rounded-2xl px-1 py-1 text-left" aria-label={`Double tap to open ${conversation.otherUser.displayName}`}>
            <p className="truncate text-lg font-semibold">{conversation.otherUser.avatarEmoji} {conversation.otherUser.displayName}</p>
            <p className="truncate text-sm text-muted">{conversation.otherUser.moodEmoji} {conversation.otherUser.moodText} · {conversation.otherUser.online ? 'online' : 'offline'}</p>
          </button>
          <button
            type="button"
            className="chat-tool shrink-0 text-xl"
            aria-label="Change mood"
            aria-expanded={moodOpen}
            onClick={() => { setContactOpen(false); setDrawer(null); setMoodOpen((open) => !open); }}
          >
            {profile?.moodEmoji ?? '🫠'}
          </button>
          <button
            type="button"
            className="chat-tool shrink-0 text-lg"
            aria-label="Chat settings"
            aria-expanded={rulesOpen}
            onClick={() => { setMoodOpen(false); setContactOpen(false); setDrawer(null); setRulesOpen(true); }}
          >
            ⚙️
          </button>
        </div>
        {moodOpen ? (
          <div className="relative">
            <div className="absolute right-0 z-30 mt-1 w-[min(19rem,calc(100vw-1.5rem))] rounded-3xl border border-line bg-bg p-3 shadow-card">
              <p className="mb-2 text-xs text-muted">Your mood</p>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood.text}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-left text-sm ${profile?.moodText === mood.text ? 'border-primary bg-white/10' : 'border-line'}`}
                    onClick={() => void pickMood(mood.emoji, mood.text)}
                  >
                    {mood.emoji} {mood.text}
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void pickMood(profile?.moodEmoji ?? '🫠', customMood);
                }}
              >
                <input
                  value={customMood}
                  onChange={(event) => setCustomMood(event.target.value)}
                  maxLength={48}
                  placeholder="or type one"
                  className="min-w-0 flex-1 rounded-full border border-line bg-transparent px-3 py-2 text-base outline-none"
                />
                <button type="submit" className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold">Set</button>
              </form>
            </div>
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-2 px-1 text-xs">
          {conversation.streakCount > 0 ? <span className="rounded-full bg-white/10 px-2 py-1">🔥 {conversation.streakCount} day streak</span> : null}
          {conversation.streakLost ? <span>💔 The streak didn't survive.</span> : null}
          {conversation.streakAtRisk && conversation.streakExpiresInSeconds != null ? (
            <span>🔥 Your streak expires in {formatRemaining(conversation.streakExpiresInSeconds)}</span>
          ) : null}
          {countdown ? <span>💣 This conversation ends in {countdown}</span> : null}
          {conversation.remainingMessages != null ? <span>💬 {conversation.remainingMessages} messages remaining</span> : null}
          {conversation.ghostMode ? <span>🫥 Ghost mode</span> : null}
        </div>
        <div className="mt-2 flex min-w-0 items-center">
          <VibePanel vibe={{ ...vibe, reconnecting: status === 'disconnected' || vibe.reconnecting }} friendName={conversation.otherUser.displayName} myId={profile?.id} />
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

      <div ref={scroller} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-1" onPointerDown={() => setMoodOpen(false)}>
        <div className="space-y-2 px-4">
        {messages.length === 0 ? <p className="pt-6 text-center text-muted">Say the first thing.</p> : null}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            mine={message.senderId === profile?.id}
            seen={Boolean(message.senderId === profile?.id && conversation.otherLastReadAt && conversation.otherLastReadAt >= message.createdAt)}
            selected={selected === message.id}
            tick={tick}
            choosing={picked.length > 0}
            marked={picked.includes(message.id)}
            onSelect={() => setSelected((current) => current === message.id ? null : message.id)}
            onMark={() => {
              setSelected(null);
              setPicked((current) => current.includes(message.id) ? current.filter((item) => item !== message.id) : [...current, message.id]);
            }}
            onReply={() => { setReply(message); setSelected(null); }}
            onDelete={() => {
              if (message.localStatus === 'sending') return;
              setAsk({
                title: 'Delete this message?',
                confirm: 'Delete',
                run: () => {
                  setPicked((current) => current.filter((item) => item !== message.id));
                  void discard(message.id).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
                },
              });
            }}
            onReact={(emoji) => {
              void react(message.id, emoji).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}
            onRetry={() => {
              if (!message.clientId || message.kind === 'system') return;
              void send(message.body, {
                kind: message.kind,
                metadata: message.metadata,
                clientId: message.clientId,
                retry: true,
                replyToId: message.replyTo?.id,
                replyTo: message.replyTo,
              }).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}
          />
        ))}
        {typing ? <p className="text-sm text-muted">typing…</p> : null}
        </div>
        {readChaos() !== 'off' && !error && drawer !== 'renew' && !rulesOpen ? (
          <ToodlePresence
            beat={toodle.beat}
            listening={toodle.waiting || Boolean(typing)}
            glance={glance}
            onUse={(phrase) => { setText(phrase); toodle.dismiss(); composer.current?.focus({ preventScroll: true }); }}
            onDone={toodle.dismiss}
            onTap={toodle.poke}
          />
        ) : null}
      </div>

      {ghostPull > 0 ? (
        <div className="flex items-end justify-center overflow-hidden text-xs text-muted" style={{ height: Math.min(ghostPull, 56) }}>
          {ghostPull >= GHOST_PULL ? 'Release for ghost mode' : 'Pull up for ghost mode'}
        </div>
      ) : null}

      <div className="composer-safe relative border-t border-line px-3 pt-2">
        {reply ? (
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm">
            <span className="truncate">Replying to {reply.body}</span>
            <button type="button" className="chat-tool" onClick={() => setReply(null)} aria-label="Cancel reply">✕</button>
          </div>
        ) : null}
        {picked.length > 0 ? (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="min-h-11 px-2" onClick={() => setPicked([])}>Cancel</button>
            <span className="text-muted">{picked.length} selected</span>
            <button type="button" className="min-h-11 px-2 font-semibold" onClick={() => {
              const text = messages.filter((item) => picked.includes(item.id)).map((item) => item.body).filter(Boolean).join('\n');
              void navigator.clipboard.writeText(text).then(() => toast('Copied')).catch(() => toast('Could not copy'));
              setPicked([]);
            }}>Copy</button>
            <button type="button" className="min-h-11 px-2 font-semibold text-danger" onClick={() => setAsk({
              title: picked.length === 1 ? 'Delete this message?' : `Delete ${picked.length} messages?`,
              confirm: 'Delete',
              run: () => {
                const ids = picked;
                setPicked([]);
                for (const messageId of ids) {
                  void discard(messageId).catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
                }
              },
            })}>Delete</button>
          </div>
        ) : null}
        {drawer === 'renew' ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {RENEW_OPTIONS.map((option) => (
              <button
                key={option.seconds}
                type="button"
                className="rounded-full bg-white/10 px-3 py-2 text-sm"
                onClick={() => {
                  api(`/api/conversations/${id}/renew`, { method: 'POST', body: JSON.stringify({ durationSeconds: option.seconds }) })
                    .then(() => { setDrawer(null); toast('Renewal sent'); })
                    .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {drawer === 'emoji' ? (
          <div className="mb-2 grid grid-cols-6 gap-1 sm:grid-cols-8">
            {EMOJIS.map((emoji) => (
              <button key={emoji} type="button" className="chat-tool text-2xl" onClick={() => onType(text + emoji)}>{emoji}</button>
            ))}
          </div>
        ) : null}
        {drawer === 'gif' || drawer === 'sticker' ? <GifSheet kind={mediaKind} onKind={(kind) => setDrawer(kind)} onClose={() => setDrawer(null)} onPick={(gif) => {
          const kind = mediaKind;
          void submit(gif.title || (kind === 'sticker' ? 'Sticker' : 'GIF'), { kind, metadata: { gifUrl: gif.url, previewUrl: gif.previewUrl, title: gif.title, mockId: gif.mock ? gif.id : undefined, label: gif.label } });
          setDrawer(null);
        }} /> : null}
        {drawer === 'more' ? (
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Button variant="soft" className="px-3 py-2" onClick={() => { setDrawer(null); setRulesOpen(true); }}>Rules</Button>
            <Button variant="soft" className="px-3 py-2" onClick={() => setDrawer('renew')}>♻️ Renew</Button>
            <Button variant="soft" className="px-3 py-2" onClick={() => navigate('/shortcuts')}>Shortcuts</Button>
          </div>
        ) : null}
        <div className="flex items-end gap-1.5">
          <button type="button" className="chat-tool shrink-0" data-on={drawer === 'more'} aria-label="More" onClick={() => toggleDrawer('more')}>
            <MoreIcon />
          </button>
          <div className={`flex min-h-11 min-w-0 flex-1 items-end rounded-3xl border bg-elevated ${drawer === 'emoji' || drawer === 'gif' ? 'border-primary' : 'border-line'}`}>
            <button type="button" className="chat-tool shrink-0 text-xl" data-on={drawer === 'emoji'} aria-label="Emoji" onClick={() => toggleDrawer('emoji')}>😊</button>
            <textarea
              ref={composer}
              value={text}
              rows={1}
              enterKeyHint="send"
              placeholder="Message"
              onChange={(event) => onType(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                  composer.current?.focus({ preventScroll: true });
                }
              }}
              className="max-h-28 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none"
            />
            <button type="button" className="chat-tool shrink-0 text-xs font-semibold" data-on={drawer === 'gif'} aria-label="GIFs and stickers" onClick={() => toggleDrawer('gif')}>GIF</button>
          </div>
          <button
            type="button"
            aria-label="Send"
            className="btn-primary grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-r from-violet-400 to-pink-400 text-lg text-slate-950"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              void submit();
              composer.current?.focus({ preventScroll: true });
            }}
          >
            ➤
          </button>
        </div>
      </div>
      <AnimatePresence>
        {rulesOpen ? (
          <motion.div
            className="absolute inset-0 z-50 bg-bg/95 backdrop-blur-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}
          >
            <ChatRules
              conversationId={id}
              onClose={() => setRulesOpen(false)}
              onGhost={(enabled) => setConversation((current) => current ? { ...current, ghostMode: enabled } : current)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Sheet open={contactOpen} title={conversation.otherUser.displayName} onClose={() => setContactOpen(false)}>
        <div className="text-center">
          <p className="text-5xl">{conversation.otherUser.avatarEmoji}</p>
          <p className="mt-2 text-xl font-semibold">{conversation.otherUser.displayName}</p>
          <p className="text-sm text-muted">@{conversation.otherUser.username}</p>
          <p className="mt-2 text-sm">{conversation.otherUser.moodEmoji} {conversation.otherUser.moodText}</p>
          <p className="mt-1 text-xs text-muted">{conversation.otherUser.online ? 'online' : 'offline'}</p>
        </div>
        <div className="mt-5">
          <p className="font-semibold">Report or block</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['spam', 'harassment', 'hate', 'sexual', 'other'].map((reason) => (
              <button key={reason} type="button" className={`rounded-full px-3 py-2 text-xs ${reportReason === reason ? 'bg-white/20' : 'bg-white/5'}`} onClick={() => setReportReason(reason)}>{reason}</button>
            ))}
          </div>
          <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} placeholder="What happened? Optional." className="mt-3 w-full rounded-2xl border border-line bg-transparent px-3 py-2 text-base outline-none" />
          <div className="mt-3 flex gap-2">
            <Button className="px-4 py-2" onClick={() => {
              api('/api/safety/report', { method: 'POST', body: JSON.stringify({ userId: conversation.otherUser.id, conversationId: id, reason: reportReason, details: reportDetails }) })
                .then(() => { toast('Report sent. We will review it.'); setContactOpen(false); setReportDetails(''); })
                .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}>Report</Button>
            <Button variant="danger" className="px-4 py-2" onClick={() => {
              api('/api/safety/block', { method: 'POST', body: JSON.stringify({ userId: conversation.otherUser.id }) })
                .then(() => { toast('Blocked. They cannot ping you.'); setContactOpen(false); })
                .catch((err) => toast(err instanceof Error ? err.message : 'Toodle tripped. Try again.'));
            }}>Block</Button>
          </div>
        </div>
      </Sheet>
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

function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="5" cy="11" r="1.7" fill="currentColor" />
      <circle cx="11" cy="11" r="1.7" fill="currentColor" />
      <circle cx="17" cy="11" r="1.7" fill="currentColor" />
    </svg>
  );
}

function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            exit={{ y: 48 }}
            transition={{ duration: 0.22 }}
            className="max-h-[min(82dvh,40rem)] w-full max-w-[820px] overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
              <button type="button" className="chat-tool" onClick={onClose} aria-label="Close">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MessageBubble({
  message,
  mine,
  seen,
  selected,
  choosing,
  marked,
  tick,
  onSelect,
  onMark,
  onReply,
  onDelete,
  onReact,
  onRetry,
}: {
  message: ChatMessage;
  mine: boolean;
  seen: boolean;
  selected: boolean;
  choosing: boolean;
  marked: boolean;
  tick: number;
  onSelect: () => void;
  onMark: () => void;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onRetry?: () => void;
}) {
  const drag = useRef({ x: 0, y: 0, active: false, axis: '' as '' | 'x' | 'y' });
  const lastTap = useRef(0);
  const openTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const [shift, setShift] = useState(0);
  const [pop, setPop] = useState<string | null>(null);
  const [moreEmoji, setMoreEmoji] = useState(false);
  useEffect(() => () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);
  if (message.kind === 'system') {
    return <p className="py-2 text-center text-sm text-muted">{message.body}</p>;
  }
  const gifUrl = typeof message.metadata.gifUrl === 'string' ? message.metadata.gifUrl : '';
  const label = typeof message.metadata.label === 'string' ? message.metadata.label : '';
  const expiresLabel = message.expiresAt ? formatRemaining((new Date(message.expiresAt).getTime() - serverNowMs()) / 1000) : null;
  void tick;

  function feel(emoji: string) {
    nudge(emoji === '❤️' ? [8, 18] : 10);
    setPop(emoji);
    window.setTimeout(() => setPop((current) => current === emoji ? null : current), 460);
    onReact(emoji);
  }

  const canDelete = message.localStatus !== 'sending';

  function clearHold() {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, active: true, axis: '' };
    held.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      held.current = true;
      nudge(12);
      onMark();
    }, 420);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      clearHold();
      drag.current.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (drag.current.axis === 'x') event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (drag.current.axis !== 'x') return;
    const next = Math.max(canDelete ? -112 : -24, Math.min(112, dx * 0.72));
    setShift(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const axis = drag.current.axis;
    drag.current.active = false;
    clearHold();
    setShift(0);
    if (held.current) {
      held.current = false;
      return;
    }
    if (axis === 'x') {
      if (dx > 64) {
        nudge(8);
        onReply();
      } else if (dx < -64 && canDelete) {
        nudge([6, 16]);
        onDelete();
      }
      return;
    }
    if (Math.abs(dx) > 8) return;
    if (choosing) {
      onMark();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (openTimer.current) window.clearTimeout(openTimer.current);
      feel('❤️');
      return;
    }
    lastTap.current = now;
    if (openTimer.current) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => onSelect(), 260);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.08 }} className={`relative flex items-center ${mine ? 'justify-end' : 'justify-start'} ${selected ? 'z-30' : ''}`}>
      {choosing ? (
        <span className={`mr-2 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${marked ? 'border-primary bg-primary text-slate-950' : 'border-white/40'}`}>{marked ? '✓' : ''}</span>
      ) : null}
      <div className="relative flex max-w-[min(86%,22rem)] flex-col">
        {shift > 18 ? <span className="absolute inset-y-0 left-2 grid place-items-center text-xs font-semibold text-primary">Reply</span> : null}
        {shift < -18 && canDelete ? <span className="absolute inset-y-0 right-2 grid place-items-center text-xs font-semibold text-danger">Delete</span> : null}
        <div
          role="button"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current.active = false; setShift(0); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSelect();
          }}
          className={`relative touch-pan-y select-none rounded-[1.4rem] px-3 py-2 text-left ${mine ? 'bubble-mine' : 'bubble-theirs'} ${pop ? 'msg-pop' : ''} ${marked ? 'ring-2 ring-primary' : ''}`}
          style={{ transform: pop ? undefined : `translateX(${shift}px)`, ['--msg-shift' as string]: `${shift}px` }}
        >
          {pop ? <span className="react-float">{pop}</span> : null}
          {message.replyTo ? <p className="mb-1 truncate text-xs opacity-70">↩ {message.replyTo.body}</p> : null}
          {message.kind === 'gif' && gifUrl ? <img src={gifUrl} alt={message.body} className="mb-1 max-h-52 rounded-2xl" /> : null}
          {message.kind === 'gif' && !gifUrl ? <span className="block text-5xl">{label || '✨'}</span> : null}
          {message.kind === 'sticker' && gifUrl ? <img src={gifUrl} alt={message.body} className="mb-1 max-h-40 object-contain" /> : null}
          {message.kind === 'sticker' && !gifUrl ? <span className="block text-5xl">{label || message.body}</span> : null}
          {message.kind === 'text' ? <span className="whitespace-pre-wrap break-words">{message.body}</span> : null}
          <span className="mt-1 block text-[10px] opacity-60">
            {formatClock(message.createdAt)}
            {seen ? ' · Seen' : ''}
            {message.localStatus === 'failed' ? (
              <button type="button" className="ml-1 text-danger" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRetry?.(); }}>Didn't send · Retry</button>
            ) : null}
          </span>
          {expiresLabel ? <span className="block text-[10px] opacity-70">⏳ disappears in {expiresLabel}</span> : null}
          {message.reactions.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1 text-xs">
              {message.reactions.map((reaction) => (
                <button
                  key={`${reaction.userId}${reaction.emoji}`}
                  type="button"
                  className="rounded-full bg-black/10 px-1.5 py-0.5"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => { event.stopPropagation(); feel(reaction.emoji); }}
                >
                  {reaction.emoji}
                </button>
              ))}
            </span>
          ) : null}
        </div>
        {selected ? (
          <div className={`absolute top-full z-30 mt-1 w-max max-w-[min(18rem,80vw)] glass rounded-2xl p-2 ${mine ? 'right-0' : 'left-0'}`}>
            <div className="flex flex-wrap gap-1.5">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" className="grid h-11 w-11 place-items-center rounded-full bg-ink/10 text-lg active:scale-90" onClick={() => { feel(emoji); onSelect(); }}>{emoji}</button>
              ))}
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-ink/10 text-lg" aria-label="Add emoji" onClick={() => setMoreEmoji((open) => !open)}>+</button>
              <button type="button" className="min-h-11 rounded-full bg-ink/10 px-3 text-xs font-semibold" onClick={onReply}>Reply</button>
              <button type="button" className="min-h-11 rounded-full bg-ink/10 px-3 text-xs font-semibold" onClick={() => void navigator.clipboard.writeText(message.body)}>Copy</button>
              <button type="button" className="min-h-11 rounded-full bg-ink/10 px-3 text-xs font-semibold" onClick={onMark}>Select</button>
              {canDelete ? <button type="button" className="min-h-11 rounded-full bg-danger/15 px-3 text-xs font-semibold text-danger" onClick={onDelete}>Delete</button> : null}
            </div>
            {moreEmoji ? (
              <div className="mt-2 grid grid-cols-6 gap-1">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" className="grid h-10 w-10 place-items-center rounded-full text-xl active:scale-90" onClick={() => { setMoreEmoji(false); feel(emoji); onSelect(); }}>{emoji}</button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function GifSheet({ kind, onKind, onPick, onClose }: { kind: 'gif' | 'sticker'; onKind: (kind: 'gif' | 'sticker') => void; onPick: (gif: GifResult) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      api<{ results: GifResult[] }>(`/api/gifs?kind=${kind}&q=${encodeURIComponent(query)}`)
        .then((result) => setGifs(result.results))
        .catch(() => setGifs([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query, kind]);

  return (
    <div className="mb-2 rounded-3xl border border-line p-3">
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className={`text-sm font-semibold ${kind === 'gif' ? '' : 'opacity-50'}`} onClick={() => onKind('gif')}>GIFs</button>
        <button type="button" className={`text-sm font-semibold ${kind === 'sticker' ? '' : 'opacity-50'}`} onClick={() => onKind('sticker')}>Stickers</button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === 'sticker' ? 'Search stickers' : 'Search GIFs'} className="min-w-0 flex-1 bg-transparent outline-none" />
        <button type="button" onClick={onClose}>✕</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {gifs.map((gif) => (
          <button key={gif.id} type="button" onClick={() => onPick(gif)} className="grid h-16 place-items-center overflow-hidden rounded-2xl bg-white/10 text-3xl">
            {gif.url ? <img src={gif.previewUrl || gif.url} alt={gif.title} className={`h-full w-full ${kind === 'sticker' ? 'object-contain' : 'object-cover'}`} /> : gif.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">Powered by GIPHY</p>
    </div>
  );
}
