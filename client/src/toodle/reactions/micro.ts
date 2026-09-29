import { cue, type ChatReaction } from './types';

const ENJOY = ['ENJOY ENJOY 😎', 'Absolutely.', 'Carry on.', 'Full enjoy mode.'];
const PROUD = ['Obviously. 😌', 'Finally, someone noticed.', 'I knew it.'];
const WARM = ['You toooo ❤️', 'Always 😌', 'Trying my best.', 'Happy mode ON.'];
const SOFT = ['Aww. Thanks anna. 🥹', 'Nijamgaa? 👀'];
const NAME = ['Nannu emaina pilichaaraa?', 'Haan? 👀', 'Cheppu.', "I'm listening.", 'Yes?'];

export const MICRO: ChatReaction[] = [
  {
    id: 'enjoy',
    category: 'enjoy',
    aliases: ['enjoy', 'enjoy enjoy', 'enjoy ra', 'enjoy bro'],
    probability: 0.28,
    cooldownMs: 90_000,
    level: 2,
    cues: (random) => [
      cue(ENJOY[Math.floor(random() * ENJOY.length)] ?? ENJOY[0], 'wink', 'chaotic', { prop: 'sunglasses', ms: 800 }),
      cue(undefined, 'dance', 'celebrating', { ms: 700 }),
      cue(undefined, 'walkAway', 'happy', { ms: 600 }),
    ],
  },
  {
    id: 'best',
    category: 'compliment',
    aliases: ['nekey best', 'neeke best', 'neekey best', 'neeku best', 'nee key best'],
    probability: 0.42,
    cooldownMs: 120_000,
    level: 2,
    cues: (random) => [
      cue(undefined, 'shocked', 'shocked', { ms: 500 }),
      cue(PROUD[Math.floor(random() * PROUD.length)] ?? PROUD[0], 'wink', 'chaotic', { prop: 'sunglasses', ms: 1200 }),
    ],
  },
  {
    id: 'happy-ga',
    category: 'warm',
    aliases: ['happy ga undu', 'happyga undu', 'happy ga undu ani'],
    probability: 0.4,
    cooldownMs: 120_000,
    level: 2,
    cues: (random) => {
      const line = WARM[Math.floor(random() * WARM.length)] ?? WARM[0];
      return [
        cue(line, 'happy', 'happy', { prop: 'sparkles', ms: 900 }),
        cue(undefined, 'dance', 'celebrating', { ms: 700 }),
      ];
    },
  },
  {
    id: 'bavundhi',
    category: 'compliment',
    aliases: ['bavundhi anna', 'baavundhi anna', 'bagundhi anna', 'baagundhi anna', 'bavundi anna', 'bagundi anna'],
    probability: 0.36,
    cooldownMs: 150_000,
    level: 2,
    cues: (random) => [
      cue(undefined, 'shocked', 'shocked', { ms: 450 }),
      cue(SOFT[Math.floor(random() * SOFT.length)] ?? SOFT[0], 'blush', 'blushing', { prop: 'heart', ms: 1300 }),
    ],
  },
  {
    id: 'strong-compliment',
    category: 'strong-compliment',
    aliases: [
      'nijamgaaney bavundhi', 'nijamgaane bavundhi', 'nijamgane bavundhi', 'nijamga bavundhi',
      'nijamgaaney bagundhi', 'nijamgaane bagundhi', 'nijamgane bagundhi', 'nijam gane bavundhi',
      'really bavundhi', 'really good', 'actually good',
    ],
    probability: 0.55,
    cooldownMs: 180_000,
    level: 3,
    cues: () => [
      cue(undefined, 'suspicious', 'suspicious', { ms: 600 }),
      cue('Nijamgaa? 🥹', 'blush', 'blushing', { prop: 'heart', ms: 1100 }),
      cue("Okay... I'll remember this.", 'happy', 'happy', { ms: 1200 }),
    ],
  },
  {
    id: 'name',
    category: 'name',
    aliases: ['toodle', 'toodles', 'hey toodle', 'hey toodles', 'oi toodle', 'oye toodle', 'listen toodle', 'toodle bro'],
    probability: 0.62,
    cooldownMs: 40_000,
    level: 3,
    cues: (random) => [
      cue(undefined, 'shocked', 'shocked', { ms: 400 }),
      cue(NAME[Math.floor(random() * NAME.length)] ?? NAME[0], 'peek', 'suspicious', { ms: 1200 }),
    ],
  },
];
