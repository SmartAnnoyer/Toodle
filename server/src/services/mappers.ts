export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  mood_emoji: string;
  mood_text: string;
  show_online: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  moodEmoji: string;
  moodText: string;
  online: boolean;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  reply_to_id: string | null;
  kind: 'text' | 'gif' | 'sticker' | 'system';
  metadata: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
}

export interface ReplyPreview {
  id: string;
  body: string;
  senderName: string;
}

export function toPublicProfile(row: ProfileRow, online: boolean): PublicProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarEmoji: row.avatar_emoji,
    moodEmoji: row.mood_emoji,
    moodText: row.mood_text,
    online: row.show_online ? online : false,
  };
}

function isReply(value: unknown): value is ReplyPreview {
  if (!value || typeof value !== 'object') return false;
  const reply = value as Record<string, unknown>;
  return typeof reply.id === 'string' && typeof reply.body === 'string' && typeof reply.senderName === 'string';
}

export function mapMessage(row: MessageRow, reactions: { emoji: string; userId: string }[] = []) {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    kind: row.kind,
    metadata,
    replyTo: isReply(metadata.reply) ? metadata.reply : null,
    reactions,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function humanDuration(seconds: number): string {
  if (seconds % 86400 === 0) {
    const days = seconds / 86400;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${seconds} seconds`;
}
