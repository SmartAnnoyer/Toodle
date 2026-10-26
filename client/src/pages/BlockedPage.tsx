import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Button, EmptyState, InfinityMark, useToast } from '../components/ui';
import { api } from '../lib/http';

interface BlockedPerson {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  conversationId: string | null;
}

export function BlockedPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [people, setPeople] = useState<BlockedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api<{ users: BlockedPerson[] }>('/api/safety/blocks')
      .then((result) => setPeople(result.users))
      .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'))
      .finally(() => setLoading(false));
  }, [toast]);

  async function unblock(person: BlockedPerson) {
    if (busy) return;
    setBusy(person.id);
    const previous = people;
    setPeople((current) => current.filter((item) => item.id !== person.id));
    try {
      await api('/api/safety/unblock', { method: 'POST', body: JSON.stringify({ userId: person.id }) });
      toast(`Unblocked ${person.displayName}`);
    } catch (error) {
      setPeople(previous);
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="px-4 pt-6">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted">← Back</button>
      <h1 className="mt-3 text-3xl font-semibold">Blocked</h1>
      <p className="mt-2 text-sm text-muted">They stay out of search. Open a chat here if you still want to read it.</p>
      {loading && people.length === 0 ? <InfinityMark /> : null}
      {!loading && people.length === 0 ? (
        <EmptyState emoji="✨" title="No one is blocked" body="When you block someone, they show up here." />
      ) : null}
      <div className="mt-5 space-y-3">
        {people.map((person) => (
          <article key={person.id} className="glass flex items-center gap-3 rounded-[1.6rem] p-3">
            <Avatar emoji={person.avatarEmoji} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{person.displayName}</p>
              <p className="truncate text-sm text-muted">@{person.username}</p>
            </div>
            {person.conversationId ? (
              <Link to={`/chat/${person.conversationId}`} className="min-h-11 px-2 text-sm font-semibold text-primary">Read</Link>
            ) : null}
            <Button className="px-4 py-2" disabled={busy === person.id} onClick={() => void unblock(person)}>
              {busy === person.id ? '…' : 'Unblock'}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
