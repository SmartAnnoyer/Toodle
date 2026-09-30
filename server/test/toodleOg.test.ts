import assert from 'node:assert/strict';
import test from 'node:test';
import { hearMessage, freshMemory } from '../../client/src/toodle/life.ts';
import { dressOgBeat, ogFlourish, ogMassPhrase, ogMassReaction } from '../../client/src/toodle/og/registry.ts';
import type { ToodleBeat } from '../../client/src/toodle/types.ts';

test('og phrasing stays on whole words and does not replace a trip', () => {
  assert.equal(ogMassPhrase('mass ra'), 'mass ra');
  assert.equal(ogMassPhrase('dog'), null);
  assert.equal(ogMassPhrase('trip ki veldham'), null);
  const trip = hearMessage('trip ki veldham', freshMemory(), 1_000, 'full', () => 0);
  const dressed = dressOgBeat(trip?.[0] as ToodleBeat);
  assert.equal(dressed.line, "WAIT. I'M COMING.");
  assert.equal(dressed.prop, 'suitcase');
});

test('sword fight stays on the same character and respects cooldown', () => {
  const sword = hearMessage('sword', freshMemory(), 0, 'normal', () => 0);
  assert.equal(sword?.[0]?.animation, 'sword_fight');
  assert.equal(sword?.[0]?.prop, 'katana');
  assert.equal(sword?.[0]?.line, 'Mass. 😎');
  const again = hearMessage('katana', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(again?.[0]?.animation, 'sword_fight');
  const cooled = freshMemory();
  hearMessage('sword', cooled, 0, 'normal', () => 0);
  assert.equal(hearMessage('sword fight', cooled, 5_000, 'normal', () => 0), null);

  const fight = hearMessage('fight', freshMemory(), 0, 'normal', () => 0);
  assert.equal(fight?.[0]?.animation, 'sword_fight');
  assert.equal(hearMessage('fighting', freshMemory(), 0, 'normal', () => 0.9), null);

  const og = hearMessage('og', freshMemory(), 0, 'normal', () => 0.5);
  assert.notEqual(og?.[0]?.animation, 'sword_fight');
  const mass = hearMessage('mass', freshMemory(), 0, 'normal', () => 0);
  assert.notEqual(mass?.[0]?.animation, 'sword_fight');
  const combo = hearMessage('og mass', freshMemory(), 0, 'normal', () => 0);
  assert.equal(combo?.[0]?.animation, 'sword_fight');
});

test('og mass is rare and a name flourish stays on cooldown', () => {
  const hit = ogMassReaction('mass ra', 0, 0, 0);
  assert.equal(hit?.beats[1]?.line, 'Obviously.');
  assert.equal(ogMassReaction('mass ra', 1_000, 0, hit?.until ?? 0), null);
  assert.equal(ogMassReaction('mass ra', 0, 0.9, 0), null);
  const name: ToodleBeat = { event: 'HEARD', pose: 'happy', spot: 'composer', ms: 800, priority: 80, line: 'Nannu emaina pilichaaraa?', reactionId: 'name' };
  assert.equal(dressOgBeat(name).line, 'Cheppu.');
  const flourish = ogFlourish('name', 0, 0, 0);
  assert.equal(flourish?.beat.sound, 'shing');
  assert.equal(ogFlourish('name', 1_000, flourish?.until ?? 0, 0), null);
  assert.equal(ogFlourish('trip', 0, 0, 0), null);
});
