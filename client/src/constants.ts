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

export const AVATARS = ['✨', '💀', '😭', '🪩', '🫶', '💅', '🫧', '🌙', '🔥', '🦋', '🍓', '🎧', '👽', '🖤', '⭐', '😈'];

export const EMOJIS = ['😂', '❤️', '😭', '🔥', '✨', '💀', '👀', '🫠', '💅', '🫡', '🥀', '🪩', '🫶', '😈', '🫧', '🖤', '👽', '⭐', '🥺', '😘', '😎', '🎉', '💜', '🌙'];

export const REACTIONS = ['❤️', '😂', '💀', '🔥', '💅', '😭'];

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
  MusicPlay: 'music:play',
  MusicPause: 'music:pause',
  MusicSeek: 'music:seek',
  MusicChange: 'music:change',
  MusicSyncRequest: 'music:sync-request',
  MusicSyncState: 'music:sync-state',
  MusicStop: 'music:stop',
  MusicControl: 'music:control',
  MusicQueueAdd: 'music:queue-add',
  MusicQueueRemove: 'music:queue-remove',
  MusicNext: 'music:next',
  MusicGuessInvite: 'music:guess-invite',
  MusicGuessStart: 'music:guess-start',
  MusicGuessSubmit: 'music:guess-submit',
  MusicGuessJudge: 'music:guess-judge',
  MusicGuessHint: 'music:guess-hint',
  MusicGuessReveal: 'music:guess-reveal',
  MusicGuessNext: 'music:guess-next',
} as const;
