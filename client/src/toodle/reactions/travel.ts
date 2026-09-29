import { cue, type ChatReaction, type ReactionCue } from './types';

export function suitcase(): ReactionCue[] {
  return [
    cue("WAIT. I'M COMING.", 'run', 'excited', { prop: 'suitcase', ms: 900, mood: 'excited', timeline: [{ at: 360, sound: 'suitcase_open' }] }),
    cue(undefined, 'bounce', 'excited', { prop: 'suitcase', ms: 800, timeline: [{ at: 180, sound: 'suitcase_close' }] }),
    cue(undefined, 'fall', 'dead', { ms: 800, timeline: [{ at: 0, sound: 'fall' }, { at: 480, sound: 'land' }] }),
  ];
}

export const TRAVEL: ChatReaction[] = [
  {
    id: 'trip',
    category: 'trip',
    aliases: ['trip', 'trip ki', 'travelling', 'traveling', 'journey', 'tour'],
    probability: 0.34,
    cooldownMs: 120_000,
    level: 4,
    cues: (random) => {
      const roll = random();
      if (roll < 0.4) return suitcase();
      if (roll < 0.6) return [cue(undefined, 'wink', 'chaotic', { prop: 'sunglasses', ms: 1200 })];
      if (roll < 0.75) return [cue(undefined, 'peek', 'suspicious', { prop: 'suitcase', ms: 1200 })];
      if (roll < 0.9) return [cue(undefined, 'run', 'excited', { prop: 'backpack', ms: 1000 })];
      return [cue(undefined, 'spin', 'chaotic', { prop: 'suitcase', ms: 1000 })];
    },
  },
  {
    id: 'plan',
    category: 'plan',
    aliases: ['plan', 'plan enti', 'plan cheddam', 'plan cheddhama', 'plan undha', 'plan unda'],
    probability: 0.22,
    cooldownMs: 120_000,
    level: 4,
    cues: () => [cue('Operation: Weekend.', 'thinking', 'thinking', { prop: 'notebook', ms: 1800, mood: 'curious' })],
  },
  {
    id: 'cancel',
    category: 'cancel',
    aliases: ['cancel', 'cancelled', 'canceled', 'plan cancel', 'plan cancel ayindi', 'cancel ayindi'],
    probability: 0.4,
    cooldownMs: 120_000,
    level: 4,
    cues: () => [
      cue(undefined, 'shocked', 'shocked', { ms: 600 }),
      cue('All that planning...', 'fall', 'dead', { prop: 'notebook', ms: 1600, mood: 'dramatic' }),
    ],
  },
  {
    id: 'bike',
    category: 'ride',
    aliases: ['bike', 'scooty', 'scooter', 'ride', 'riding', 'bike meedha', 'scooty meedha'],
    probability: 0.28,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [
      cue('Helmet first bro.', 'wink', 'chaotic', { prop: 'helmet', ms: 1100, mood: 'excited', timeline: [{ at: 80, sound: 'helmet' }] }),
      cue(undefined, 'run', 'excited', { prop: 'helmet', ms: 800, timeline: [{ at: 120, sound: 'bike' }] }),
      cue(undefined, 'peek', 'happy', { ms: 700 }),
    ],
  },
  {
    id: 'otw',
    category: 'otw',
    aliases: ['rapido', 'otw', 'on the way', 'coming', 'vastunna', 'vastunnanu', 'vasthunna', 'vasthunnanu'],
    probability: 0.22,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [
      cue('2 mins bro.', 'thinking', 'thinking', { prop: 'phone', ms: 1000, timeline: [{ at: 40, sound: 'phone' }] }),
      cue(undefined, 'run', 'excited', { prop: 'helmet', ms: 900, timeline: [{ at: 80, sound: 'helmet' }] }),
    ],
  },
  {
    id: 'outside',
    category: 'outside',
    aliases: [
      'bayataki veltham', 'bayataki veldham', 'bayataki velthaam', 'bayatakeltham',
      'bayataki velthunnam', 'going out', 'outside',
    ],
    probability: 0.36,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [
      cue('Phone.', 'run', 'excited', { prop: 'phone', ms: 900 }),
      cue('Wallet.', 'run', 'excited', { prop: 'backpack', ms: 900 }),
      cue(undefined, 'walkAway', 'dramatic', { ms: 700 }),
    ],
  },
];
