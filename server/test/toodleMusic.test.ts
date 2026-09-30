import assert from 'node:assert/strict';
import test from 'node:test';
import { correctTime, driftFix, vibePresence } from '../../client/src/music/sync.ts';
import type { MusicSnapshot, SharedMusicState } from '../../client/src/music/MusicTypes.ts';
import { freshMemory, hearMessage } from '../../client/src/toodle/life.ts';
import { decideMusicReaction, musicComboBeat } from '../../client/src/toodle/music/reactions.ts';

const playing: MusicSnapshot = { status: 'playing', energy: 'energetic', mood: 'happy', trackId: 'cyan-stairs', title: 'Cyan Stairs' };

test('drift under 300ms is ignored and a large gap hard-syncs', () => {
  assert.equal(driftFix(0.2), 'ignore');
  assert.equal(driftFix(0.6), 'smooth');
  assert.equal(driftFix(1.4), 'hard');
  assert.equal(correctTime(10, 10.1), null);
  assert.equal(correctTime(10, 12), 12);
});

test('music reactions stay rare and do not replace a trip', () => {
  const cool = new Map<string, number>();
  const start = decideMusicReaction({ event: 'music_started', energy: 'energetic', now: 0, random: 0, cooldowns: cool, performing: 0 });
  assert.equal(start?.[1]?.prop, 'headphones');
  assert.equal(start?.[1]?.line, 'Okayyy... 👀');
  const blocked = decideMusicReaction({ event: 'music_started', energy: 'normal', now: 1_000, random: 0, cooldowns: cool, performing: 0 });
  assert.equal(blocked, null);
  const quietPause = decideMusicReaction({ event: 'music_paused', energy: 'normal', now: 5_000, random: 0.9, cooldowns: cool, performing: 0 });
  assert.equal(quietPause, null);
  const busy = decideMusicReaction({ event: 'music_changed', energy: 'normal', now: 5_000, random: 0, cooldowns: new Map(), performing: 80 });
  assert.equal(busy, null);

  const memory = freshMemory();
  const heard = hearMessage('trip ki veldham', memory, 10_000, 'full', () => 0, { userId: 'me' });
  assert.equal(heard?.[0]?.line, "WAIT. I'M COMING.");
  const extra = musicComboBeat(heard?.[0]?.reactionId, playing, 0);
  assert.equal(extra?.line, 'TRIP + MUSIC = YES.');
  assert.equal(musicComboBeat('name', playing, 0), null);
  assert.equal(musicComboBeat('trip', { ...playing, status: 'paused' }, 0), null);
});

test('vibe presence stays a single line', () => {
  const state = { status: 'playing', updatedBy: 'me' } as SharedMusicState;
  assert.equal(vibePresence(state, 'me', 'Ari'), 'You + Ari are vibing');
  assert.equal(vibePresence({ ...state, status: 'paused', updatedBy: 'me' }, 'me', 'Ari'), 'You paused');
  assert.equal(vibePresence({ ...state, status: 'paused', updatedBy: 'them' }, 'me', 'Ari'), 'Ari paused');
});
