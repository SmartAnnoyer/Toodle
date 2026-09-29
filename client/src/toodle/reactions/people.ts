import { cue, type ChatReaction } from './types';

/** Family and hero lines the chat already expects. Same registry as every other reaction. */
export const PEOPLE: ChatReaction[] = [
  {
    id: 'pspk',
    category: 'pspk',
    aliases: ['pawan kalyan', 'pspk', 'power star'],
    probability: 0.55,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [cue('Jai!', 'celebrate', 'celebrating', { ms: 1200 })],
  },
  {
    id: 'megastar',
    category: 'megastar',
    aliases: ['megastar', 'chiranjeevi', 'chiru'],
    probability: 0.55,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [cue('Boss.', 'wink', 'chaotic', { ms: 1100 })],
  },
  {
    id: 'amma',
    category: 'amma',
    aliases: ['amma', 'ammaa', 'mummy'],
    probability: 0.5,
    cooldownMs: 90_000,
    level: 2,
    cues: () => [cue('Amma.', 'blush', 'blushing', { ms: 1000 })],
  },
  {
    id: 'nanna',
    category: 'nanna',
    aliases: ['nanna', 'naanna'],
    probability: 0.5,
    cooldownMs: 90_000,
    level: 2,
    cues: () => [cue('Nanna.', 'peek', 'happy', { ms: 1000 })],
  },
];
