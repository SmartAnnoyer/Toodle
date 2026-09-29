import { cue, type ChatReaction, type ReactionCue } from './types';

const ACTIVITIES: ReactionCue[] = [
  cue('Nenu? Chill.', 'happy', 'happy', { prop: 'popcorn', ms: 1200 }),
  cue('Nenu? Chill.', 'dance', 'celebrating', { ms: 1200 }),
  cue('Nenu? Chill.', 'sleepy', 'sleeping', { prop: 'blanket', ms: 1200 }),
  cue('Nenu? Chill.', 'thinking', 'thinking', { prop: 'book', ms: 1200 }),
  cue('Nenu? Chill.', 'peek', 'suspicious', { prop: 'phone', ms: 1200 }),
];

export const TELUGU: ChatReaction[] = [
  {
    id: 'doing',
    category: 'doing',
    aliases: ['em chesthunnav', 'em chestunnav', 'em chestunav', 'em chesthunnavu', 'em chestunnavu', 'em chesthav'],
    probability: 0.34,
    cooldownMs: 90_000,
    level: 2,
    cues: (random) => [ACTIVITIES[Math.floor(random() * ACTIVITIES.length)] ?? ACTIVITIES[0]],
  },
  {
    id: 'where',
    category: 'where',
    aliases: ['ekkadunnav', 'ekkada unnav', 'ekkad unnav', 'ekkadunnavu', 'ekada unnav'],
    probability: 0.34,
    cooldownMs: 90_000,
    level: 2,
    cues: () => [
      cue(undefined, 'suspicious', 'suspicious', { ms: 600 }),
      cue('Ikkaade.', 'peek', 'happy', { ms: 1000 }),
    ],
  },
  {
    id: 'wellbeing',
    category: 'wellbeing',
    aliases: ['ela unnav', 'ela unnava', 'bagunnava', 'bavunnava', 'baagunnava'],
    probability: 0.3,
    cooldownMs: 90_000,
    level: 2,
    cues: (random) => {
      const line = random() < 0.34 ? 'Super.' : random() < 0.67 ? 'Surviving.' : "Don't ask.";
      const pose = line === 'Surviving.' ? 'sleeping' : line === "Don't ask." ? 'dramatic' : 'happy';
      const animation = line === 'Surviving.' ? 'sleepy' : line === "Don't ask." ? 'dramatic' : 'happy';
      return [cue(line, animation, pose, { ms: 1100 })];
    },
  },
];
