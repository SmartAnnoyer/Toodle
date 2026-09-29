import type { SoundCue, ToodleSoundId } from '../audio/types';
import type { ToodleAnimation, ToodleProp } from '../animations';
import type { LifeMemory, LifeMood } from '../life';
import type { ToodlePose } from '../types';

export type ReactionLevel = 2 | 3 | 4;

export interface ReactionCue {
  animation: ToodleAnimation;
  pose: ToodlePose;
  line?: string;
  prop?: ToodleProp;
  suggestion?: string;
  ms: number;
  priority: number;
  mood?: LifeMood;
  sound?: ToodleSoundId;
  soundVariants?: ToodleSoundId[];
  timeline?: SoundCue[];
}

export interface ChatReaction {
  id: string;
  category: string;
  aliases: string[];
  probability: number;
  cooldownMs: number;
  /** 4 major, 3 topic, 2 micro. */
  level: ReactionLevel;
  cues: (random: () => number, memory: LifeMemory) => ReactionCue[];
}

export function cue(
  line: string | undefined,
  animation: ToodleAnimation,
  pose: ToodlePose,
  extra: Partial<ReactionCue> = {},
): ReactionCue {
  return { animation, pose, line, ms: 1200, priority: 40, ...extra };
}
