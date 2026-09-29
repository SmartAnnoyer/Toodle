export const MOODS = [
  { emoji: '😂', text: 'bored' },
  { emoji: '🫠', text: 'surviving' },
  { emoji: '🤡', text: 'questionable decisions' },
  { emoji: '😴', text: 'sleepy' },
  { emoji: '🔥', text: 'cooking' },
  { emoji: '👀', text: 'watching' },
  { emoji: '💀', text: 'dead inside' },
  { emoji: '🧠', text: 'overthinking' },
  { emoji: '❤️', text: 'in love' },
  { emoji: '🥱', text: 'barely alive' },
] as const;

export const AVATARS = ['🦊', '🌙', '☕', '✨', '🌸', '🔥', '💜', '🦋', '🍓', '⚡', '🌊', '🎧'];

export const EMOJIS = ['😂', '❤️', '😭', '🔥', '✨', '💀', '👀', '🫠', '🤡', '😴', '🥱', '🧠', '💜', '🌙', '☕', '🌸', '⚡', '🥺', '😘', '🤝', '👋', '💕', '😎', '🎉'];

export const REACTIONS = ['❤️', '😂', '💀', '🔥', '👀', '😭'];

export const MESSAGE_EXPIRY = [
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '5 minutes', seconds: 300 },
  { label: '10 minutes', seconds: 600 },
  { label: '30 minutes', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
];

export const MESSAGE_COUNTS = [10, 25, 50, 100, 250, 500, 1000];

export const CONVERSATION_EXPIRY = [
  { label: '5 minutes', seconds: 300 },
  { label: '10 minutes', seconds: 600 },
  { label: '30 minutes', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '12 hours', seconds: 43200 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
];

export const RENEW_OPTIONS = [
  { label: '+5 minutes', seconds: 300 },
  { label: '+10 minutes', seconds: 600 },
  { label: '+30 minutes', seconds: 1800 },
  { label: '+1 hour', seconds: 3600 },
  { label: '+24 hours', seconds: 86400 },
];

export const CHALLENGE_OPTIONS = [
  { label: 'Every minute', seconds: 60 },
  { label: 'Every 5 minutes', seconds: 300 },
  { label: 'Every 10 minutes', seconds: 600 },
  { label: 'Every 30 minutes', seconds: 1800 },
];

export const SocketEvents = {
  MessageSend: 'message:send',
  MessageNew: 'message:new',
  MessageDelete: 'message:delete',
  MessageReaction: 'message:reaction',
  MessageRead: 'message:read',
  TypingStart: 'typing:start',
  TypingStop: 'typing:stop',
  PresenceUpdate: 'presence:update',
  ConversationJoin: 'conversation:join',
  ConversationLeave: 'conversation:leave',
  ConversationUpdated: 'conversation:updated',
  ConversationExpired: 'conversation:expired',
  RenewRequest: 'conversation:renew-request',
  RenewAccepted: 'conversation:renew-accepted',
  RenewRejected: 'conversation:renew-rejected',
  ShortcutShared: 'shortcut:shared',
  ShortcutAccepted: 'shortcut:accepted',
  ShortcutRevoked: 'shortcut:revoked',
  NotificationNew: 'notification:new',
} as const;
