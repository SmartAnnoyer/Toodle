import { isSupabaseConfigured } from '../config.js';
import { viewStreak } from '../engines/streakEngine.js';
import { db } from '../lib/db.js';
import { secondsUntilUtcMidnight, utcDateString } from '../utils/time.js';
import { expireConversation, loadMembers } from './conversationStore.js';
import { notify } from './notifications.js';

async function expireDue() {
  const { data, error } = await db()
    .from('conversations')
    .select('id')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lte('expires_at', new Date().toISOString());
  if (error) {
    console.error('expire scan', error.message);
    return;
  }
  for (const row of data ?? []) {
    try {
      await expireConversation(row.id as string);
    } catch (expireError) {
      console.error('expire conversation', expireError);
    }
  }
}

async function warnStreaks() {
  const now = new Date();
  const secondsLeft = secondsUntilUtcMidnight(now);
  if (secondsLeft <= 0 || secondsLeft > 3 * 3600) return;
  const yesterday = utcDateString(new Date(now.getTime() - 24 * 3600 * 1000));
  const { data, error } = await db()
    .from('streaks')
    .select('*')
    .eq('last_completed_on', yesterday)
    .gt('current_count', 0);
  if (error) {
    console.error('streak scan', error.message);
    return;
  }
  const todayStart = `${utcDateString(now)}T00:00:00.000Z`;
  for (const row of data ?? []) {
    const view = viewStreak({
      currentCount: row.current_count as number,
      longestCount: row.longest_count as number,
      lastCompletedOn: row.last_completed_on as string | null,
      activity: (row.activity ?? {}) as Record<string, string>,
    }, [], now);
    if (!view.atRisk) continue;
    const members = await loadMembers(row.conversation_id as string);
    for (const member of members) {
      const { data: existing } = await db()
        .from('notifications')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('type', 'streak_warning')
        .gte('created_at', todayStart)
        .contains('payload', { conversationId: row.conversation_id })
        .limit(1);
      if (existing && existing.length) continue;
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      await notify({
        userId: member.user_id,
        type: 'streak_warning',
        title: 'Streak',
        body: `🔥 Your streak expires in ${label}.`,
        payload: { conversationId: row.conversation_id },
      });
    }
  }
}

export function startWorker() {
  const tick = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const purged = await db().rpc('purge_expired_messages');
      if (purged.error) console.error('purge', purged.error.message);
      await expireDue();
      await warnStreaks();
    } catch (error) {
      console.error('worker', error);
    }
  };
  void tick();
  setInterval(() => void tick(), 15_000);
}
