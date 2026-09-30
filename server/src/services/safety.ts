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
