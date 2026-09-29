import type { ToodleAnimation, ToodleProp } from './animations';

export type ChaosLevel = 'full' | 'normal' | 'quiet' | 'off';

export type ToodlePose =
  | 'idle'
  | 'happy'
  | 'laughing'
  | 'blushing'
  | 'sleeping'
  | 'shocked'
  | 'thinking'
  | 'confused'
  | 'crying'
  | 'excited'
  | 'dramatic'
  | 'suspicious'
  | 'celebrating'
  | 'dead'
  | 'chaotic';

export type ToodleEvent =
  | 'CHAT_OPENED'
  | 'USER_TYPING_TOO_LONG'
  | 'USER_DELETED_DRAFT'
  | 'USER_SENT_MANY_MESSAGES'
  | 'CHAT_IDLE'
  | 'CHAT_ACTIVE_LONG'
  | 'WORD_REPEATED'
  | 'LATE_CLAIM'
  | 'STREAK_INCREASED'
  | 'STREAK_AT_RISK'
  | 'MOOD_CHANGED'
  | 'CONVERSATION_EXPIRING'
  | 'GIF_SENT'
  | 'EMOJI_REACT'
  | 'LONG_MESSAGE'
  | 'MESSAGE_MILESTONE'
  | 'SHORTCUT_USED'
  | 'GOODNIGHT'
  | 'HEARD'
  | 'TOUCHED';

export interface ToodleContext {
  word?: string;
  count?: number;
  streak?: number;
  moodText?: string;
  emoji?: string;
  secondsLeft?: number;
}

export interface ToodleBeat {
  event: ToodleEvent;
  pose: ToodlePose;
  line?: string;
  suggestion?: string;
  spot: 'composer' | 'edge';
  ms: number;
  priority: number;
  animation?: ToodleAnimation;
  prop?: ToodleProp;
}
