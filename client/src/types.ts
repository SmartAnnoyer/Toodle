export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  moodEmoji: string;
  moodText: string;
  online: boolean;
}

export interface Me extends PublicProfile {
  showOnline: boolean;
  onboarded: boolean;
  shortcutCount: number;
  activeStreaks: number;
  bestStreak: number;
  serverNow: string;
}

export interface SearchUser extends PublicProfile {
  relationship: 'none' | 'incoming' | 'outgoing' | 'accepted';
  conversationId: string | null;
}

export interface FriendRequest {
  id: string;
  status: string;
  createdAt: string;
  direction: 'incoming' | 'outgoing';
  user: PublicProfile;
  conversationId: string | null;
}

export interface LastMessage {
  id: string;
  body: string;
  kind: string;
  senderId: string | null;
  createdAt: string;
}

export interface PendingRenewal {
  id: string;
  requestedBy: string;
  durationSeconds: number;
  status: string;
}

export interface ConversationSummary {
  id: string;
  status: 'active' | 'expired' | 'vanished';
  expiresAt: string | null;
  messagesSent: number;
  remainingMessages: number | null;
  messageLimit: number | null;
  streakCount: number;
  streakAtRisk: boolean;
  streakExpiresInSeconds: number | null;
  streakLost: boolean;
  unreadCount: number;
  youLeft: boolean;
  ghostMode: boolean;
  otherUser: PublicProfile;
  otherLastReadAt: string | null;
  lastMessage: LastMessage | null;
  pendingRenewal: PendingRenewal | null;
  updatedAt: string;
}

export interface RuleView {
  ruleType: string;
  title: string;
  explanation: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export interface ConversationDetail extends ConversationSummary {
  myLastReadAt: string | null;
  rules: RuleView[];
  serverNow: string;
}

export interface ReplyPreview {
  id: string;
  body: string;
  senderName: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string;
  kind: 'text' | 'gif' | 'sticker' | 'system';
  metadata: Record<string, unknown>;
  replyTo: ReplyPreview | null;
  reactions: { emoji: string; userId: string }[];
  expiresAt: string | null;
  createdAt: string;
  streak?: { count: number; increased: boolean };
}

export interface Shortcut {
  id: string;
  ownerId: string;
  name: string;
  trigger: string;
  type: 'TEXT' | 'ACTION' | 'SYSTEM';
  content: string;
  actionType: string | null;
  visibility: 'private' | 'shared' | 'conversation';
  conversationId: string | null;
  createdAt: string;
}

export interface IncomingShare {
  id: string;
  status: string;
  createdAt: string;
  from: PublicProfile;
  shortcut: Shortcut;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface GifResult {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  label?: string;
  mock?: boolean;
}

export interface SendResult {
  type: 'message' | 'action';
  message?: ChatMessage;
  action?: string;
  ghostEnabled?: boolean;
  streak?: { count: number; increased?: boolean; atRisk?: boolean; expiresInSeconds?: number | null };
  serverNow: string;
  ok?: boolean;
  error?: string;
}
