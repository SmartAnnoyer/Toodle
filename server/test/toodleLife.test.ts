import assert from 'node:assert/strict';
import test from 'node:test';
import { feelTap, freshMemory, hearMessage } from '../../client/src/toodle/life.ts';

test('a love message usually stays quiet', () => {
  const memory = freshMemory();
  const beat = hearMessage('I love this song', memory, 10_000, 'normal', () => 0.99);
  assert.equal(beat, null);
});

test('a secret makes him take notes when the roll hits', () => {
  const memory = freshMemory();
  const beats = hearMessage('keep it a secret', memory, 10_000, 'normal', () => 0);
  assert.equal(beats?.some((beat) => beat.line === "I'm listening... 👀"), true);
  assert.equal(beats?.some((beat) => beat.prop === 'notebook'), true);
  assert.equal(beats?.filter((beat) => beat.line).length, 1);
});

test('the same category stays on cooldown', () => {
  const memory = freshMemory();
  hearMessage("don't tell anyone", memory, 10_000, 'normal', () => 0);
  const again = hearMessage('keep it a secret', memory, 100_000, 'normal', () => 0);
  assert.equal(again, null);
});

test('serious lines are left alone', () => {
  const memory = freshMemory();
  const beat = hearMessage('I feel depressed and I love them', memory, 10_000, 'full', () => 0);
  assert.equal(beat, null);
});

test('one tap is a pat and three taps sting', () => {
  const memory = freshMemory();
  const pat = feelTap(memory, 1_000, () => 0.5);
  assert.equal(pat[0]?.line && ['Hehe.', 'Aww.', 'Thanks.'].includes(pat[0].line), true);
  feelTap(memory, 1_200, () => 0.5);
  const ow = feelTap(memory, 1_400, () => 0.5);
  assert.equal(ow[0]?.line, 'OW!');
  assert.equal(ow.at(-1)?.animation, 'walkAway');
});

test('five fast taps become the runaway bit', () => {
  const memory = freshMemory();
  let last: ReturnType<typeof feelTap> = [];
  for (let i = 0; i < 5; i += 1) last = feelTap(memory, 5_000 + i * 100, () => 0.5);
  assert.equal(last[0]?.line, 'Okay.');
  assert.equal(last.some((cue) => cue.line === 'You saw nothing.'), true);
  assert.equal(last.at(-1)?.animation, 'walkAway');
  assert.equal(feelTap(memory, 20_000, () => 0.5).length, 0);
});
