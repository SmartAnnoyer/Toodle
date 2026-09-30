import { useEffect, useState } from 'react';
import { CHALLENGE_OPTIONS, CONVERSATION_EXPIRY, MESSAGE_COUNTS, MESSAGE_EXPIRY } from '../constants';
import { Button, OptionPicker, useToast } from './ui';
import { api } from '../lib/http';
import type { ConversationDetail, RuleView } from '../types';

export function RulesEditor({ conversationId }: { conversationId: string }) {
  const toast = useToast();
  const [rules, setRules] = useState<RuleView[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!conversationId) return;
    api<ConversationDetail>(`/api/conversations/${conversationId}`)
      .then((detail) => setRules(detail.rules))
      .catch((error) => toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.'));
  }, [conversationId, toast]);

  function update(ruleType: string, patch: Partial<RuleView>) {
    setRules((current) => current.map((rule) => rule.ruleType === ruleType ? { ...rule, ...patch, configuration: { ...rule.configuration, ...(patch.configuration ?? {}) } } : rule));
  }

  async function save(rule: RuleView) {
    setBusy(true);
    try {
      const detail = await api<ConversationDetail>(`/api/conversations/${conversationId}/rules`, {
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
    <div className="space-y-4">
      {rules.map((rule) => (
        <article key={rule.ruleType} className="glass rounded-[1.6rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-snug">{rule.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{rule.explanation}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label={`${rule.title} ${rule.enabled ? 'on' : 'off'}`}
              aria-checked={rule.enabled}
              onClick={() => update(rule.ruleType, { enabled: !rule.enabled })}
              className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${rule.enabled ? 'bg-primary' : 'bg-ink/20'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${rule.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          {rule.ruleType === 'message_expiration' ? (
            <OptionPicker
              label="Fade after"
              value={String(Number(rule.configuration.durationSeconds ?? 30))}
              options={MESSAGE_EXPIRY.map((option) => ({ value: String(option.seconds), label: option.label }))}
              onChange={(next) => update(rule.ruleType, { configuration: { durationSeconds: Number(next) } })}
            />
          ) : null}
          {rule.ruleType === 'message_count' ? (
            <OptionPicker
              label="Message limit"
              value={String(Number(rule.configuration.limit ?? 50))}
              options={MESSAGE_COUNTS.map((count) => ({ value: String(count), label: `${count} messages` }))}
              onChange={(next) => update(rule.ruleType, { configuration: { limit: Number(next) } })}
            />
          ) : null}
          {rule.ruleType === 'conversation_expiration' ? (
            <div>
              <OptionPicker
                label="Chat timer"
                value={String(Number(rule.configuration.durationSeconds ?? 3600))}
                options={CONVERSATION_EXPIRY.map((option) => ({ value: String(option.seconds), label: option.label }))}
                onChange={(next) => update(rule.ruleType, { configuration: { durationSeconds: Number(next) } })}
              />
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 leading-snug">Require approval for renewals</span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Require approval for renewals"
                  aria-checked={rule.configuration.requireApproval !== false}
                  onClick={() => update(rule.ruleType, { configuration: { requireApproval: rule.configuration.requireApproval === false } })}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${rule.configuration.requireApproval !== false ? 'bg-primary' : 'bg-ink/20'}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${rule.configuration.requireApproval !== false ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">Turning this on starts the timer now.</p>
            </div>
          ) : null}
          {rule.ruleType === 'challenge_mode' ? (
            <OptionPicker
              label="Send pace"
              value={String(Number(rule.configuration.intervalSeconds ?? 60))}
              options={CHALLENGE_OPTIONS.map((option) => ({ value: String(option.seconds), label: option.label }))}
              onChange={(next) => update(rule.ruleType, { configuration: { intervalSeconds: Number(next) } })}
            />
          ) : null}
          <Button className="mt-4 w-full px-4 py-3 sm:w-auto" disabled={busy} onClick={() => void save(rule)}>Save</Button>
        </article>
      ))}
    </div>
  );
}
