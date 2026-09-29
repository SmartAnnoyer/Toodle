import type { ToodleBeat, ToodleEvent, ToodlePose } from './types';
import type { DanceStyle, ToodleAnimation, ToodleProp } from './animations';
import { ToodleStage } from './3d/ToodleStage';

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
  beat = null,
  inline = false,
  listening = false,
  glance = 'center',
  onUse,
  onDone,
  onTap,
}: {
  beat?: ToodleBeat | null;
  inline?: boolean;
  listening?: boolean;
  glance?: 'left' | 'right' | 'center';
  onUse?: (phrase: string) => void;
  onDone?: () => void;
  onTap?: () => void;
}) {
  const animation = beat ? beat.animation ?? BY_EVENT[beat.event] ?? ANIMATION[beat.pose] : null;
  const danceStyle: DanceStyle = beat?.event === 'STREAK_INCREASED' ? 'victory' : beat?.pose === 'chaotic' ? 'chaotic' : 'bounce';
  const playId = beat ? `${beat.event}:${beat.pose}:${beat.animation ?? ''}:${beat.line ?? ''}:${beat.ms}` : 'idle';
  return (
    <ToodleStage
      animation={animation}
      playId={playId}
      danceStyle={danceStyle}
      prop={beat?.prop ?? (beat ? PROP_FOR[beat.event] : undefined)}
      line={beat?.line}
      suggestion={beat?.suggestion}
      listening={listening}
      inline={inline}
      glance={glance}
      onTap={onTap}
      onUse={onUse}
      onDone={onDone}
    />
  );
}
