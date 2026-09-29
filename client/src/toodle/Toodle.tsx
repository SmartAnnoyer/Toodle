import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  framesFor,
  PROP_MARK,
  SIZE_PX,
  spriteSrc,
  type DanceStyle,
  type MotionFrame,
  type SpriteName,
  type ToodleAnimation,
  type ToodleDirection,
  type ToodleIntensity,
  type ToodlePosition,
  type ToodleProp,
  type ToodleSize,
} from './animations';

export function Toodle({
  animation = 'idle',
  size = 'medium',
  position = 'floating',
  intensity = 'normal',
  direction = 'right',
  danceStyle = 'bounce',
  prop,
  onTap,
}: {
  animation?: ToodleAnimation;
  size?: ToodleSize;
  position?: ToodlePosition;
  intensity?: ToodleIntensity;
  direction?: ToodleDirection;
  danceStyle?: DanceStyle;
  prop?: ToodleProp;
  onTap?: () => void;
}) {
  const reduced = useReducedMotion();
  const frames = useMemo(
    () => framesFor(animation, intensity, direction, danceStyle),
    [animation, intensity, direction, danceStyle],
  );
  const [step, setStep] = useState(0);
  const [glance, setGlance] = useState<{ sprite: SpriteName; flip: boolean; bounce: boolean } | null>(null);
  const frame: MotionFrame = frames[Math.min(step, frames.length - 1)] ?? frames[0];
  const px = SIZE_PX[size];
  const accessory = prop === 'sunglasses' ? 'cool' : prop === 'glasses' ? 'thinking' : null;
  const sprite = glance?.sprite ?? (accessory && (animation === 'idle' || animation === 'thinking') ? accessory : frame.sprite);
  const effect = animation === 'angry' ? '💨' : animation === 'fear' ? '💦' : animation === 'cry' ? '💧' : null;

  useEffect(() => {
    setStep(0);
    setGlance(null);
  }, [animation, danceStyle]);

  useEffect(() => {
    if (reduced || animation !== 'idle') return;
    let glanceTimer = 0;
    const handle = window.setInterval(() => {
      const roll = Math.random();
      if (roll < 0.34) setGlance({ sprite: 'winking', flip: false, bounce: false });
      else if (roll < 0.62) setGlance({ sprite: 'side', flip: false, bounce: false });
      else if (roll < 0.9) setGlance({ sprite: 'side', flip: true, bounce: false });
      else setGlance({ sprite: 'happy', flip: false, bounce: true });
      window.clearTimeout(glanceTimer);
      glanceTimer = window.setTimeout(() => setGlance(null), 680);
    }, 5400);
    return () => {
      window.clearInterval(handle);
      window.clearTimeout(glanceTimer);
    };
  }, [animation, reduced]);

  useEffect(() => {
    if (reduced || frames.length < 2 || step >= frames.length - 1) return;
    const current = frames[step];
    const repeats = current.repeat && Number.isFinite(current.repeat) ? current.repeat : 1;
    const handle = window.setTimeout(() => setStep((value) => value + 1), current.duration * 1000 * repeats);
    return () => window.clearTimeout(handle);
  }, [frames, reduced, step]);

  const repeat = reduced ? 0 : frame.repeat ?? 0;

  return (
    <div
      className={`pointer-events-none relative ${position === 'peek' ? '-translate-x-3' : ''}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <div style={{ width: '100%', height: '100%', transform: (glance?.flip || frame.flip) ? 'scaleX(-1)' : undefined }}>
      <motion.img
        key={`${sprite}-${step}-${glance?.bounce ? 'b' : ''}`}
        src={spriteSrc(sprite)}
        alt=""
        draggable={false}
        className={`h-full w-full object-contain ${onTap ? 'pointer-events-auto cursor-pointer' : ''}`}
        onClick={onTap ? (event) => { event.stopPropagation(); onTap(); } : undefined}
        initial={reduced ? { opacity: 0 } : false}
        animate={reduced || glance ? { opacity: 1, y: glance?.bounce ? [0, -7, 0] : 0 } : {
          x: frame.x ?? 0,
          y: frame.y ?? 0,
          rotate: frame.rotate ?? 0,
          scale: frame.scale ?? 1,
          opacity: frame.opacity ?? 1,
        }}
        transition={reduced ? { duration: 0.2 } : { duration: frame.duration, repeat, ease: 'easeInOut' }}
        style={{ transformOrigin: 'center bottom' }}
      />
      </div>
      {effect ? <span className="absolute -left-1 top-1 text-sm">{effect}</span> : null}
      {prop && PROP_MARK[prop] ? (
        <span className="absolute -right-1 top-0 text-lg">{PROP_MARK[prop]}</span>
      ) : null}
    </div>
  );
}
