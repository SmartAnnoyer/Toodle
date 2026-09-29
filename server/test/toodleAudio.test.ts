import assert from 'node:assert/strict';
import test from 'node:test';
import { admit, pickVariant, shouldPopIncoming } from '../../client/src/toodle/audio/ToodleAudioState.ts';
import { freshMemory, hearMessage } from '../../client/src/toodle/life.ts';

test('incoming pop ignores history, echoes, and your own sends', () => {
  assert.equal(shouldPopIncoming({ mine: false, system: false, alreadySeen: false, booted: true }), true);
  assert.equal(shouldPopIncoming({ mine: true, system: false, alreadySeen: false, booted: true }), false);
  assert.equal(shouldPopIncoming({ mine: false, system: true, alreadySeen: false, booted: true }), false);
  assert.equal(shouldPopIncoming({ mine: false, system: false, alreadySeen: true, booted: true }), false);
  assert.equal(shouldPopIncoming({ mine: false, system: false, alreadySeen: false, booted: false }), false);
});

test('sound admission respects mute, cooldown, and a louder voice', () => {
  assert.deepEqual(admit({
    enabled: false,
    channel: 'voice',
    priority: 80,
    now: 1_000,
    cooldownUntil: 0,
    slots: {},
  }), { ok: false, reason: 'muted' });
  assert.deepEqual(admit({
    enabled: true,
    channel: 'voice',
    priority: 80,
    now: 1_000,
    cooldownUntil: 2_000,
    slots: {},
  }), { ok: false, reason: 'cooldown' });
  assert.deepEqual(admit({
    enabled: true,
    channel: 'voice',
    priority: 10,
    now: 1_000,
    cooldownUntil: 0,
    slots: { voice: { priority: 70, until: 2_000 } },
  }), { ok: false, reason: 'busy' });
  assert.deepEqual(admit({
    enabled: true,
    channel: 'movement',
    priority: 30,
    now: 1_000,
    cooldownUntil: 0,
    slots: { voice: { priority: 70, until: 2_000 } },
  }).ok, true);
  assert.deepEqual(admit({
    enabled: true,
    channel: 'ambient',
    priority: 15,
    now: 1_000,
    cooldownUntil: 0,
    slots: { voice: { priority: 70, until: 2_000 } },
  }), { ok: false, reason: 'busy' });
});

test('confused sounds can vary', () => {
  assert.equal(pickVariant('confused', ['hmm', 'huh', 'confused'], 0), 'hmm');
  assert.equal(pickVariant('confused', ['hmm', 'huh', 'confused'], 0.9), 'confused');
  assert.equal(pickVariant('boop', undefined, 0.4), 'boop');
});

test('trip ki veldham carries the run and the suitcase sounds together', () => {
  const beats = hearMessage('trip ki veldham', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(beats?.[0].animation, 'run');
  assert.equal(beats?.[0].prop, 'suitcase');
  assert.equal(beats?.[0].line, "WAIT. I'M COMING.");
  assert.equal(beats?.[0].timeline?.some((item) => item.sound === 'suitcase_open'), true);
  assert.equal(beats?.[1].timeline?.some((item) => item.sound === 'suitcase_close'), true);
  assert.equal(beats?.[2].timeline?.some((item) => item.sound === 'fall'), true);
});

test('a direct name call gets one attention sound', () => {
  const beats = hearMessage('Toodle?', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(beats?.[0].timeline?.some((item) => item.sound === 'boop'), true);
});
