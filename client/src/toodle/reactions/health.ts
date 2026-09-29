import { cue, type ChatReaction } from './types';

const doctor = () => [
  cue('Doctor Toodle reporting.', 'thinking', 'thinking', { prop: 'medicine', ms: 1500, mood: 'curious' }),
  cue(undefined, 'suspicious', 'suspicious', { prop: 'notebook', ms: 900 }),
];

export const HEALTH: ChatReaction[] = [
  {
    id: 'doctor',
    category: 'doctor',
    aliases: ['doctor', 'doctor ki', 'hospital'],
    probability: 0.4,
    cooldownMs: 150_000,
    level: 4,
    cues: doctor,
  },
  {
    id: 'fever',
    category: 'fever',
    aliases: ['fever', 'jwaram', 'jvaram', 'sick'],
    probability: 0.38,
    cooldownMs: 150_000,
    level: 4,
    cues: doctor,
  },
  {
    id: 'headache',
    category: 'headache',
    aliases: ['headache', 'head pain', 'head noppi', 'thala noppi', 'tala noppi'],
    probability: 0.36,
    cooldownMs: 150_000,
    level: 4,
    cues: doctor,
  },
];
