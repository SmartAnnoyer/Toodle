import { cue, type ChatReaction } from './types';

const focus = () => [
  cue('Focus bro.', 'thinking', 'thinking', { prop: 'book', ms: 1300, mood: 'curious' }),
  cue(undefined, 'sleepy', 'sleeping', { prop: 'book', ms: 1400, mood: 'sleepy' }),
];

export const OFFICE: ChatReaction[] = [
  {
    id: 'deadline',
    category: 'deadline',
    aliases: ['deadline', 'urgent', 'tomorrow', 'submission'],
    probability: 0.32,
    cooldownMs: 120_000,
    level: 4,
    cues: () => [
      cue(undefined, 'thinking', 'thinking', { prop: 'coffee', ms: 600 }),
      cue('WE HAVE HOW LONG?!', 'fear', 'shocked', { ms: 1400, mood: 'scared' }),
      cue(undefined, 'run', 'shocked', { prop: 'coffee', ms: 800 }),
    ],
  },
  {
    id: 'office',
    category: 'office',
    aliases: ['office', 'ofc', 'work', 'meeting', 'client', 'boss', 'manager'],
    probability: 0.2,
    cooldownMs: 120_000,
    level: 3,
    cues: () => [
      cue(undefined, 'thinking', 'thinking', { prop: 'coffee', ms: 900 }),
      cue('Corporate life.', 'sleepy', 'sleeping', { prop: 'coffee', ms: 1400, mood: 'sleepy' }),
    ],
  },
  {
    id: 'study',
    category: 'study',
    aliases: [
      'chadhuvkovali', 'chaduvkovali', 'chadhuvukovali', 'chaduvukovali',
      'chadhuvukuntunna', 'chaduvthunna', 'chaduvutunna',
      'chadhuvkunta', 'chaduvkunta', 'chadhuvkunna', 'chaduvkunna',
      'chadhuvkuntunna', 'chaduvkuntunna', 'chadhuvkutunna', 'chadhuvukunta',
      'study', 'studying', 'preparation', 'prepare',
    ],
    probability: 0.32,
    cooldownMs: 120_000,
    level: 3,
    cues: focus,
  },
  {
    id: 'exam',
    category: 'exam',
    aliases: ['exam'],
    probability: 0.34,
    cooldownMs: 120_000,
    level: 3,
    cues: focus,
  },
];
