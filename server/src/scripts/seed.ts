import { DEFAULT_SHORTCUTS } from '../constants/catalog.js';
import { RULE_TYPES, sanitizeRuleConfig } from '../engines/ruleEngine.js';
import { config, isSupabaseConfigured } from '../config.js';
import { db } from '../lib/db.js';

const PASSWORD = 'toodle-dev-1';

const PEOPLE = [
  { username: 'akki', displayName: 'Akki', email: 'akki@seed.toodle.app', avatar: '✨', moodEmoji: '🫠', moodText: 'surviving' },
  { username: 'bestie', displayName: 'Bestie', email: 'bestie@seed.toodle.app', avatar: '💜', moodEmoji: '😂', moodText: 'bored' },
  { username: 'coffeeaddict', displayName: 'Coffee', email: 'coffeeaddict@seed.toodle.app', avatar: '☕', moodEmoji: '🥱', moodText: 'barely alive' },
  { username: 'moon', displayName: 'Moon', email: 'moon@seed.toodle.app', avatar: '🌙', moodEmoji: '❤️', moodText: 'in love' },
  { username: 'chaos', displayName: 'Chaos', email: 'chaos@seed.toodle.app', avatar: '⚡', moodEmoji: '🤡', moodText: 'questionable decisions' },
];

async function ensureUser(person: (typeof PEOPLE)[number]) {
  const supabase = db();
  const created = await supabase.auth.admin.createUser({
    email: person.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: person.username,
      display_name: person.displayName,
      avatar_emoji: person.avatar,
      mood_emoji: person.moodEmoji,
      mood_text: person.moodText,
    },
  });
  if (created.data.user) return created.data.user.id;
  const listed = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = listed.data.users.find((user) => user.email === person.email);
  if (!found) throw created.error ?? new Error(`Could not create @${person.username}`);
  return found.id;
}

async function main() {
  if (config.nodeEnv === 'production') {
    console.error('Seed is for development only.');
    process.exit(1);
  }
  if (!isSupabaseConfigured()) {
    console.error('Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env first.');
    process.exit(1);
  }

  const ids = new Map<string, string>();
  for (const person of PEOPLE) {
    const id = await ensureUser(person);
    ids.set(person.username, id);
    const { error } = await db().from('profiles').update({
      username: person.username,
      display_name: person.displayName,
      avatar_emoji: person.avatar,
      mood_emoji: person.moodEmoji,
      mood_text: person.moodText,
      onboarded: true,
    }).eq('id', id);
    if (error) throw error;
    const existing = await db().from('shortcuts').select('trigger').eq('owner_id', id).is('conversation_id', null);
    const have = new Set((existing.data ?? []).map((row) => row.trigger as string));
    const missing = DEFAULT_SHORTCUTS.filter((shortcut) => !have.has(shortcut.trigger));
    if (missing.length) {
      await db().from('shortcuts').insert(missing.map((shortcut) => ({
        owner_id: id,
        name: shortcut.name,
        trigger: shortcut.trigger,
        type: shortcut.type,
        content: shortcut.content,
        action_type: shortcut.actionType,
        visibility: 'private',
      })));
    }
    console.log(`@${person.username} ready`);
  }

  const akki = ids.get('akki')!;
  const bestie = ids.get('bestie')!;
  const coffee = ids.get('coffeeaddict')!;
  const moon = ids.get('moon')!;

  await upsertRequest(bestie, akki, 'pending');
  await upsertRequest(akki, coffee, 'pending');
  await upsertRequest(akki, moon, 'accepted');

  const pair = await db()
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', akki);
  let conversationId: string | null = null;
  const mine = (pair.data ?? []).map((row) => row.conversation_id as string);
  if (mine.length) {
    const shared = await db().from('conversation_members').select('conversation_id').eq('user_id', moon).in('conversation_id', mine);
    const sharedIds = (shared.data ?? []).map((row) => row.conversation_id as string);
    if (sharedIds.length) {
      const active = await db().from('conversations').select('id').in('id', sharedIds).eq('status', 'active').limit(1).maybeSingle();
      conversationId = (active.data?.id as string) ?? null;
    }
  }

  if (!conversationId) {
    const created = await db().from('conversations').insert({ created_by: akki }).select('id').single();
    if (created.error) throw created.error;
    conversationId = created.data.id as string;
    await db().from('conversation_members').insert([
      { conversation_id: conversationId, user_id: akki },
      { conversation_id: conversationId, user_id: moon },
    ]);
    await db().from('streaks').insert({ conversation_id: conversationId });
    await db().from('conversation_rules').insert(RULE_TYPES.map((ruleType) => ({
      conversation_id: conversationId,
      rule_type: ruleType,
      enabled: ruleType === 'conversation_expiration',
      configuration: sanitizeRuleConfig(ruleType, ruleType === 'conversation_expiration' ? { durationSeconds: 86400, requireApproval: true } : {}),
      created_by: akki,
    })));
    await db().from('conversations').update({
      expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
    }).eq('id', conversationId);
    await db().from('messages').insert([
      { conversation_id: conversationId, sender_id: akki, body: 'hey 😂', kind: 'text' },
      { conversation_id: conversationId, sender_id: moon, body: 'what are you doing?', kind: 'text' },
      { conversation_id: conversationId, sender_id: akki, body: 'nothing lol', kind: 'text' },
      { conversation_id: conversationId, sender_id: moon, body: 'same 💀', kind: 'text' },
    ]);
    await db().from('conversations').update({ messages_sent: 4 }).eq('id', conversationId);
  }

  const love = await db().from('shortcuts').select('id').eq('owner_id', akki).eq('trigger', '/love').eq('conversation_id', conversationId).maybeSingle();
  if (!love.data) {
    await db().from('shortcuts').insert({
      owner_id: akki,
      name: 'Love',
      trigger: '/love',
      type: 'TEXT',
      content: 'I love you ❤️',
      visibility: 'conversation',
      conversation_id: conversationId,
    });
  }

  const idiot = await db().from('shortcuts').select('id').eq('owner_id', akki).eq('trigger', '/idiot').is('conversation_id', null).maybeSingle();
  let idiotId = idiot.data?.id as string | undefined;
  if (!idiotId) {
    const inserted = await db().from('shortcuts').insert({
      owner_id: akki,
      name: 'Idiot',
      trigger: '/idiot',
      type: 'TEXT',
      content: 'You absolute idiot 😂❤️',
      visibility: 'shared',
    }).select('id').single();
    if (inserted.error) throw inserted.error;
    idiotId = inserted.data.id as string;
  }
  await db().from('shortcut_shares').upsert({
    shortcut_id: idiotId,
    owner_id: akki,
    recipient_id: moon,
    status: 'PENDING',
  }, { onConflict: 'shortcut_id,recipient_id' });

  console.log('Seed complete. Password for every sample account: toodle-dev-1');
  console.log('Emails look like akki@seed.toodle.app');
}

async function upsertRequest(from: string, to: string, status: string) {
  const existing = await db().from('friend_requests').select('id').eq('from_user_id', from).eq('to_user_id', to).maybeSingle();
  if (existing.data) {
    await db().from('friend_requests').update({ status }).eq('id', existing.data.id);
    return;
  }
  const { error } = await db().from('friend_requests').insert({ from_user_id: from, to_user_id: to, status });
  if (error) throw error;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
