import { REACTION_EMOJIS } from '../constants/catalog.js';
import { SocketEvents } from '../constants/events.js';
import { authorizeSend, canDeleteMessage } from '../engines/access.js';
import { calculateMessageExpiration, isRuleEnabled, remainingMessages, validateMessage } from '../engines/ruleEngine.js';
import { recordMessage, viewStreak, type StreakState } from '../engines/streakEngine.js';
import { parseTrigger, type ActionType } from '../engines/shortcutEngine.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { emitToUsers, isUserInConversation } from '../socket/hub.js';
import { serverNow } from '../utils/time.js';
import { expireConversation, insertSystem, loadMembers, loadRules, requireMember, upsertRule } from './conversationStore.js';
import { mapMessage, type MessageRow } from './mappers.js';
import { notify } from './notifications.js';
import { getProfiles } from './profiles.js';
import { assertNotBlocked } from './safety.js';
import { resolveExecution } from './shortcuts.js';

export interface SendInput {
  body?: string;
  kind?: 'text' | 'gif' | 'sticker';
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

function safeHttps(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function sanitizeMetadata(kind: string, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  if (kind === 'gif' || kind === 'sticker') {
    const gifUrl = safeHttps(source.gifUrl);
    const previewUrl = safeHttps(source.previewUrl);
    if (gifUrl) next.gifUrl = gifUrl;
    if (previewUrl) next.previewUrl = previewUrl;
    if (typeof source.title === 'string') next.title = source.title.slice(0, 80);
    if (typeof source.mockId === 'string') next.mockId = source.mockId.slice(0, 40);
    if (typeof source.label === 'string') next.label = source.label.slice(0, 8);
  }
  return next;
}

async function reactionsFor(messageIds: string[]) {
  const grouped = new Map<string, { emoji: string; userId: string }[]>();
  if (!messageIds.length) return grouped;
  const { data, error } = await db().from('message_reactions').select('message_id, emoji, user_id').in('message_id', messageIds);
  if (error) throwDb(error, 'reactions');
  for (const row of data ?? []) {
    const list = grouped.get(row.message_id as string) ?? [];
    list.push({ emoji: row.emoji as string, userId: row.user_id as string });
    grouped.set(row.message_id as string, list);
  }
  return grouped;
}

async function lastOwnMessageAt(conversationId: string, userId: string): Promise<Date | null> {
  const { data, error } = await db()
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conversationId)
    .eq('sender_id', userId)
    .neq('kind', 'system')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throwDb(error, 'last message');
  return data?.created_at ? new Date(data.created_at as string) : null;
}

async function applyStreak(conversationId: string, memberIds: string[], senderId: string) {
  const { data, error } = await db().from('streaks').select('*').eq('conversation_id', conversationId).maybeSingle();
  if (error) throwDb(error, 'load streak');
  const current: StreakState = {
    currentCount: (data?.current_count as number) ?? 0,
    longestCount: (data?.longest_count as number) ?? 0,
    lastCompletedOn: (data?.last_completed_on as string | null) ?? null,
    activity: ((data?.activity ?? {}) as Record<string, string>),
  };
  const update = recordMessage(current, memberIds, senderId, new Date());
  const { error: saveError } = await db().from('streaks').upsert({
    conversation_id: conversationId,
    current_count: update.state.currentCount,
    longest_count: update.state.longestCount,
    last_completed_on: update.state.lastCompletedOn,
    activity: update.state.activity,
  });
  if (saveError) throwDb(saveError, 'save streak');
  const view = viewStreak(update.state, memberIds, new Date());
  return { ...view, increased: update.increased };
}

function emitMessage(memberIds: string[], message: ReturnType<typeof mapMessage>, streak?: { count: number; increased: boolean }) {
  emitToUsers(memberIds, SocketEvents.MessageNew, streak ? { ...message, streak } : message);
  emitToUsers(memberIds, SocketEvents.ConversationUpdated, { conversationId: message.conversationId });
}

export async function listMessages(userId: string, conversationId: string, before?: string) {
  const { conversation } = await requireMember(conversationId, userId);
  if (conversation.status !== 'active') return { serverNow: serverNow(), messages: [] };
  if (conversation.expires_at && new Date(conversation.expires_at) <= new Date()) {
    await expireConversation(conversationId);
    return { serverNow: serverNow(), messages: [] };
  }
  await db()
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)
    .lt('expires_at', new Date().toISOString());

  let query = db()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(80);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throwDb(error, 'list messages');
  const rows = ((data ?? []) as MessageRow[]).slice().reverse();
  const reactions = await reactionsFor(rows.map((row) => row.id));
  return {
    serverNow: serverNow(),
    messages: rows.map((row) => mapMessage(row, reactions.get(row.id) ?? [])),
  };
}

export async function sendMessage(userId: string, conversationId: string, input: SendInput) {
  if (!rateLimit(`msg:${userId}`, 30, 10_000)) throw new AppError(429, 'Slow down a little.');
  const { conversation, members, me } = await requireMember(conversationId, userId);
  const access = authorizeSend({
    isMember: true,
    hasLeft: Boolean(me.left_at),
    status: conversation.status,
  });
  if (!access.ok) throw new AppError(403, access.message);
  if (conversation.expires_at && new Date(conversation.expires_at) <= new Date()) {
    await expireConversation(conversationId);
    throw new AppError(410, '💨 Poof. This chat is gone.');
  }

  const memberIds = members.map((member) => member.user_id);
  for (const otherId of memberIds) {
    if (otherId !== userId) await assertNotBlocked(userId, otherId);
  }
  const rules = await loadRules(conversationId);
  let kind = input.kind ?? 'text';
  let body = (input.body ?? '').trim();
  let metadata = sanitizeMetadata(kind, input.metadata);

  if (kind === 'text') {
    const trigger = parseTrigger(body);
    if (trigger) {
      const execution = await resolveExecution(userId, conversationId, trigger);
      if (!execution) throw new AppError(400, "That shortcut isn't yours. Yet.");
      if ('error' in execution) throw new AppError(400, execution.error);
      if (execution.kind === 'action') {
        return runAction(execution.action, { userId, conversationId, memberIds, rules });
      }
      body = execution.body;
    }
  }

  if (!body) {
    body = kind === 'gif' ? 'GIF' : kind === 'sticker' ? (metadata.label as string) || '✨' : '';
  }
  if (!body) throw new AppError(400, 'Say something first.');
  if (body.length > 2000) throw new AppError(400, 'That message is a bit long.');

  const gate = validateMessage(rules, {
    now: new Date(),
    messagesSent: conversation.messages_sent,
    lastOwnMessageAt: await lastOwnMessageAt(conversationId, userId),
    conversationExpiresAt: conversation.expires_at ? new Date(conversation.expires_at) : null,
    conversationStatus: conversation.status,
  });
  if (!gate.ok) throw new AppError(400, gate.message);

  if (input.replyToId) {
    const { data: reply, error } = await db()
      .from('messages')
      .select('*')
      .eq('id', input.replyToId)
      .eq('conversation_id', conversationId)
      .maybeSingle();
    if (error) throwDb(error, 'reply');
    if (reply) {
      const profiles = await getProfiles([reply.sender_id].filter(Boolean) as string[]);
      metadata = {
        ...metadata,
        reply: {
          id: reply.id as string,
          body: String(reply.body).slice(0, 140),
          senderName: profiles.get(reply.sender_id as string)?.display_name ?? 'Someone',
        },
      };
    }
  }

  const expiresAt = calculateMessageExpiration(rules, new Date());
  const { data, error } = await db()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body,
      kind,
      reply_to_id: input.replyToId ?? null,
      metadata,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select('*')
    .single();
  if (error) throwDb(error, 'send message');
  if (!data) throw new AppError(500, 'Toodle tripped. Try again.');

  const nextCount = conversation.messages_sent + 1;
  const { error: countError } = await db()
    .from('conversations')
    .update({ messages_sent: nextCount })
    .eq('id', conversationId);
  if (countError) throwDb(countError, 'message count');

  const streak = await applyStreak(conversationId, memberIds, userId);
  const message = mapMessage(data as MessageRow);
  emitMessage(memberIds, message, { count: streak.count, increased: streak.increased });

  const remaining = remainingMessages(rules, nextCount);
  if (remaining === 0) {
    await insertSystem(conversationId, '💨 This conversation ran out of messages.');
  }

  const others = memberIds.filter((id) => id !== userId);
  await Promise.all(others.filter((id) => !isUserInConversation(id, conversationId)).map(async (id) => {
    const profiles = await getProfiles([userId]);
    const me = profiles.get(userId);
    return notify({
      userId: id,
      type: 'message',
      title: 'New message',
      body: `💬 @${me?.username ?? 'someone'} sent you something.`,
      payload: { conversationId, messageId: message.id },
    });
  }));

  return {
    type: 'message' as const,
    message,
    streak,
    serverNow: serverNow(),
  };
}

async function runAction(
  action: ActionType,
  ctx: {
    userId: string;
    conversationId: string;
    memberIds: string[];
    rules: Awaited<ReturnType<typeof loadRules>>;
  },
) {
  if (action === 'ghost') {
    const enabled = !isRuleEnabled(ctx.rules, 'ghost_mode');
    await upsertRule(ctx.conversationId, ctx.userId, 'ghost_mode', enabled, {});
    emitToUsers(ctx.memberIds, SocketEvents.ConversationUpdated, { conversationId: ctx.conversationId });
    await insertSystem(ctx.conversationId, enabled
      ? '👻 Ghost mode is on. This chat disappears when you both leave.'
      : 'Ghost mode is off.');
    return { type: 'action' as const, action, ghostEnabled: enabled, serverNow: serverNow() };
  }

  if (action === 'streak') {
    const { data } = await db().from('streaks').select('*').eq('conversation_id', ctx.conversationId).maybeSingle();
    const view = viewStreak({
      currentCount: (data?.current_count as number) ?? 0,
      longestCount: (data?.longest_count as number) ?? 0,
      lastCompletedOn: (data?.last_completed_on as string | null) ?? null,
      activity: ((data?.activity ?? {}) as Record<string, string>),
    }, ctx.memberIds, new Date());
    return { type: 'action' as const, action, streak: view, serverNow: serverNow() };
  }

  return { type: 'action' as const, action, serverNow: serverNow() };
}

export async function deleteMessage(userId: string, messageId: string) {
  const { data, error } = await db().from('messages').select('*').eq('id', messageId).maybeSingle();
  if (error) throwDb(error, 'load message');
  if (!data) throw new AppError(404, 'That message is already gone.');
  await requireMember(data.conversation_id as string, userId);
  if (!canDeleteMessage(data.sender_id as string | null, userId)) {
    throw new AppError(403, 'You can only delete your own messages.');
  }
  const { error: deleteError } = await db().from('messages').delete().eq('id', messageId);
  if (deleteError) throwDb(deleteError, 'delete message');
  const members = await loadMembers(data.conversation_id as string);
  emitToUsers(members.map((member) => member.user_id), SocketEvents.MessageDelete, {
    conversationId: data.conversation_id,
    messageId,
  });
  return { ok: true };
}

export async function reactToMessage(userId: string, messageId: string, emoji: string) {
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    throw new AppError(400, 'That reaction is not on the list.');
  }
  const { data, error } = await db().from('messages').select('id, conversation_id').eq('id', messageId).maybeSingle();
  if (error) throwDb(error, 'load message');
  if (!data) throw new AppError(404, 'That message is already gone.');
  await requireMember(data.conversation_id as string, userId);
  const existing = await db()
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (existing.error) throwDb(existing.error, 'reaction lookup');
  if (existing.data) {
    const { error: deleteError } = await db().from('message_reactions').delete().eq('id', existing.data.id);
    if (deleteError) throwDb(deleteError, 'remove reaction');
  } else {
    const { error: insertError } = await db().from('message_reactions').insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    });
    if (insertError) throwDb(insertError, 'add reaction');
  }
  const reactions = await reactionsFor([messageId]);
  const members = await loadMembers(data.conversation_id as string);
  const payload = {
    conversationId: data.conversation_id,
    messageId,
    reactions: reactions.get(messageId) ?? [],
  };
  emitToUsers(members.map((member) => member.user_id), SocketEvents.MessageReaction, payload);
  return payload;
}

export async function markRead(userId: string, conversationId: string) {
  await requireMember(conversationId, userId);
  const lastReadAt = new Date().toISOString();
  const { error } = await db()
    .from('conversation_members')
    .update({ last_read_at: lastReadAt })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throwDb(error, 'mark read');
  const members = await loadMembers(conversationId);
  emitToUsers(members.map((member) => member.user_id), SocketEvents.MessageRead, {
    conversationId,
    userId,
    lastReadAt,
  });
  return { lastReadAt };
}
