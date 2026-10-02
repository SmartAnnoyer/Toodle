import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { musicPlayer } from './MusicManager';
import { vibeNotice, vibePresence } from './sync';
import type { useVibe } from './useVibe';

type VibeApi = ReturnType<typeof useVibe>;
type SheetView = 'home' | 'listen' | 'guess' | 'pick' | 'queue';

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
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
  const [guess, setGuess] = useState('');
  const [seconds, setSeconds] = useState(60);
  const bar = useRef<HTMLInputElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const playing = vibe.state?.status === 'playing';
  const mystery = Boolean(vibe.state?.mystery && !vibe.state.revealed);
  const title = mystery ? 'Mystery vibe' : (vibe.state?.title || 'Vibe Together');

  useEffect(() => {
    if (vibe.state?.mode === 'guess') setView((current) => current === 'pick' ? current : 'guess');
    else if (vibe.state?.mode === 'listen') setView((current) => current === 'home' || current === 'guess' ? 'listen' : current);
  }, [vibe.state?.mode, vibe.state?.round]);

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
          aria-label={mystery ? 'Open mystery vibe' : `Open ${title}`}
        >
          <span aria-hidden>{mystery ? '🎵' : '🎧'}</span>
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-muted">{vibe.needsTap ? 'Tap to join' : playing ? 'Vibing' : 'Paused'}</span>
        </button>
      );
    }
    return (
      <button type="button" className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={vibe.collapse} aria-label="Hide vibe panel">
        🎧 Hide
      </button>
    );
  }

  if (!vibe.expanded) return null;

  const shell = `vibe-panel mt-2 max-h-[46dvh] w-full min-w-0 overflow-y-auto rounded-3xl border border-line bg-elevated p-3 shadow-card ${og ? 'vibe-panel-og' : ''}`;
  const notice = vibeNotice(vibe.state?.notice, vibe.state?.updatedBy === myId, friendName);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={shell}
      aria-label="Vibe Together"
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-semibold ${og ? 'og-display' : ''}`}>{og ? 'VIBE TOGETHER' : '🎧 Vibe Together'}</p>
        <button type="button" className="text-xs text-muted" onClick={vibe.collapse}>Hide</button>
      </div>
      {notice ? <p className="mt-1 text-xs text-muted">{notice}</p> : null}
      {vibe.reconnecting ? <p className="mt-1 text-xs text-muted">Reconnecting to the vibe...</p> : null}
      {vibe.needsTap ? (
        <button type="button" className="mt-2 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold" onClick={vibe.hear}>
          🎧 Tap to join
        </button>
      ) : null}

      {view === 'home' ? <Home og={og} onListen={() => setView('listen')} onGuess={() => setView('guess')} /> : null}
      {view === 'listen' ? (
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
      {view === 'guess' ? (
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
          onPick={() => setView('pick')}
        />
      ) : null}
      {view === 'pick' ? <Picker vibe={vibe} seconds={seconds} onBack={() => setView('guess')} /> : null}
      {view === 'queue' ? <Queue vibe={vibe} myId={myId} friendName={friendName} onBack={() => setView('listen')} /> : null}
    </motion.section>
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
          <p className="text-xs text-muted">Pick a song. Same moment, both of you.</p>
        </button>
        <button type="button" className="rounded-3xl border border-line bg-white/5 p-3 text-left" onClick={onGuess}>
          <span className="text-lg" aria-hidden>🎵</span>
          <p className="mt-1 font-semibold">Guess the song</p>
          <p className="text-xs text-muted">Play a mystery. Let them sweat.</p>
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
      <p className="text-center text-xs uppercase tracking-wide text-muted">Vibing together</p>
      <div className={`mx-auto mt-2 grid h-16 w-16 place-items-center rounded-2xl text-2xl ${playing ? 'vibe-disc' : 'bg-white/10'}`} aria-hidden>
        🎧
      </div>
      <p className="mt-2 truncate text-center font-semibold">{vibe.state?.title ?? 'Pick a song'}</p>
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
      <div className="mt-2 flex items-center justify-center gap-2 text-sm">
        <span className="rounded-full bg-white/10 px-2 py-1">You {playing ? '●' : '○'}</span>
        <span className="rounded-full bg-white/10 px-2 py-1">{friendName} {playing ? '●' : '○'}</span>
      </div>
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
        <button type="button" className={`rounded-full px-3 py-2 ${vibe.state?.control !== 'hostOnly' ? 'bg-white/15' : 'bg-white/5'}`} onClick={() => vibe.setControl('both')}>Both can control</button>
        <button type="button" className={`rounded-full px-3 py-2 ${vibe.state?.control === 'hostOnly' ? 'bg-white/15' : 'bg-white/5'}`} onClick={() => vibe.setControl('hostOnly')}>Only host</button>
        <button type="button" className="rounded-full bg-white/5 px-3 py-2" onClick={onQueue}>Queue</button>
        <button type="button" className="rounded-full bg-white/5 px-3 py-2" onClick={onGuess}>Guess a song</button>
        {vibe.state ? <button type="button" className="rounded-full px-3 py-2 text-muted" onClick={vibe.stop}>End vibe</button> : null}
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
  onPick,
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
  onPick: () => void;
}) {
  const state = vibe.state;
  const picker = state?.role === 'picker';
  const hidden = Boolean(state?.sealed && !state.revealed);
  const revealed = Boolean(state?.revealed && state.title);
  const mineScore = myId ? state?.scores?.[myId] ?? 0 : 0;
  const otherId = myId && state?.pickerId === myId ? state?.guesserId : state?.pickerId;
  const friendScore = otherId ? state?.scores?.[otherId] ?? 0 : 0;
  const wrong = state?.lastGuess && !state.lastGuess.correct ? state.lastGuess : null;

  if (!state || state.mode !== 'guess') {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm">Who wants to get challenged?</p>
        <button type="button" className="w-full rounded-2xl bg-white/10 px-3 py-3 text-left" onClick={() => { vibe.inviteGuess('me'); onPick(); }}>
          <span className="font-semibold">I'll pick 🎵</span>
          <span className="mt-1 block text-xs text-muted">You choose. {friendName} guesses.</span>
        </button>
        <button type="button" className="w-full rounded-2xl bg-white/10 px-3 py-3 text-left" disabled={!vibe.friendReady} onClick={() => vibe.inviteGuess('them')}>
          <span className="font-semibold">Let them pick 🎵</span>
          <span className="mt-1 block text-xs text-muted">{friendName} chooses a mystery.</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className={`rounded-3xl border border-line p-3 text-center ${og ? 'vibe-mystery-og' : 'vibe-mystery'}`}>
        <p className="text-xs uppercase tracking-wide text-muted">{hidden ? 'Mystery vibe' : 'Guess battle'}</p>
        {picker && hidden ? (
          <>
            <p className="mt-2 font-semibold">{state.title}</p>
            <p className="text-xs text-muted">{state.artist}</p>
            <p className="mt-2 text-xs">Hidden from {friendName}</p>
          </>
        ) : null}
        {!picker && hidden ? (
          <>
            <p className="mt-2 text-3xl" aria-hidden>🔒</p>
            <p className="font-semibold">Song hidden</p>
            <p className="text-xs text-muted">Listen carefully...</p>
          </>
        ) : null}
        {revealed ? (
          <div className="vibe-reveal mt-2">
            <p className="text-xs">{state.lastGuess?.correct ? (state.lastGuess.userId === myId ? 'You got it' : `${friendName} got it`) : 'The song was'}</p>
            <p className="text-lg font-semibold">{state.title}</p>
            <p className="text-xs text-muted">{state.artist}</p>
          </div>
        ) : null}
        <p className="mt-2 text-sm"><span ref={time}>0:00</span> {playing ? '· playing' : '· paused'}</p>
        {state.hints?.length ? <p className="mt-2 text-xs">{state.hints.join(' · ')}</p> : null}
      </div>

      {wrong ? <p className="vibe-shake mt-2 text-center text-sm">Not quite. Keep listening.</p> : null}

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
            placeholder="What's the song?"
            aria-label="Song guess"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-transparent px-3 py-2 text-base outline-none"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-2xl bg-white/10 px-3 text-sm font-semibold">Guess</button>
        </form>
      ) : null}

      {picker && hidden ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.giveHint('letter')}>First letter</button>
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.giveHint('mood')}>Mood hint</button>
          <button type="button" className="rounded-full bg-white/15 px-3 py-2 font-semibold" onClick={vibe.reveal}>Reveal song</button>
        </div>
      ) : null}

      {state.waiting && picker ? (
        <div className="mt-3">
          <p className="text-sm">Pick the mystery.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {[30, 45, 60, 90, 0].map((option) => (
              <button key={option} type="button" className={`rounded-full px-3 py-2 ${seconds === option ? 'bg-white/15' : 'bg-white/5'}`} onClick={() => setSeconds(option)}>
                {option === 0 ? 'Full song' : `${option}s`}
              </button>
            ))}
          </div>
          <button type="button" className="mt-2 text-sm font-semibold" onClick={onPick}>Choose a track</button>
          <button
            type="button"
            className="mt-2 block text-sm"
            onClick={() => {
              const list = vibe.tracks;
              const track = list[Math.floor(Math.random() * list.length)];
              if (track) void vibe.startGuess(track, seconds);
            }}
          >
            Quick guess
          </button>
        </div>
      ) : null}

      {state.waiting && !picker ? <p className="mt-3 text-sm text-muted">{friendName} is picking a mystery.</p> : null}

      <div className="mt-3 flex items-center justify-between text-sm">
        <span>You {mineScore}</span>
        <span className="text-muted">Round {state.round ?? 1}</span>
        <span>{friendName} {friendScore}</span>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button type="button" className="min-h-11 rounded-full bg-white/10 px-3 text-sm" onClick={() => (playing ? vibe.pause() : vibe.play())} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      {revealed ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.nextRound('me')}>I'll pick next</button>
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => vibe.nextRound('them')}>They pick next</button>
          <button type="button" className="rounded-full px-3 py-2 text-muted" onClick={vibe.stop}>End vibe</button>
        </div>
      ) : null}
    </div>
  );
}

function Picker({ vibe, seconds, onBack }: { vibe: VibeApi; seconds: number; onBack: () => void }) {
  return (
    <div className="mt-3">
      <button type="button" className="text-xs text-muted" onClick={onBack}>Back</button>
      <p className="mt-2 text-sm font-semibold">Pick a mystery song</p>
      <SearchList vibe={vibe} action="guess" seconds={seconds} />
    </div>
  );
}

function Queue({
  vibe,
  myId,
  friendName,
  onBack,
}: {
  vibe: VibeApi;
  myId?: string;
  friendName: string;
  onBack: () => void;
}) {
  return (
    <div className="mt-3">
      <button type="button" className="text-xs text-muted" onClick={onBack}>Back</button>
      <p className="mt-2 text-sm font-semibold">Up next</p>
      <div className="mt-2 space-y-1">
        {(vibe.state?.queue ?? []).length === 0 ? <p className="text-xs text-muted">Queue is empty. Add something.</p> : null}
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

function SearchList({ vibe, action, seconds = 60 }: { vibe: VibeApi; action: 'play' | 'queue' | 'guess'; seconds?: number }) {
  return (
    <div className="mt-3">
      <input
        value={vibe.query}
        onChange={(event) => vibe.setQuery(event.target.value)}
        placeholder="Search music"
        aria-label="Search music"
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
              else if (action === 'guess') void vibe.startGuess(track, seconds);
              else vibe.change(track);
            }}
          >
            <span className="min-w-0">
              <span className="block truncate">{track.title}</span>
              <span className="block truncate text-[11px] text-muted">{track.artist}</span>
            </span>
            <span className="shrink-0 text-[11px]">{action === 'queue' ? 'Add' : action === 'guess' ? 'Hide & play' : 'Play'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
