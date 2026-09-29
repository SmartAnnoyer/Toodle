import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesAlias } from '../../client/src/toodle/language/match.ts';
import { normalizeChatText } from '../../client/src/toodle/language/normalize.ts';
import { feelTap, freshMemory, hearMessage } from '../../client/src/toodle/life.ts';

test('repeated letters and emoji collapse without touching a real message store', () => {
  assert.equal(normalizeChatText('thinnavaaaaa 😭😂'), 'thinnavaa');
  assert.equal(normalizeChatText("Don't tell anyone!!!"), 'dont tell anyone');
});

test('telugu spellings of the same question land together', () => {
  for (const line of ['thinnava', 'tinnava', 'thinnava?', 'thinnavaa', 'tinnavaaa', 'tinava', 'thinnava ra']) {
    assert.equal(matchesAlias(line, 'thinnava'), true, line);
  }
  for (const line of ['em chesthunnav', 'em chestunnav', 'em chestunav', 'em chesthunnavvv', 'em chesthunnavu']) {
    assert.equal(matchesAlias(line, 'em chesthunnav'), true, line);
  }
  for (const line of ['ekkadunnav', 'ekkada unnav', 'ekkad unnav', 'ekkadunnavu', 'ekada unnav']) {
    assert.equal(matchesAlias(line, 'ekkadunnav'), true, line);
  }
});

test('similar english words do not steal a reaction', () => {
  assert.equal(matchesAlias('planet', 'plan'), false);
  assert.equal(matchesAlias('secretary', 'secret'), false);
  assert.equal(matchesAlias('business', 'bus'), false);
  assert.equal(matchesAlias('glove', 'love'), false);
  assert.equal(matchesAlias('upcoming', 'coming'), false);
});

test('casual lines pick a performance when the roll hits', () => {
  const plate = hearMessage('thinnavaaaaa 😭', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(plate?.some((beat) => beat.line === 'Nannu adagaledu?'), true);

  const chill = hearMessage('em chestunav?', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(chill?.some((beat) => beat.line === 'Nenu? Chill.'), true);

  const here = hearMessage('ekkada unnav', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(here?.some((beat) => beat.line === 'Ikkaade.'), true);

  const book = hearMessage('chadhuvkovali', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(book?.some((beat) => beat.line === 'Focus bro.'), true);
  assert.equal(book?.some((beat) => beat.animation === 'sleepy'), true);
});

test('a casual plan stays quiet when the roll misses', () => {
  assert.equal(hearMessage('plan', freshMemory(), 10_000, 'normal', () => 0.99), null);
  assert.equal(hearMessage('planet of the day', freshMemory(), 10_000, 'full', () => 0), null);
});

test('trip then cancel unpacks the suitcase', () => {
  const memory = freshMemory();
  const packed = hearMessage('trip ki veldham', memory, 10_000, 'normal', () => 0);
  assert.equal(packed?.some((beat) => beat.line === "WAIT. I'M COMING."), true);
  const dropped = hearMessage('plan cancel', memory, 40_000, 'normal', () => 0);
  assert.equal(dropped?.some((beat) => beat.line === 'All that planning...'), true);
  assert.equal(dropped?.some((beat) => beat.line === "WAIT. I'M COMING."), false);
});

test('one message keeps a single reaction', () => {
  const beats = hearMessage('trip plan cancel ayindi', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(beats?.some((beat) => beat.line === 'All that planning...'), true);
  assert.equal(beats?.some((beat) => beat.line === 'Operation: Weekend.'), false);
});

test('a cancelled trip is not treated as excitement', () => {
  assert.equal(hearMessage('trip ledu', freshMemory(), 10_000, 'full', () => 0), null);
});

test('fever plus office is one confused beat', () => {
  const beats = hearMessage('fever undhi office ki vellali', freshMemory(), 10_000, 'normal', () => 0);
  assert.equal(beats?.[0]?.animation, 'confused');
  assert.equal(beats?.some((beat) => beat.line === 'Doctor Toodle reporting.'), false);
});

test('a tap during a trip is still a pat', () => {
  const memory = freshMemory();
  hearMessage('trip', memory, 5_000, 'normal', () => 0);
  const tap = feelTap(memory, 6_000, () => 0.5);
  assert.equal(tap[0]?.line && ['Hehe.', 'Aww.', 'Thanks.'].includes(tap[0].line), true);
});

test('hmm looks once, then asks what it means', () => {
  const memory = freshMemory();
  const first = hearMessage('hmm', memory, 1_000, 'normal', () => 0);
  const second = hearMessage('hmmm', memory, 4_000, 'normal', () => 0);
  assert.equal(first?.[0]?.animation, 'thinking');
  assert.equal(second?.some((beat) => beat.line === 'What does that mean? 👀'), true);
});

test('enjoy, a compliment, and a name call stay short', () => {
  const enjoy = hearMessage('enjoy enjoyyy 😂', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(enjoy?.some((beat) => beat.line === 'ENJOY ENJOY 😎'), true);

  const best = hearMessage('neeke best ra', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(best?.some((beat) => beat.line === 'Obviously. 😌'), true);

  const warm = hearMessage('happyga undu', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(warm?.some((beat) => beat.line === 'You toooo ❤️'), true);

  const soft = hearMessage('bagundhi anna', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(soft?.some((beat) => beat.line === 'Aww. Thanks anna. 🥹'), true);

  const strong = hearMessage('nijamgaane bavundhi', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(strong?.some((beat) => beat.line === 'Nijamgaa? 🥹'), true);
  assert.equal(strong?.some((beat) => beat.line === "Okay... I'll remember this."), true);

  const called = hearMessage('Toodle?', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(called?.some((beat) => beat.line === 'Nannu kaadhaa?'), true);
  assert.equal(called?.some((beat) => beat.line === 'Okay okay. 😌'), true);
});

test('a double okay is two thumbs, and one bro is ignored', () => {
  const nods = hearMessage('okai okai', freshMemory(), 1_000, 'normal', () => 0);
  assert.equal(nods?.some((beat) => beat.line === 'Okay. Okay.'), true);
  assert.equal(hearMessage('bro', freshMemory(), 1_000, 'normal', () => 0), null);
});

test('three bros in a row ask who bro is', () => {
  const memory = freshMemory();
  assert.equal(hearMessage('bro', memory, 1_000, 'normal', () => 0), null);
  assert.equal(hearMessage('broo', memory, 3_000, 'normal', () => 0), null);
  const third = hearMessage('brooo', memory, 6_000, 'normal', () => 0);
  assert.equal(third?.some((beat) => beat.line === 'Who is bro here?'), true);
});

test('a ha after a question stays quiet, a dry streak says bye', () => {
  const quiet = hearMessage('ha', freshMemory(), 1_000, 'normal', () => 0, { recent: ['Are you coming?'] });
  assert.equal(quiet, null);

  const memory = freshMemory();
  for (let i = 0; i < 4; i += 1) hearMessage(i % 2 ? 'haaa' : 'hmm', memory, 2_000 + i * 3_000, 'normal', () => 0.95);
  const bye = hearMessage('ha', memory, 20_000, 'normal', () => 0);
  assert.equal(bye?.some((beat) => beat.line === 'Bye man. 👋'), true);
  assert.equal(bye?.some((beat) => beat.line === 'Actually, continue. 👀'), true);
});

test('calling his name and then changing the subject makes him shrug', () => {
  const memory = freshMemory();
  const called = hearMessage('toodle', memory, 1_000, 'normal', () => 0);
  assert.equal(called?.some((beat) => beat.line === 'Nannu emaina pilichaaraa?'), true);
  const shrug = hearMessage('never mind the weather', memory, 6_000, 'normal', () => 0);
  assert.equal(shrug?.some((beat) => beat.line === 'Oh... nannu kaadhaa.'), true);
});

test('two big reactions in a minute is the budget', () => {
  const memory = freshMemory();
  assert.equal(hearMessage('secret cheptha', memory, 1_000, 'normal', () => 0)?.length ? true : false, true);
  assert.equal(hearMessage('birthday', memory, 6_000, 'normal', () => 0)?.some((beat) => beat.line === 'PARTYYYY 🎉'), true);
  assert.equal(hearMessage('movie ki veldham', memory, 10_000, 'normal', () => 0), null);
});
