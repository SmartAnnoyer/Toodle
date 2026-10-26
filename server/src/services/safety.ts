import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';

const REASONS = ['spam', 'harassment', 'hate', 'sexual', 'other'] as const;
export type ReportReason = (typeof REASONS)[number];

export function isReportReason(value: string): value is ReportReason {
  return (REASONS as readonly string[]).includes(value);
}

export async function blockedUserIds(userId: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throwDb(error, 'blocks');
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const blocker = row.blocker_id as string;
    const blocked = row.blocked_id as string;
    ids.add(blocker === userId ? blocked : blocker);
  }
  ids.delete(userId);
  return ids;
}

export async function assertNotBlocked(userId: string, otherUserId: string) {
  if (userId === otherUserId) return;
  const { data, error } = await db()
    .from('blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
    .limit(1);
  if (error) throwDb(error, 'block check');
  if (data && data.length > 0) throw new AppError(403, 'That person is not available.');
}

export async function idsIBlocked(userId: string) {
  const { data, error } = await db().from('blocks').select('blocked_id').eq('blocker_id', userId);
  if (error) throwDb(error, 'blocks');
  return new Set((data ?? []).map((row) => row.blocked_id as string));
}

export async function blockState(userId: string, otherUserId: string) {
  const { data, error } = await db()
    .from('blocks')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`);
  if (error) throwDb(error, 'block check');
  const rows = data ?? [];
  return {
    blocked: rows.length > 0,
    blockedByMe: rows.some((row) => row.blocker_id === userId),
  };
}

export async function listBlocked(userId: string) {
  const { data, error } = await db()
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });
  if (error) throwDb(error, 'blocks');
  const ids = (data ?? []).map((row) => row.blocked_id as string);
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await db()
    .from('profiles')
    .select('id, username, display_name, avatar_emoji')
    .in('id', ids);
  if (profileError) throwDb(profileError, 'blocked profiles');
  const { data: mine, error: mineError } = await db()
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId)
    .is('left_at', null);
  if (mineError) throwDb(mineError, 'blocked chats');
  const conversationIds = (mine ?? []).map((row) => row.conversation_id as string);
  const chatByUser = new Map<string, string>();
  if (conversationIds.length) {
    const { data: others, error: otherError } = await db()
      .from('conversation_members')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds)
      .in('user_id', ids);
    if (otherError) throwDb(otherError, 'blocked chats');
    for (const row of others ?? []) chatByUser.set(row.user_id as string, row.conversation_id as string);
  }
  const byId = new Map((profiles ?? []).map((row) => [row.id as string, row]));
  return ids.flatMap((id) => {
    const profile = byId.get(id);
    if (!profile) return [];
    return [{
      id,
      username: profile.username as string,
      displayName: profile.display_name as string,
      avatarEmoji: (profile.avatar_emoji as string) || '✨',
      conversationId: chatByUser.get(id) ?? null,
    }];
  });
}

export async function unblockUser(userId: string, otherUserId: string) {
  const { error } = await db().from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', otherUserId);
  if (error) throwDb(error, 'unblock');
  return { ok: true };
}

export async function blockUser(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new AppError(400, 'You cannot block yourself.');
  const { error } = await db().from('blocks').upsert(
    { blocker_id: userId, blocked_id: otherUserId },
    { onConflict: 'blocker_id,blocked_id' },
  );
  if (error) throwDb(error, 'block');
  await db()
    .from('friend_requests')
    .delete()
    .eq('from_user_id', userId)
    .eq('to_user_id', otherUserId)
    .eq('status', 'pending');
  await db()
    .from('friend_requests')
    .delete()
    .eq('from_user_id', otherUserId)
    .eq('to_user_id', userId)
    .eq('status', 'pending');
  return { ok: true };
}

export async function reportUser(input: {
  reporterId: string;
  reportedId: string;
  conversationId?: string;
  reason: ReportReason;
  details: string;
}) {
  if (input.reporterId === input.reportedId) throw new AppError(400, 'You cannot report yourself.');
  const details = input.details.trim().slice(0, 500);
  const { error } = await db().from('reports').insert({
    reporter_id: input.reporterId,
    reported_id: input.reportedId,
    conversation_id: input.conversationId ?? null,
    reason: input.reason,
    details,
  });
  if (error) throwDb(error, 'report');
  return { ok: true };
}
