import { SocketEvents } from '../constants/events.js';
import { decideRequestAction } from '../engines/access.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { emitToUsers } from '../socket/hub.js';
import { activeConversationsWith } from './conversationStore.js';
import { notify } from './notifications.js';
import { getProfiles, toPublicProfiles } from './profiles.js';
import { assertNotBlocked, blockedUserIds } from './safety.js';

async function profileOrThrow(userId: string) {
  const profiles = await getProfiles([userId]);
  const profile = profiles.get(userId);
  if (!profile) throw new AppError(404, 'We could not find that profile.');
  return profile;
}

export async function sendRequest(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) throw new AppError(400, 'You cannot ping yourself.');
  await assertNotBlocked(fromUserId, toUserId);
  const [from, to] = await Promise.all([profileOrThrow(fromUserId), profileOrThrow(toUserId)]);
  if (!to.onboarded) throw new AppError(404, 'Nobody with that username is here yet.');

  const reverse = await db()
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', toUserId)
    .eq('to_user_id', fromUserId)
    .maybeSingle();
  if (reverse.error) throwDb(reverse.error, 'reverse request');
  if (reverse.data?.status === 'pending') {
    throw new AppError(409, 'They already pinged you. Check requests.');
  }
  if (reverse.data?.status === 'accepted') {
    throw new AppError(409, 'You are already connected. Start a chat.');
  }

  const existing = await db()
    .from('friend_requests')
    .select('*')
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .maybeSingle();
  if (existing.error) throwDb(existing.error, 'existing request');
  if (existing.data?.status === 'accepted') throw new AppError(409, 'You are already connected. Start a chat.');
  if (existing.data?.status === 'pending') throw new AppError(409, 'You already pinged them.');

  let row = existing.data;
  if (row) {
    const updated = await db()
      .from('friend_requests')
      .update({ status: 'pending' })
      .eq('id', row.id)
      .select('*')
      .single();
    if (updated.error) throwDb(updated.error, 'reopen request');
    row = updated.data;
  } else {
    const inserted = await db()
      .from('friend_requests')
      .insert({ from_user_id: fromUserId, to_user_id: toUserId, status: 'pending' })
      .select('*')
      .single();
    if (inserted.error) throwDb(inserted.error, 'create request');
    row = inserted.data;
  }

  await notify({
    userId: toUserId,
    type: 'request',
    title: 'New ping',
    body: `${from.avatar_emoji} @${from.username} wants to Toodle with you.`,
    payload: { requestId: row.id, fromUserId },
  });
  emitToUsers([toUserId], SocketEvents.ConversationUpdated, { kind: 'request' });

  return { id: row.id as string, status: 'pending' as const };
}

export async function actOnRequest(actorId: string, requestId: string, action: 'accept' | 'ignore') {
  const { data, error } = await db().from('friend_requests').select('*').eq('id', requestId).maybeSingle();
  if (error) throwDb(error, 'load request');
  if (!data) throw new AppError(404, 'That ping is gone.');

  const decision = decideRequestAction({
    action,
    status: data.status as string,
    toUserId: data.to_user_id as string,
    actorId,
  });
  if (!decision.ok) throw new AppError(403, decision.message);

  const { error: updateError } = await db()
    .from('friend_requests')
    .update({ status: decision.status })
    .eq('id', requestId);
  if (updateError) throwDb(updateError, 'update request');

  if (decision.status === 'accepted') {
    await db()
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('from_user_id', data.to_user_id)
      .eq('to_user_id', data.from_user_id)
      .eq('status', 'pending');

    const actor = await profileOrThrow(actorId);
    await notify({
      userId: data.from_user_id as string,
      type: 'request_accepted',
      title: 'Ping accepted',
      body: `${actor.avatar_emoji} @${actor.username} accepted. You can start a chat.`,
      payload: { requestId, userId: actorId },
    });
    emitToUsers([data.from_user_id as string, actorId], SocketEvents.ConversationUpdated, { kind: 'request' });
  }

  return { id: requestId, status: decision.status };
}

export async function listRequests(userId: string) {
  const { data, error } = await db()
    .from('friend_requests')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throwDb(error, 'list requests');

  const rows = data ?? [];
  const otherIds = rows.map((row) => (row.from_user_id === userId ? row.to_user_id : row.from_user_id) as string);
  const [profiles, conversations] = await Promise.all([
    toPublicProfiles([...new Set(otherIds)]),
    activeConversationsWith(userId, [...new Set(otherIds)]),
  ]);

  const mapRow = (row: (typeof rows)[number]) => {
    const otherId = (row.from_user_id === userId ? row.to_user_id : row.from_user_id) as string;
    const user = profiles.get(otherId);
    if (!user) return null;
    return {
      id: row.id as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      direction: row.to_user_id === userId ? 'incoming' as const : 'outgoing' as const,
      user,
      conversationId: conversations.get(otherId) ?? null,
    };
  };

  const blocked = await blockedUserIds(userId);
  const mapped = rows.map(mapRow).filter((row): row is NonNullable<typeof row> => row != null && !blocked.has(row.user.id));
  return {
    incoming: mapped.filter((row) => row.direction === 'incoming' && row.status === 'pending'),
    outgoing: mapped.filter((row) => row.direction === 'outgoing' && row.status === 'pending'),
    accepted: mapped.filter((row) => row.status === 'accepted'),
  };
}

export async function unreadRequestCount(userId: string) {
  const { count, error } = await db()
    .from('friend_requests')
    .select('id', { count: 'exact', head: true })
    .eq('to_user_id', userId)
    .eq('status', 'pending');
  if (error) throwDb(error, 'request count');
  return count ?? 0;
}
