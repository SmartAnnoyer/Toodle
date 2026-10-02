export function normalizeGuess(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(is|it|this|the|a|an|song|from|maybe|think|its)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function guessMatches(guess: string, title: string, artist?: string): boolean {
  const spoken = normalizeGuess(guess);
  const name = normalizeGuess(title);
  if (spoken.length < 3 || name.length < 2) return false;
  if (spoken === name || spoken.includes(name)) return true;
  const words = name.split(' ').filter((word) => word.length >= 3);
  if (words.some((word) => word === spoken)) return true;
  if (words.length > 1 && words.every((word) => spoken.includes(word))) return true;
  const singer = artist ? normalizeGuess(artist) : '';
  if (singer && singer !== 'telugu' && singer.length >= 3 && (spoken === singer || spoken.includes(singer))) return true;
  return false;
}

export function hintLine(kind: 'letter' | 'mood', title: string, mood?: string): string | null {
  if (kind === 'letter') {
    const letter = title.trim().charAt(0).toUpperCase();
    return letter ? `Starts with ${letter}` : null;
  }
  if (!mood) return null;
  return `Mood: ${mood}`;
}
