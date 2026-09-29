import { Suspense, lazy, useEffect, useState } from 'react';
import type { DanceStyle, ToodleProp } from '../animations';

const ToodleScene = lazy(() => import('./ToodleScene'));

export function ToodleStage({
  animation = null,
  playId = 'idle',
  danceStyle = 'bounce',
  prop,
  line,
  suggestion,
  listening = false,
  inline = false,
  onTap,
  onUse,
  onDone,
}: {
  animation?: string | null;
  playId?: string;
  danceStyle?: DanceStyle;
  prop?: ToodleProp;
  line?: string;
  suggestion?: string;
  listening?: boolean;
  inline?: boolean;
  onTap?: () => void;
  onUse?: (phrase: string) => void;
  onDone?: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [aside, setAside] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    const onHide = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      media.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => {
    if (!listening || line) return;
    const handle = window.setTimeout(() => {
      if (Math.random() > 0.35) return;
      setAside("I'm listening... 👀");
      window.setTimeout(() => setAside((current) => current?.startsWith("I'm listening") ? null : current), 1600);
    }, 2600);
    return () => window.clearTimeout(handle);
  }, [listening, line]);

  const bubble = line ?? aside;

  return (
    <div className={inline
      ? 'relative mx-auto flex w-full max-w-sm items-end justify-center gap-2'
      : 'pointer-events-none absolute bottom-full left-0 right-0 z-20 h-48'}
    >
      <div className="relative h-full w-full">
        <Suspense fallback={null}>
          <ToodleScene
            animation={animation}
            playId={playId}
            danceStyle={danceStyle}
            prop={prop}
            listening={listening}
            reduced={reduced}
            paused={paused}
          />
        </Suspense>
        <button
          type="button"
          aria-label="Toodle"
          onClick={onTap}
          className="pointer-events-auto absolute bottom-1 left-1/2 h-40 w-28 -translate-x-1/2 cursor-pointer bg-transparent"
        />
      </div>
      {bubble ? (
        <div className={`${suggestion ? 'pointer-events-auto' : 'pointer-events-none'} ${inline ? 'mb-6' : 'absolute left-3 top-1'} max-w-[200px] rounded-2xl bg-elevated px-3 py-2 text-sm shadow-card`}>
          <p>{bubble}</p>
          {suggestion ? (
            <button
              type="button"
              className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"
              onClick={() => {
                onUse?.(suggestion);
                onDone?.();
              }}
            >
              Use this
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
