import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRenewal,
  calculateMessageExpiration,
  canRenew,
  remainingMessages,
  renewalRequiresApproval,
  sanitizeRenewDuration,
  shouldVanishOnExit,
  validateMessage,
  type ConversationRule,
} from '../src/engines/ruleEngine.js';

const now = new Date('2026-09-29T12:00:00.000Z');

function rule(partial: ConversationRule): ConversationRule[] {
  return [partial];
}

test('message expiration is calculated from the server clock', () => {
  const expires = calculateMessageExpiration(rule({
    ruleType: 'message_expiration',
    enabled: true,
    configuration: { durationSeconds: 30 },
  }), now);
  assert.equal(expires?.toISOString(), '2026-09-29T12:00:30.000Z');
  assert.equal(calculateMessageExpiration([], now), null);
});

test('message count blocks when the budget is spent', () => {
  const rules = rule({ ruleType: 'message_count', enabled: true, configuration: { limit: 50 } });
  assert.equal(remainingMessages(rules, 47), 3);
  const allowed = validateMessage(rules, {
    now,
    messagesSent: 49,
    lastOwnMessageAt: null,
    conversationExpiresAt: null,
    conversationStatus: 'active',
  });
  assert.equal(allowed.ok, true);
  const blocked = validateMessage(rules, {
    now,
    messagesSent: 50,
    lastOwnMessageAt: null,
    conversationExpiresAt: null,
    conversationStatus: 'active',
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.match(blocked.message, /messages/);
});

test('an expired conversation cannot accept messages', () => {
  const result = validateMessage([], {
    now,
    messagesSent: 0,
    lastOwnMessageAt: null,
    conversationExpiresAt: new Date('2026-09-29T11:59:00.000Z'),
    conversationStatus: 'active',
  });
  assert.equal(result.ok, false);
});

test('renewal extends a live timer and can require approval', () => {
  const rules = rule({
    ruleType: 'conversation_expiration',
    enabled: true,
    configuration: { durationSeconds: 600, requireApproval: true },
  });
  assert.equal(canRenew(rules).ok, true);
  assert.equal(renewalRequiresApproval(rules), true);
  assert.equal(canRenew([]).ok, false);

  const extended = applyRenewal(new Date('2026-09-29T12:10:00.000Z'), 1800, now);
  assert.equal(extended.toISOString(), '2026-09-29T12:40:00.000Z');

  const restarted = applyRenewal(new Date('2026-09-29T11:00:00.000Z'), 300, now);
  assert.equal(restarted.toISOString(), '2026-09-29T12:05:00.000Z');
  assert.equal(sanitizeRenewDuration(10), 60);
});

test('approval can be turned off', () => {
  const rules = rule({
    ruleType: 'conversation_expiration',
    enabled: true,
    configuration: { durationSeconds: 600, requireApproval: false },
  });
  assert.equal(renewalRequiresApproval(rules), false);
});

test('ghost mode only vanishes when every member has left', () => {
  const rules = rule({ ruleType: 'ghost_mode', enabled: true, configuration: {} });
  assert.equal(shouldVanishOnExit(rules, [new Date(), null]), false);
  assert.equal(shouldVanishOnExit(rules, [new Date(), new Date()]), true);
  assert.equal(shouldVanishOnExit([], [new Date(), new Date()]), false);
});

