import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { musicPlayer } from './MusicManager';
import { vibeNotice, vibePresence } from './sync';
import type { useVibe } from './useVibe';

type VibeApi = ReturnType<typeof useVibe>;
type SheetView = 'home' | 'listen' | 'guess' | 'queue';

const CLIPS = [5, 10, 15, 20, 30];

function namesTheSong(clue: string, title: string) {
  const spoken = clue.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const name = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (spoken.length < 3 || name.length < 2) return false;
  if (spoken.includes(name)) return true;
  return name.split(' ').filter((word) => word.length >= 3).some((word) => spoken === word || spoken.includes(word));
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function Icon({ name }: { name: 'back' | 'info' | 'hide' | 'end' }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (name === 'back') return <svg {...props}><path d="M15 18 9 12l6-6" /></svg>;
  if (name === 'info') return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>;
  if (name === 'hide') {
    return (
      <svg {...props}>
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M4 20 20 4" />
      </svg>
    );
  }
  return <svg {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

function Tool({
  name,
  label,
  onClick,
}: {
  name: 'back' | 'info' | 'hide' | 'end';
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white/10 px-3 text-xs" onClick={onClick} aria-label={label}>
      <Icon name={name} />
      {label}
    </button>
  );
}

export function VibePanel({
  vibe,
  friendName,
  myId,
  place = 'bar',
}: {
  vibe: VibeApi;
  friendName: string;
  myId?: string;
  place?: 'bar' | 'sheet';
}) {
  const og = useTheme().theme === 'og';
  const [view, setView] = useState<SheetView>('home');
  const [guide, setGuide] = useState(false);
  const [guess, setGuess] = useState('');
  const [seconds, setSeconds] = useState(10);
  const hold = useRef<SheetView | null>(null);
  const bar = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const playing = vibe.state?.status === 'playing';
  const mystery = Boolean(vibe.state?.mystery && !vibe.state.revealed);
  const title = mystery ? 'Mystery song' : (vibe.state?.title || 'Vibe');

  useEffect(() => {
    if (guide) return;
    if (hold.current) {
      if (!vibe.state) {
        setView(hold.current);
        hold.current = null;
      }
      return;
    }
    if (vibe.state?.mode === 'guess') setView('guess');
    else if (vibe.state?.mode === 'listen') setView((current) => (current === 'home' || current === 'guess' ? 'listen' : current));
  }, [guide, vibe.state]);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const current = vibe.state;
      const position = current ? (musicPlayer.position() || current.position) : 0;
      const duration = current?.duration || 1;
      if (bar.current && document.activeElement !== bar.current) bar.current.value = String(Math.min(duration, position));
      if (time.current) time.current.textContent = current ? clock(position) : '';
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, vibe.state]);

  function endSession() {
    hold.current = 'home';
    setGuide(false);
    setView('home');
    vibe.stop();
  }

  function listenInstead() {
    hold.current = 'listen';
    setGuide(false);
    setView('listen');
    vibe.stop();
  }

  if (place === 'bar') {
    if (!vibe.expanded && !vibe.state) {
      return (
        <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-sm" onClick={vibe.toggle} aria-label="Open Vibe Together">
          🎧 Vibe
        </button>
      );
    }
    if (!vibe.expanded) {
      return (
        <button
          type="button"
          className="flex max-w-full items-center gap-2 truncate rounded-full bg-white/10 px-3 py-1 text-xs"
          onClick={() => {
            if (vibe.needsTap) vibe.hear();
            vibe.toggle();
          }}
          aria-label={mystery ? 'Open mystery song' : `Open ${title}`}
        >
          <span aria-hidden>{mystery ? '🎵' : '🎧'}</span>
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-muted">{vibe.needsTap ? 'Tap to join' : playing ? 'Playing' : 'Paused'}</span>
        </button>
      );
    }
    return <Tool name="hide" label="Hide" onClick={vibe.collapse} />;
  }

  if (!vibe.expanded) return null;

  const shell = `vibe-panel mt-2 max-h-[46dvh] w-full min-w-0 overflow-y-auto rounded-3xl border border-line bg-elevated p-3 shadow-card ${og ? 'vibe-panel-og' : ''}`;
  const notice = vibeNotice(vibe.state?.notice, vibe.state?.updatedBy === myId, friendName);
  const canBack = guide || view === 'queue' || (view === 'listen' && !vibe.state) || (view === 'guess' && vibe.state?.mode !== 'guess');
  const heading = guide ? 'How it works' : view === 'listen' ? 'Listen together' : view === 'guess' ? 'Guess the song' : view === 'queue' ? 'Up next' : (og ? 'VIBE TOGETHER' : 'Vibe');

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={shell}
      aria-label="Vibe Together"
    >
      <div className="flex flex-wrap items-center gap-2">
        {canBack ? (
          <Tool
            name="back"
            label="Back"
            onClick={() => {
              if (guide) setGuide(false);
              else if (view === 'queue') setView('listen');
              else setView('home');
            }}
          />
        ) : null}
        <Tool name="info" label="Info" onClick={() => setGuide((open) => !open)} />
        <Tool name="hide" label="Hide" onClick={vibe.collapse} />
        {vibe.state ? <Tool name="end" label="End" onClick={endSession} /> : null}
      </div>
      <p className={`mt-2 truncate text-sm font-semibold ${og ? 'og-display' : ''}`}>{heading}</p>
      {notice && !guide ? <p className="mt-1 text-xs text-muted">{notice}</p> : null}
      {vibe.reconnecting ? <p className="mt-1 text-xs text-muted">Reconnecting to the vibe...</p> : null}
      {vibe.needsTap ? (
        <button type="button" className="mt-2 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold" onClick={vibe.hear}>
          🎧 Tap to join
        </button>
      ) : null}

      {guide ? <Guide /> : null}
      {!guide && view === 'home' ? <Home og={og} onListen={() => setView('listen')} onGuess={() => setView('guess')} /> : null}
      {!guide && view === 'listen' ? (
        <Listen
          vibe={vibe}
          friendName={friendName}
          myId={myId}
          bar={bar}
          time={time}
          playing={Boolean(playing)}
          onQueue={() => setView('queue')}
          onGuess={() => setView('guess')}
        />
      ) : null}
      {!guide && view === 'guess' ? (
        <Guess
          vibe={vibe}
          friendName={friendName}
          myId={myId}
          og={og}
          guess={guess}
          setGuess={setGuess}
          seconds={seconds}
          setSeconds={setSeconds}
          time={time}
          playing={Boolean(playing)}
          onListen={listenInstead}
        />
      ) : null}
      {!guide && view === 'queue' ? <Queue vibe={vibe} myId={myId} friendName={friendName} /> : null}
    </motion.section>
  );
}

function Guide() {
  return (
    <div className="mt-3 space-y-3 text-sm">
      <div className="space-y-2">
        <p className="flex items-center gap-2"><Icon name="hide" /> <span><span className="font-semibold">Hide</span> tucks this panel away. The music keeps going, and the chat stays open.</span></p>
        <p className="flex items-center gap-2"><Icon name="end" /> <span><span className="font-semibold">End</span> stops the music for both of you.</span></p>
        <p className="flex items-center gap-2"><Icon name="back" /> <span><span className="font-semibold">Back</span> leaves this screen. The song or game keeps running.</span></p>
      </div>
      <div>
        <p className="font-semibold">Listen together</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
          <li>Pick a song. You both hear the same moment.</li>
          <li>Play, pause, and skip stay in sync.</li>
          <li>Volume is only yours.</li>
          <li>Hide keeps it playing while you type. End stops it.</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold">Guess the song</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">
          <li>One person picks the song. The other only hears it. The title stays hidden.</li>
          <li>Choose 5, 10, 15, 20, or 30 seconds. Some songs open with music, some with a lyric, so pick a clip that is fair.</li>
          <li>That clip loops until someone names the song, or you switch who picks.</li>
          <li>The picker marks each guess right or wrong. A different spelling can still count.</li>
          <li>A guess marked right wins the round. Switch turns, and the other person can win the next one.</li>
          <li>The picker can send a short name hint. Keep it a clue.</li>
          <li>New song keeps the same guesser. Switch turns swaps who picks. End closes the game.</li>
          <li>Hide leaves the clip playing in the chat. End stops it for both of you.</li>
        </ul>
      </div>
    </div>
  );
}

function Home({ og, onListen, onGuess }: { og: boolean; onListen: () => void; onGuess: () => void }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm">{og ? 'Okay. What are we doing.' : 'Okayyy... what are we doing? 👀'}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" className="rounded-3xl border border-line bg-white/5 p-3 text-left" onClick={onListen}>
          <span className="text-lg" aria-hidden>🎧</span>
          <p className="mt-1 font-semibold">Listen together</p>
          <p className="text-xs text-muted">Same song, same moment.</p>
        </button>
        <button type="button" className="rounded-3xl border border-line bg-white/5 p-3 text-left" onClick={onGuess}>
          <span className="text-lg" aria-hidden>🎵</span>
          <p className="mt-1 font-semibold">Guess the song</p>
          <p className="text-xs text-muted">One of you picks. The other names it.</p>
        </button>
      </div>
    </div>
  );
}

function Listen({
  vibe,
  friendName,
  myId,
  bar,
  time,
  playing,
  onQueue,
  onGuess,
}: {
  vibe: VibeApi;
  friendName: string;
  myId?: string;
  bar: RefObject<HTMLInputElement>;
  time: RefObject<HTMLSpanElement>;
  playing: boolean;
  onQueue: () => void;
  onGuess: () => void;
}) {
  const presence = vibePresence(vibe.state, myId, friendName);
  return (
    <div className="mt-3">
      <p className="truncate text-center font-semibold">{vibe.state?.title ?? 'Pick a song'}</p>
      <p className="truncate text-center text-xs text-muted">{vibe.state?.artist ?? 'Your library'}</p>
      <input
        ref={bar}
        className="mt-3 w-full accent-current"
        type="range"
        min={0}
        max={vibe.state?.duration || 1}
        step={0.1}
        defaultValue={0}
        aria-label="Song position"
        onPointerUp={(event) => vibe.seek(Number(event.currentTarget.value))}
        onKeyUp={(event) => vibe.seek(Number(event.currentTarget.value))}
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span ref={time}>0:00</span>
        <span>{clock(vibe.state?.duration || 0)}</span>
      </div>
      <p className="mt-2 text-center text-xs text-muted">{presence || 'Ready when you are'}</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button type="button" className="min-h-11 rounded-full bg-white/10 px-3" onClick={vibe.previous} aria-label="Previous song">◀</button>
        <button type="button" className="min-h-11 rounded-full bg-white/15 px-4 font-semibold" onClick={() => (playing ? vibe.pause() : vibe.play())} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="min-h-11 rounded-full bg-white/10 px-3" onClick={vibe.next} aria-label="Next song">▶</button>
      </div>
      <label className="mt-3 block text-xs text-muted">
        Your volume
        <input
          className="mt-1 w-full"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vibe.volume}
          aria-label="Your volume"
          onChange={(event) => vibe.setVolume(Number(event.target.value))}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button type="button" className="rounded-full bg-white/5 px-3 py-2" onClick={onQueue}>Queue</button>
        <button type="button" className="rounded-full bg-white/5 px-3 py-2" onClick={onGuess}>Guess instead</button>
      </div>
      <SearchList vibe={vibe} action="play" />
    </div>
  );
}

function Guess({
  vibe,
  friendName,
  myId,
  og,
  guess,
  setGuess,
  seconds,
  setSeconds,
  time,
  playing,
  onListen,
}: {
  vibe: VibeApi;
  friendName: string;
  myId?: string;
  og: boolean;
  guess: string;
  setGuess: (value: string) => void;
  seconds: number;
  setSeconds: (value: number) => void;
  time: RefObject<HTMLSpanElement>;
  playing: boolean;
  onListen: () => void;
}) {
  const state = vibe.state;
  const picker = state?.role === 'picker';
  const hidden = Boolean(state?.sealed && !state.revealed);
  const revealed = Boolean(state?.revealed && state.title);
  const mineScore = myId ? state?.scores?.[myId] ?? 0 : 0;
  const otherId = myId && state?.pickerId === myId ? state?.guesserId : state?.pickerId;
  const friendScore = otherId ? state?.scores?.[otherId] ?? 0 : 0;
  const pending = Boolean(state?.lastGuess?.pending);
  const wrong = state?.lastGuess && !state.lastGuess.pending && !state.lastGuess.correct ? state.lastGuess : null;
  const [hint, setHint] = useState('');
  const [hintNote, setHintNote] = useState('');
  const [picking, setPicking] = useState(false);
  const clip = state?.clipSeconds || seconds;

  if (!state || state.mode !== 'guess') {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm">Who picks the song?</p>
        <button type="button" className="w-full rounded-2xl bg-white/10 px-3 py-3 text-left" onClick={() => vibe.inviteGuess('me')}>
          <span className="font-semibold">I'll pick</span>
          <span className="mt-1 block text-xs text-muted">{friendName} guesses.</span>
        </button>
        <button type="button" className="w-full rounded-2xl bg-white/10 px-3 py-3 text-left" disabled={!vibe.friendReady} onClick={() => vibe.inviteGuess('them')}>
          <span className="font-semibold">They pick</span>
          <span className="mt-1 block text-xs text-muted">{friendName} chooses. You guess.</span>
        </button>
      </div>
    );
  }

  const choosing = Boolean((state.waiting && picker) || picking);

  return (
    <div className="mt-3">
      <div className={`rounded-3xl border border-line p-3 text-center ${og ? 'vibe-mystery-og' : 'vibe-mystery'}`}>
        {picker && hidden ? (
          <>
            <p className="font-semibold">{state.title}</p>
            <p className="text-xs text-muted">{state.artist}</p>
            <p className="mt-2 text-xs">Hidden from {friendName}</p>
          </>
        ) : null}
        {!picker && hidden ? (
          <>
            <p className="text-3xl" aria-hidden>🔒</p>
            <p className="font-semibold">Song hidden</p>
            <p className="text-xs text-muted">Name it when you know it.</p>
          </>
        ) : null}
        {revealed ? (
          <div className="vibe-reveal">
            <p className="text-xs">{state.lastGuess?.correct ? (state.lastGuess.userId === myId ? 'You got it' : `${friendName} got it`) : 'The song was'}</p>
            <p className="text-lg font-semibold">{state.title}</p>
            <p className="text-xs text-muted">{state.artist}</p>
          </div>
        ) : null}
        {state.waiting ? <p className="text-sm">{picker ? 'Choose the clip, then the song.' : `${friendName} is choosing a song.`}</p> : null}
        {!state.waiting && !revealed ? (
          <p className="mt-2 text-sm">Looping the first {clip}s · <span ref={time}>0:00</span> {playing ? 'playing' : 'paused'}</p>
        ) : null}
        {state.hints?.length ? <p className="mt-2 text-xs">Hint: {state.hints.join(' · ')}</p> : null}
      </div>

      {pending && state.lastGuess ? (
        <div className="mt-3 rounded-2xl bg-white/5 px-3 py-3 text-center">
          <p className="text-sm">"{state.lastGuess.text}"</p>
          {picker ? (
            <div className="mt-2 flex justify-center gap-2">
              <button type="button" className="min-h-11 rounded-full bg-white/15 px-4 text-sm font-semibold" onClick={() => vibe.judgeGuess(true)}>Right</button>
              <button type="button" className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold" onClick={() => vibe.judgeGuess(false)}>Wrong</button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">{friendName} marks this.</p>
          )}
        </div>
      ) : null}

      {wrong ? <p className="vibe-shake mt-2 text-center text-sm">Keep listening.</p> : null}

      {!picker && hidden ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            vibe.submitGuess(guess);
            setGuess('');
          }}
        >
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="Song name"
            aria-label="Song guess"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-transparent px-3 py-2 text-base outline-none"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-2xl bg-white/10 px-3 text-sm font-semibold">Guess</button>
        </form>
      ) : null}

      {picker && hidden && !state.waiting ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (state.title && namesTheSong(hint, state.title)) {
              setHintNote('That clue names the song. Try a smaller clue.');
              return;
            }
            vibe.giveHint(hint);
            setHint('');
            setHintNote('');
          }}
        >
          <input
            value={hint}
            onChange={(event) => setHint(event.target.value)}
            placeholder="Name a hint"
            aria-label="Name a hint"
            maxLength={40}
            className="min-w-0 flex-1 rounded-2xl border border-line bg-transparent px-3 py-2 text-base outline-none"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-2xl bg-white/10 px-3 text-sm font-semibold">Send</button>
        </form>
      ) : null}
      {hintNote ? <p className="mt-1 text-xs text-muted">{hintNote}</p> : null}

      {choosing && picker ? (
        <div className="mt-3">
          <p className="text-xs text-muted">How many seconds loop</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {CLIPS.map((option) => (
              <button key={option} type="button" className={`min-h-11 rounded-full px-3 ${seconds === option ? 'bg-white/15' : 'bg-white/5'}`} onClick={() => setSeconds(option)}>
                {option}s
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">That opening keeps looping until they guess, or you switch who picks.</p>
          <SearchList
            vibe={vibe}
            action="guess"
            seconds={seconds}
            onPicked={() => setPicking(false)}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span>You {mineScore}</span>
        <span className="text-muted">Round {state.round ?? 1}</span>
        <span>{friendName} {friendScore}</span>
      </div>
      <p className="mt-1 text-center text-[11px] text-muted">Whoever is guessing can win. Switch turns and the other person can win next.</p>

      {!state.waiting ? (
        <div className="mt-2 flex justify-center">
          <button type="button" className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-semibold" onClick={() => (playing ? vibe.pause() : vibe.play())} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {picker && hidden && !state.waiting ? <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => setPicking((open) => !open)}>New song</button> : null}
        {!revealed ? <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.nextRound(picker ? 'them' : 'me')}>Switch turns</button> : null}
        {revealed ? <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.nextRound('me')}>I pick next</button> : null}
        {revealed ? <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.nextRound('them')}>They pick next</button> : null}
        {picker && hidden && !state.waiting ? <button type="button" className="rounded-full px-3 py-2 text-muted" onClick={vibe.reveal}>Show song</button> : null}
        <button type="button" className="rounded-full px-3 py-2 text-muted" onClick={onListen}>Listen together</button>
      </div>
    </div>
  );
}

function Queue({
  vibe,
  myId,
  friendName,
}: {
  vibe: VibeApi;
  myId?: string;
  friendName: string;
}) {
  return (
    <div className="mt-3">
      <div className="space-y-1">
        {(vibe.state?.queue ?? []).length === 0 ? <p className="text-xs text-muted">Queue is empty. Add a song.</p> : null}
        {vibe.state?.queue?.map((item) => (
          <div key={item.trackId} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{item.title}</span>
            <span className="shrink-0 text-[11px] text-muted">{item.addedBy === myId ? 'You' : friendName}</span>
            <button type="button" className="text-xs text-muted" onClick={() => vibe.queueRemove(item.trackId)} aria-label={`Remove ${item.title}`}>Remove</button>
          </div>
        ))}
      </div>
      <SearchList vibe={vibe} action="queue" />
    </div>
  );
}

function SearchList({
  vibe,
  action,
  seconds = 10,
  onPicked,
}: {
  vibe: VibeApi;
  action: 'play' | 'queue' | 'guess';
  seconds?: number;
  onPicked?: () => void;
}) {
  return (
    <div className="mt-3">
      <input
        value={vibe.query}
        onChange={(event) => vibe.setQuery(event.target.value)}
        placeholder="Search a song"
        aria-label="Search a song"
        className="w-full rounded-2xl border border-line bg-transparent px-3 py-2 text-sm outline-none"
      />
      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
        {vibe.tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl px-2 py-2 text-left text-sm hover:bg-white/10"
            onClick={() => {
              if (action === 'queue') vibe.queueAdd(track);
              else if (action === 'guess') {
                void vibe.startGuess(track, seconds);
                onPicked?.();
              } else vibe.change(track);
            }}
          >
            <span className="min-w-0">
              <span className="block truncate">{track.title}</span>
              <span className="block truncate text-[11px] text-muted">{track.artist}</span>
            </span>
            <span className="shrink-0 text-[11px]">{action === 'queue' ? 'Add' : 'Play'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
