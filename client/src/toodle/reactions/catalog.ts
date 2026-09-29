import { COMEDY } from './comedy';
import { FOOD } from './food';
import { HEALTH } from './health';
import { MICRO } from './micro';
import { OFFICE } from './office';
import { PEOPLE } from './people';
import { RELATIONSHIPS } from './relationships';
import { TELUGU } from './telugu';
import { TRAVEL } from './travel';
import type { ChatReaction } from './types';

/** Every configured reaction. Detection reads this list and nothing else. */
export const ALL_TOODLE_REACTIONS: ChatReaction[] = [
  ...COMEDY,
  ...TRAVEL,
  ...FOOD,
  ...HEALTH,
  ...OFFICE,
  ...RELATIONSHIPS,
  ...TELUGU,
  ...MICRO,
  ...PEOPLE,
];

export const REACTIONS = ALL_TOODLE_REACTIONS;
