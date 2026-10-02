export type KeywordEffect = {
  id: string;
  emojis: string[];
};

const EFFECTS: { id: string; words: string[]; emojis: string[] }[] = [
  {
    id: 'akash',
    words: ['akash'],
    emojis: ['🎈', '🎈', '🎉', '✨', '🥳', '💫', '🌟', '🎊'],
  },
];

function hasWord(text: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text);
}

export function keywordEffectFor(text: string): KeywordEffect | null {
  const body = text.trim();
  if (!body) return null;
  for (const effect of EFFECTS) {
    if (effect.words.some((word) => hasWord(body, word))) {
      return { id: effect.id, emojis: effect.emojis };
    }
  }
  return null;
}
