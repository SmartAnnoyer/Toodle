import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CHALLENGE_OPTIONS, CONVERSATION_EXPIRY, MESSAGE_COUNTS, MESSAGE_EXPIRY } from '../constants';
import { Button, useToast } from '../components/ui';
import { api } from '../lib/http';
import type { ConversationDetail, RuleView } from '../types';

export function RulesPage() {
  const { id } = useParams();
  const toast = useToast();
  const [rules, setRules] = useState<RuleView[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<ConversationDetail>(`/api/conversations/${id}`)
      .then((detail) => setRules(detail.rules))
      .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
  }, [id, toast]);

  function update(ruleType: string, patch: Partial<RuleView>) {
    setRules((current) => current.map((rule) => rule.ruleType === ruleType ? { ...rule, ...patch, configuration: { ...rule.configuration, ...(patch.configuration ?? {}) } } : rule));
  }

  async function save(rule: RuleView) {
    if (!id) return;
    setBusy(true);
    try {
      const detail = await api<ConversationDetail>(`/api/conversations/${id}/rules`, {
        method: 'PUT',
        body: JSON.stringify({
          ruleType: rule.ruleType,
          enabled: rule.enabled,
          configuration: rule.configuration,
        }),
      });
      setRules(detail.rules);
      toast(rule.enabled ? `${rule.title} is on` : `${rule.title} is off`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-bg min-h-dvh px-4 py-5">
      <div className="mx-auto max-w-[820px]">
        <Link to={`/chat/${id}`} className="text-sm text-muted">← Back to chat</Link>
        <h1 className="mt-3 text-3xl font-semibold">⚙️ Conversation rules</h1>
        <p className="mt-1 text-sm text-muted">Every chat can behave differently.</p>
        <div className="mt-5 space-y-4">
          {rules.map((rule) => (
            <article key={rule.ruleType} className="glass rounded-[1.6rem] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{rule.title}</h2>
                  <p className="mt-1 text-sm text-muted">{rule.explanation}</p>
                </div>
                <input type="checkbox" checked={rule.enabled} onChange={(event) => update(rule.ruleType, { enabled: event.target.checked })} />
              </div>
              {rule.ruleType === 'message_expiration' ? (
                <select className="mt-3 w-full rounded-2xl bg-elevated px-3 py-2" value={Number(rule.configuration.durationSeconds ?? 30)} onChange={(event) => update(rule.ruleType, { configuration: { durationSeconds: Number(event.target.value) } })}>
                  {MESSAGE_EXPIRY.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
                </select>
              ) : null}
              {rule.ruleType === 'message_count' ? (
                <select className="mt-3 w-full rounded-2xl bg-elevated px-3 py-2" value={Number(rule.configuration.limit ?? 50)} onChange={(event) => update(rule.ruleType, { configuration: { limit: Number(event.target.value) } })}>
                  {MESSAGE_COUNTS.map((count) => <option key={count} value={count}>{count} messages</option>)}
                </select>
              ) : null}
              {rule.ruleType === 'conversation_expiration' ? (
                <div className="mt-3 space-y-2">
                  <select className="w-full rounded-2xl bg-elevated px-3 py-2" value={Number(rule.configuration.durationSeconds ?? 3600)} onChange={(event) => update(rule.ruleType, { configuration: { durationSeconds: Number(event.target.value) } })}>
                    {CONVERSATION_EXPIRY.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
                  </select>
                  <label className="flex items-center justify-between text-sm">
                    Require approval for renewals
                    <input type="checkbox" checked={rule.configuration.requireApproval !== false} onChange={(event) => update(rule.ruleType, { configuration: { requireApproval: event.target.checked } })} />
                  </label>
                  <p className="text-xs text-muted">Turning this on starts the timer now.</p>
                </div>
              ) : null}
              {rule.ruleType === 'challenge_mode' ? (
                <select className="mt-3 w-full rounded-2xl bg-elevated px-3 py-2" value={Number(rule.configuration.intervalSeconds ?? 60)} onChange={(event) => update(rule.ruleType, { configuration: { intervalSeconds: Number(event.target.value) } })}>
                  {CHALLENGE_OPTIONS.map((option) => <option key={option.seconds} value={option.seconds}>{option.label}</option>)}
                </select>
              ) : null}
              <Button className="mt-3 px-4 py-2" disabled={busy} onClick={() => void save(rule)}>Save</Button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
