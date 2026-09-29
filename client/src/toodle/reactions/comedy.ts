import { cue, type ChatReaction } from './types';

export const COMEDY: ChatReaction[] = [
  {
    id: 'secret',
    category: 'secret',
    aliases: ['secret', 'secret cheptha', 'evariki cheppaku', 'evvariki cheppaku', 'dont tell anyone', "don't tell anyone"],
    probability: 0.5,
    cooldownMs: 180_000,
    level: 4,
    cues: () => [
      cue(undefined, 'suspicious', 'suspicious', { ms: 700 }),
      cue(undefined, 'thinking', 'thinking', { prop: 'glasses', ms: 800 }),
      cue("I'm listening... 👀", 'dramatic', 'dramatic', { prop: 'notebook', ms: 1500, mood: 'curious' }),
    ],
  },
  {
    id: 'birthday',
    category: 'birthday',
    aliases: ['birthday', 'bday', 'puttinaroju', 'puttina roju'],
    probability: 0.45,
    cooldownMs: 180_000,
    level: 4,
    cues: () => [
      cue('PARTYYYY 🎉', 'celebrate', 'celebrating', { prop: 'cake', ms: 1400, mood: 'excited' }),
      cue(undefined, 'dance', 'celebrating', { prop: 'party', ms: 1100 }),
    ],
  },
  {
    id: 'movie',
    category: 'movie',
    aliases: ['movie', 'cinema', 'theatre', 'theater', 'movie ki veldham', 'movie ki veldhama', 'cinema ki'],
    probability: 0.32,
    cooldownMs: 90_000,
    level: 3,
    cues: () => [
      cue("I'm seated.", 'peek', 'happy', { prop: 'popcorn', ms: 1300, mood: 'happy' }),
      cue(undefined, 'sleepy', 'thinking', { prop: 'popcorn', ms: 1000 }),
    ],
  },
  {
    id: 'cool',
    category: 'cool',
    aliases: ['cool', 'nice', 'super', 'awesome', 'mass', 'wow'],
    probability: 0.12,
    cooldownMs: 90_000,
    level: 2,
    cues: () => [
      cue(undefined, 'wink', 'chaotic', { prop: 'sunglasses', ms: 700 }),
      cue(undefined, 'walkAway', 'dramatic', { ms: 700 }),
    ],
  },
  {
    id: 'enough',
    category: 'enough',
    aliases: ['enough', 'enough ra', 'chaalu', 'chalu', 'stop', 'aapey', 'apey'],
    probability: 0.3,
    cooldownMs: 90_000,
    level: 2,
    cues: () => [
      cue('Okay okay.', 'confused', 'confused', { ms: 900, mood: 'annoyed' }),
      cue(undefined, 'sleepy', 'sleeping', { ms: 700 }),
    ],
  },
];
