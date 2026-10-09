import { db } from '../lib/db.js';
import { throwDb } from '../lib/errors.js';

export async function saveDevice(userId: string, token: string, platform: 'android' | 'ios') {
  const { error } = await db().from('device_tokens').upsert({
    user_id: userId,
    token,
    platform,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'token' });
  if (error) throwDb(error, 'save device');
  return { ok: true };
}

export async function removeDevice(userId: string, token: string) {
  const { error } = await db().from('device_tokens').delete().eq('user_id', userId).eq('token', token);
  if (error) throwDb(error, 'remove device');
  return { ok: true };
}
