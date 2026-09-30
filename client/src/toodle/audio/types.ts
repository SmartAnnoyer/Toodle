export type AudioChannel = 'voice' | 'movement' | 'interaction' | 'prop' | 'ambient';

export type SoundGroup = 'ui' | 'toodle' | 'effects';

export type ToodleSoundId =
  | 'message_pop'
  | 'notification_soft'
  | 'boop'
  | 'hmm'
  | 'huh'
  | 'giggle'
  | 'laugh'
  | 'surprise'
  | 'confused'
  | 'angry'
  | 'sad'
  | 'cry'
  | 'sleep'
  | 'snore'
  | 'sigh'
  | 'yawn'
  | 'footsteps_soft'
  | 'footsteps_fast'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'tap'
  | 'double_tap'
  | 'triple_tap'
  | 'pop'
  | 'sparkle'
  | 'success'
  | 'celebration'
  | 'suitcase_open'
  | 'suitcase_close'
  | 'page_flip'
  | 'pen'
  | 'typing_fast'
  | 'clock'
  | 'camera'
  | 'phone'
  | 'bike'
  | 'helmet'
  | 'whoosh'
  | 'shing'
  | 'popcorn'
  | 'impact';

export interface SoundCue {
  at: number;
  sound: ToodleSoundId;
  variants?: ToodleSoundId[];
}

export interface SoundDef {
  id: ToodleSoundId;
  /** Path under /audio/toodle/. Drop the file here and list it in manifest.json. */
  file: string;
  channel: AudioChannel;
  group: SoundGroup;
  priority: number;
  cooldownMs: number;
  /** How long the channel stays busy. */
  holdMs: number;
  gain: number;
  variants?: ToodleSoundId[];
}
