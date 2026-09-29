import { clampInt, utcDateString } from '../utils/time.js';

export const RULE_TYPES = [
  'message_expiration',
  'message_count',
  'conversation_expiration',
  'ghost_mode',
  'challenge_mode',
  'clean_slate',
] as const;

export type RuleType = (typeof RULE_TYPES)[number];

export interface ConversationRule {
  ruleType: RuleType;
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export const RULE_CATALOG: Record<RuleType, { title: string; explanation: string }> = {
  message_expiration: {
    title: 'Message Fade',
    explanation: 'Messages disappear after a while.',
  },
  message_count: {
    title: 'Message Limit',
    explanation: 'This chat only gets a set number of messages.',
  },
  conversation_expiration: {
    title: 'Countdown',
    explanation: 'The whole chat vanishes when the timer hits zero.',
  },
  ghost_mode: {
    title: 'Ghost Mode',
    explanation: 'This conversation disappears when you both leave.',
  },
  challenge_mode: {
    title: 'Challenge Mode',
    explanation: 'One message every few minutes. No flooding.',
  },
  clean_slate: {
    title: 'Clean Slate',
    explanation: 'The chat clears at midnight UTC. The message budget stays.',
  },
};

export function isRuleType(value: string): value is RuleType {
  return (RULE_TYPES as readonly string[]).includes(value);
}

export function isRuleEnabled(rules: ConversationRule[], type: RuleType): boolean {
  return rules.some((rule) => rule.ruleType === type && rule.enabled);
}

export function getRuleConfig(
  rules: ConversationRule[],
  type: RuleType,
): Record<string, unknown> | null {
  const rule = rules.find((item) => item.ruleType === type && item.enabled);
  return rule ? rule.configuration : null;
}

function num(config: Record<string, unknown> | null, key: string): number | null {
  if (!config) return null;
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface ValidateMessageInput {
  now: Date;
  messagesSent: number;
  lastOwnMessageAt: Date | null;
  conversationExpiresAt: Date | null;
  conversationStatus: string;
}

export type Gate =
  | { ok: true }
  | { ok: false; message: string; code: string };

export function validateMessage(rules: ConversationRule[], input: ValidateMessageInput): Gate {
  if (input.conversationStatus !== 'active') {
    return { ok: false, code: 'vanished', message: '💨 Poof. This chat is gone.' };
  }
  if (input.conversationExpiresAt && input.conversationExpiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, code: 'expired', message: '💨 Poof. This chat is gone.' };
  }

  const countConfig = getRuleConfig(rules, 'message_count');
  const limit = num(countConfig, 'limit');
  if (limit != null && input.messagesSent >= limit) {
    return { ok: false, code: 'message_limit', message: '💀 You used all your messages.' };
  }

  const challenge = getRuleConfig(rules, 'challenge_mode');
  if (challenge && input.lastOwnMessageAt) {
    const interval = num(challenge, 'intervalSeconds') ?? 60;
    const elapsed = (input.now.getTime() - input.lastOwnMessageAt.getTime()) / 1000;
    if (elapsed < interval) {
      const wait = Math.ceil(interval - elapsed);
      return {
        ok: false,
        code: 'challenge',
        message: `🎯 Challenge mode. Wait ${wait}s before the next one.`,
      };
    }
  }

  return { ok: true };
}

export function calculateMessageExpiration(rules: ConversationRule[], now: Date): Date | null {
  const seconds = num(getRuleConfig(rules, 'message_expiration'), 'durationSeconds');
  if (!seconds || seconds <= 0) return null;
  return new Date(now.getTime() + seconds * 1000);
}

export function remainingMessages(rules: ConversationRule[], messagesSent: number): number | null {
  const limit = num(getRuleConfig(rules, 'message_count'), 'limit');
  if (limit == null) return null;
  return Math.max(0, limit - messagesSent);
}

export function messageLimit(rules: ConversationRule[]): number | null {
  return num(getRuleConfig(rules, 'message_count'), 'limit');
}

export function initialConversationExpiry(rules: ConversationRule[], now: Date): Date | null {
  const seconds = num(getRuleConfig(rules, 'conversation_expiration'), 'durationSeconds');
  if (!seconds || seconds <= 0) return null;
  return new Date(now.getTime() + seconds * 1000);
}

export function renewalRequiresApproval(rules: ConversationRule[]): boolean {
  const config = getRuleConfig(rules, 'conversation_expiration');
  if (!config) return true;
  return config.requireApproval !== false;
}

export function canRenew(rules: ConversationRule[]): Gate {
  if (!isRuleEnabled(rules, 'conversation_expiration')) {
    return { ok: false, code: 'no_timer', message: 'This chat is not on a timer yet.' };
  }
  return { ok: true };
}

export function applyRenewal(currentExpiresAt: Date | null, durationSeconds: number, now: Date): Date {
  const base = currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
    ? currentExpiresAt.getTime()
    : now.getTime();
  return new Date(base + durationSeconds * 1000);
}

export function shouldVanishOnExit(rules: ConversationRule[], leftAts: Array<Date | null>): boolean {
  if (!isRuleEnabled(rules, 'ghost_mode')) return false;
  return leftAts.length > 0 && leftAts.every((left) => left != null);
}

export function shouldCleanSlate(
  rules: ConversationRule[],
  now: Date,
  lastClearedOn: string | null,
): boolean {
  if (!isRuleEnabled(rules, 'clean_slate')) return false;
  return lastClearedOn !== utcDateString(now);
}

export function sanitizeRuleConfig(type: RuleType, raw: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case 'message_expiration':
      return { durationSeconds: clampInt(raw.durationSeconds, 10, 24 * 3600, 30) };
    case 'message_count':
      return { limit: clampInt(raw.limit, 1, 10000, 50) };
    case 'conversation_expiration':
      return {
        durationSeconds: clampInt(raw.durationSeconds, 60, 30 * 24 * 3600, 3600),
        requireApproval: raw.requireApproval !== false,
      };
    case 'challenge_mode':
      return { intervalSeconds: clampInt(raw.intervalSeconds, 30, 24 * 3600, 60) };
    case 'ghost_mode':
      return {};
    case 'clean_slate':
      return {};
    default:
      return {};
  }
}

export function sanitizeRenewDuration(value: unknown): number {
  return clampInt(value, 60, 30 * 24 * 3600, 1800);
}
