import assert from 'node:assert/strict';
import test from 'node:test';
import { ToodleEngine } from '../../client/src/toodle/engine.ts';

test('off never produces a reaction', () => {
  const engine = new ToodleEngine();
  const beat = engine.decide({
    event: 'STREAK_INCREASED',
    now: 1_000,
    chaos: 'off',
    serious: false,
    context: { streak: 7 },
    random: () => 0,
  });
  assert.equal(beat, null);
});

test('a 7 day streak gets the big line', () => {
  const engine = new ToodleEngine();
  const beat = engine.decide({
    event: 'STREAK_INCREASED',
    now: 1_000,
    chaos: 'normal',
    serious: false,
    context: { streak: 7 },
    random: () => 0,
  });
  assert.equal(beat?.line, 'SEVEN DAYS?!');
  assert.equal(beat?.pose, 'celebrating');
});

test('a second reaction inside the gap is dropped', () => {
  const engine = new ToodleEngine();
  const first = engine.decide({ event: 'CHAT_IDLE', now: 10_000, chaos: 'normal', serious: false, random: () => 0 });
  const second = engine.decide({ event: 'USER_TYPING_TOO_LONG', now: 12_000, chaos: 'normal', serious: false, random: () => 0 });
  assert.ok(first?.line);
  assert.equal(second, null);
});

test('serious chats skip teasing', () => {
  const engine = new ToodleEngine();
  const beat = engine.decide({
    event: 'WORD_REPEATED',
    now: 5_000,
    chaos: 'full',
    serious: true,
    context: { word: 'bro', count: 4 },
    random: () => 0,
  });
  assert.equal(beat, null);
});

test('a repeated bro offers a ridiculous swap', () => {
  const engine = new ToodleEngine();
  const beat = engine.decide({
    event: 'WORD_REPEATED',
    now: 5_000,
    chaos: 'normal',
    serious: false,
    context: { word: 'bro', count: 4 },
    random: () => 0,
  });
  assert.match(beat?.line ?? '', /bro/i);
  assert.equal(beat?.suggestion, 'my distinguished gentleman');
});
