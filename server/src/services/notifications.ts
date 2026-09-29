import { SocketEvents } from '../constants/events.js';
import { db } from '../lib/db.js';
import { AppError, throwDb } from '../lib/errors.js';
import { emitToUsers } from '../socket/hub.js';

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}) {
  const { data, error } = await db()
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
    })
    .select('*')
    .single();
  if (error) throwDb(error, 'notify');
  if (!data) throw new AppError(500, 'Toodle tripped. Try again.');
  const mapped = mapNotification(data);
  emitToUsers([input.userId], SocketEvents.NotificationNew, mapped);
  return mapped;
}

export function mapNotification(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    payload: row.payload ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listNotifications(userId: string) {
  const { data, error } = await db()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throwDb(error, 'list notifications');
  return (data ?? []).map(mapNotification);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const { error } = await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error) throwDb(error, 'read notification');
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throwDb(error, 'read all notifications');
}
