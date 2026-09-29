import { SocketEvents } from '../constants/events.js';
import {
  RULE_CATALOG,
  RULE_TYPES,
  isRuleType,
  sanitizeRuleConfig,
  type ConversationRule,
  type RuleType,
} from '../engines/ruleEngine.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { emitToUsers } from '../socket/hub.js';
import { mapMessage, type MessageRow } from './mappers.js';
import { notify } from './notifications.js';

export interface ConversationRow {
  id: string;
  created_by: string;
  status: 'active' | 'expired' | 'vanished';
  expires_at: string | null;
  messages_sent: number;
  created_at: string;
  updated_at: string;
}

export interface MemberRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  left_at: string | null;
  joined_at: string;
}

export async function loadConversation(conversationId: string): Promise<ConversationRow> {
  const { data, error } = await db().from('conversations').select('*').eq('id', conversationId).maybeSingle();
  if (error) throwDb(error, 'load conversation');
  if (!data) throw new AppError(404, '💨 Poof. That conversation is gone.');
  return data as ConversationRow;
}

export async function loadMembers(conversationId: string): Promise<MemberRow[]> {
  const { data, error } = await db().from('conversation_members').select('*').eq('conversation_id', conversationId);
  if (error) throwDb(error, 'members');
  return (data ?? []) as MemberRow[];
}

export async function loadRules(conversationId: string): Promise<ConversationRule[]> {
  const { data, error } = await db().from('conversation_rules').select('*').eq('conversation_id', conversationId);
  if (error) throwDb(error, 'rules');
  return (data ?? [])
    .map((row) => ({
      ruleType: row.rule_type as string,
      enabled: Boolean(row.enabled),
      configuration: (row.configuration ?? {}) as Record<string, unknown>,
    }))
    .filter((rule): rule is ConversationRule => isRuleType(rule.ruleType));
}

export function presentRules(rules: ConversationRule[]) {
  return RULE_TYPES.map((type) => {
    const found = rules.find((rule) => rule.ruleType === type);
    return {
      ruleType: type,
      title: RULE_CATALOG[type].title,
      explanation: RULE_CATALOG[type].explanation,
      enabled: found?.enabled ?? false,
      configuration: found?.configuration ?? sanitizeRuleConfig(type, {}),
    };
  });
}

export async function requireMember(conversationId: string, userId: string) {
  const conversation = await loadConversation(conversationId);
  const members = await loadMembers(conversationId);
  const me = members.find((member) => member.user_id === userId);
  if (!me) throw new AppError(403, 'This chat is not yours.');
  return { conversation, members, me };
}

export async function activeConversationsWith(userId: string, otherIds: string[]) {
  const result = new Map<string, string>();
  if (!otherIds.length) return result;
  const { data: mine, error } = await db().from('conversation_members').select('conversation_id').eq('user_id', userId);
  if (error) throwDb(error, 'my conversations');
  const myIds = (mine ?? []).map((row) => row.conversation_id as string);
  if (!myIds.length) return result;
  const { data: others, error: otherError } = await db()
    .from('conversation_members')
    .select('conversation_id, user_id')
    .in('conversation_id', myIds)
    .in('user_id', otherIds);
  if (otherError) throwDb(otherError, 'other conversations');
  const convoIds = [...new Set((others ?? []).map((row) => row.conversation_id as string))];
  if (!convoIds.length) return result;
  const { data: active, error: activeError } = await db()
    .from('conversations')
    .select('id')
    .in('id', convoIds)
    .eq('status', 'active');
  if (activeError) throwDb(activeError, 'active conversations');
  const activeIds = new Set((active ?? []).map((row) => row.id as string));
  for (const row of others ?? []) {
    if (activeIds.has(row.conversation_id as string)) {
      result.set(row.user_id as string, row.conversation_id as string);
    }
  }
  return result;
}

export async function findActiveConversation(a: string, b: string): Promise<string | null> {
  const map = await activeConversationsWith(a, [b]);
  return map.get(b) ?? null;
}

export async function hasAcceptedConnection(a: string, b: string): Promise<boolean> {
  const first = await db()
    .from('friend_requests')
    .select('id')
    .eq('from_user_id', a)
    .eq('to_user_id', b)
    .eq('status', 'accepted')
    .maybeSingle();
  if (first.error) throwDb(first.error, 'connection');
  if (first.data) return true;
  const second = await db()
    .from('friend_requests')
    .select('id')
    .eq('from_user_id', b)
    .eq('to_user_id', a)
    .eq('status', 'accepted')
    .maybeSingle();
  if (second.error) throwDb(second.error, 'connection');
  return Boolean(second.data);
}

export async function insertSystem(conversationId: string, body: string) {
  const { data, error } = await db()
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: null,
      body,
      kind: 'system',
      metadata: {},
    })
    .select('*')
    .single();
  if (error) throwDb(error, 'system message');
  if (!data) throw new AppError(500, 'Toodle tripped. Try again.');
  const message = mapMessage(data as MessageRow);
  const members = await loadMembers(conversationId);
  emitToUsers(members.map((member) => member.user_id), SocketEvents.MessageNew, message);
  return message;
}

export async function expireConversation(conversationId: string): Promise<boolean> {
  const members = await loadMembers(conversationId);
  const { data, error } = await db().rpc('expire_conversation', { cid: conversationId });
  if (error) throwDb(error, 'expire conversation');
  if (data !== true) return false;
  const ids = members.map((member) => member.user_id);
  emitToUsers(ids, SocketEvents.ConversationExpired, { conversationId });
  emitToUsers(ids, SocketEvents.ConversationUpdated, { conversationId });
  await Promise.all(ids.map((userId) => notify({
    userId,
    type: 'conversation_expired',
    title: 'Poof',
    body: '💨 That conversation vanished.',
    payload: { conversationId },
  })));
  return true;
}

export async function upsertRule(
  conversationId: string,
  userId: string,
  ruleType: RuleType,
  enabled: boolean,
  configuration: Record<string, unknown>,
) {
  const { data: existing, error: existingError } = await db()
    .from('conversation_rules')
    .select('configuration')
    .eq('conversation_id', conversationId)
    .eq('rule_type', ruleType)
    .maybeSingle();
  if (existingError) throwDb(existingError, 'existing rule');

  let nextConfig = sanitizeRuleConfig(ruleType, configuration);
  if (ruleType === 'clean_slate') {
    const previous = (existing?.configuration ?? {}) as Record<string, unknown>;
    nextConfig = {
      lastClearedOn: typeof previous.lastClearedOn === 'string' ? previous.lastClearedOn : null,
    };
  }

  const { error } = await db().from('conversation_rules').upsert({
    conversation_id: conversationId,
    rule_type: ruleType,
    enabled,
    configuration: nextConfig,
    created_by: userId,
  }, { onConflict: 'conversation_id,rule_type' });
  if (error) throwDb(error, 'save rule');

  if (ruleType === 'conversation_expiration') {
    const expiresAt = enabled
      ? new Date(Date.now() + (nextConfig.durationSeconds as number) * 1000).toISOString()
      : null;
    const { error: updateError } = await db()
      .from('conversations')
      .update({ expires_at: expiresAt })
      .eq('id', conversationId);
    if (updateError) throwDb(updateError, 'conversation timer');
  }

  return presentRules(await loadRules(conversationId));
}
