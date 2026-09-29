import { cue, type ChatReaction } from './types';

const blush = () => [
  cue('Ohhh... 👀', 'blush', 'blushing', { prop: 'heart', ms: 1100, mood: 'curious' }),
  cue(undefined, 'peek', 'blushing', { ms: 700 }),
  cue(undefined, 'walkAway', 'blushing', { ms: 800 }),
];

export const RELATIONSHIPS: ChatReaction[] = [
  {
    id: 'romance',
    category: 'romance',
    aliases: ['crush', 'cute', 'handsome', 'beautiful', 'love', 'like her', 'like him'],
    probability: 0.16,
    cooldownMs: 180_000,
    level: 4,
    cues: blush,
  },
  {
    id: 'heroine',
    category: 'heroine',
    aliases: ['hero', 'heroine'],
    probability: 0.16,
    cooldownMs: 180_000,
    level: 4,
    cues: blush,
  },
];
