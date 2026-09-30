import { looksSerious } from '../lines';
import type { LifeMemory } from '../life';
import { ALL_TOODLE_REACTIONS, REACTIONS } from '../reactions/catalog';
import { cue, type ChatReaction, type ReactionCue, type ReactionLevel } from '../reactions/types';
import { swordFightCues } from '../reactions/sword';
import { suitcase } from '../reactions/travel';
import type { ChaosLevel, ToodleBeat } from '../types';
import { timelineFor } from '../audio/reactionSounds';
import { matchesAlias } from './match';
import { chatTokens, foldToken, normalizeChatText, normalizeToodleText } from './normalize';

const WINDOW_MS = 10 * 60_000;
const BURST_MS = 12_000;
const BUDGET_MS = 60_000;
const MAX_MAJORS_PER_MINUTE = 2;

/** Phrases from the reaction shortlist. These play their own bit instead of losing a dice roll. */
const SURE = new Set([
  'trip', 'secret', 'study', 'best', 'doctor', 'fever', 'headache',
  'enjoy', 'happy-ga', 'bavundhi', 'strong-compliment', 'name',
  'birthday', 'cancel', 'deadline', 'exam', 'food', 'doing', 'where',
  'wellbeing', 'bike', 'outside', 'movie',
  'pspk', 'megastar', 'amma', 'nanna',
  'og_sword_fight', 'og-mass-sword', 'og-fight-sword', 'mass-sword', 'og-sword', 'fight-sword',
]);

const LISTEN_LINES = [
  "I'm listening... 👀",
  'Hoo...?',
  'Really?',
  'Wait.',
  'Go on...',
  'Interesting...',
  'Okayyy...',
  "I'm not judging.",
  'Suspicious.',
  'I heard that.',
  'I need context.',
  'WHAT?',
  'Sure bro.',
];

export interface HearContext {
  userId?: string;
  recent?: string[];
}

interface Hit {
  reaction: ChatReaction;
  specificity: number;
}

interface Pick {
  id: string;
  categories: string[];
  level: ReactionLevel;
  specificity: number;
  probability: number;
  cooldownMs: number;
  combo: boolean;
  build: (random: () => number) => ReactionCue[];
}

function surePick(pick: Pick): boolean {
  return pick.combo || SURE.has(pick.id);
}

function levelScore(level: ReactionLevel): number {
  if (level === 4) return 80;
  if (level === 3) return 60;
  return 40;
}

function gapScale(chaos: ChaosLevel): number {
  if (chaos === 'quiet') return 0.45;
  if (chaos === 'full') return 1.2;
  return 1;
}

function swordLocked(reactionId?: string) {
  return reactionId === 'og_sword_fight'
    || reactionId === 'fight_invite'
    || reactionId === 'og-mass-sword'
    || reactionId === 'og-fight-sword'
    || reactionId === 'mass-sword'
    || reactionId === 'og-sword'
    || reactionId === 'fight-sword';
}

function toBeats(items: ReactionCue[], score: number, reactionId?: string): ToodleBeat[] {
  return items.map((item, index) => ({
    event: 'HEARD' as const,
    pose: item.pose,
    line: item.line,
    suggestion: item.suggestion,
    spot: 'composer' as const,
    ms: item.ms,
    priority: score,
    animation: item.animation,
    prop: item.prop,
    reactionId,
    sound: item.sound,
    soundVariants: item.soundVariants,
    timeline: item.timeline ?? timelineFor(reactionId, index),
  }));
}

function detect(text: string): Hit[] {
  const hits: Hit[] = [];
  for (const reaction of REACTIONS) {
    let specificity = 0;
    for (const alias of reaction.aliases) {
      if (matchesAlias(text, alias) && alias.length > specificity) specificity = alias.length;
    }
    if (specificity > 0) hits.push({ reaction, specificity });
  }
  return hits;
}

export function keywordHit(text: string): boolean {
  return detect(text).some((hit) => !negated(text, hit.reaction.category));
}

function negated(text: string, category: string): boolean {
  const norm = normalizeChatText(text);
  if (category === 'secret' || category === 'cancel') return false;
  if (/\b(ledu|ledhu|kaadu|kadu)\b/.test(norm)) return true;
  return /\b(no|not|dont)\b/.test(norm);
}

function stalkKey(token: string): string | null {
  const flat = token.replace(/(.)\1+/g, '$1');
  if (/^hm+$/.test(flat)) return 'hmm';
  if (flat === 'ok' || flat === 'okay' || flat === 'okk' || flat === 'okai' || flat === 'sare' || flat === 'sari') return 'okay';
  if (flat === 'bro' || flat === 'bruh' || flat === 'brah') return 'bro';
  if (flat === 'chepu') return 'cheppu';
  return null;
}

function onlyKey(text: string, key: string): boolean {
  const tokens = chatTokens(text);
  return tokens.length > 0 && tokens.every((token) => stalkKey(token) === key);
}

function dryKind(token: string): string | null {
  if (/^ha+$/.test(token)) return 'ha';
  const flat = token.replace(/(.)\1+/g, '$1');
  if (/^hm+$/.test(flat)) return 'hmm';
  if (flat === 'oh') return 'oh';
  if (flat === 'k') return 'k';
  if (flat === 'ya' || flat === 'yeah' || flat === 'ye') return 'yeah';
  if (flat === 'ok' || flat === 'okay' || flat === 'okai' || flat === 'okk') return 'okay';
  return null;
}

function okayShape(token: string): 'none' | 'plain' | 'stretch' | 'vake' {
  const flat = token.replace(/(.)\1+/g, '$1');
  if (flat === 'vakey' || flat === 'vakai' || flat === 'vake') return 'vake';
  if (flat === 'ok' || flat === 'okay' || flat === 'okai' || flat === 'okk' || flat === 'sare' || flat === 'sari') {
    return token === flat ? 'plain' : 'stretch';
  }
  return 'none';
}

function nameTokens(text: string): boolean {
  const tokens = chatTokens(text);
  const named = tokens.some((token) => {
    const flat = foldToken(token);
    return flat === 'tudle' || flat === 'tudles';
  });
  if (!named) return false;
  return tokens.every((token) => {
    const flat = foldToken(token);
    return flat === 'tudle' || flat === 'tudles' || token === 'hey' || token === 'oi' || token === 'oye' || token === 'listen' || stalkKey(token) === 'bro';
  });
}

function prune(memory: LifeMemory, now: number) {
  memory.wordHits = memory.wordHits.filter((hit) => now - hit.at < WINDOW_MS);
  memory.majorAt = memory.majorAt.filter((at) => now - at < BUDGET_MS);
  memory.msgAt = memory.msgAt.filter((at) => now - at < BURST_MS);
  memory.recentCats = memory.recentCats.filter((row) => now - row.at < 3 * 60_000).slice(-5);
}

function tally(memory: LifeMemory, text: string, userId: string, now: number): Map<string, { before: number; after: number }> {
  const add = new Map<string, number>();
  for (const token of chatTokens(text)) {
    const key = stalkKey(token);
    if (!key) continue;
    add.set(key, (add.get(key) ?? 0) + 1);
  }
  if (matchesAlias(text, 'thinnava')) add.set('thinnava', (add.get('thinnava') ?? 0) + 1);
  const tokens = chatTokens(text);
  const enjoys = tokens.filter((token) => foldToken(token) === 'enjoy').length;
  if (enjoys) add.set('enjoy', enjoys);
  if (tokens.length === 1) {
    const kind = dryKind(tokens[0] ?? '');
    if (kind) {
      add.set('dry', 1);
      add.set(`dry-${kind}`, 1);
    }
  }
  const out = new Map<string, { before: number; after: number }>();
  for (const [key, times] of add) {
    const before = memory.wordHits.filter((hit) => hit.key === key && hit.userId === userId).length;
    for (let i = 0; i < times; i += 1) memory.wordHits.push({ key, userId, at: now });
    out.set(key, { before, after: before + times });
  }
  return out;
}

function crossed(span: { before: number; after: number } | undefined, mark: number): boolean {
  return !!span && span.before < mark && span.after >= mark;
}

function comboCues(id: string): ReactionCue[] {
  if (id === 'trip-cancel' || id === 'trip-plan-cancel') {
    return [
      cue(undefined, 'run', 'excited', { prop: 'suitcase', ms: 800 }),
      cue(undefined, 'shocked', 'shocked', { ms: 600 }),
      cue('All that planning...', 'fall', 'dead', { prop: 'suitcase', ms: 1500, mood: 'dramatic' }),
    ];
  }
  if (id === 'trip-plan') {
    return [
      cue('Operation: Weekend.', 'thinking', 'thinking', { prop: 'notebook', ms: 900 }),
      ...suitcase(),
    ];
  }
  if (id === 'movie-cancel') {
    return [cue(undefined, 'shocked', 'shocked', { prop: 'popcorn', ms: 700 }), cue(undefined, 'fall', 'dead', { ms: 900 })];
  }
  if (id === 'deadline-panic') {
    return [
      cue(undefined, 'fear', 'shocked', { ms: 700 }),
      cue('WE HAVE HOW LONG?!', 'run', 'shocked', { prop: 'coffee', ms: 1300, mood: 'scared' }),
    ];
  }
  if (id === 'exam-panic') {
    return [
      cue('Focus bro.', 'fear', 'shocked', { prop: 'book', ms: 900 }),
      cue(undefined, 'sleepy', 'sleeping', { prop: 'book', ms: 1200, mood: 'sleepy' }),
    ];
  }
  if (id === 'rapido-driver') {
    return [cue('2 mins bro.', 'run', 'excited', { prop: 'helmet', ms: 1200 })];
  }
  if (id === 'og-mass-sword' || id === 'og-fight-sword' || id === 'mass-sword' || id === 'og-sword' || id === 'fight-sword') {
    return swordFightCues();
  }
  if (id === 'romantic-blush') {
    return [
      cue('Ohhh... 👀', 'blush', 'blushing', { prop: 'heart', ms: 1100 }),
      cue(undefined, 'walkAway', 'blushing', { ms: 800 }),
    ];
  }
  return [cue(undefined, 'confused', 'confused', { prop: 'coffee', ms: 1400, mood: 'dramatic' })];
}

const COMBOS: { id: string; need: string[]; level: ReactionLevel; cooldownMs?: number; probability?: number }[] = [
  { id: 'trip-plan-cancel', need: ['trip', 'plan', 'cancel'], level: 4 },
  { id: 'trip-cancel', need: ['trip', 'cancel'], level: 4 },
  { id: 'movie-cancel', need: ['movie', 'cancel'], level: 4 },
  { id: 'trip-plan', need: ['trip', 'plan'], level: 4 },
  { id: 'deadline-panic', need: ['office', 'deadline'], level: 4 },
  { id: 'exam-panic', need: ['study', 'exam'], level: 4 },
  { id: 'rapido-driver', need: ['ride', 'otw'], level: 4 },
  { id: 'romantic-blush', need: ['romance', 'heroine'], level: 4 },
  { id: 'sick-office', need: ['fever', 'office'], level: 4 },
  { id: 'headache-office', need: ['headache', 'office'], level: 4 },
  { id: 'og-mass-sword', need: ['og', 'mass'], level: 4, cooldownMs: 180_000, probability: 0.9 },
  { id: 'og-fight-sword', need: ['og', 'fight'], level: 4, cooldownMs: 180_000, probability: 0.9 },
  { id: 'mass-sword', need: ['mass', 'sword'], level: 4, cooldownMs: 180_000, probability: 0.95 },
  { id: 'og-sword', need: ['og', 'sword'], level: 4, cooldownMs: 180_000, probability: 0.95 },
  { id: 'fight-sword', need: ['fight', 'sword'], level: 4, cooldownMs: 180_000, probability: 0.95 },
];

function combinations(current: Set<string>, recent: Set<string>): Pick[] {
  const union = new Set([...current, ...recent]);
  return COMBOS.filter((item) => item.need.every((cat) => union.has(cat)) && item.need.some((cat) => current.has(cat)))
    .map((item) => ({
      id: item.id,
      categories: item.need,
      level: item.level,
      specificity: 1000 + item.need.length,
      probability: item.probability ?? 0.72,
      cooldownMs: item.cooldownMs ?? 90_000,
      combo: true,
      build: () => comboCues(item.id),
    }));
}

const BRO_WHO = [
  cue('Who is bro here?', 'suspicious', 'suspicious', { ms: 900 }),
  cue('Oh... me?', 'peek', 'happy', { ms: 800 }),
];

const BYE_LINES = [
  "Aren't you interested then? 😭",
  "Okay bro, I'll stop talking.",
  'Clearly you\'re busy. Bye. 👋',
  "Okay okay, I'll leave.",
  "Fine. Don't listen then.",
  "Interesting way to say 'I don't care.' 😭",
  "Bro is replying with one-word DLC.",
  "That's it? 😭",
  'Your enthusiasm is inspiring.',
  "Okay... I'll just disappear.",
  "Carry on. I'm apparently talking to myself.",
  'Fine. BYE MAN.',
];

function goodbye(random: () => number): ReactionCue[] {
  const line = BYE_LINES[Math.floor(random() * BYE_LINES.length)] ?? BYE_LINES[0];
  return [
    cue(line, 'dramatic', 'dramatic', { ms: 1200 }),
    cue('Bye man. 👋', 'walkAway', 'dramatic', { ms: 900 }),
    cue('Actually, continue. 👀', 'peek', 'suspicious', { ms: 1100 }),
  ];
}

function dryCount(memory: LifeMemory, userId: string, now: number): number {
  return memory.wordHits.filter((hit) => hit.key === 'dry' && hit.userId === userId && now - hit.at < 3 * 60_000).length;
}

function dryKinds(memory: LifeMemory, userId: string, now: number): Set<string> {
  const kinds = new Set<string>();
  for (const hit of memory.wordHits) {
    if (hit.userId !== userId || now - hit.at >= 3 * 60_000 || !hit.key.startsWith('dry-')) continue;
    kinds.add(hit.key.slice(4));
  }
  return kinds;
}

function socialPicks(text: string, memory: LifeMemory, userId: string, now: number, recent: string[], current: Set<string>): Pick[] {
  const picks: Pick[] = [];
  const tokens = chatTokens(text);
  const shapes = tokens.map(okayShape);
  const onlyOkay = tokens.length > 0 && shapes.every((shape) => shape === 'plain' || shape === 'stretch');
  const onlyVake = tokens.length > 0 && tokens.length <= 2 && shapes.every((shape) => shape === 'vake');
  const broCount = tokens.filter((token) => stalkKey(token) === 'bro').length;
  const enjoy = memory.wordHits.filter((hit) => hit.key === 'enjoy' && hit.userId === userId && now - hit.at < WINDOW_MS).length;

  if (enjoy >= 3 && tokens.some((token) => foldToken(token) === 'enjoy')) {
    picks.push({
      id: 'enjoy-again',
      categories: ['enjoy-again'],
      level: 2,
      specificity: 400,
      probability: 0.7,
      cooldownMs: 90_000,
      combo: false,
      build: () => [cue('Okay okay, ENJOY ENJOY understood 😂', 'wink', 'chaotic', { prop: 'sunglasses', ms: 1400 })],
    });
  }

  if (text.includes('?') && nameTokens(text) && !tokens.some((token) => stalkKey(token) === 'bro')) {
    picks.push({
      id: 'name-ask',
      categories: ['name'],
      level: 3,
      specificity: 700,
      probability: 0.7,
      cooldownMs: 40_000,
      combo: true,
      build: () => [
        cue('Nannu emaina pilichaaraa?', 'peek', 'suspicious', { ms: 900 }),
        cue('Nannu kaadhaa?', 'confused', 'confused', { ms: 800 }),
        cue('Okay okay. 😌', 'happy', 'happy', { ms: 700 }),
      ],
    });
  }

  if (current.has('name') && broCount > 0) {
    picks.push({
      id: 'name-bro',
      categories: ['name', 'freq-bro'],
      level: 3,
      specificity: 800,
      probability: 0.7,
      cooldownMs: 40_000,
      combo: true,
      build: () => [
        cue('Nannu pilichaaraa?', 'peek', 'suspicious', { ms: 900 }),
        cue('Also... who is bro here? 😭', 'suspicious', 'suspicious', { ms: 1100 }),
      ],
    });
  }

  if (current.has('name') && (current.has('compliment') || current.has('strong-compliment'))) {
    picks.push({
      id: 'name-compliment',
      categories: ['name', 'strong-compliment'],
      level: 3,
      specificity: 850,
      probability: 0.72,
      cooldownMs: 60_000,
      combo: true,
      build: () => [
        cue(undefined, 'blush', 'blushing', { ms: 500 }),
        cue('Nijamgaa? 🥹', 'blush', 'blushing', { prop: 'heart', ms: 1200 }),
      ],
    });
  }

  if (onlyOkay && tokens.length >= 4) {
    picks.push({
      id: 'okay-tired',
      categories: ['double-okay'],
      level: 2,
      specificity: 220,
      probability: 0.75,
      cooldownMs: 60_000,
      combo: false,
      build: () => [
        cue(undefined, 'happy', 'happy', { ms: 400 }),
        cue('BRO. WE UNDERSTOOD.', 'fall', 'dramatic', { ms: 1300 }),
      ],
    });
  } else if (onlyOkay && tokens.length >= 2) {
    const repeats = tokens.length >= 2 && (memory.wordHits.filter((hit) => hit.key === 'okay' && hit.userId === userId).length >= 6);
    picks.push({
      id: 'double-okay',
      categories: ['double-okay'],
      level: 2,
      specificity: repeats ? 180 : 140,
      probability: 0.5,
      cooldownMs: 25_000,
      combo: false,
      build: () => [cue(repeats ? 'We got it.' : 'Okay. Okay.', 'happy', 'happy', { ms: 900 })],
    });
  } else if (onlyOkay && tokens.length === 1 && shapes[0] === 'stretch') {
    picks.push({
      id: 'stretch-okay',
      categories: ['double-okay'],
      level: 2,
      specificity: 60,
      probability: 0.22,
      cooldownMs: 30_000,
      combo: false,
      build: () => [cue('👍👍', 'wink', 'happy', { ms: 800 })],
    });
  } else if (onlyVake) {
    picks.push({
      id: 'vake-okay',
      categories: ['double-okay'],
      level: 2,
      specificity: 30,
      probability: 0.2,
      cooldownMs: 40_000,
      combo: false,
      build: () => [cue(undefined, 'happy', 'happy', { ms: 700 })],
    });
  }

  const bros = tokens.filter((token) => stalkKey(token) === 'bro').length;
  const broTotal = memory.wordHits.filter((hit) => hit.key === 'bro' && hit.userId === userId && now - hit.at < WINDOW_MS).length;
  if (onlyKey(text, 'bro') && bros >= 3) {
    picks.push({
      id: 'bro-burst',
      categories: ['freq-bro'],
      level: 3,
      specificity: 500,
      probability: 0.75,
      cooldownMs: 20_000,
      combo: false,
      build: () => [
        ...BRO_WHO,
        cue('I have enough brothers and sisters already.', 'walkAway', 'dramatic', { ms: 1400 }),
      ],
    });
  } else if (broTotal >= 8 && bros > 0) {
    picks.push({
      id: 'bro-siblings',
      categories: ['freq-bro'],
      level: 3,
      specificity: 90,
      probability: 0.8,
      cooldownMs: 20_000,
      combo: false,
      build: () => [cue('I have enough brothers and sisters already.', 'walkAway', 'dramatic', { ms: 1500 })],
    });
  } else if (crossed({ before: broTotal - bros, after: broTotal }, 5)) {
    picks.push({
      id: 'bro-name',
      categories: ['freq-bro'],
      level: 3,
      specificity: 70,
      probability: 0.7,
      cooldownMs: 12_000,
      combo: false,
      build: () => [cue('I HAVE A NAME 😭', 'angry', 'chaotic', { ms: 1200 })],
    });
  } else if (crossed({ before: broTotal - bros, after: broTotal }, 3)) {
    picks.push({
      id: 'bro-who',
      categories: ['freq-bro'],
      level: 2,
      specificity: 40,
      probability: 0.5,
      cooldownMs: 12_000,
      combo: false,
      build: () => BRO_WHO,
    });
  }

  const hmm = memory.wordHits.filter((hit) => hit.key === 'hmm' && hit.userId === userId && now - hit.at < 3 * 60_000).length;
  const kinds = dryKinds(memory, userId, now);
  const dry = dryCount(memory, userId, now);
  const lastRecent = recent[recent.length - 1] ?? '';
  const answering = /\?|coming|are you|vastun|vasthun/.test(lastRecent.toLowerCase());
  const hadStory = recent.some((line) => line.trim().length > 24);
  const mixed = kinds.size >= 2 || (kinds.has('hmm') && kinds.has('ha'));
  const fakeBye = dry >= 5 || (mixed && kinds.has('okay') && dry >= 3) || (hadStory && dry >= 4 && mixed);

  if (!answering || dry >= 3) {
    if (fakeBye) {
      picks.push({
        id: 'fake-bye',
        categories: ['dry'],
        level: 3,
        specificity: 600,
        probability: 0.8,
        cooldownMs: 45_000,
        combo: true,
        build: (random) => goodbye(random),
      });
    } else if (mixed && dry >= 3) {
      picks.push({
        id: 'dry-mix',
        categories: ['dry'],
        level: 3,
        specificity: 500,
        probability: 0.6,
        cooldownMs: 20_000,
        combo: true,
        build: () => [cue("Bro... are you interested? 😭", 'suspicious', 'suspicious', { ms: 1300 })],
      });
    } else if (onlyKey(text, 'hmm') && hmm >= 6) {
      picks.push({
        id: 'hmm-lore',
        categories: ['hmm'],
        level: 3,
        specificity: 120,
        probability: 0.75,
        cooldownMs: 30_000,
        combo: false,
        build: (random) => [cue(random() < 0.5 ? 'JUST SAY IT MAN 😭' : 'This "hmm" has lore.', 'dramatic', 'dramatic', { prop: 'notebook', ms: 1400 })],
      });
    } else if (onlyKey(text, 'hmm') && hmm >= 4) {
      picks.push({
        id: 'hmm-snap',
        categories: ['hmm'],
        level: 2,
        specificity: 80,
        probability: 0.65,
        cooldownMs: 8_000,
        combo: false,
        build: () => [cue('BRO WHAT ARE YOU THINKING 😭', 'angry', 'chaotic', { ms: 1300 })],
      });
    } else if (onlyKey(text, 'hmm') && hmm === 3) {
      picks.push({
        id: 'hmm-loop',
        categories: ['hmm'],
        level: 2,
        specificity: 40,
        probability: 0.55,
        cooldownMs: 4_000,
        combo: false,
        build: () => [cue('Hmm... hmm... hmm...', 'thinking', 'thinking', { ms: 1200 })],
      });
    } else if (onlyKey(text, 'hmm') && hmm === 2) {
      picks.push({
        id: 'hmm-side',
        categories: ['hmm'],
        level: 2,
        specificity: 20,
        probability: 0.4,
        cooldownMs: 2_000,
        combo: false,
        build: () => [cue('What does that mean? 👀', 'suspicious', 'suspicious', { ms: 1100 })],
      });
    } else if (onlyKey(text, 'hmm') && hmm === 1) {
      picks.push({
        id: 'hmm-look',
        categories: ['hmm'],
        level: 2,
        specificity: 10,
        probability: 0.12,
        cooldownMs: 2_000,
        combo: false,
        build: () => [cue('Hmm?', 'thinking', 'thinking', { ms: 800 })],
      });
    } else if (tokens.length === 1 && dryKind(tokens[0] ?? '') === 'ha' && dry < 3) {
      const stretched = (tokens[0] ?? '').length >= 4;
      picks.push({
        id: 'ha-look',
        categories: ['dry'],
        level: 2,
        specificity: stretched ? 25 : 8,
        probability: stretched ? 0.34 : 0.08,
        cooldownMs: 8_000,
        combo: false,
        build: () => [cue(stretched ? 'Okay...' : undefined, stretched ? 'angry' : 'suspicious', 'suspicious', { ms: 700 })],
      });
    } else if (dry >= 3 && tokens.length === 1 && dryKind(tokens[0] ?? '')) {
      picks.push({
        id: 'dry-streak',
        categories: ['dry'],
        level: 2,
        specificity: 40,
        probability: 0.45,
        cooldownMs: 12_000,
        combo: false,
        build: () => [cue(dry >= 5 ? "Bro's conversation battery is at 2%. 🔋😭" : "Bro... are you interested? 😭", 'suspicious', 'suspicious', { ms: 1300 })],
      });
    }
  }

  if (memory.namePingAt && now - memory.namePingAt < 20_000 && !current.has('name')) {
    memory.namePingAt = 0;
    const follow = current.has('compliment') || current.has('strong-compliment') || current.has('warm') || current.has('doing') || text.includes('?');
    picks.push(follow
      ? { id: 'name-follow', categories: ['name-follow'], level: 2, specificity: 450, probability: 0.7, cooldownMs: 15_000, combo: false, build: () => [cue('Cheppu 👀', 'peek', 'suspicious', { ms: 1000 })] }
      : { id: 'name-shrug', categories: ['name-shrug'], level: 2, specificity: 450, probability: 0.65, cooldownMs: 15_000, combo: false, build: () => [cue('Oh... nannu kaadhaa.', 'confused', 'confused', { ms: 900 }), cue('Okay okay.', 'happy', 'happy', { ms: 700 })] });
  }

  return picks;
}

function frequencyPicks(text: string, spans: Map<string, { before: number; after: number }>): Pick[] {
  const picks: Pick[] = [];
  const okay = spans.get('okay');
  const tokens = chatTokens(text);
  const doubled = tokens.length >= 2 && tokens.every((token) => okayShape(token) === 'plain' || okayShape(token) === 'stretch');
  if (!doubled && onlyKey(text, 'okay') && crossed(okay, 8)) {
    picks.push({ id: 'okay-strong', categories: ['freq-okay'], level: 2, specificity: 80, probability: 0.8, cooldownMs: 90_000, combo: false, build: () => [cue(`Okay counter: ${okay?.after ?? 8}`, 'suspicious', 'suspicious', { ms: 1300 })] });
  } else if (!doubled && onlyKey(text, 'okay') && crossed(okay, 5)) {
    picks.push({ id: 'okay-count', categories: ['freq-okay'], level: 2, specificity: 40, probability: 0.65, cooldownMs: 90_000, combo: false, build: () => [cue('Okay counter 📈', 'suspicious', 'suspicious', { ms: 1100 })] });
  }
  const cheppu = spans.get('cheppu');
  if (crossed(cheppu, 5)) {
    picks.push({ id: 'cheppu', categories: ['freq-cheppu'], level: 2, specificity: 50, probability: 0.7, cooldownMs: 90_000, combo: false, build: () => [cue('CHEPPU.', 'celebrate', 'excited', { prop: 'phone', ms: 1200 })] });
  }
  const food = spans.get('thinnava');
  if (crossed(food, 5)) {
    picks.push({ id: 'food-again', categories: ['food'], level: 3, specificity: 200, probability: 0.7, cooldownMs: 90_000, combo: false, build: () => [cue('Again? 😂', 'happy', 'happy', { prop: 'popcorn', ms: 1300 })] });
  }
  return picks;
}

function listenBeats(random: () => number, line?: string): ToodleBeat[] {
  const chosen = line ?? LISTEN_LINES[Math.floor(random() * LISTEN_LINES.length)] ?? LISTEN_LINES[0];
  return toBeats([cue(chosen, 'peek', 'suspicious', { ms: 1200 })], 40);
}

function coolKey(userId: string, id: string) {
  return `${userId}:${id}`;
}

function cooled(memory: LifeMemory, userId: string, id: string, now: number, cooldownMs: number) {
  const seen = memory.categoryAt.get(coolKey(userId, id));
  if (seen == null) return { ok: true, remainingMs: 0 };
  const remainingMs = cooldownMs - (now - seen);
  return { ok: remainingMs <= 0, remainingMs: Math.max(0, remainingMs) };
}

function commit(memory: LifeMemory, pick: Pick, now: number, beats: ToodleBeat[], userId: string) {
  const duration = beats.reduce((sum, beat) => sum + beat.ms, 0);
  memory.lockUntil = now + duration;
  memory.lockLevel = beats[0]?.priority ?? levelScore(pick.level);
  memory.lastListenAt = now;
  memory.categoryAt.set(coolKey(userId, pick.id), now);
  for (const category of pick.categories) memory.categoryAt.set(coolKey(userId, category), now);
  if (swordLocked(pick.id)) memory.categoryAt.set(coolKey(userId, 'sword'), now);
  if (pick.categories.includes('name')) memory.namePingAt = now;
  if (pick.level >= 3) memory.majorAt.push(now);
}

export interface ToodleDecision {
  message: string;
  normalized: string;
  detected: string[];
  selected: string | null;
  status: 'played' | 'suppressed' | 'none';
  reason: string | null;
  remainingMs: number | null;
  beats: ToodleBeat[] | null;
}

const recentDecisions: ToodleDecision[] = [];

function debugOn() {
  try {
    return globalThis.localStorage?.getItem('toodle-debug') === '1';
  } catch {
    return false;
  }
}

function remember(decision: ToodleDecision) {
  recentDecisions.push(decision);
  if (recentDecisions.length > 12) recentDecisions.shift();
  if (!debugOn()) return;
  const lines = [
    'Toodle Detection',
    `Message: "${decision.message}"`,
    `Normalized: "${decision.normalized}"`,
    decision.detected.length ? `Detected: ${decision.detected.join(', ')}` : 'Detected: NONE',
    decision.selected ? `Selected: ${decision.selected}` : 'Selected: none',
    `Status: ${decision.status}${decision.reason ? ` (${decision.reason})` : ''}`,
  ];
  console.info(lines.join('\n'));
}

export function explainToodleReaction(
  text: string,
  memory: LifeMemory,
  now: number,
  chaos: ChaosLevel,
  random: () => number = Math.random,
  context: HearContext = {},
): ToodleDecision {
  const normalized = normalizeToodleText(text);
  const done = (decision: ToodleDecision) => {
    remember(decision);
    return decision;
  };
  const blank = (status: ToodleDecision['status'], reason: string | null, detected: string[] = []): ToodleDecision => done({
    message: text,
    normalized,
    detected,
    selected: null,
    status,
    reason,
    remainingMs: null,
    beats: null,
  });
  if (chaos === 'off') return blank('suppressed', 'chaos-off');
  if (looksSerious(text)) {
    const found = detect(text).map((hit) => hit.reaction.id);
    return blank('suppressed', 'serious', found);
  }
  if (memory.chaosUntil > now) {
    const found = detect(text).map((hit) => hit.reaction.id);
    return blank('suppressed', 'chaos-escape', found);
  }
  prune(memory, now);
  const userId = context.userId ?? 'chat';
  const tokensNow = chatTokens(text);
  const singleDry = tokensNow.length === 1 && !!dryKind(tokensNow[0] ?? '');
  if (!singleDry) memory.msgAt.push(now);
  const spans = tally(memory, text, userId, now);
  const askedForName = text.includes('?') && nameTokens(text);
  const currentHits = detect(text).filter((hit) => !negated(text, hit.reaction.category) && !(askedForName && hit.reaction.category === 'name'));
  const current = new Set(currentHits.map((hit) => hit.reaction.category));
  memory.recentCats.push({ at: now, categories: [...current] });

  if (memory.msgAt.length >= 5) {
    memory.hotUntil = now + 8_000;
    return blank('suppressed', 'burst', currentHits.map((hit) => hit.reaction.id));
  }
  if (memory.hotUntil && now >= memory.hotUntil) {
    memory.hotUntil = 0;
    memory.oweListen = true;
  }

  const recent = new Set<string>();
  for (const row of memory.recentCats.slice(0, -1)) {
    for (const category of row.categories) recent.add(category);
  }
  for (const body of context.recent ?? []) {
    for (const hit of detect(body)) {
      if (!negated(body, hit.reaction.category)) recent.add(hit.reaction.category);
    }
  }

  const individuals: Pick[] = currentHits.map((hit) => ({
    id: hit.reaction.id,
    categories: [hit.reaction.category],
    level: hit.reaction.level,
    specificity: hit.specificity,
    probability: hit.reaction.probability,
    cooldownMs: hit.reaction.cooldownMs,
    combo: false,
    build: (roll) => hit.reaction.cues(roll, memory),
  }));

  const pool = [
    ...combinations(current, recent),
    ...individuals,
    ...frequencyPicks(text, spans),
    ...socialPicks(text, memory, userId, now, context.recent ?? [], current),
  ];
  const detected = [...new Set(pool.map((pick) => pick.id))];
  if (pool.length > 0) {
    const majors = memory.majorAt.length;
    const blocked: { id: string; reason: string; remainingMs: number }[] = [];
    const open = pool.filter((pick) => {
      if (pick.level >= 3 && majors >= MAX_MAJORS_PER_MINUTE && !surePick(pick)) {
        blocked.push({ id: pick.id, reason: 'budget', remainingMs: 0 });
        return false;
      }
      const keys = pick.combo ? [pick.id] : [...pick.categories];
      if (swordLocked(pick.id) && !keys.includes('sword')) keys.push('sword');
      for (const category of keys) {
        const gate = cooled(memory, userId, category, now, pick.cooldownMs);
        if (!gate.ok) {
          blocked.push({ id: pick.id, reason: 'cooldown', remainingMs: gate.remainingMs });
          return false;
        }
      }
      return true;
    });
    open.sort((a, b) => {
      if (a.combo !== b.combo) return a.combo ? -1 : 1;
      if (a.level !== b.level) return b.level - a.level;
      if (a.specificity !== b.specificity) return b.specificity - a.specificity;
      return b.probability - a.probability;
    });
    const winner = open[0];
    if (!winner) {
      const first = blocked[0];
      return done({
        message: text,
        normalized,
        detected,
        selected: first?.id ?? null,
        status: 'suppressed',
        reason: first?.reason ?? 'filtered',
        remainingMs: first?.remainingMs ?? null,
        beats: null,
      });
    }
    if (!surePick(winner)) {
      const chance = Math.min(0.9, winner.probability * gapScale(chaos));
      if (random() > chance) {
        return done({
          message: text,
          normalized,
          detected,
          selected: winner.id,
          status: 'suppressed',
          reason: 'probability',
          remainingMs: null,
          beats: null,
        });
      }
    }
    const built = winner.build(random);
    const beats = toBeats(built, swordLocked(winner.id) ? 86 : levelScore(winner.level) + (winner.combo ? 4 : 0), winner.id);
    commit(memory, winner, now, beats, userId);
    return done({ message: text, normalized, detected, selected: winner.id, status: 'played', reason: null, remainingMs: null, beats });
  }

  if (memory.oweListen) {
    memory.oweListen = false;
    if (random() < 0.55) {
      const beats = listenBeats(random, "Okay... I'm listening.");
      memory.categoryAt.set(coolKey(userId, 'listen'), now);
      memory.lastListenAt = now;
      return done({ message: text, normalized, detected, selected: 'listen', status: 'played', reason: null, remainingMs: null, beats });
    }
  }

  const listenSeen = memory.categoryAt.get(coolKey(userId, 'listen'));
  const enoughChat = memory.recentCats.length >= 3;
  if (currentHits.length === 0 && enoughChat && (listenSeen == null || now - listenSeen >= 180_000) && random() < 0.06 * gapScale(chaos)) {
    const beats = listenBeats(random);
    memory.categoryAt.set(coolKey(userId, 'listen'), now);
    memory.lockUntil = now + (beats[0]?.ms ?? 1200);
    memory.lockLevel = 40;
    return done({ message: text, normalized, detected, selected: 'listen', status: 'played', reason: null, remainingMs: null, beats });
  }
  return blank('none', detected.length ? null : 'no-matcher', detected);
}

export function getNextToodleReaction(
  text: string,
  memory: LifeMemory,
  now: number,
  chaos: ChaosLevel,
  random: () => number = Math.random,
  context: HearContext = {},
): ToodleBeat[] | null {
  return explainToodleReaction(text, memory, now, chaos, random, context).beats;
}

export function hearMessage(
  text: string,
  memory: LifeMemory,
  now: number,
  chaos: ChaosLevel,
  random: () => number = Math.random,
  context?: HearContext,
): ToodleBeat[] | null {
  return explainToodleReaction(text, memory, now, chaos, random, context).beats;
}

export function getToodleReactionHealth() {
  const ids = ALL_TOODLE_REACTIONS.map((reaction) => reaction.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const missingKeywords = ALL_TOODLE_REACTIONS.filter((reaction) => reaction.aliases.length === 0).map((reaction) => reaction.id);
  return {
    total: ALL_TOODLE_REACTIONS.length,
    loaded: ALL_TOODLE_REACTIONS.length,
    duplicateIds,
    missingKeywords,
    groups: {
      english: true,
      tanglish: true,
      aliases: true,
      context: true,
      combinations: true,
      frequency: true,
      cooldown: true,
    },
    recent: recentDecisions.map((decision) => ({
      id: decision.selected,
      status: decision.status,
      reason: decision.reason,
    })),
  };
}

