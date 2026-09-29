import { cue, type ChatReaction } from './types';

export const FOOD: ChatReaction[] = [
  {
    id: 'food',
    category: 'food',
    aliases: ['thinnava', 'tinnava', 'thinnavaa', 'tinnavaa', 'tinava', 'thinnanu', 'tinnanu', 'thintunna', 'tintunna', 'food', 'lunch', 'dinner'],
    probability: 0.36,
    cooldownMs: 90_000,
    level: 3,
    cues: () => [cue('Nannu adagaledu?', 'happy', 'happy', { prop: 'popcorn', ms: 1600, mood: 'happy' })],
  },
];
