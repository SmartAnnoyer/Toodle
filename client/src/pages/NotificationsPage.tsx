import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, useToast } from '../components/ui';
import { api } from '../lib/http';
import { formatAgo } from '../lib/time';
import type { AppNotification } from '../types';

export function NotificationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);

  async function load() {
    const data = await api<{ notifications: AppNotification[] }>('/api/notifications');
    setItems(data.notifications);
  }

  useEffect(() => {
    load().catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
  }, [toast]);

  async function open(item: AppNotification) {
    await api(`/api/notifications/${item.id}/read`, { method: 'POST' }).catch(() => undefined);
    const conversationId = item.payload.conversationId;
    if (typeof conversationId === 'string') navigate(`/chat/${conversationId}`);
    else if (item.type === 'request' || item.type === 'request_accepted') navigate('/requests');
    else if (item.type === 'shortcut_shared') navigate('/shortcuts');
    else void load();
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Notices</h1>
        <button type="button" className="text-sm text-muted" onClick={() => api('/api/notifications/read-all', { method: 'POST' }).then(load).catch(() => undefined)}>Mark all read</button>
      </div>
      {items.length === 0 ? <EmptyState emoji="✨" title="Nothing new." /> : null}
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => void open(item)} className={`glass block w-full rounded-[1.4rem] px-4 py-3 text-left ${item.readAt ? 'opacity-60' : ''}`}>
            <p>{item.body}</p>
            <p className="mt-1 text-xs text-muted">{formatAgo(item.createdAt)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
