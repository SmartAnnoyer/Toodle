import { AVATARS, DEFAULT_SHORTCUTS, MOODS } from '../constants/catalog.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { blockedUserIds } from './safety.js';
import { serverNow } from '../utils/time.js';
import { sanitizeSearch, usernameAvailability, validateUsername } from '../utils/username.js';
import { viewStreak, type StreakState } from '../engines/streakEngine.js';
import { activeConversationsWith } from './conversationStore.js';
import { toPublicProfile, type ProfileRow, type PublicProfile } from './mappers.js';

export function moodCatalog() {
  return { moods: MOODS, avatars: AVATARS };
}

export async function ensureDefaultShortcuts(userId: string) {
  const { data, error } = await db()
    .from('shortcuts')
    .select('trigger')
    .eq('owner_id', userId)
    .is('conversation_id', null);
  if (error) throwDb(error, 'default shortcuts');
  const have = new Set((data ?? []).map((row) => row.trigger as string));
  const missing = DEFAULT_SHORTCUTS.filter((shortcut) => !have.has(shortcut.trigger));
  if (!missing.length) return;
  const { error: insertError } = await db().from('shortcuts').insert(missing.map((shortcut) => ({
    owner_id: userId,
    name: shortcut.name,
    trigger: shortcut.trigger,
    type: shortcut.type,
    content: shortcut.content,
    action_type: shortcut.actionType,
    visibility: 'private',
  })));
  if (insertError) throwDb(insertError, 'insert default shortcuts');
}

async function profileRow(userId: string): Promise<ProfileRow> {
  const { data, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throwDb(error, 'profile');
  if (!data) throw new AppError(404, 'We could not find that profile.');
  return data as ProfileRow;
}

export async function presenceMap(userIds: string[]): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!userIds.length) return map;
  const { data, error } = await db().from('presence').select('user_id, status').in('user_id', userIds);
  if (error) throwDb(error, 'presence');
  for (const row of data ?? []) map.set(row.user_id as string, row.status === 'online');
  return map;
}

export async function setPresence(userId: string, status: 'online' | 'offline') {
  const { error } = await db().from('presence').upsert({
    user_id: userId,
    status,
    last_seen_at: new Date().toISOString(),
  });
  if (error) console.error('presence', error.message);
}

export async function getProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (!ids.length) return map;
  const { data, error } = await db().from('profiles').select('*').in('id', ids);
  if (error) throwDb(error, 'profiles');
  for (const row of (data ?? []) as ProfileRow[]) map.set(row.id, row);
  return map;
}

export async function toPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const [profiles, presence] = await Promise.all([getProfiles(ids), presenceMap(ids)]);
  const map = new Map<string, PublicProfile>();
  for (const [id, row] of profiles) {
    map.set(id, toPublicProfile(row, presence.get(id) ?? false));
  }
  return map;
}

async function stats(userId: string) {
  const { count, error } = await db()
    .from('shortcuts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);
  if (error) throwDb(error, 'shortcut count');

  const { data: memberships, error: memberError } = await db()
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId);
  if (memberError) throwDb(memberError, 'streak memberships');
  const ids = (memberships ?? []).map((row) => row.conversation_id as string);
  let activeStreaks = 0;
  let bestStreak = 0;
  if (ids.length) {
    const { data: streaks, error: streakError } = await db().from('streaks').select('*').in('conversation_id', ids);
    if (streakError) throwDb(streakError, 'streaks');
    const now = new Date();
    for (const row of streaks ?? []) {
      const view = viewStreak({
        currentCount: row.current_count as number,
        longestCount: row.longest_count as number,
        lastCompletedOn: row.last_completed_on as string | null,
        activity: (row.activity ?? {}) as StreakState['activity'],
      }, [], now);
      if (view.count > 0) {
        activeStreaks += 1;
        bestStreak = Math.max(bestStreak, view.count);
      }
    }
  }

  return { shortcutCount: count ?? 0, activeStreaks, bestStreak };
}

function mePayload(row: ProfileRow, extra: { shortcutCount: number; activeStreaks: number; bestStreak: number }) {
  return {
    ...toPublicProfile(row, true),
    showOnline: row.show_online,
    onboarded: row.onboarded,
    shortcutCount: extra.shortcutCount,
    activeStreaks: extra.activeStreaks,
    bestStreak: extra.bestStreak,
    serverNow: serverNow(),
  };
}

export async function getMe(userId: string) {
  await ensureDefaultShortcuts(userId);
  const row = await profileRow(userId);
  return mePayload(row, await stats(userId));
}

export async function setupProfile(userId: string, input: {
  username: string;
  displayName: string;
  avatarEmoji: string;
  moodEmoji: string;
  moodText: string;
}) {
  const parsed = validateUsername(input.username);
  if (!parsed.ok) throw new AppError(400, parsed.message);
  const { data: taken, error: takenError } = await db()
    .from('profiles')
    .select('id')
    .eq('username', parsed.username)
    .maybeSingle();
  if (takenError) throwDb(takenError, 'username lookup');
  const availability = usernameAvailability(parsed.username, taken?.id ?? null, userId);
  if (!availability.available) throw new AppError(409, availability.message ?? 'That username is taken.');

  const displayName = input.displayName.trim();
  const moodText = input.moodText.trim();
  if (displayName.length < 1 || displayName.length > 32) {
    throw new AppError(400, 'Names can be up to 32 characters.');
  }
  if (moodText.length < 1 || moodText.length > 48) {
    throw new AppError(400, 'Keep the mood under 48 characters.');
  }

  const { data, error } = await db()
    .from('profiles')
    .update({
      username: parsed.username,
      display_name: displayName,
      avatar_emoji: input.avatarEmoji.trim().slice(0, 8) || '✨',
      mood_emoji: input.moodEmoji.trim().slice(0, 8) || '🫠',
      mood_text: moodText,
      onboarded: true,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throwDb(error, 'setup profile');
  await ensureDefaultShortcuts(userId);
  const row = data as ProfileRow;
  return mePayload(row, await stats(userId));
}

export async function updateProfile(userId: string, input: {
  username?: string;
  displayName?: string;
  avatarEmoji?: string;
  moodEmoji?: string;
  moodText?: string;
  showOnline?: boolean;
}) {
  const patch: Record<string, unknown> = {};
  if (input.username != null) {
    const parsed = validateUsername(input.username);
    if (!parsed.ok) throw new AppError(400, parsed.message);
    const { data: taken, error } = await db().from('profiles').select('id').eq('username', parsed.username).maybeSingle();
    if (error) throwDb(error, 'username lookup');
    const availability = usernameAvailability(parsed.username, taken?.id ?? null, userId);
    if (!availability.available) throw new AppError(409, availability.message ?? 'That username is taken.');
    patch.username = parsed.username;
  }
  if (input.displayName != null) {
    const displayName = input.displayName.trim();
    if (displayName.length < 1 || displayName.length > 32) throw new AppError(400, 'Names can be up to 32 characters.');
    patch.display_name = displayName;
  }
  if (input.moodText != null) {
    const moodText = input.moodText.trim();
    if (moodText.length < 1 || moodText.length > 48) throw new AppError(400, 'Keep the mood under 48 characters.');
    patch.mood_text = moodText;
  }
  if (input.avatarEmoji != null) patch.avatar_emoji = input.avatarEmoji.trim().slice(0, 8) || '✨';
  if (input.moodEmoji != null) patch.mood_emoji = input.moodEmoji.trim().slice(0, 8) || '🫠';
  if (input.showOnline != null) patch.show_online = input.showOnline;

  const { data, error } = await db().from('profiles').update(patch).eq('id', userId).select('*').single();
  if (error) throwDb(error, 'update profile');
  return mePayload(data as ProfileRow, await stats(userId));
}

export async function usernameAvailable(username: string, selfId?: string) {
  const parsed = validateUsername(username);
  if (!parsed.ok) return { available: false, message: parsed.message };
  const { data, error } = await db().from('profiles').select('id').eq('username', parsed.username).maybeSingle();
  if (error) throwDb(error, 'username lookup');
  return usernameAvailability(parsed.username, data?.id ?? null, selfId);
}

export async function searchUsers(userId: string, rawQuery: string) {
  const query = sanitizeSearch(rawQuery);
  if (!query) return [];
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .eq('onboarded', true)
    .neq('id', userId)
    .or(`username.ilike.${query}%,display_name.ilike.%${query}%`)
    .limit(15);
  if (error) throwDb(error, 'search');
  const hidden = await blockedUserIds(userId);
  const rows = ((data ?? []) as ProfileRow[]).filter((row) => !hidden.has(row.id));
  const ids = rows.map((row) => row.id);
  const [presence, conversations, requests] = await Promise.all([
    presenceMap(ids),
    activeConversationsWith(userId, ids),
    requestLinks(userId, ids),
  ]);

  return rows.map((row) => {
    const link = requests.get(row.id);
    return {
      ...toPublicProfile(row, presence.get(row.id) ?? false),
      relationship: link?.relationship ?? 'none',
      conversationId: conversations.get(row.id) ?? null,
    };
  });
}

async function requestLinks(userId: string, otherIds: string[]) {
  const map = new Map<string, { relationship: 'incoming' | 'outgoing' | 'accepted' }>();
  if (!otherIds.length) return map;
  const { data, error } = await db()
    .from('friend_requests')
    .select('from_user_id, to_user_id, status')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
  if (error) throwDb(error, 'request links');
  const wanted = new Set(otherIds);
  for (const row of data ?? []) {
    const other = row.from_user_id === userId ? row.to_user_id as string : row.from_user_id as string;
    if (!wanted.has(other)) continue;
    if (row.status === 'accepted') map.set(other, { relationship: 'accepted' });
    else if (row.status === 'pending' && row.to_user_id === userId) map.set(other, { relationship: 'incoming' });
    else if (row.status === 'pending' && row.from_user_id === userId) map.set(other, { relationship: 'outgoing' });
  }
  return map;
}

export async function partnerIds(userId: string): Promise<string[]> {
  const { data: mine, error } = await db().from('conversation_members').select('conversation_id').eq('user_id', userId);
  if (error) return [];
  const ids = (mine ?? []).map((row) => row.conversation_id as string);
  if (!ids.length) return [];
  const { data: others } = await db()
    .from('conversation_members')
    .select('user_id')
    .in('conversation_id', ids)
    .neq('user_id', userId);
  return [...new Set((others ?? []).map((row) => row.user_id as string))];
}
