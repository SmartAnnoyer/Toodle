import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { musicPlayer } from './MusicManager';
import { vibePresence } from './sync';
import type { useVibe } from './useVibe';

function Bars({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0.45, 0.9, 0.6, 1, 0.7].map((height, index) => (
        <motion.span
          key={index}
          className="w-1 rounded-full bg-cyan-200"
          animate={playing ? { scaleY: [0.3, height, 0.4] } : { scaleY: 0.3 }}
          transition={playing ? { repeat: Infinity, duration: 0.55 + index * 0.07, repeatType: 'mirror' } : { duration: 0.2 }}
          style={{ height: 14, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  );
}

export function VibePanel({
  vibe,
  friendName,
  myId,
}: {
  vibe: ReturnType<typeof useVibe>;
  friendName: string;
  myId?: string;
}) {
  const bar = useRef<HTMLInputElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const playing = vibe.state?.status === 'playing';

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const current = vibe.state;
      const position = current ? (musicPlayer.position() || current.position) : 0;
      const duration = current?.duration || 1;
      if (bar.current && document.activeElement !== bar.current) bar.current.value = String(Math.min(duration, position));
      if (label.current) label.current.textContent = current ? `${Math.floor(position)}s` : '';
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, vibe.state]);

  if (!vibe.expanded && !vibe.state) {
    return (
      <button type="button" className="text-muted" onClick={vibe.toggle}>🎵 Vibe</button>
    );
  }

  if (!vibe.expanded) {
    return (
      <button type="button" className="max-w-full truncate rounded-full bg-white/10 px-3 py-1 text-xs" onClick={vibe.toggle}>
        🎵 {vibe.state?.title ?? 'Vibe Together'} · {playing ? '▶' : '❚❚'}
      </button>
    );
  }

  const presence = vibePresence(vibe.state, myId, friendName);

  return (
    <div className="w-full min-w-0 basis-full">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/10 p-3 shadow-[0_0_24px_rgba(168,85,247,0.15)] backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">🎵 Vibe Together</p>
          <button type="button" className="text-xs text-muted" onClick={vibe.collapse}>Close</button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Bars playing={Boolean(playing)} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{vibe.state?.title ?? 'Pick a vibe'}</p>
            <p className="truncate text-xs text-muted">{vibe.state ? `${vibe.state.artist ?? 'Toodle Originals'} · ${vibe.state.energy}` : 'Original loops'}</p>
          </div>
        </div>
        <input
          ref={bar}
          className="mt-3 w-full accent-fuchsia-300"
          type="range"
          min={0}
          max={vibe.state?.duration ?? 1}
          step={0.1}
          defaultValue={0}
          aria-label="Seek"
          onPointerUp={(event) => vibe.seek(Number(event.currentTarget.value))}
          onKeyUp={(event) => vibe.seek(Number(event.currentTarget.value))}
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
          <span ref={label} />
          {vibe.reconnecting ? <span>Reconnecting</span> : null}
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => shift(vibe, -1)} aria-label="Previous">◀</button>
          <button type="button" className="rounded-full bg-white/15 px-4 py-2" onClick={() => (playing ? vibe.pause() : vibe.play())} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <button type="button" className="rounded-full bg-white/10 px-3 py-2" onClick={() => shift(vibe, 1)} aria-label="Next">▶</button>
        </div>
        <input
          value={vibe.query}
          onChange={(event) => vibe.setQuery(event.target.value)}
          placeholder="Search vibes"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-3 py-2 text-sm outline-none"
        />
        <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
          {vibe.tracks.map((track) => (
            <button key={track.id} type="button" className="flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl px-2 py-1.5 text-left text-sm hover:bg-white/10" onClick={() => vibe.change(track)}>
              <span className="truncate">{track.title}</span>
              <span className="shrink-0 text-[11px] text-muted">{track.energy}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <p className="truncate text-emerald-200/90">{presence ? `🟢 ${presence}` : 'Ready when you are'}</p>
          {vibe.state ? <button type="button" className="text-muted" onClick={vibe.stop}>End</button> : null}
        </div>
      </motion.div>
    </div>
  );
}

function shift(vibe: ReturnType<typeof useVibe>, direction: number) {
  const list = vibe.tracks;
  if (list.length === 0) return;
  const index = Math.max(0, list.findIndex((track) => track.id === vibe.state?.trackId));
  const next = list[(index + direction + list.length) % list.length];
  if (next) vibe.change(next);
}
