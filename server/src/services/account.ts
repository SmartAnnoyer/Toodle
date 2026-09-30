import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';

export async function deleteAccount(userId: string, password: string) {
  if (!config.supabaseAnonKey) throw new AppError(503, 'Toodle is not connected yet. Add your Supabase keys.');
  const { data: existing, error: lookupError } = await db().auth.admin.getUserById(userId);
  if (lookupError || !existing.user?.email) throw new AppError(400, 'We could not find that account.');

  const anon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signError } = await anon.auth.signInWithPassword({
    email: existing.user.email,
    password,
  });
  if (signError) throw new AppError(401, 'That password does not match.');

  const renewals = await db().from('conversation_renewals').delete().eq('requested_by', userId);
  if (renewals.error) throwDb(renewals.error, 'clear renewals');
  const rules = await db().from('conversation_rules').update({ created_by: null }).eq('created_by', userId);
  if (rules.error) throwDb(rules.error, 'clear rules');
  const chats = await db().from('conversations').delete().eq('created_by', userId);
  if (chats.error) throwDb(chats.error, 'clear chats');

  const { error: deleteError } = await db().auth.admin.deleteUser(userId);
  if (deleteError) throw new AppError(500, 'We could not delete that account. Try again.');
  return { ok: true };
}
