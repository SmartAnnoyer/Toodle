import { motion } from 'framer-motion';
import type { ToodleBeat, ToodleEvent, ToodlePose } from './types';
import type { ToodleAnimation, ToodleProp } from './animations';
import { Toodle } from './Toodle';

const BY_EVENT: Partial<Record<ToodleEvent, ToodleAnimation>> = {
  USER_TYPING_TOO_LONG: 'thinking',
  USER_DELETED_DRAFT: 'suspicious',
  WORD_REPEATED: 'laugh',
  CHAT_IDLE: 'sleepy',
  CHAT_ACTIVE_LONG: 'dramatic',
  STREAK_INCREASED: 'celebrate',
  STREAK_AT_RISK: 'fear',
  CONVERSATION_EXPIRING: 'dramatic',
  GIF_SENT: 'bounce',
  GOODNIGHT: 'sleepy',
  CHAT_OPENED: 'peek',
  USER_SENT_MANY_MESSAGES: 'shocked',
  LATE_CLAIM: 'suspicious',
  MOOD_CHANGED: 'happy',
  MESSAGE_MILESTONE: 'dramatic',
  SHORTCUT_USED: 'wink',
  LONG_MESSAGE: 'thinking',
};

const PROP_FOR: Partial<Record<ToodleEvent, ToodleProp>> = {
  STREAK_INCREASED: 'sparkles',
  GIF_SENT: 'popcorn',
  GOODNIGHT: 'blanket',
  CONVERSATION_EXPIRING: 'magnifyingGlass',
  WORD_REPEATED: 'exclamation',
  LONG_MESSAGE: 'popcorn',
};

const ANIMATION: Record<ToodlePose, ToodleAnimation> = {
  idle: 'idle',
  happy: 'happy',
  laughing: 'laugh',
  blushing: 'blush',
  sleeping: 'sleepy',
  shocked: 'shocked',
  thinking: 'thinking',
  confused: 'confused',
  crying: 'cry',
  excited: 'bounce',
  dramatic: 'dramatic',
  suspicious: 'suspicious',
  celebrating: 'celebrate',
  dead: 'fall',
  chaotic: 'dance',
};

export function ToodlePresence({
  beat,
  inline = false,
  onUse,
  onDone,
  onTap,
}: {
  beat: ToodleBeat;
  inline?: boolean;
  onUse?: (phrase: string) => void;
  onDone?: () => void;
  onTap?: () => void;
}) {
  const animation = beat.animation ?? BY_EVENT[beat.event] ?? ANIMATION[beat.pose];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className={inline
        ? 'flex items-end justify-center gap-2'
        : `pointer-events-none absolute z-20 flex max-w-[92%] items-end gap-2 ${beat.spot === 'edge' ? 'bottom-full left-1' : 'bottom-full left-2'}`}
    >
      <Toodle
        animation={animation}
        size="small"
        position={beat.spot === 'edge' ? 'peek' : 'floating'}
        danceStyle={beat.event === 'STREAK_INCREASED' ? 'victory' : beat.pose === 'chaotic' ? 'chaotic' : 'bounce'}
        prop={beat.prop ?? PROP_FOR[beat.event]}
        onTap={onTap}
      />
      {beat.line ? (
        <div className={`${beat.suggestion ? 'pointer-events-auto' : 'pointer-events-none'} mb-3 max-w-[210px] rounded-2xl bg-elevated px-3 py-2 text-sm shadow-card`}>
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
