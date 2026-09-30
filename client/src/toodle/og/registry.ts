import type { ToodleBeat } from '../types';

const MASS = [
  'what a vibe',
  'mass ra',
  'mass bro',
  'stylish',
  'style',
  'danger',
  'respect',
  'original',
  'crazy',
  'fire',
  'mass',
  'boss',
  'og',
];

export function flattenOgText(text: string) {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function hasPhrase(flat: string, phrase: string) {
  return flat === phrase || flat.startsWith(`${phrase} `) || flat.endsWith(` ${phrase}`) || flat.includes(` ${phrase} `);
}

export function ogMassPhrase(text: string): string | null {
  const flat = flattenOgText(text);
  return MASS.find((phrase) => hasPhrase(flat, phrase)) ?? null;
}

function beat(partial: Partial<ToodleBeat> & Pick<ToodleBeat, 'animation' | 'pose' | 'ms' | 'priority'>): ToodleBeat {
  return { event: 'HEARD', spot: 'composer', ...partial };
}

/** Rare OG-only lines. Existing chat detection still runs first. */
export function ogMassReaction(text: string, now: number, random: number, cooledUntil: number): { beats: ToodleBeat[]; until: number } | null {
  if (now < cooledUntil || random > 0.42) return null;
  const phrase = ogMassPhrase(text);
  if (!phrase) return null;
  return {
    until: now + 45_000,
    beats: [
      beat({ animation: 'dramatic', pose: 'dramatic', ms: 700, priority: 58, prop: 'sunglasses', reactionId: 'og-mass' }),
      beat({
        animation: 'walk',
        pose: 'suspicious',
        line: 'Obviously.',
        ms: 1200,
        priority: 58,
        prop: 'sunglasses',
        reactionId: 'og-mass',
        sound: 'shing',
      }),
    ],
  };
}

const DRESS: Record<string, { line?: string; animation?: ToodleBeat['animation']; prop?: ToodleBeat['prop'] }> = {
  name: { line: 'Cheppu.', animation: 'dramatic' },
  'name-ask': { line: 'Cheppu.', animation: 'dramatic' },
  food: { line: 'Important question.' },
  enjoy: { prop: 'sunglasses', animation: 'dance' },
};

export function dressOgBeat(beat: ToodleBeat): ToodleBeat {
  const id = beat.reactionId ?? '';
  if (id.startsWith('bro-') || id === 'name-bro') {
    return beat.line ? { ...beat, line: 'Bro?', animation: 'walkAway', pose: 'suspicious' } : beat;
  }
  if (id.startsWith('hmm-')) {
    return beat.line ? { ...beat, line: 'Em alochisthunnav?', animation: 'suspicious', pose: 'suspicious' } : beat;
  }
  const dress = DRESS[id];
  if (!dress) return beat;
  if (dress.line && !beat.line) return beat;
  return {
    ...beat,
    line: dress.line ?? beat.line,
    animation: dress.animation ?? beat.animation,
    pose: dress.animation === 'dramatic' ? 'dramatic' : beat.pose,
    prop: beat.prop ?? dress.prop,
  };
}

/** Very rare sword flourish after a name call or an enjoy. */
export function ogFlourish(reactionId: string | undefined, now: number, cooledUntil: number, random: number): { beat: ToodleBeat; until: number } | null {
  if (!reactionId || now < cooledUntil || random > 0.22) return null;
  if (reactionId !== 'name' && reactionId !== 'name-ask' && reactionId !== 'enjoy' && reactionId !== 'og-mass') return null;
  return {
    until: now + 180_000,
    beat: {
      event: 'HEARD',
      spot: 'composer',
      animation: 'sword',
      pose: 'dramatic',
      prop: 'katana',
      ms: 1150,
      priority: 64,
      sound: 'shing',
      reactionId: 'og_sword_draw',
    },
  };
}

export function ogTapBeats(count: number): ToodleBeat[] {
  const base = { event: 'TOUCHED' as const, spot: 'composer' as const, priority: 97 };
  if (count <= 1) return [{ ...base, animation: 'listen', pose: 'suspicious', ms: 700 }];
  if (count === 2) return [{ ...base, animation: 'confused', pose: 'confused', line: '...', ms: 800 }];
  if (count === 3) return [{ ...base, animation: 'dramatic', pose: 'dramatic', prop: 'sunglasses', ms: 900 }];
  if (count === 4) return [{ ...base, animation: 'sword', pose: 'dramatic', prop: 'katana', ms: 1150, sound: 'shing', reactionId: 'og_sword_draw' }];
  return [
    { ...base, animation: 'angry', pose: 'chaotic', line: 'Enough.', ms: 900, priority: 98 },
    { ...base, animation: 'walkAway', pose: 'dramatic', ms: 900, priority: 98, sound: 'whoosh' },
  ];
}

export function dressOgMusicLine(line: string | undefined, reactionId?: string): string | undefined {
  if (reactionId === 'music_start') return "Let's go.";
  if (reactionId === 'music_pause') return '...';
  if (reactionId === 'music_resume') return "Let's go.";
  if (reactionId === 'music_change') return 'Hmm.';
  return line;
}
