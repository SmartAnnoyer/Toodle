import assert from 'node:assert/strict';
import test from 'node:test';
import { explainToodleReaction, getToodleReactionHealth } from '../../client/src/toodle/language/react.ts';
import { freshMemory } from '../../client/src/toodle/life.ts';

function check(message: string, id: string) {
  const decision = explainToodleReaction(message, freshMemory(), 10_000, 'normal', () => 0);
  const hit = decision.selected === id || decision.detected.includes(id);
  assert.equal(hit, true, `${message} → ${decision.status} ${decision.selected} [${decision.detected.join(', ')}]`);
  assert.notEqual(decision.status, 'none', message);
}

test('registered reactions are reachable from natural chat', () => {
  const health = getToodleReactionHealth();
  assert.equal(health.duplicateIds.length, 0);
  assert.equal(health.missingKeywords.length, 0);
  assert.ok(health.total >= 30);

  check('thinnava', 'food');
  check('bro thinnava', 'food');
  check('trip ki veldham', 'trip');
  check('nenu trip ki velthunna', 'trip');
  check('bro trip ki veldhama', 'trip');
  check('chadhuvkovali ra', 'study');
  check('chadhuvkunta', 'study');
  check('movie ki veldham', 'movie');
  check('movie ki velladam cancel', 'movie-cancel');
  check('toodle', 'name');
  check('toodle?', 'name-ask');
  check('hey toodle', 'name');
  check('toodle bro', 'name-bro');
  check('hmmmm', 'hmm-look');
  check('okai okai', 'double-okay');
  check('bavundhi anna', 'bavundhi');
  check('happy ga undu', 'happy-ga');
  check('neeke best', 'best');
  check('nijamga bagundhi', 'strong-compliment');
  check('enjoy enjoy', 'enjoy');
  check('pawan kalyan', 'pspk');
  check('pspk mass', 'pspk');
  check('megastar boss', 'megastar');
  check('amma ki cheppali', 'amma');
  check('nanna tho matladava', 'nanna');
  check('office ki late', 'office');
  check('fever undhi office ki vellali', 'sick-office');
  check('bike meedha vastunna', 'bike');
  check('rapido book chesa', 'otw');
  check('bayataki veldham', 'outside');
  check('secret cheptha', 'secret');
  check('secret chepta', 'secret');
  check('secret chepptha', 'secret');
  check('secret chepthaanu', 'secret');
  check('bro bro bro', 'bro-burst');
});

test('a missed dice roll is suppressed, not treated as no match', () => {
  const decision = explainToodleReaction('plan', freshMemory(), 10_000, 'normal', () => 0.99);
  assert.equal(decision.detected.includes('plan'), true);
  assert.equal(decision.status, 'suppressed');
  assert.equal(decision.reason, 'probability');
  assert.equal(decision.beats, null);
});

test('a food cooldown does not block study', () => {
  const memory = freshMemory();
  explainToodleReaction('thinnava', memory, 1_000, 'normal', () => 0);
  const study = explainToodleReaction('chadhuvkovali', memory, 2_000, 'normal', () => 0);
  assert.equal(study.selected, 'study');
  assert.equal(study.status, 'played');
});

test('calling his name still works after two major reactions', () => {
  const memory = freshMemory();
  explainToodleReaction('secret', memory, 1_000, 'normal', () => 0);
  explainToodleReaction('birthday', memory, 2_000, 'normal', () => 0);
  const called = explainToodleReaction('toodle', memory, 3_000, 'normal', () => 0);
  assert.equal(called.status, 'played');
  assert.equal(called.selected, 'name');
});
