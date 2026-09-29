import { motion } from 'framer-motion';
import type { ToodleBeat, ToodlePose } from './types';

const BADGE: Partial<Record<ToodlePose, string>> = {
  laughing: '😂',
  blushing: '💗',
  sleeping: '💤',
  shocked: '👀',
  thinking: '🤔',
  confused: '❓',
  crying: '🥺',
  excited: '🍿',
  dramatic: '🎭',
  suspicious: '👀',
  celebrating: '🎉',
  dead: '💀',
  chaotic: '😎',
  happy: '✨',
};

const POSE: Record<ToodlePose, { rotate?: number | number[]; y?: number | number[]; scale?: number | number[]; x?: number | number[] }> = {
  idle: { y: [0, -3, 0] },
  happy: { y: [8, 0], scale: [0.85, 1] },
  laughing: { rotate: [0, -10, 9, -6, 0] },
  blushing: { y: [6, 0], scale: [0.9, 1] },
  sleeping: { rotate: -10, y: 8 },
  shocked: { scale: [0.7, 1.08, 1], y: [8, 0] },
  thinking: { rotate: [0, -4, 0], y: [0, -4, 0] },
  confused: { rotate: [0, 8, -6, 0] },
  crying: { y: [0, 3, 0] },
  excited: { y: [0, -12, 0], rotate: [0, -6, 6, 0] },
  dramatic: { scale: [1, 1.12, 1], rotate: [0, -3, 3, 0] },
  suspicious: { x: [-28, 0] },
  celebrating: { y: [0, -14, 0], scale: [1, 1.08, 1] },
  dead: { rotate: 72, y: 14 },
  chaotic: { rotate: [0, 8, -8, 4, 0] },
};

export function ToodlePresence({
  beat,
  inline = false,
  onUse,
  onDone,
}: {
  beat: ToodleBeat;
  inline?: boolean;
  onUse?: (phrase: string) => void;
  onDone?: () => void;
}) {
  const pose = POSE[beat.pose];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={inline
        ? 'flex items-end justify-center gap-2'
        : `pointer-events-none absolute z-20 flex items-end gap-2 ${beat.spot === 'edge' ? 'bottom-full left-1' : 'bottom-full left-3'}`}
    >
      <motion.div animate={pose} transition={{ duration: beat.pose === 'dead' ? 0.45 : 0.55 }} className="relative">
        <img src="/icon.jpg" alt="" className="h-16 w-16 rounded-[1.1rem] object-cover shadow-card" />
        {BADGE[beat.pose] ? <span className="absolute -right-1 -top-2 text-lg">{BADGE[beat.pose]}</span> : null}
      </motion.div>
      {beat.line ? (
        <div className="pointer-events-auto mb-2 max-w-[220px] rounded-2xl bg-elevated px-3 py-2 text-sm shadow-card">
          <p>{beat.line}</p>
          {beat.suggestion ? (
            <button
              type="button"
              className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold"
              onClick={() => {
                onUse?.(beat.suggestion!);
                onDone?.();
              }}
            >
              Use this
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
