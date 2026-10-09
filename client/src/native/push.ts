import { Capacitor } from '@capacitor/core';
import { PushNotifications, type PushNotificationSchema } from '@capacitor/push-notifications';
import { api } from '../lib/http';

export type PushData = Record<string, string | undefined>;

const seen = new Set<string>();

export function claimNotice(id: string) {
  if (!id) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 300) seen.delete(seen.values().next().value ?? id);
  return true;
}

export function routeFor(data: PushData | undefined) {
  const type = data?.type ?? '';
  if ((type === 'message' || type === 'read') && data?.conversationId) return `/chat/${data.conversationId}`;
  if (type === 'request' || type === 'request_accepted') return '/requests';
  return null;
}

export function dataOf(notification: PushNotificationSchema): PushData {
  const raw = notification.data;
  if (!raw || typeof raw !== 'object') return {};
  const data: PushData = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') data[key] = value;
  }
  return data;
}

export async function clearConversationNotifications(conversationId: string) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const delivered = await PushNotifications.getDeliveredNotifications();
    const tag = `chat:${conversationId}`;
    const matches = delivered.notifications.filter((item) => item.tag === tag || dataOf(item).conversationId === conversationId);
    if (matches.length > 0) await PushNotifications.removeDeliveredNotifications({ notifications: matches });
  } catch {
    // The tray can already be empty.
  }
}

let currentToken = '';

export async function enablePush(handlers: {
  onOpen: (path: string) => void;
  onArrive: (note: { id: string; title: string; body: string; path: string | null; data: PushData }) => void;
}) {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('PushNotifications')) return () => {};
  try {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return () => {};
  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({ id: 'messages', name: 'Messages', description: 'New chats', importance: 5, visibility: 1 });
    await PushNotifications.createChannel({ id: 'requests', name: 'Requests', description: 'Pings', importance: 4, visibility: 1 });
  }
  await PushNotifications.register();
  const listeners = await Promise.all([
    PushNotifications.addListener('registration', (token) => {
      currentToken = token.value;
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      void api('/api/devices', { method: 'POST', body: JSON.stringify({ token: token.value, platform }) }).catch(() => undefined);
    }),
    PushNotifications.addListener('registrationError', (error) => {
      console.error('push registration', error.error);
    }),
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const data = dataOf(notification);
      if (data.type === 'read' && data.conversationId) {
        void clearConversationNotifications(data.conversationId);
        return;
      }
      const path = routeFor(data);
      const id = data.messageId || data.notificationId || notification.id;
      handlers.onArrive({
        id,
        title: notification.title || 'Toodle',
        body: notification.body || '',
        path,
        data,
      });
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = dataOf(action.notification);
      const path = routeFor(data);
      if (data.conversationId) void clearConversationNotifications(data.conversationId);
      if (path) handlers.onOpen(path);
    }),
  ]);
  return () => {
    for (const listener of listeners) void listener.remove();
  };
  } catch (error) {
    console.error('push', error);
    return () => {};
  }
}

export async function disablePush() {
  if (!currentToken || !Capacitor.isNativePlatform()) return;
  const token = currentToken;
  currentToken = '';
  await api('/api/devices', { method: 'DELETE', body: JSON.stringify({ token }) }).catch(() => undefined);
  await PushNotifications.unregister().catch(() => undefined);
}
