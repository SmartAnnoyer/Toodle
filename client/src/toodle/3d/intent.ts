import type { ToodleAnimation, ToodleProp } from '../animations';

export function reactionForText(text: string): { animation: ToodleAnimation; prop?: ToodleProp } {
  const raw = text.trim();
  const t = raw.toLowerCase();
  if (/good\s*night|goodnight|\bgn\b/.test(t)) return { animation: 'sleepy' };
  if (/thank|thanks|\bthx\b/.test(t)) return { animation: 'blush', prop: 'heart' };
  if (/love|ily|miss you|❤|😍|🥰|💗/.test(raw)) return { animation: 'blush', prop: 'heart' };
  if (/lol|lmao|haha|😂|🤣/.test(raw)) return { animation: 'laugh' };
  if (/don'?t understand|confused|what do you mean|inkenti/.test(t)) return { animation: 'confused' };
  if (/really\?!|wait what|what\?|huh\??/.test(t) || (t.includes('?') && t.length < 24)) return { animation: 'shocked' };
  if (/let'?s go|yay|omg|excited|!!!/.test(t)) return { animation: 'celebrate' };
  if (/\b(bye|goodbye|see you|cya)\b/.test(t)) return { animation: 'wave' };
  if (/^(hi|hey|hello|yo|hii|heyy)\b/.test(t)) return { animation: 'wave' };
  if (/sad|sorry|upset|😢|😭/.test(raw)) return { animation: 'cry' };
  if (t.includes('?')) return { animation: 'thinking' };
  return { animation: 'happy' };
}
