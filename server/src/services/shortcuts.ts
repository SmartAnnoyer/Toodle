import { SocketEvents } from '../constants/events.js';
import {
  executeShortcut,
  pickShortcut,
  validateTrigger,
  type ShareRecord,
  type ShortcutRecord,
  type ShortcutType,
  type ShortcutVisibility,
} from '../engines/shortcutEngine.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { emitToUsers } from '../socket/hub.js';
import { requireMember } from './conversationStore.js';
import { notify } from './notifications.js';
import { getProfiles, toPublicProfiles } from './profiles.js';

interface ShortcutRow {
  id: string;
  owner_id: string;
  name: string;
  trigger: string;
  type: ShortcutType;
  content: string;
  action_type: string | null;
  visibility: ShortcutVisibility;
  conversation_id: string | null;
  created_at: string;
}

function toRecord(row: ShortcutRow): ShortcutRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    trigger: row.trigger,
    type: row.type,
    content: row.content,
    actionType: row.action_type,
    visibility: row.visibility,
    conversationId: row.conversation_id,
  };
}

export function mapShortcut(row: ShortcutRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    trigger: row.trigger,
    type: row.type,
    content: row.content,
    actionType: row.action_type,
    visibility: row.visibility,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
  };
}

export async function resolveExecution(userId: string, conversationId: string, trigger: string) {
  await requireMember(conversationId, userId);
  const [owned, conversationScoped, shares] = await Promise.all([
    db().from('shortcuts').select('*').eq('trigger', trigger).eq('owner_id', userId),
    db().from('shortcuts').select('*').eq('trigger', trigger).eq('visibility', 'conversation').eq('conversation_id', conversationId),
    db().from('shortcut_shares').select('shortcut_id, recipient_id, status, shortcuts(*)').eq('recipient_id', userId).in('status', ['ACCEPTED', 'REVOKED', 'PENDING']),
  ]);
  if (owned.error) throwDb(owned.error, 'owned shortcuts');
  if (conversationScoped.error) throwDb(conversationScoped.error, 'conversation shortcuts');
  if (shares.error) throwDb(shares.error, 'shortcut shares');

  const byId = new Map<string, ShortcutRow>();
  for (const row of (owned.data ?? []) as ShortcutRow[]) byId.set(row.id, row);
  for (const row of (conversationScoped.data ?? []) as ShortcutRow[]) byId.set(row.id, row);

  const shareRecords: ShareRecord[] = [];
  for (const share of shares.data ?? []) {
    const shortcut = share.shortcuts as ShortcutRow | ShortcutRow[] | null;
    const row = Array.isArray(shortcut) ? shortcut[0] : shortcut;
    if (!row || row.trigger !== trigger) continue;
    byId.set(row.id, row);
    shareRecords.push({
      shortcutId: share.shortcut_id as string,
      recipientId: share.recipient_id as string,
      status: share.status as ShareRecord['status'],
    });
  }

  const picked = pickShortcut([...byId.values()].map(toRecord), userId, conversationId, shareRecords, true);
  if (!picked) return null;
  return executeShortcut(picked);
}

export async function listShortcuts(userId: string) {
  const mineQuery = await db().from('shortcuts').select('*').eq('owner_id', userId).order('created_at', { ascending: true });
  if (mineQuery.error) throwDb(mineQuery.error, 'my shortcuts');
  const incomingQuery = await db()
    .from('shortcut_shares')
    .select('*')
    .eq('recipient_id', userId)
    .in('status', ['PENDING', 'ACCEPTED'])
    .order('created_at', { ascending: false });
  if (incomingQuery.error) throwDb(incomingQuery.error, 'incoming shortcuts');

  const shareRows = incomingQuery.data ?? [];
  const shortcutIds = shareRows.map((row) => row.shortcut_id as string);
  const ownerIds = shareRows.map((row) => row.owner_id as string);
  const [shortcutMap, profiles] = await Promise.all([
    loadShortcutMap(shortcutIds),
    toPublicProfiles([...new Set(ownerIds)]),
  ]);

  const incoming = shareRows.flatMap((row) => {
    const shortcut = shortcutMap.get(row.shortcut_id as string);
    const from = profiles.get(row.owner_id as string);
    if (!shortcut || !from || row.status !== 'PENDING') return [];
    return [{
      id: row.id as string,
      status: row.status as string,
      createdAt: row.created_at as string,
      from,
      shortcut: mapShortcut(shortcut),
    }];
  });

  const sharedWithMe = shareRows.flatMap((row) => {
    const shortcut = shortcutMap.get(row.shortcut_id as string);
    if (!shortcut || row.status !== 'ACCEPTED') return [];
    return [mapShortcut(shortcut)];
  });

  return {
    mine: ((mineQuery.data ?? []) as ShortcutRow[]).map(mapShortcut),
    incoming,
    sharedWithMe,
  };
}

async function loadShortcutMap(ids: string[]) {
  const map = new Map<string, ShortcutRow>();
  if (!ids.length) return map;
  const { data, error } = await db().from('shortcuts').select('*').in('id', ids);
  if (error) throwDb(error, 'shortcut map');
  for (const row of (data ?? []) as ShortcutRow[]) map.set(row.id, row);
  return map;
}

export async function createShortcut(userId: string, input: {
  name: string;
  trigger: string;
  type: ShortcutType;
  content: string;
  actionType?: string | null;
  visibility: ShortcutVisibility;
  conversationId?: string | null;
}) {
  const parsed = validateTrigger(input.trigger);
  if (!parsed.ok) throw new AppError(400, parsed.message);
  const name = input.name.trim();
  if (name.length < 1 || name.length > 32) throw new AppError(400, 'Give the shortcut a short name.');
  if (input.visibility === 'conversation') {
    if (!input.conversationId) throw new AppError(400, 'Pick the chat this shortcut belongs to.');
    await requireMember(input.conversationId, userId);
  }
  if (input.type === 'TEXT' && input.content.trim().length < 1) {
    throw new AppError(400, 'Write the message this shortcut should send.');
  }
  if (input.type !== 'TEXT' && input.actionType && !['streak', 'mood', 'rules', 'renew', 'ghost', 'gif', 'shrug'].includes(input.actionType)) {
    throw new AppError(400, 'That shortcut action is not allowed.');
  }

  const { data, error } = await db().from('shortcuts').insert({
    owner_id: userId,
    name,
    trigger: parsed.trigger,
    type: input.type,
    content: input.content.trim().slice(0, 500),
    action_type: input.type === 'TEXT' ? null : input.actionType ?? null,
    visibility: input.visibility,
    conversation_id: input.visibility === 'conversation' ? input.conversationId : null,
  }).select('*').single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new AppError(409, 'You already have that shortcut.');
    }
    throwDb(error, 'create shortcut');
  }
  return mapShortcut(data as ShortcutRow);
}

export async function updateShortcut(userId: string, shortcutId: string, input: {
  name?: string;
  content?: string;
  visibility?: ShortcutVisibility;
}) {
  const row = await ownedShortcut(userId, shortcutId);
  const patch: Record<string, unknown> = {};
  if (input.name != null) {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 32) throw new AppError(400, 'Give the shortcut a short name.');
    patch.name = name;
  }
  if (input.content != null) patch.content = input.content.trim().slice(0, 500);
  if (input.visibility != null && row.visibility !== 'conversation') patch.visibility = input.visibility;
  const { data, error } = await db().from('shortcuts').update(patch).eq('id', shortcutId).select('*').single();
  if (error) throwDb(error, 'update shortcut');
  return mapShortcut(data as ShortcutRow);
}

export async function deleteShortcut(userId: string, shortcutId: string) {
  const row = await ownedShortcut(userId, shortcutId);
  if (row.type === 'SYSTEM') throw new AppError(400, 'That one comes with Toodle.');
  const { error } = await db().from('shortcuts').delete().eq('id', shortcutId);
  if (error) throwDb(error, 'delete shortcut');
  return { ok: true };
}

async function ownedShortcut(userId: string, shortcutId: string) {
  const { data, error } = await db().from('shortcuts').select('*').eq('id', shortcutId).maybeSingle();
  if (error) throwDb(error, 'load shortcut');
  if (!data) throw new AppError(404, 'That shortcut is gone.');
  if (data.owner_id !== userId) throw new AppError(403, 'That shortcut is not yours.');
  return data as ShortcutRow;
}

export async function shareShortcut(userId: string, shortcutId: string, username: string) {
  const shortcut = await ownedShortcut(userId, shortcutId);
  if (shortcut.visibility === 'conversation') {
    throw new AppError(400, 'Everyone in that chat can already use it.');
  }
  const handle = username.trim().toLowerCase().replace(/^@/, '');
  const { data: recipient, error } = await db().from('profiles').select('*').eq('username', handle).maybeSingle();
  if (error) throwDb(error, 'find recipient');
  if (!recipient) throw new AppError(404, 'Nobody with that username is here.');
  if (recipient.id === userId) throw new AppError(400, 'You already have this one.');

  if (shortcut.visibility === 'private') {
    await db().from('shortcuts').update({ visibility: 'shared' }).eq('id', shortcutId);
  }

  const existing = await db()
    .from('shortcut_shares')
    .select('*')
    .eq('shortcut_id', shortcutId)
    .eq('recipient_id', recipient.id)
    .maybeSingle();
  if (existing.error) throwDb(existing.error, 'existing share');

  let shareId = existing.data?.id as string | undefined;
  if (existing.data?.status === 'ACCEPTED') throw new AppError(409, 'They already have this shortcut.');
  if (existing.data) {
    const updated = await db().from('shortcut_shares').update({ status: 'PENDING' }).eq('id', existing.data.id).select('id').single();
    if (updated.error) throwDb(updated.error, 'refresh share');
    if (!updated.data) throw new AppError(500, 'Toodle tripped. Try again.');
    shareId = updated.data.id as string;
  } else {
    const inserted = await db().from('shortcut_shares').insert({
      shortcut_id: shortcutId,
      owner_id: userId,
      recipient_id: recipient.id,
      status: 'PENDING',
    }).select('id').single();
    if (inserted.error) throwDb(inserted.error, 'share shortcut');
    if (!inserted.data) throw new AppError(500, 'Toodle tripped. Try again.');
    shareId = inserted.data.id as string;
  }

  const owner = await getProfiles([userId]);
  const me = owner.get(userId);
  await notify({
    userId: recipient.id as string,
    type: 'shortcut_shared',
    title: 'Shortcut',
    body: `${me?.display_name ?? 'Someone'} shared shortcut ${shortcut.trigger} with you.`,
    payload: { shareId, shortcutId },
  });
  emitToUsers([recipient.id as string], SocketEvents.ShortcutShared, { shareId, trigger: shortcut.trigger });
  return { id: shareId, status: 'PENDING' };
}

export async function respondToShare(userId: string, shareId: string, accept: boolean) {
  const { data, error } = await db().from('shortcut_shares').select('*').eq('id', shareId).maybeSingle();
  if (error) throwDb(error, 'load share');
  if (!data) throw new AppError(404, 'That share is gone.');
  if (data.recipient_id !== userId) throw new AppError(403, 'This shortcut was not shared with you.');
  if (data.status !== 'PENDING') throw new AppError(409, 'That share was already handled.');
  const status = accept ? 'ACCEPTED' : 'REJECTED';
  const { error: updateError } = await db().from('shortcut_shares').update({ status }).eq('id', shareId);
  if (updateError) throwDb(updateError, 'update share');
  if (accept) {
    emitToUsers([data.owner_id as string, userId], SocketEvents.ShortcutAccepted, { shareId, shortcutId: data.shortcut_id });
  }
  return { id: shareId, status };
}

export async function revokeShare(userId: string, shortcutId: string, recipientId: string) {
  await ownedShortcut(userId, shortcutId);
  const { error } = await db()
    .from('shortcut_shares')
    .update({ status: 'REVOKED' })
    .eq('shortcut_id', shortcutId)
    .eq('recipient_id', recipientId);
  if (error) throwDb(error, 'revoke shortcut');
  emitToUsers([recipientId], SocketEvents.ShortcutRevoked, { shortcutId });
  return { ok: true };
}
