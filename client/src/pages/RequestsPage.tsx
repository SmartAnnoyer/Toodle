import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, EmptyState, InfinityMark, useToast } from '../components/ui';
import { api } from '../lib/http';
import { nudge } from '../lib/feedback';
import type { FriendRequest } from '../types';

export function RequestsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [accepted, setAccepted] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      const data = await api<{ incoming: FriendRequest[]; outgoing: FriendRequest[]; accepted: FriendRequest[] }>('/api/requests');
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
      setAccepted(data.accepted);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function act(id: string, action: 'accept' | 'ignore') {
    const key = `${id}:${action}`;
    if (busy) return;
    setBusy(key);
    try {
      await api(`/api/requests/${id}/${action}`, { method: 'POST' });
      if (action === 'accept') nudge([12, 30, 12]);
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy('');
    }
  }

  async function start(userId: string, conversationId: string | null) {
    if (busy) return;
    setBusy(userId);
    try {
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
        return;
      }
      const created = await api<{ id: string }>('/api/conversations', { method: 'POST', body: JSON.stringify({ userId }) });
      navigate(`/chat/${created.id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
      setBusy('');
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-3xl font-semibold">Requests</h1>
      {loading ? <InfinityMark /> : null}
      {!loading && incoming.length === 0 && outgoing.length === 0 && accepted.length === 0 ? (
        <EmptyState emoji="👀" title="Nobody is Toodling you yet." />
      ) : null}
      <div className="mt-5 space-y-3">
        {incoming.map((request) => (
          <article key={request.id} className="glass rounded-[1.6rem] p-4">
            <div className="flex items-center gap-3">
              <Avatar emoji={request.user.avatarEmoji} />
              <div>
                <p className="font-semibold">{request.user.avatarEmoji} @{request.user.username} wants to Toodle with you.</p>
                <p className="text-sm text-muted">{request.user.moodEmoji} {request.user.moodText}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" disabled={Boolean(busy)} onClick={() => void act(request.id, 'accept')}>{busy === `${request.id}:accept` ? 'Accepting' : 'Accept'}</Button>
              <Button variant="ghost" disabled={Boolean(busy)} onClick={() => void act(request.id, 'ignore')}>{busy === `${request.id}:ignore` ? 'Ignoring' : 'Ignore'}</Button>
            </div>
          </article>
        ))}
        {outgoing.map((request) => (
          <article key={request.id} className="glass rounded-[1.6rem] p-4 text-sm text-muted">
            Waiting on @{request.user.username}
          </article>
        ))}
        {accepted.map((request) => (
          <article key={request.id} className="glass flex items-center justify-between gap-3 rounded-[1.6rem] p-4">
            <div>
              <p className="font-semibold">{request.user.displayName}</p>
              <p className="text-sm text-muted">@{request.user.username}</p>
            </div>
            <Button disabled={busy === request.user.id} onClick={() => void start(request.user.id, request.conversationId)}>
              {busy === request.user.id ? 'Opening' : request.conversationId ? 'Open chat' : 'Start Toodling'}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
