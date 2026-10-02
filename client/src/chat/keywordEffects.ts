export type BurstMotion = 'rise' | 'fall' | 'drift' | 'blink';

export type KeywordEffect = {
  id: string;
  emojis: string[];
  motion: BurstMotion;
  density?: number;
  pop?: number;
};

const WISH_COOLDOWN_MS = 60_000;

type Wish = {
  id: string;
  words: string[];
  takes: KeywordEffect[];
};

function takes(id: string, rows: [BurstMotion, string[], number?, number?][]): KeywordEffect[] {
  return rows.map(([motion, emojis, density, pop], index) => ({
    id: `${id}-${index}`,
    motion,
    emojis,
    density,
    pop,
  }));
}

const WISHES: Wish[] = [
  {
    id: 'morning',
    words: ['good morning', 'goodmorning', 'gud morning', 'gud mrng', 'gud mrnggg', 'gmorn', 'morninggg', 'morning', 'gm'],
    takes: takes('morning', [
      ['rise', ['🌅', '🙆', '☀️', '✨'], 18, 0.08],
      ['fall', ['🥱', '😊', '💤', '✨'], 16, 0.04],
      ['drift', ['👋', '🌤️', '😊'], 14, 0],
      ['blink', ['😌', '😊', '✨'], 10, 0],
      ['rise', ['⚡', '☀️', '😄', '✨'], 28, 0.75],
    ]),
  },
  {
    id: 'night',
    words: ['good night', 'goodnight', 'gud night', 'gud n8', 'gnight', 'nighttt', 'night', 'gn'],
    takes: takes('night', [
      ['fall', ['🌙', '😴', '💤'], 16, 0.04],
      ['blink', ['😌', '🌙', '✨'], 10, 0],
      ['fall', ['🌌', '⭐', '💤'], 14, 0],
      ['drift', ['👋', '🌙', '✨'], 12, 0],
    ]),
  },
  {
    id: 'afternoon',
    words: ['good afternoon', 'gud afternoon', 'gud aftrnoon', 'afternoonnn', 'afternoon'],
    takes: takes('afternoon', [
      ['rise', ['☀️', '🕒', '👋'], 16, 0.1],
      ['drift', ['👋', '😊', '🌤️'], 14, 0],
      ['blink', ['😌', '☀️', '✨'], 10, 0],
      ['rise', ['🌞', '✨', '😄'], 22, 0.45],
    ]),
  },
  {
    id: 'birthday',
    words: ['happy birthday', 'happy bday', 'many more happy returns', 'birthday wishes', 'hbdyy', 'hbd'],
    takes: takes('birthday', [
      ['rise', ['🎂', '🎉', '🎈'], 26, 0.7],
      ['rise', ['🥳', '🎊', '🎁'], 24, 0.55],
      ['drift', ['🎈', '🎉', '✨'], 16, 0.2],
      ['blink', ['🎂', '✨', '🌟'], 12, 0],
    ]),
  },
  {
    id: 'all-the-best',
    words: ['all the best', 'all da best', 'all d best', 'best of luck', 'good luck', 'gud luck', 'best wishes'],
    takes: takes('all-the-best', [
      ['rise', ['🍀', '👍', '💪'], 16, 0.15],
      ['rise', ['✨', '🍀', '🌟'], 20, 0.4],
      ['drift', ['👋', '👍', '✨'], 12, 0],
      ['blink', ['💪', '✨', '🍀'], 10, 0],
    ]),
  },
  {
    id: 'journey',
    words: ['have a safe journey', 'happy journey', 'safe journey', 'safe travels', 'happy travelling', 'happy travel'],
    takes: takes('journey', [
      ['drift', ['✈️', '🧳', '🌍'], 14, 0],
      ['drift', ['👋', '✈️', '✨'], 12, 0],
      ['rise', ['🌍', '✈️', '🌤️'], 16, 0.2],
      ['blink', ['🧳', '✨', '💛'], 10, 0],
    ]),
  },
  {
    id: 'take-care',
    words: ['take care', 'takecare', 'jagratha ga', 'jagratha', 'careful', 'be safe', 'tc'],
    takes: takes('take-care', [
      ['rise', ['💗', '🤗', '👋'], 16, 0.1],
      ['blink', ['💗', '✨', '😊'], 10, 0],
      ['drift', ['👋', '💛', '💗'], 12, 0],
      ['fall', ['🤗', '🤍', '✨'], 14, 0.05],
    ]),
  },
  {
    id: 'congrats',
    words: ['many congratulations', 'congratulations bro', 'congratulations', 'congrats bro', 'congrats'],
    takes: takes('congrats', [
      ['rise', ['👏', '🎉', '🥳'], 24, 0.65],
      ['rise', ['🎊', '✨', '🏆'], 20, 0.4],
      ['drift', ['👏', '👋', '✨'], 14, 0.1],
      ['blink', ['🎉', '⭐', '😄'], 12, 0],
    ]),
  },
  {
    id: 'no-problem',
    words: ["you're welcome", 'youre welcome', 'no problem', 'em parledu', 'parledu', 'np'],
    takes: takes('no-problem', [
      ['rise', ['😊', '🤍', '✨'], 14, 0.08],
      ['blink', ['😌', '✨', '😊'], 10, 0],
      ['drift', ['👋', '😊', '💛'], 12, 0],
      ['rise', ['🤝', '✨', '😄'], 14, 0.12],
    ]),
  },
  {
    id: 'welcome-back',
    words: ["i'm back", 'im back', 'came back', 'vachesa back', 'vachesa', 'ochesa', 'back'],
    takes: takes('welcome-back', [
      ['rise', ['🏃', '👋', '😄'], 18, 0.35],
      ['drift', ['👋', '✨', '😊'], 14, 0],
      ['blink', ['🤗', '✨', '😄'], 10, 0],
      ['rise', ['✨', '😄', '🎉'], 22, 0.5],
    ]),
  },
  {
    id: 'welcome',
    words: ['welcome backkk', 'welcome back', 'welcomee', 'welcum', 'welcome'],
    takes: takes('welcome', [
      ['drift', ['👋', '😄', '✨'], 14, 0],
      ['rise', ['👋', '🎉', '😊'], 18, 0.3],
      ['blink', ['😊', '✨', '💛'], 10, 0],
      ['rise', ['🎊', '👋', '✨'], 20, 0.45],
    ]),
  },
  {
    id: 'bye',
    words: ['bye bye', 'see you', 'see ya', 'vellostunna', 'vellostha', 'ika bye', 'byeee', 'byee', 'cya', 'bye'],
    takes: takes('bye', [
      ['drift', ['👋', '💨', '✨'], 14, 0],
      ['drift', ['👋', '😊', '💛'], 12, 0],
      ['fall', ['💨', '🌙', '✨'], 12, 0.05],
      ['blink', ['👋', '😌', '✨'], 10, 0],
    ]),
  },
  {
    id: 'miss-you',
    words: ['ninnu miss avthunna', 'missing you', 'miss avtunna', 'missuuu', 'miss you', 'miss u'],
    takes: takes('miss-you', [
      ['fall', ['💗', '🥺', '💌'], 16, 0.05],
      ['blink', ['💗', '✨', '😊'], 10, 0],
      ['fall', ['💌', '🌙', '💗'], 14, 0],
      ['rise', ['🤗', '💗', '✨'], 14, 0.1],
    ]),
  },
  {
    id: 'sleep',
    words: ['going to sleep', 'nidrosthundi', 'padukuntunna', 'padukunta', 'sleeping', 'nidra', 'sleep'],
    takes: takes('sleep', [
      ['fall', ['😴', '💤', '🌙'], 14, 0.04],
      ['blink', ['😌', '💤', '✨'], 8, 0],
      ['fall', ['🌙', '⭐', '😴'], 12, 0],
      ['blink', ['😴', '🤍', '💤'], 10, 0],
    ]),
  },
  {
    id: 'good-luck',
    words: ['you can do it', 'you got this', 'luck'],
    takes: takes('good-luck', [
      ['rise', ['🤞', '💪', '🔥'], 16, 0.2],
      ['rise', ['✨', '💪', '⭐'], 18, 0.35],
      ['blink', ['🤞', '✨', '🍀'], 10, 0],
      ['drift', ['👋', '🍀', '✨'], 12, 0],
    ]),
  },
  {
    id: 'thanks',
    words: ['thank you', 'thanks a lot', 'thank u', 'thanks', 'thx', 'ty'],
    takes: takes('thanks', [
      ['rise', ['🙏', '😊', '💗'], 14, 0.1],
      ['blink', ['🙏', '✨', '😊'], 10, 0],
      ['drift', ['👋', '💗', '✨'], 12, 0],
      ['fall', ['🤍', '😊', '🙏'], 12, 0.05],
    ]),
  },
  {
    id: 'sorry',
    words: ['na mistake', 'my bad', 'sorry ra', 'sorrie', 'sorry', 'sry'],
    takes: takes('sorry', [
      ['fall', ['😔', '🤍', '🤝'], 14, 0.04],
      ['blink', ['😔', '✨', '🤍'], 10, 0],
      ['fall', ['🌧️', '🤍', '💛'], 12, 0],
      ['rise', ['🤝', '💗', '😊'], 14, 0.08],
    ]),
  },
  {
    id: 'motivation',
    words: ['never give up', "i'll do it", 'i will try', 'i can do it', "let's do it", 'lets do it'],
    takes: takes('motivation', [
      ['rise', ['🔥', '💪', '✨'], 18, 0.3],
      ['rise', ['⚡', '⭐', '😄'], 22, 0.55],
      ['blink', ['💪', '✨', '🔥'], 10, 0],
      ['drift', ['🏃', '🔥', '✨'], 12, 0.1],
    ]),
  },
  {
    id: 'celebration',
    words: ['we did it', 'completed', 'finally', 'yesss', 'yayy', 'yay', 'done'],
    takes: takes('celebration', [
      ['rise', ['🎉', '🙌', '🥳'], 26, 0.7],
      ['rise', ['🎊', '✨', '⭐'], 20, 0.4],
      ['drift', ['🎉', '👋', '✨'], 14, 0.15],
      ['blink', ['🥳', '✨', '😄'], 12, 0],
    ]),
  },
  {
    id: 'bad-news',
    words: ["didn't happen", 'didnt happen', 'not selected', 'cancelled', 'canceled', 'rejected', 'failed', 'lost'],
    takes: takes('bad-news', [
      ['fall', ['🤍', '🌧️', '🤗'], 14, 0.04],
      ['blink', ['😔', '🤍', '💛'], 10, 0],
      ['fall', ['🌧️', '💙', '🤍'], 12, 0],
      ['rise', ['🤗', '💛', '✨'], 12, 0.08],
    ]),
  },
  {
    id: 'care',
    words: ['safe ga vellu', 'careful ga', 'be careful'],
    takes: takes('care', [
      ['rise', ['💛', '🙏', '✨'], 14, 0.08],
      ['blink', ['💛', '✨', '😊'], 10, 0],
      ['drift', ['👋', '💛', '🤍'], 12, 0],
      ['fall', ['🙏', '💗', '✨'], 12, 0.05],
    ]),
  },
  {
    id: 'wish',
    words: ['wish me luck', 'pray for me', 'bless me'],
    takes: takes('wish', [
      ['rise', ['🤞', '✨', '🙏'], 16, 0.15],
      ['blink', ['🤞', '⭐', '✨'], 10, 0],
      ['drift', ['🙏', '✨', '💛'], 12, 0],
      ['rise', ['🍀', '🤞', '✨'], 18, 0.3],
    ]),
  },
];

const SPARKLE: KeywordEffect = {
  id: 'sparkle',
  motion: 'rise',
  emojis: ['💫', '✨', '🌟', '💫', '✨', '🤩'],
  density: 26,
  pop: 0.45,
};

const SPARKLE_NAMES = [
  'akki smart',
  'smart star',
  'jaanammaaaa',
  'jahnaviiiii',
  'smartuuu',
  'jaanamma',
  'janamma',
  'jahnavii',
  'jahnavi',
  'jaanu',
  'jaaan',
  'muse',
  'akki',
  'akash',
  'smart',
];

const readyAt = new Map<string, number>();

function loosen(text: string) {
  return text.toLowerCase().replace(/(.)\1{2,}/g, '$1$1');
}

function hasWord(text: string, word: string) {
  const escaped = loosen(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text);
}

const PHRASES = [
  ...WISHES.flatMap((wish) => wish.words.map((word) => ({ word, wish }))),
  ...SPARKLE_NAMES.map((word) => ({ word, wish: null as Wish | null })),
].sort((a, b) => loosen(b.word).length - loosen(a.word).length);

function pickTake(wish: Wish, now: number, random: () => number): KeywordEffect | null {
  if (now < (readyAt.get(wish.id) ?? 0)) return null;
  const take = wish.takes[Math.floor(random() * wish.takes.length) % wish.takes.length];
  readyAt.set(wish.id, now + WISH_COOLDOWN_MS);
  return take ?? null;
}

export function keywordEffectFor(text: string, now = Date.now(), random: () => number = Math.random): KeywordEffect | null {
  const body = loosen(text.trim());
  if (!body) return null;
  for (const phrase of PHRASES) {
    if (!hasWord(body, phrase.word)) continue;
    if (!phrase.wish) return SPARKLE;
    return pickTake(phrase.wish, now, random);
  }
  return null;
}
