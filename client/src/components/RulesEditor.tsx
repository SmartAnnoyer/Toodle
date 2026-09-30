import { useEffect, useRef, useState } from 'react';
import { CONVERSATION_EXPIRY, MESSAGE_COUNTS, MESSAGE_EXPIRY } from '../constants';
import { Toggle, useToast } from './ui';
import { api } from '../lib/http';
import type { ConversationDetail, RuleView } from '../types';

const HIDDEN = new Set(['challenge_mode', 'clean_slate']);

const LOOK: Record<string, { mark: string; line: string }> = {
  message_expiration: { mark: '⏳', line: 'Messages fade' },
  message_count: { mark: '💬', line: 'A message budget' },
  conversation_expiration: { mark: '💣', line: 'The chat ends' },
  ghost_mode: { mark: '🫥', line: 'Gone when you both leave' },
};

function summary(rule: RuleView): string {
  if (!rule.enabled) return 'Off';
  if (rule.ruleType === 'ghost_mode') return 'On';
  if (rule.ruleType === 'message_expiration') {
    return MESSAGE_EXPIRY.find((option) => option.seconds === Number(rule.configuration.durationSeconds))?.label ?? 'On';
  }
  if (rule.ruleType === 'message_count') return `${Number(rule.configuration.limit ?? 50)} messages`;
  if (rule.ruleType === 'conversation_expiration') {
    return CONVERSATION_EXPIRY.find((option) => option.seconds === Number(rule.configuration.durationSeconds))?.label ?? 'On';
  }
  return 'On';
}

export function ChatRules({ conversationId, onClose, onGhost }: { conversationId: string; onClose?: () => void; onGhost?: (enabled: boolean) => void }) {
  const toast = useToast();
  const [rules, setRules] = useState<RuleView[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const epoch = useRef(0);

  useEffect(() => {
    if (!conversationId) return;
    let cancel = false;
    const started = epoch.current;
    api<ConversationDetail>(`/api/conversations/${conversationId}`)
      .then((detail) => {
        if (cancel || epoch.current !== started) return;
        setRules(detail.rules.filter((rule) => !HIDDEN.has(rule.ruleType)));
      })
      .catch((error) => {
        if (!cancel) toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
      });
    return () => {
      cancel = true;
    };
  }, [conversationId, toast]);

  async function apply(rule: RuleView, patch: Partial<RuleView>) {
    const next: RuleView = {
      ...rule,
      ...patch,
      configuration: { ...rule.configuration, ...(patch.configuration ?? {}) },
    };
    const mine = ++epoch.current;
    setRules((current) => current.map((item) => item.ruleType === rule.ruleType ? next : item));
    if (next.ruleType === 'ghost_mode') onGhost?.(next.enabled);
    try {
      const detail = await api<ConversationDetail>(`/api/conversations/${conversationId}/rules`, {
        method: 'PUT',
        body: JSON.stringify({
          ruleType: next.ruleType,
          enabled: next.enabled,
          configuration: next.configuration,
        }),
      });
      if (epoch.current !== mine) return;
      setRules(detail.rules.filter((item) => !HIDDEN.has(item.ruleType)));
    } catch (error) {
      if (epoch.current !== mine) return;
      setRules((current) => current.map((item) => item.ruleType === rule.ruleType ? rule : item));
      if (rule.ruleType === 'ghost_mode') onGhost?.(rule.enabled);
      toast(error instanceof Error ? error.message : 'Toodle tripped. Try again.');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">This chat</p>
          <h2 className="text-2xl font-semibold">How it behaves</h2>
        </div>
        {onClose ? (
          <button type="button" className="chat-tool" onClick={onClose} aria-label="Close">✕</button>
        ) : null}
      </div>
      <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto">
        {rules.map((rule) => {
          const look = LOOK[rule.ruleType] ?? { mark: '✦', line: rule.explanation };
          const expanded = open === rule.ruleType;
          return (
            <article key={rule.ruleType} className={`${expanded ? 'col-span-2' : ''} rounded-[1.6rem] border p-4 ${rule.enabled ? 'border-primary bg-white/10' : 'border-line bg-white/5'}`}>
              {rule.ruleType === 'ghost_mode' ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-3xl">{look.mark}</span>
                    <p className="mt-3 text-base font-semibold">{rule.title}</p>
                    <p className="mt-1 text-sm text-muted">{look.line}</p>
                    <p className="mt-3 text-sm font-semibold">{summary(rule)}</p>
                  </div>
                  <Toggle checked={rule.enabled} label="Ghost mode" onChange={(enabled) => void apply(rule, { enabled })} />
                </div>
              ) : (
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setOpen((current) => current === rule.ruleType ? null : rule.ruleType)}
              >
                <span className="text-3xl">{look.mark}</span>
                <p className="mt-3 text-base font-semibold">{rule.title}</p>
                <p className="mt-1 text-sm text-muted">{look.line}</p>
                <p className="mt-3 text-sm font-semibold">{summary(rule)}</p>
              </button>
              )}
              {expanded && rule.ruleType === 'message_expiration' ? (
                <ChoiceRow
                  current={rule.enabled ? String(Number(rule.configuration.durationSeconds ?? 30)) : 'off'}
                  options={[{ value: 'off', label: 'Off' }, ...MESSAGE_EXPIRY.map((option) => ({ value: String(option.seconds), label: option.label }))]}
                  onPick={(value) => void apply(rule, value === 'off' ? { enabled: false } : { enabled: true, configuration: { durationSeconds: Number(value) } })}
                />
              ) : null}
              {expanded && rule.ruleType === 'message_count' ? (
                <ChoiceRow
                  current={rule.enabled ? String(Number(rule.configuration.limit ?? 50)) : 'off'}
                  options={[{ value: 'off', label: 'Off' }, ...MESSAGE_COUNTS.map((count) => ({ value: String(count), label: String(count) }))]}
                  onPick={(value) => void apply(rule, value === 'off' ? { enabled: false } : { enabled: true, configuration: { limit: Number(value) } })}
                />
              ) : null}
              {expanded && rule.ruleType === 'conversation_expiration' ? (
                <div>
                  <ChoiceRow
                    current={rule.enabled ? String(Number(rule.configuration.durationSeconds ?? 3600)) : 'off'}
                    options={[{ value: 'off', label: 'Off' }, ...CONVERSATION_EXPIRY.map((option) => ({ value: String(option.seconds), label: option.label }))]}
                    onPick={(value) => void apply(rule, value === 'off'
                      ? { enabled: false }
                      : { enabled: true, configuration: { durationSeconds: Number(value), requireApproval: rule.configuration.requireApproval !== false } })}
                  />
                  <button
                    type="button"
                    className="mt-3 text-sm text-muted"
                    onClick={() => void apply(rule, { enabled: true, configuration: { requireApproval: rule.configuration.requireApproval === false } })}
                  >
                    Renewal approval {rule.configuration.requireApproval === false ? 'off' : 'on'}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceRow({
  current,
  options,
  onPick,
}: {
  current: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onPick(option.value)}
          className={`rounded-full px-3 py-2 text-sm ${option.value === current ? 'bg-primary text-slate-950' : 'bg-white/10'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
