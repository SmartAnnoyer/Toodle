import { COMEDY } from './comedy';
import { FOOD } from './food';
import { HEALTH } from './health';
import { MICRO } from './micro';
import { OFFICE } from './office';
import { RELATIONSHIPS } from './relationships';
import { TELUGU } from './telugu';
import { TRAVEL } from './travel';
import type { ChatReaction } from './types';

export const REACTIONS: ChatReaction[] = [
  ...COMEDY,
  ...TRAVEL,
  ...FOOD,
  ...HEALTH,
  ...OFFICE,
  ...RELATIONSHIPS,
  ...TELUGU,
  ...MICRO,
];
