import assert from 'node:assert/strict';
import test from 'node:test';
import { recordMessage, viewStreak, type StreakState } from '../src/engines/streakEngine.js';

const members = ['a', 'b'];
const empty: StreakState = {
  currentCount: 0,
  longestCount: 0,
  lastCompletedOn: null,
  activity: {},
};

test('one person texting does not start a streak', () => {
  const first = recordMessage(empty, members, 'a', new Date('2026-09-28T10:00:00.000Z'));
  assert.equal(first.increased, false);
  assert.equal(first.state.currentCount, 0);
});

test('both people messaging on the same UTC day starts a streak', () => {
  const first = recordMessage(empty, members, 'a', new Date('2026-09-28T10:00:00.000Z'));
  const second = recordMessage(first.state, members, 'b', new Date('2026-09-28T18:00:00.000Z'));
  assert.equal(second.increased, true);
  assert.equal(second.state.currentCount, 1);
  assert.equal(second.state.lastCompletedOn, '2026-09-28');
});

test('the next UTC day increments, and a second exchange the same day does not', () => {
  let state = empty;
  state = recordMessage(state, members, 'a', new Date('2026-09-28T10:00:00.000Z')).state;
  state = recordMessage(state, members, 'b', new Date('2026-09-28T11:00:00.000Z')).state;
  const again = recordMessage(state, members, 'a', new Date('2026-09-28T12:00:00.000Z'));
  assert.equal(again.increased, false);
  assert.equal(again.state.currentCount, 1);

  state = recordMessage(again.state, members, 'a', new Date('2026-09-29T10:00:00.000Z')).state;
  const next = recordMessage(state, members, 'b', new Date('2026-09-29T10:05:00.000Z'));
  assert.equal(next.increased, true);
  assert.equal(next.state.currentCount, 2);
});

test('a missed UTC day resets the streak to one when both show up again', () => {
  let state: StreakState = {
    currentCount: 4,
    longestCount: 4,
    lastCompletedOn: '2026-09-27',
    activity: {
      a: '2026-09-27T10:00:00.000Z',
      b: '2026-09-27T11:00:00.000Z',
    },
  };
  state = recordMessage(state, members, 'a', new Date('2026-09-29T10:00:00.000Z')).state;
  const restart = recordMessage(state, members, 'b', new Date('2026-09-29T10:05:00.000Z'));
  assert.equal(restart.state.currentCount, 1);
  assert.equal(restart.state.longestCount, 4);
  assert.equal(restart.increased, true);
});

test('a streak completed yesterday is at risk until midnight UTC', () => {
  const state: StreakState = {
    currentCount: 7,
    longestCount: 7,
    lastCompletedOn: '2026-09-28',
    activity: {
      a: '2026-09-28T10:00:00.000Z',
      b: '2026-09-28T11:00:00.000Z',
    },
  };
  const view = viewStreak(state, members, new Date('2026-09-29T21:46:00.000Z'));
  assert.equal(view.count, 7);
  assert.equal(view.atRisk, true);
  assert.equal(view.lost, false);
  assert.ok((view.expiresInSeconds ?? 0) > 0);
});

test('a streak older than yesterday is lost', () => {
  const view = viewStreak({
    currentCount: 3,
    longestCount: 3,
    lastCompletedOn: '2026-09-27',
    activity: {},
  }, members, new Date('2026-09-29T12:00:00.000Z'));
  assert.equal(view.count, 0);
  assert.equal(view.lost, true);
});
