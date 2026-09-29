import type { ToodleAnimation, ToodleProp } from './animations';
import type { ToodleBeat, ToodlePose } from './types';

export type LifeMood = 'happy' | 'curious' | 'sleepy' | 'annoyed' | 'excited' | 'sad' | 'scared' | 'dramatic';

export interface LifeMemory {
  mood: LifeMood;
  touches: number[];
  lastListenAt: number;
  categoryAt: Map<string, number>;
  chaosUntil: number;
  lockUntil: number;
  lockLevel: number;
  majorAt: number[];
  msgAt: number[];
  hotUntil: number;
  oweListen: boolean;
  recentCats: { at: number; categories: string[] }[];
  wordHits: { key: string; userId: string; at: number }[];
  namePingAt: number;
}

export function freshMemory(): LifeMemory {
  return {
    mood: 'happy',
    touches: [],
    lastListenAt: 0,
    categoryAt: new Map(),
    chaosUntil: 0,
    lockUntil: 0,
    lockLevel: 0,
    majorAt: [],
    msgAt: [],
    hotUntil: 0,
    oweListen: false,
    recentCats: [],
    wordHits: [],
    namePingAt: 0,
  };
}

interface Cue {
  animation: ToodleAnimation;
  pose: ToodlePose;
  line?: string;
  prop?: ToodleProp;
  ms: number;
  priority: number;
  mood?: LifeMood;
  category?: string;
}

function beat(cue: Cue, event: 'HEARD' | 'TOUCHED'): ToodleBeat {
  return {
    event,
    pose: cue.pose,
    line: cue.line,
    spot: 'composer',
    ms: cue.ms,
    priority: cue.priority,
    animation: cue.animation,
    prop: cue.prop,
  };
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

export { explainToodleReaction, getToodleReactionHealth, hearMessage, keywordHit } from './language/react';

const PATS = ['Hehe.', 'Aww.', 'Thanks.'];
const DOUBLES = ['Okay.', 'Bro.', 'I felt that.'];
const TRIPLES = ['WHY?!', 'RUDE.'];

function arm(memory: LifeMemory, cues: ToodleBeat[], now: number, chaos = false) {
  const ms = cues.reduce((sum, item) => sum + item.ms, 0);
  memory.lockUntil = now + ms;
  memory.lockLevel = chaos ? 98 : (cues[0]?.priority ?? 97);
  if (chaos) memory.chaosUntil = now + ms + 12_000;
  return cues;
}

export function feelTap(memory: LifeMemory, now: number, random: () => number = Math.random): ToodleBeat[] {
  if (now < memory.chaosUntil) return [];
  memory.touches = [...memory.touches.filter((time) => now - time < 900), now];
  const burst = memory.touches.length;
  memory.mood = burst >= 4 ? 'annoyed' : memory.mood;

  if (burst >= 5) {
    memory.mood = 'dramatic';
    memory.touches = [];
    const runaway: Cue[] = [
      { animation: 'angry', pose: 'chaotic', line: 'Okay.', ms: 700, priority: 98 },
      { animation: 'run', pose: 'shocked', ms: 700, priority: 98 },
      { animation: 'fall', pose: 'dead', ms: 650, priority: 98 },
      { animation: 'shocked', pose: 'shocked', line: 'You saw nothing.', ms: 1200, priority: 98 },
      { animation: 'peek', pose: 'happy', ms: 800, priority: 98 },
      { animation: 'laugh', pose: 'laughing', line: 'HAHA.', ms: 800, priority: 98 },
      { animation: 'walkAway', pose: 'dramatic', ms: 800, priority: 98 },
    ];
    return arm(memory, runaway.map((item) => beat(item, 'TOUCHED')), now, true);
  }

  if (burst >= 3 && random() > 0.12) {
    memory.mood = 'annoyed';
    const stung: Cue[] = [
      { animation: 'fall', pose: 'dead', line: 'OW!', ms: 700, priority: 97 },
      { animation: 'angry', pose: 'chaotic', line: pick(TRIPLES, random), ms: 1100, priority: 97 },
      { animation: 'walkAway', pose: 'dramatic', ms: 900, priority: 97 },
    ];
    return arm(memory, stung.map((item) => beat(item, 'TOUCHED')), now);
  }

  if (burst === 2) {
    memory.mood = 'annoyed';
    return arm(memory, [beat({ animation: 'confused', pose: 'confused', line: pick(DOUBLES, random), ms: 1200, priority: 97 }, 'TOUCHED')], now);
  }

  if (memory.mood === 'sleepy') {
    memory.mood = 'sleepy';
    return [
      beat({ animation: 'shocked', pose: 'shocked', line: 'Huh?', ms: 800, priority: 97 }, 'TOUCHED'),
      beat({ animation: 'sleepy', pose: 'sleeping', ms: 1400, priority: 97, prop: 'blanket' }, 'TOUCHED'),
    ];
  }
  if (memory.mood === 'excited') {
    return [beat({ animation: 'celebrate', pose: 'celebrating', line: 'LET\'S GOOO!', ms: 1600, priority: 97, prop: 'sparkles' }, 'TOUCHED')];
  }
  if (memory.mood === 'sad') {
    return [beat({ animation: 'blush', pose: 'blushing', line: 'Thanks.', ms: 1500, priority: 97, prop: 'heart' }, 'TOUCHED')];
  }
  if (memory.mood === 'scared') {
    return [
      beat({ animation: 'fear', pose: 'shocked', ms: 900, priority: 97 }, 'TOUCHED'),
      beat({ animation: 'peek', pose: 'suspicious', line: 'I\'m not judging.', ms: 1200, priority: 97 }, 'TOUCHED'),
    ];
  }
  if (memory.mood === 'annoyed') {
    return [beat({ animation: 'angry', pose: 'chaotic', line: 'Not now.', ms: 1400, priority: 97 }, 'TOUCHED')];
  }

  return arm(memory, [beat({ animation: 'blush', pose: 'blushing', line: pick(PATS, random), ms: 1100, priority: 97, prop: 'sparkles', mood: 'happy' }, 'TOUCHED')], now);
}
