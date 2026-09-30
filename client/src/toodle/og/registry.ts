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

function mentions(flat: string, phrase: string) {
  return hasPhrase(flat, phrase);
}

/** Sword words and OG/mass/fight pairings belong to the reaction engine. */
export function ogSwordCombo(text: string) {
  const flat = flattenOgText(text);
  const og = mentions(flat, 'og');
  const mass = mentions(flat, 'mass') || mentions(flat, 'too mass');
  const fight = mentions(flat, 'fight') || mentions(flat, 'fighting') || mentions(flat, 'fight cheddam') || mentions(flat, 'fight cheddham');
  const sword = mentions(flat, 'sword') || mentions(flat, 'katana') || mentions(flat, 'sword fight') || mentions(flat, 'swordfight');
  if (sword) return true;
  return (og && mass) || (og && fight) || (fight && sword);
}

/** Rare OG-only lines. Sword phrases and OG combinations are left for the reaction engine. */
export function ogMassReaction(text: string, now: number, random: number, cooledUntil: number): { beats: ToodleBeat[]; until: number } | null {
  if (ogSwordCombo(text)) return null;
  if (now < cooledUntil || random > 0.85) return null;
  const phrase = ogMassPhrase(text);
  if (!phrase) return null;
  const hype = phrase === 'mass' || phrase === 'og' || phrase === 'mass ra' || phrase === 'mass bro';
  if (hype && random > 0.73) {
    return {
      until: now + 180_000,
      beats: [
        beat({
          animation: 'sword_fight',
          pose: 'dramatic',
          line: 'Mass. 😎',
          ms: 4800,
          priority: 86,
          prop: 'katana',
          reactionId: 'og_sword_fight',
        }),
      ],
    };
  }
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
  if (reactionId !== 'name' && reactionId !== 'name-ask' && reactionId !== 'enjoy') return null;
  return {
    until: now + 180_000,
    beat: {
      event: 'HEARD',
      spot: 'composer',
      animation: 'sword',
      pose: 'dramatic',
      prop: 'katana',
      ms: 2500,
      priority: 64,
      sound: 'shing',
      reactionId: 'og_sword_draw',
      timeline: [
        { at: 80, sound: 'shing' },
        { at: 520, sound: 'whoosh' },
        { at: 780, sound: 'impact' },
        { at: 1280, sound: 'whoosh' },
        { at: 1480, sound: 'impact' },
        { at: 2100, sound: 'shing' },
      ],
    },
  };
}

export function ogTapBeats(count: number): ToodleBeat[] {
  const base = { event: 'TOUCHED' as const, spot: 'composer' as const, priority: 97 };
  if (count <= 1) return [{ ...base, animation: 'listen', pose: 'suspicious', ms: 700 }];
  if (count === 2) return [{ ...base, animation: 'confused', pose: 'confused', line: '...', ms: 800 }];
  if (count === 3) return [{ ...base, animation: 'dramatic', pose: 'dramatic', prop: 'sunglasses', ms: 900 }];
  if (count === 4) return [{ ...base, animation: 'sword', pose: 'dramatic', prop: 'katana', ms: 2500, sound: 'shing', reactionId: 'og_sword_draw', timeline: [
    { at: 80, sound: 'shing' },
    { at: 520, sound: 'whoosh' },
    { at: 780, sound: 'impact' },
    { at: 1280, sound: 'whoosh' },
    { at: 1480, sound: 'impact' },
    { at: 2100, sound: 'shing' },
  ] }];
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
