import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, useToast } from '../components/ui';
import { api } from '../lib/http';
import { nudge } from '../lib/feedback';
import type { SearchUser } from '../types';

export function FindPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState('');
  const field = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.focus();
    const timer = window.setTimeout(() => node.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (query.trim().length < 1) {
      setUsers([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setSearching(true);
      api<{ users: SearchUser[] }>(`/api/users/search?q=${encodeURIComponent(query)}`)
        .then((result) => setUsers(result.users))
        .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, toast]);

  async function ping(user: SearchUser) {
    if (busyId) return;
    setBusyId(user.id);
    try {
      if (user.conversationId) {
        navigate(`/chat/${user.conversationId}`);
        return;
      }
      if (user.relationship === 'accepted') {
        const created = await api<{ id: string }>('/api/conversations', { method: 'POST', body: JSON.stringify({ userId: user.id }) });
        navigate(`/chat/${created.id}`);
        return;
      }
      await api('/api/requests', { method: 'POST', body: JSON.stringify({ toUserId: user.id }) });
      nudge();
      toast('Ping sent 👋');
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, relationship: 'outgoing' } : item));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-3xl font-semibold">Find people</h1>
      <input
        ref={field}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="@username"
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="text"
        className="glass mt-5 w-full rounded-full px-4 py-3 text-base outline-none ring-primary/40 focus:ring-2"
      />
      {searching ? <p className="mt-4 text-sm text-muted">Searching…</p> : null}
      {!searching && query.trim().length > 0 && users.length === 0 ? <p className="mt-4 text-sm text-muted">No one with that name.</p> : null}
      <div className="mt-4 space-y-3">
        {users.map((user) => (
          <article key={user.id} className="glass flex items-center gap-3 rounded-[1.6rem] p-3">
            <Avatar emoji={user.avatarEmoji} online={user.online} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{user.displayName}</p>
              <p className="text-sm text-muted">@{user.username}</p>
              <p className="text-sm">{user.moodEmoji} {user.moodText}</p>
            </div>
            <button
              type="button"
              className="text-xs text-muted"
              onClick={() => {
                api('/api/safety/block', { method: 'POST', body: JSON.stringify({ userId: user.id }) })
                  .then(() => { toast('Blocked'); setUsers((current) => current.filter((item) => item.id !== user.id)); })
                  .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
              }}
            >Block</button>
            <Button className="px-4 py-2" disabled={busyId === user.id} onClick={() => void ping(user)}>
              {busyId === user.id ? 'Opening' : user.conversationId ? 'Chat' : user.relationship === 'accepted' ? 'Chat' : user.relationship === 'outgoing' ? 'Pinged' : user.relationship === 'incoming' ? 'They pinged you' : 'Ping 👋'}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
