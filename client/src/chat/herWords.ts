export type HerMarkHit = {
  id: string;
  line: string;
};

const GROUPS: { id: string; words: string[]; lines: string[] }[] = [
  {
    id: 'greeting',
    words: ['ellehey', 'elley', 'ehey'],
    lines: ['👀 There she is', 'Her signature 😂', 'That greeting ✨', 'Her mark ✨', '✨'],
  },
  {
    id: 'food',
    words: ['thintav', 'thintaav'],
    lines: ['Again? 👀', 'Food topic detected 😂', 'Thinu thinu 😌', 'Her mark ✨'],
  },
  {
    id: 'vibes',
    words: ['enjoy enjoy', 'nekey best', 'happy ga undu', 'nice nice'],
    lines: ['✨ Good vibes', "That's her energy 💫", 'Happy mode ✨', 'Her mark ✨'],
  },
  {
    id: 'command',
    words: ['chaalanu', 'challey', 'urko', 'enough', 'chaalu', 'chalu'],
    lines: ['😂 Classic', 'Okay okay...', 'Her command 😭', 'Yes madam 🫡', 'Her mark ✨'],
  },
  {
    id: 'bye',
    words: ['tata'],
    lines: ['👋 Tata', 'There she goes ✨', 'Her bye 😌', 'Her mark ✨'],
  },
  {
    id: 'name',
    words: ['toodles', 'toodle'],
    lines: ['👀 She said it', 'Name drop ✨', 'Toodle heard that 😌', 'Her mark ✨'],
  },
  {
    id: 'drama',
    words: ['edisaavle', 'edisavle', 'edichavle', 'edichaavle'],
    lines: ['😂 Here we go', 'Drama detected 🎭', 'Her dialogue 😭', 'Classic line 💀', 'Her mark ✨'],
  },
  {
    id: 'stop',
    words: ['aaputhava', 'aapu'],
    lines: ['🫡 Stopping...', 'Okay okay 😂', 'Command received', 'Her mark ✨'],
  },
  {
    id: 'careful-word',
    words: ['thagulathai', 'thagulthaai', 'thagulthay', 'thagulthaay'],
    lines: ['👀 Dangerous word', '😂 Noted...', 'Here we go again', 'Her mark ✨'],
  },
  {
    id: 'famous',
    words: ['neku chala undhi'],
    lines: ['😂 We know...', 'Too much? 👀', 'Her famous line ✨', 'Her mark ✨'],
  },
];

function normalizeMark(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasPhrase(text: string, word: string) {
  const needle = normalizeMark(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!needle) return false;
  return new RegExp(`(?:^|[^a-z0-9])${needle}(?=$|[^a-z0-9])`, 'i').test(text);
}

const PHRASES = GROUPS.flatMap((group) => group.words.map((word) => ({ word, group })))
  .sort((a, b) => normalizeMark(b.word).length - normalizeMark(a.word).length);

export function herMarkFor(text: string, random: () => number = Math.random): HerMarkHit | null {
  const body = normalizeMark(text);
  if (!body) return null;
  for (const phrase of PHRASES) {
    if (!hasPhrase(body, phrase.word)) continue;
    const lines = phrase.group.lines;
    const line = lines[Math.floor(random() * lines.length) % lines.length];
    return line ? { id: phrase.group.id, line } : null;
  }
  return null;
}
