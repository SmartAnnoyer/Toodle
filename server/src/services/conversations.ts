import { SocketEvents } from '../constants/events.js';
import { canResolveRenewal } from '../engines/access.js';
import {
  RULE_TYPES,
  applyRenewal,
  canRenew,
  isRuleEnabled,
  isRuleType,
  messageLimit,
  remainingMessages,
  renewalRequiresApproval,
  sanitizeRenewDuration,
  sanitizeRuleConfig,
  shouldVanishOnExit,
} from '../engines/ruleEngine.js';
import { viewStreak, type StreakState } from '../engines/streakEngine.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { emitToUsers } from '../socket/hub.js';
import { serverNow } from '../utils/time.js';
import {
  expireConversation,
  findActiveConversation,
  hasAcceptedConnection,
  insertSystem,
  loadConversation,
  loadMembers,
  loadRules,
  presentRules,
  requireMember,
  upsertRule,
  type ConversationRow,
} from './conversationStore.js';
import { humanDuration, toPublicProfile, type ProfileRow } from './mappers.js';
import { notify } from './notifications.js';
import { getProfiles, presenceMap } from './profiles.js';
import { assertNotBlocked } from './safety.js';

interface InboxRow {
  conversation_id: string;
  status: 'active' | 'expired' | 'vanished';
  expires_at: string | null;
  messages_sent: number;
  updated_at: string;
  last_message_id: string | null;
  last_body: string | null;
  last_kind: string | null;
  last_sender: string | null;
  last_created: string | null;
  unread_count: number;
  last_read_at: string | null;
  left_at: string | null;
}

async function otherMemberMap(conversationIds: string[], userId: string) {
  const users = new Map<string, string>();
  const reads = new Map<string, string | null>();
  if (!conversationIds.length) return { users, reads };
  const { data, error } = await db()
    .from('conversation_members')
    .select('conversation_id, user_id, last_read_at')
    .in('conversation_id', conversationIds)
    .neq('user_id', userId);
  if (error) throwDb(error, 'other members');
  for (const row of data ?? []) {
    users.set(row.conversation_id as string, row.user_id as string);
    reads.set(row.conversation_id as string, row.last_read_at as string | null);
  }
  return { users, reads };
}

export async function listConversations(userId: string) {
  const purged = await db().rpc('purge_expired_messages');
  if (purged.error) throwDb(purged.error, 'purge messages');
  const { data, error } = await db().rpc('conversation_inbox', { uid: userId });
  if (error) throwDb(error, 'inbox');
  const rows = (data ?? []) as InboxRow[];
  const ids = rows.map((row) => row.conversation_id);
  const others = await otherMemberMap(ids, userId);
  const otherIds = [...others.users.values()];
  const [profileMap, presence, streaks, rules, renewals] = await Promise.all([
    getProfiles(otherIds),
    presenceMap(otherIds),
    loadStreakRows(ids),
    loadEnabledRules(ids),
    loadPendingRenewals(ids),
  ]);

  const now = new Date();
  const conversations = rows.flatMap((row) => {
    const otherId = others.users.get(row.conversation_id);
    const profile = otherId ? profileMap.get(otherId) : undefined;
    if (!otherId || !profile) return [];
    const streak = streaks.get(row.conversation_id);
    const view = viewStreak(streak ?? emptyStreak(), [userId, otherId], now);
    const convoRules = rules.get(row.conversation_id) ?? [];
    const renewal = renewals.get(row.conversation_id) ?? null;
    return [{
      id: row.conversation_id,
      status: row.status,
      expiresAt: row.expires_at,
      messagesSent: row.messages_sent,
      remainingMessages: remainingMessages(convoRules, row.messages_sent),
      messageLimit: messageLimit(convoRules),
      streakCount: view.count,
      streakAtRisk: view.atRisk,
      streakExpiresInSeconds: view.expiresInSeconds,
      streakLost: view.lost,
      unreadCount: row.unread_count ?? 0,
      youLeft: Boolean(row.left_at),
      ghostMode: isRuleEnabled(convoRules, 'ghost_mode'),
      otherUser: toPublicProfile(profile, presence.get(otherId) ?? false),
      otherLastReadAt: others.reads.get(row.conversation_id) ?? null,
      lastMessage: row.last_message_id ? {
        id: row.last_message_id,
        body: row.last_body ?? '',
        kind: row.last_kind ?? 'text',
        senderId: row.last_sender,
        createdAt: row.last_created ?? row.updated_at,
      } : null,
      pendingRenewal: renewal,
      updatedAt: row.updated_at,
    }];
  });

  conversations.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });

  return { serverNow: serverNow(), conversations };
}

function emptyStreak(): StreakState {
  return { currentCount: 0, longestCount: 0, lastCompletedOn: null, activity: {} };
}

async function loadStreakRows(ids: string[]) {
  const map = new Map<string, StreakState>();
  if (!ids.length) return map;
  const { data, error } = await db().from('streaks').select('*').in('conversation_id', ids);
  if (error) throwDb(error, 'inbox streaks');
  for (const row of data ?? []) {
    map.set(row.conversation_id as string, {
      currentCount: row.current_count as number,
      longestCount: row.longest_count as number,
      lastCompletedOn: row.last_completed_on as string | null,
      activity: (row.activity ?? {}) as Record<string, string>,
    });
  }
  return map;
}

async function loadEnabledRules(ids: string[]) {
  const map = new Map<string, ReturnType<typeof presentRules>>();
  if (!ids.length) return map;
  const { data, error } = await db().from('conversation_rules').select('*').in('conversation_id', ids);
  if (error) throwDb(error, 'inbox rules');
  const grouped = new Map<string, { ruleType: string; enabled: boolean; configuration: Record<string, unknown> }[]>();
  for (const row of data ?? []) {
    const list = grouped.get(row.conversation_id as string) ?? [];
    list.push({
      ruleType: row.rule_type as string,
      enabled: Boolean(row.enabled),
      configuration: (row.configuration ?? {}) as Record<string, unknown>,
    });
    grouped.set(row.conversation_id as string, list);
  }
  for (const [id, list] of grouped) {
    map.set(id, presentRules(list.filter((rule): rule is { ruleType: import('../engines/ruleEngine.js').RuleType; enabled: boolean; configuration: Record<string, unknown> } => isRuleType(rule.ruleType))));
  }
  return map;
}

async function loadPendingRenewals(ids: string[]) {
  const map = new Map<string, { id: string; requestedBy: string; durationSeconds: number; status: string }>();
  if (!ids.length) return map;
  const { data, error } = await db()
    .from('conversation_renewals')
    .select('*')
    .in('conversation_id', ids)
    .eq('status', 'pending');
  if (error) throwDb(error, 'renewals');
  for (const row of data ?? []) {
    map.set(row.conversation_id as string, {
      id: row.id as string,
      requestedBy: row.requested_by as string,
      durationSeconds: row.duration_seconds as number,
      status: row.status as string,
    });
  }
  return map;
}

export async function getConversation(userId: string, conversationId: string) {
  const { conversation, members, me } = await requireMember(conversationId, userId);
  if (conversation.status === 'active' && conversation.expires_at && new Date(conversation.expires_at) <= new Date()) {
    await expireConversation(conversationId);
    conversation.status = 'expired';
  }
  const other = members.find((member) => member.user_id !== userId);
  if (!other) throw new AppError(404, 'This chat is missing someone.');
  const profiles = await getProfiles([other.user_id]);
  const profile = profiles.get(other.user_id);
  if (!profile) throw new AppError(404, 'That person left Toodle.');
  const presence = await presenceMap([other.user_id]);
  const rules = presentRules(await loadRules(conversationId));
  const engineRules = rules.map((rule) => ({
    ruleType: rule.ruleType,
    enabled: rule.enabled,
    configuration: rule.configuration,
  }));
  const { data: streakRow } = await db().from('streaks').select('*').eq('conversation_id', conversationId).maybeSingle();
  const view = viewStreak(streakRow ? {
    currentCount: streakRow.current_count as number,
    longestCount: streakRow.longest_count as number,
    lastCompletedOn: streakRow.last_completed_on as string | null,
    activity: (streakRow.activity ?? {}) as Record<string, string>,
  } : emptyStreak(), members.map((member) => member.user_id), new Date());
  const { data: renewal } = await db()
    .from('conversation_renewals')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .maybeSingle();

  return {
    id: conversation.id,
    status: conversation.status,
    expiresAt: conversation.status === 'expired' ? conversation.expires_at : (await loadConversation(conversationId)).expires_at,
    messagesSent: conversation.messages_sent,
    remainingMessages: remainingMessages(engineRules, conversation.messages_sent),
    messageLimit: messageLimit(engineRules),
    streakCount: view.count,
    streakAtRisk: view.atRisk,
    streakExpiresInSeconds: view.expiresInSeconds,
    streakLost: view.lost,
    youLeft: Boolean(me.left_at),
    ghostMode: isRuleEnabled(engineRules, 'ghost_mode'),
    otherUser: toPublicProfile(profile, presence.get(other.user_id) ?? false),
    otherLastReadAt: other.last_read_at,
    myLastReadAt: me.last_read_at,
    lastMessage: null,
    pendingRenewal: renewal ? {
      id: renewal.id as string,
      requestedBy: renewal.requested_by as string,
      durationSeconds: renewal.duration_seconds as number,
      status: renewal.status as string,
    } : null,
    rules,
    updatedAt: conversation.updated_at,
    serverNow: serverNow(),
  };
}

export async function createConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new AppError(400, 'Pick someone else.');
  await assertNotBlocked(userId, otherUserId);
  const connected = await hasAcceptedConnection(userId, otherUserId);
  if (!connected) throw new AppError(403, 'Accept a ping before starting a chat.');
  const existing = await findActiveConversation(userId, otherUserId);
  if (existing) return getConversation(userId, existing);

  const { data, error } = await db()
    .from('conversations')
    .insert({ created_by: userId, status: 'active' })
    .select('*')
    .single();
  if (error) throwDb(error, 'create conversation');
  const conversation = data as ConversationRow;
  const { error: memberError } = await db().from('conversation_members').insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);
  if (memberError) throwDb(memberError, 'add members');
  const { error: streakError } = await db().from('streaks').insert({ conversation_id: conversation.id });
  if (streakError) throwDb(streakError, 'create streak');
  const { error: ruleError } = await db().from('conversation_rules').insert(
    RULE_TYPES.map((ruleType) => ({
      conversation_id: conversation.id,
      rule_type: ruleType,
      enabled: false,
      configuration: sanitizeRuleConfig(ruleType, {}),
      created_by: userId,
    })),
  );
  if (ruleError) throwDb(ruleError, 'create rules');

  emitToUsers([userId, otherUserId], SocketEvents.ConversationUpdated, { conversationId: conversation.id });
  return getConversation(userId, conversation.id);
}

export async function updateConversationRule(
  userId: string,
  conversationId: string,
  ruleType: string,
  enabled: boolean,
  configuration: Record<string, unknown>,
) {
  await requireMember(conversationId, userId);
  if (!isRuleType(ruleType)) throw new AppError(400, 'That rule does not exist.');
  const rules = await upsertRule(conversationId, userId, ruleType, enabled, configuration);
  const members = await loadMembers(conversationId);
  emitToUsers(members.map((member) => member.user_id), SocketEvents.ConversationUpdated, { conversationId });
  return getConversation(userId, conversationId).then((detail) => ({ ...detail, rules }));
}

export async function requestRenewal(userId: string, conversationId: string, durationSeconds: number) {
  const { conversation, members } = await requireMember(conversationId, userId);
  if (conversation.status !== 'active') throw new AppError(410, '💨 Poof. This chat is gone.');
  if (conversation.expires_at && new Date(conversation.expires_at) <= new Date()) {
    await expireConversation(conversationId);
    throw new AppError(410, '💨 Poof. This chat is gone.');
  }
  const rules = await loadRules(conversationId);
  const gate = canRenew(rules);
  if (!gate.ok) throw new AppError(400, gate.message);
  const duration = sanitizeRenewDuration(durationSeconds);
  const profiles = await getProfiles([userId]);
  const me = profiles.get(userId) as ProfileRow;
  const others = members.filter((member) => member.user_id !== userId).map((member) => member.user_id);

  if (!renewalRequiresApproval(rules)) {
    return applyAcceptedRenewal({
      conversation,
      duration,
      requestedBy: userId,
      actorName: me.display_name,
      memberIds: members.map((member) => member.user_id),
    });
  }

  const pending = await db()
    .from('conversation_renewals')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending.error) throwDb(pending.error, 'pending renewal');
  if (pending.data) throw new AppError(409, 'A renewal is already waiting.');

  const { data, error } = await db()
    .from('conversation_renewals')
    .insert({
      conversation_id: conversationId,
      requested_by: userId,
      duration_seconds: duration,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throwDb(error, 'create renewal');

  const payload = {
    id: data.id as string,
    conversationId,
    requestedBy: userId,
    durationSeconds: duration,
    status: 'pending',
  };
  emitToUsers(members.map((member) => member.user_id), SocketEvents.RenewRequest, payload);
  await Promise.all(others.map((otherId) => notify({
    userId: otherId,
    type: 'renewal',
    title: 'Renew?',
    body: `♻️ ${me.display_name} wants to renew the conversation for ${humanDuration(duration)}.`,
    payload: { conversationId, renewalId: data.id },
  })));
  return { applied: false, renewal: payload, serverNow: serverNow() };
}

async function applyAcceptedRenewal(input: {
  conversation: ConversationRow;
  duration: number;
  requestedBy: string;
  actorName: string;
  memberIds: string[];
  renewalId?: string;
}) {
  const expiresAt = applyRenewal(
    input.conversation.expires_at ? new Date(input.conversation.expires_at) : null,
    input.duration,
    new Date(),
  );
  const { error } = await db()
    .from('conversations')
    .update({ expires_at: expiresAt.toISOString(), status: 'active' })
    .eq('id', input.conversation.id);
  if (error) throwDb(error, 'extend conversation');

  if (input.renewalId) {
    await db().from('conversation_renewals').update({
      status: 'accepted',
      resolved_at: new Date().toISOString(),
    }).eq('id', input.renewalId);
  } else {
    await db().from('conversation_renewals').insert({
      conversation_id: input.conversation.id,
      requested_by: input.requestedBy,
      duration_seconds: input.duration,
      status: 'accepted',
      resolved_at: new Date().toISOString(),
    });
  }

  await insertSystem(input.conversation.id, `♻️ Renewed for ${humanDuration(input.duration)}.`);
  emitToUsers(input.memberIds, SocketEvents.RenewAccepted, {
    conversationId: input.conversation.id,
    expiresAt: expiresAt.toISOString(),
    durationSeconds: input.duration,
  });
  emitToUsers(input.memberIds, SocketEvents.ConversationUpdated, { conversationId: input.conversation.id });
  return { applied: true, expiresAt: expiresAt.toISOString(), serverNow: serverNow() };
}

export async function respondToRenewal(userId: string, renewalId: string, accept: boolean) {
  const { data, error } = await db().from('conversation_renewals').select('*').eq('id', renewalId).maybeSingle();
  if (error) throwDb(error, 'load renewal');
  if (!data) throw new AppError(404, 'That renewal is gone.');
  await requireMember(data.conversation_id as string, userId);
  const decision = canResolveRenewal({
    requestedBy: data.requested_by as string,
    actorId: userId,
    status: data.status as string,
  });
  if (!decision.ok) throw new AppError(403, decision.message);

  const members = await loadMembers(data.conversation_id as string);
  const memberIds = members.map((member) => member.user_id);
  if (!accept) {
    await db().from('conversation_renewals').update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
    }).eq('id', renewalId);
    emitToUsers(memberIds, SocketEvents.RenewRejected, { conversationId: data.conversation_id, renewalId });
    emitToUsers(memberIds, SocketEvents.ConversationUpdated, { conversationId: data.conversation_id });
    return { applied: false, serverNow: serverNow() };
  }

  const conversation = await loadConversation(data.conversation_id as string);
  const profiles = await getProfiles([data.requested_by as string]);
  return applyAcceptedRenewal({
    conversation,
    duration: data.duration_seconds as number,
    requestedBy: data.requested_by as string,
    actorName: profiles.get(data.requested_by as string)?.display_name ?? 'Someone',
    memberIds,
    renewalId,
  });
}

export async function leaveConversation(userId: string, conversationId: string) {
  const { members } = await requireMember(conversationId, userId);
  const leftAt = new Date().toISOString();
  const { error } = await db()
    .from('conversation_members')
    .update({ left_at: leftAt })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throwDb(error, 'leave');
  const nextMembers = members.map((member) => member.user_id === userId ? { ...member, left_at: leftAt } : member);
  const rules = await loadRules(conversationId);
  if (shouldVanishOnExit(rules, nextMembers.map((member) => member.left_at ? new Date(member.left_at) : null))) {
    const ids = nextMembers.map((member) => member.user_id);
    emitToUsers(ids, SocketEvents.ConversationExpired, { conversationId, vanished: true });
    const { error: deleteError } = await db().from('conversations').delete().eq('id', conversationId);
    if (deleteError) throwDb(deleteError, 'vanish conversation');
    return { vanished: true };
  }
  emitToUsers(nextMembers.map((member) => member.user_id), SocketEvents.ConversationUpdated, { conversationId });
  return { vanished: false };
}

export async function rejoinConversation(userId: string, conversationId: string) {
  await requireMember(conversationId, userId);
  const { error } = await db()
    .from('conversation_members')
    .update({ left_at: null })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throwDb(error, 'rejoin');
  return { vanished: false };
}
