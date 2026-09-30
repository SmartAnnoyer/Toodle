import { cue, type ChatReaction, type ReactionCue } from './types';

export function swordFightCues(): ReactionCue[] {
  return [
    cue('Mass. 😎', 'sword_fight', 'dramatic', { prop: 'katana', ms: 4800, priority: 86 }),
  ];
}

export const SWORD: ChatReaction[] = [
  {
    id: 'og_sword_fight',
    category: 'sword',
    aliases: ['sword', 'katana', 'sword fight', 'swordfight'],
    probability: 0.92,
    cooldownMs: 180_000,
    level: 4,
    cues: () => swordFightCues(),
  },
  {
    id: 'fight_invite',
    category: 'fight',
    aliases: ['fight', 'fighting', 'fight cheddam', 'fight cheddham'],
    probability: 0.45,
    cooldownMs: 180_000,
    level: 4,
    cues: () => swordFightCues(),
  },
  {
    id: 'og_mark',
    category: 'og',
    aliases: ['og'],
    probability: 0.22,
    cooldownMs: 45_000,
    level: 2,
    cues: () => [cue(undefined, 'dramatic', 'dramatic', { prop: 'sunglasses', ms: 900 })],
  },
  {
    id: 'mass_mark',
    category: 'mass',
    aliases: ['mass', 'mass ra', 'too mass', 'mass bro'],
    probability: 0.08,
    cooldownMs: 45_000,
    level: 2,
    cues: () => [cue(undefined, 'wink', 'chaotic', { prop: 'sunglasses', ms: 800 })],
  },
];
