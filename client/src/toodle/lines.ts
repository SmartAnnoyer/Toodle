import type { ToodleContext, ToodleEvent, ToodlePose } from './types';

const pick = (items: string[], random: () => number) => items[Math.floor(random() * items.length)] ?? items[0];

export const WORD_SWAPS: Record<string, string> = {
  bro: 'my distinguished gentleman',
  okay: 'Understood, captain.',
  ok: 'Understood, captain.',
  nice: 'absolutely magnificent',
  yes: 'absolutely',
  no: 'respectfully, nope',
  lol: 'I am deceased',
  lmao: 'I have perished',
  hey: 'greetings, human',
  yeah: 'indeed',
  fine: 'spectacular, actually',
  what: 'elaborate, please',
  idk: 'the mystery continues',
  omg: 'good heavens',
  love: 'I am fond of you, formally',
  hi: 'salutations',
  cool: 'extraordinarily acceptable',
  sure: 'consider it done',
};

const MOOD_LINES: Record<string, string> = {
  bored: 'Bored? That is literally my department.',
  surviving: 'Respect.',
  'questionable decisions': 'Oh no.',
  sleepy: 'Go to bed.',
  cooking: 'CHEF MODE.',
  watching: 'Same.',
  'dead inside': 'I will lie down with you.',
  dead: 'I will lie down with you.',
  overthinking: 'And we are back.',
  'in love': 'I saw nothing.',
  'barely alive': 'Blink twice if you need water.',
  unhinged: 'Say less. I am already unwell.',
  'main character': 'The lighting is doing a lot.',
  'locked in': 'No distractions. I am a distraction.',
  'in my feels': 'I brought tissues. They are metaphorical.',
  'going out': 'Shoes on. Decisions off.',
  soft: 'Okay that is dangerously cute.',
  menace: 'I support this. Quietly.',
  delulu: 'And yet. It might work.',
  lowkey: 'I will pretend I did not see that.',
};

export function lineFor(event: ToodleEvent, ctx: ToodleContext, random: () => number): { line?: string; suggestion?: string; pose?: ToodlePose } {
  switch (event) {
    case 'CHAT_OPENED':
      return { line: pick(['Here we go...', 'I will just sit here.', 'Say something unhinged. I dare you.'], random), pose: 'suspicious' };
    case 'USER_TYPING_TOO_LONG':
      return {
        line: pick([
          'Bro is writing a thesis.',
          'That is a suspiciously long sentence.',
          'You good in there?',
          'I can hear the keyboard fighting for its life.',
          'Thinking...',
          'Thinking harder...',
          'Okay Shakespeare.',
        ], random),
        pose: 'thinking',
      };
    case 'USER_DELETED_DRAFT':
      return {
        line: pick([
          'Just send it bro.',
          'The message has entered its editing era.',
          'Draft #17 loading...',
          'You could have just said hey.',
          'Bro deleted the entire autobiography.',
        ], random),
        pose: 'confused',
      };
    case 'USER_SENT_MANY_MESSAGES':
      return {
        line: pick(['Whoa whoa WHOA.', 'Bro came prepared.', 'Machine gun texting activated.', 'Someone had things to say.'], random),
        pose: 'shocked',
      };
    case 'CHAT_IDLE':
      return {
        line: pick([
          'So... we just do not talk now?',
          'I will just sit here then.',
          'This conversation has entered airplane mode.',
          'Hello? Anybody home?',
          'The vibes have left the building.',
        ], random),
        pose: 'crying',
      };
    case 'CHAT_ACTIVE_LONG':
      return {
        line: pick([
          'Y\'all are STILL here?',
          'At this point I am basically part of the relationship.',
          'I have witnessed too much.',
          'Should I leave you two alone?',
          'You two could have just called.',
        ], random),
        pose: 'dramatic',
      };
    case 'WORD_REPEATED': {
      const word = ctx.word ?? 'that';
      const swap = WORD_SWAPS[word];
      return {
        line: pick([
          `${word} counter is climbing.`,
          `You really like the word "${word}" huh?`,
          `New vocabulary unlocked: ${word}.`,
          `You have said "${word}" ${ctx.count ?? 'a lot of'} times.`,
        ], random),
        suggestion: swap,
        pose: 'suspicious',
      };
    }
    case 'LATE_CLAIM':
      return { line: '5 minutes detected. Historically, this means 27 minutes.', pose: 'suspicious' };
    case 'STREAK_INCREASED': {
      const streak = ctx.streak ?? 1;
      if (streak >= 30) return { line: 'I think I am emotionally invested now.', pose: 'celebrating' };
      if (streak >= 7) return { line: 'SEVEN DAYS?!', pose: 'celebrating' };
      if (streak >= 3) return { line: 'Look at you two.', pose: 'happy' };
      return { line: 'Okayyy, we started something.', pose: 'happy' };
    }
    case 'STREAK_AT_RISK':
      return { line: pick(['THE STREAK. PLEASE.', 'I am not saying it is over... but it is looking suspicious.'], random), pose: 'dramatic' };
    case 'MOOD_CHANGED':
      return { line: MOOD_LINES[(ctx.moodText ?? '').toLowerCase()] ?? 'Mood noted. I am watching.', pose: 'happy' };
    case 'CONVERSATION_EXPIRING':
      return { line: pick(['Uhh... we are running out of time.', 'Just saying... you could renew this.', '5 minutes left.'], random), pose: 'dramatic' };
    case 'GIF_SENT':
      return { pose: 'excited' };
    case 'EMOJI_REACT':
      return { pose: poseForEmoji(ctx.emoji) };
    case 'LONG_MESSAGE':
      return { pose: 'excited' };
    case 'MESSAGE_MILESTONE':
      return { line: pick(['100 messages.', 'You could have sent an email.', 'I have taken notes. They are unhelpful.'], random), pose: 'dramatic' };
    case 'SHORTCUT_USED':
      return { line: pick(['Shortcut spotted.', 'Cheater. I respect it.'], random), pose: 'chaotic' };
    case 'GOODNIGHT':
      return { line: 'Blanket acquired.', pose: 'sleeping' };
    default:
      return {};
  }
}

export function poseForEmoji(emoji?: string): ToodlePose {
  if (!emoji) return 'happy';
  if (emoji.includes('😂') || emoji.includes('😭')) return 'laughing';
  if (emoji.includes('❤') || emoji.includes('💕') || emoji.includes('💗')) return 'blushing';
  if (emoji.includes('💀')) return 'dead';
  if (emoji.includes('🔥')) return 'chaotic';
  if (emoji.includes('👀')) return 'suspicious';
  return 'happy';
}

const SERIOUS = /\b(sorry|died|death|funeral|depress(?:ed|ion)|suicid|anxious|anxiety|hospital|cancer|breakup|abuse|scared|panic|grief|hurt me)\b/i;

export function looksSerious(text: string): boolean {
  return SERIOUS.test(text);
}

export function mentionsFiveMinutes(text: string): boolean {
  return /\b(5|five)\s*(min|mins|minutes)\b/i.test(text);
}

export function mentionsGoodnight(text: string): boolean {
  return /\b(good\s*night|goodnight|\bgn\b)\b/i.test(text);
}

const SKIP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'you', 'me', 'my', 'it', 'is', 'im', 'i\'m', 'that', 'this', 'just', 'so', 'was', 'are', 'be', 'we', 'they', 'them', 'with', 'at', 'if', 'but', 'not', 'do', 'did', 'have', 'has', 'i', 'u', 'ya', 'your', 'our']);

export function notableWord(text: string, counts: Map<string, number>): { word: string; count: number } | null {
  const words = text.toLowerCase().match(/[a-z']{3,}/g) ?? [];
  let hit: { word: string; count: number } | null = null;
  for (const word of words) {
    if (SKIP.has(word)) continue;
    const count = (counts.get(word) ?? 0) + 1;
    counts.set(word, count);
    if (count === 4 || count === 8 || count === 14) hit = { word, count };
  }
  return hit;
}
