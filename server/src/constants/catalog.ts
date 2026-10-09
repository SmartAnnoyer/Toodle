export const MOODS = [
  { emoji: '😭', text: 'unhinged' },
  { emoji: '🫠', text: 'surviving' },
  { emoji: '💅', text: 'main character' },
  { emoji: '🫡', text: 'locked in' },
  { emoji: '🥀', text: 'in my feels' },
  { emoji: '🪩', text: 'going out' },
  { emoji: '💀', text: 'dead' },
  { emoji: '👀', text: 'watching' },
  { emoji: '🫶', text: 'soft' },
  { emoji: '😈', text: 'menace' },
  { emoji: '🫧', text: 'delulu' },
  { emoji: '🖤', text: 'lowkey' },
  { emoji: '🔥', text: 'cooking' },
  { emoji: '🧠', text: 'overthinking' },
] as const;

export const AVATARS = ['✨', '💀', '😭', '🪩', '🫶', '💅', '🫧', '🌙', '🔥', '🦋', '🍓', '🎧', '👽', '🖤', '⭐', '😈'] as const;

export const REACTION_EMOJIS = ['😂', '❤️', '😭', '🔥', '✨', '💀', '👀', '🫠', '💅', '🫡', '🥀', '🪩', '🫶', '😈', '🫧', '🖤', '👽', '⭐', '🥺', '😘', '😎', '🎉', '💜', '🌙'] as const;

export const DEFAULT_SHORTCUTS = [
  { trigger: '/shrug', name: 'Shrug', type: 'TEXT' as const, content: '¯\\_(ツ)_/¯', actionType: null },
  { trigger: '/streak', name: 'Streak', type: 'SYSTEM' as const, content: '', actionType: 'streak' },
  { trigger: '/mood', name: 'Mood', type: 'SYSTEM' as const, content: '', actionType: 'mood' },
  { trigger: '/rules', name: 'Rules', type: 'SYSTEM' as const, content: '', actionType: 'rules' },
  { trigger: '/renew', name: 'Renew', type: 'SYSTEM' as const, content: '', actionType: 'renew' },
  { trigger: '/ghost', name: 'Ghost', type: 'SYSTEM' as const, content: '', actionType: 'ghost' },
  { trigger: '/gif', name: 'GIF', type: 'SYSTEM' as const, content: '', actionType: 'gif' },
];
