import { useEffect, useState } from 'react';
import { Button, EmptyState, useToast } from '../components/ui';
import { SocketEvents } from '../constants';
import { useSocket } from '../hooks/useSocket';
import { api } from '../lib/http';
import type { IncomingShare, Shortcut } from '../types';

export function ShortcutsPage() {
  const toast = useToast();
  const { socket } = useSocket();
  const [mine, setMine] = useState<Shortcut[]>([]);
  const [incoming, setIncoming] = useState<IncomingShare[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<Shortcut[]>([]);
  const [trigger, setTrigger] = useState('/');
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [shareWith, setShareWith] = useState<Record<string, string>>({});

  async function load() {
    const data = await api<{ mine: Shortcut[]; incoming: IncomingShare[]; sharedWithMe: Shortcut[] }>('/api/shortcuts');
    setMine(data.mine);
    setIncoming(data.incoming);
    setSharedWithMe(data.sharedWithMe);
  }

  useEffect(() => {
    load().catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
  }, [toast]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => { load().catch(() => undefined); };
    socket.on(SocketEvents.ShortcutShared, refresh);
    socket.on(SocketEvents.ShortcutAccepted, refresh);
    socket.on(SocketEvents.ShortcutRevoked, refresh);
    return () => {
      socket.off(SocketEvents.ShortcutShared, refresh);
      socket.off(SocketEvents.ShortcutAccepted, refresh);
      socket.off(SocketEvents.ShortcutRevoked, refresh);
    };
  }, [socket]);

  async function createShortcut() {
    try {
      await api('/api/shortcuts', {
        method: 'POST',
        body: JSON.stringify({
          name: name || trigger.replace('/', ''),
          trigger,
          type: 'TEXT',
          content,
          visibility: 'private',
        }),
      });
      setName('');
      setContent('');
      setTrigger('/');
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    }
  }

  async function share(shortcutId: string) {
    try {
      await api(`/api/shortcuts/${shortcutId}/share`, {
        method: 'POST',
        body: JSON.stringify({ username: shareWith[shortcutId] || '' }),
      });
      toast('Shortcut shared');
      setShareWith((current) => ({ ...current, [shortcutId]: '' }));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    }
  }

  async function respond(id: string, accept: boolean) {
    try {
      await api(`/api/shortcut-shares/${id}/${accept ? 'accept' : 'reject'}`, { method: 'POST' });
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    }
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-3xl font-semibold">Shortcuts</h1>
      <p className="mt-1 text-sm text-muted">Type /gm and Toodle sends the rest.</p>
      {incoming.length > 0 ? (
        <div className="mt-5 space-y-3">
          {incoming.map((share) => (
            <article key={share.id} className="glass rounded-[1.6rem] p-4">
              <p>{share.from.displayName} shared shortcut {share.shortcut.trigger} with you.</p>
              <p className="mt-1 text-sm text-muted">{share.shortcut.content}</p>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => void respond(share.id, true)}>Add shortcut</Button>
                <Button variant="ghost" onClick={() => void respond(share.id, false)}>Not now</Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="glass mt-5 space-y-3 rounded-[1.6rem] p-4">
        <input value={trigger} onChange={(event) => setTrigger(event.target.value)} placeholder="/gm" className="w-full bg-transparent text-lg outline-none" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="w-full bg-transparent outline-none" />
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Good morningggg ☀️❤️" className="w-full resize-none bg-transparent outline-none" rows={2} />
        <Button onClick={() => void createShortcut()} disabled={!content.trim()}>Save shortcut</Button>
      </div>
      {mine.length === 0 ? <EmptyState emoji="⚡" title="You haven't invented any shortcuts yet." /> : null}
      <div className="mt-4 space-y-3">
        {mine.map((shortcut) => (
          <article key={shortcut.id} className="glass rounded-[1.6rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{shortcut.trigger}</p>
                <p className="text-sm text-muted">{shortcut.type === 'TEXT' ? shortcut.content : shortcut.actionType}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{shortcut.visibility}</p>
              </div>
              {shortcut.type !== 'SYSTEM' ? (
                <button type="button" className="text-sm text-danger" onClick={() => api(`/api/shortcuts/${shortcut.id}`, { method: 'DELETE' }).then(load).catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'))}>Delete</button>
              ) : null}
            </div>
            {shortcut.visibility !== 'conversation' && shortcut.type !== 'SYSTEM' ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={shareWith[shortcut.id] ?? ''}
                  onChange={(event) => setShareWith((current) => ({ ...current, [shortcut.id]: event.target.value }))}
                  placeholder="@username"
                  className="flex-1 rounded-full border border-line bg-transparent px-3 py-2 text-sm outline-none"
                />
                <Button className="px-4 py-2" onClick={() => void share(shortcut.id)}>Share</Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {sharedWithMe.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Shared with you</h2>
          <div className="mt-3 space-y-2">
            {sharedWithMe.map((shortcut) => (
              <p key={shortcut.id} className="glass rounded-2xl px-4 py-3 text-sm">{shortcut.trigger} → {shortcut.content || shortcut.actionType}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
