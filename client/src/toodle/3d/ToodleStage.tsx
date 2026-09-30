import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ToodleAudioDebug } from '../audio/ToodleAudioDebug';
import { toodleAudio } from '../audio/ToodleAudioEngine';
import type { DanceStyle, ToodleProp } from '../animations';

const ToodleScene = lazy(() => import('./ToodleScene'));

const ROOMY = new Set(['walk', 'run', 'dance', 'hide', 'peek', 'walkAway', 'fall', 'jump', 'spin', 'celebrate', 'dramatic']);

function stageHeight(animation?: string | null) {
  if (animation && ROOMY.has(animation)) return 'clamp(11rem, 32dvh, 14rem)';
  if (animation) return 'clamp(9.5rem, 26dvh, 12rem)';
  return 'clamp(8.75rem, 22dvh, 10.5rem)';
}

export function ToodleStage({
  animation = null,
  playId = 'idle',
  danceStyle = 'bounce',
  prop,
  line,
  suggestion,
  listening = false,
  inline = false,
  glance = 'center',
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
  glance?: 'left' | 'right' | 'center';
  onTap?: () => void;
  onUse?: (phrase: string) => void;
  onDone?: () => void;
}) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hit = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (inline) return;
    toodleAudio.startIdle();
    return () => toodleAudio.stopIdle();
  }, [inline]);

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

  const bubble = line;

  const bubbleSide = glance === 'right' ? 'right-3 items-end' : 'left-3 items-start';

  return (
    <div
      className={inline
        ? 'relative mx-auto flex h-48 w-full max-w-sm items-end justify-center gap-2'
        : 'pointer-events-none relative mt-1 w-full transition-[height] duration-300'}
      style={inline ? undefined : { height: stageHeight(animation) }}
    >
      <div className="relative h-full w-full">
        <ToodleAudioDebug />
        <Suspense fallback={null}>
          <ToodleScene
            animation={animation}
            playId={playId}
            danceStyle={danceStyle}
            prop={prop}
            listening={listening}
            reduced={reduced}
            paused={paused}
            glance={glance}
            onPlace={(x) => {
              const node = hit.current;
              if (!node) return;
              node.style.left = `${x * 100}%`;
            }}
          />
        </Suspense>
        <button
          ref={hit}
          type="button"
          aria-label="Toodle"
          onClick={onTap}
          className="pointer-events-auto absolute bottom-1 left-[18%] h-[78%] w-28 -translate-x-1/2 cursor-pointer bg-transparent"
        />
      </div>
      {bubble ? (
        <div className={`toodle-line ${suggestion ? 'pointer-events-auto' : 'pointer-events-none'} ${inline ? 'mb-6' : `absolute top-1 flex flex-col ${bubbleSide}`} max-w-[200px] rounded-2xl bg-elevated px-3 py-2 text-sm shadow-card`}>
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
