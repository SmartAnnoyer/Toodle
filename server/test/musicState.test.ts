import assert from 'node:assert/strict';
import test from 'node:test';
import { liveMusicPosition, reduceMusic, type TrackCommand } from '../src/socket/musicState.js';

const track: TrackCommand = {
  trackId: 'pink-room',
  title: 'Pink Room',
  artist: 'Toodle Originals',
  audioUrl: '/audio/music/pink-room.wav',
  duration: 14,
  energy: 'normal',
  mood: 'happy',
};

test('shared music keeps one versioned state and ignores a repeated play', () => {
  const started = reduceMusic(null, { type: 'play', track, position: 0 }, 'user-a', 1_000, 'chat');
  assert.equal(started.changed, true);
  assert.equal(started.next?.version, 1);
  assert.equal(started.next?.status, 'playing');
  const again = reduceMusic(started.next, { type: 'play', track }, 'user-a', 2_000, 'chat');
  assert.equal(again.changed, false);
  assert.equal(again.next?.version, 1);
  const paused = reduceMusic(started.next, { type: 'pause' }, 'user-b', 4_000, 'chat');
  assert.equal(paused.next?.status, 'paused');
  assert.equal(paused.next?.version, 2);
  assert.equal(paused.next?.position, 3);
  assert.equal(paused.next?.updatedBy, 'user-b');
});

test('music position follows the server clock and rejects outside audio', () => {
  const position = liveMusicPosition({ position: 2, status: 'playing', startedAt: 1_000, duration: 14 }, 3_500);
  assert.equal(position, 4.5);
  const blocked = reduceMusic(null, {
    type: 'play',
    track: { ...track, audioUrl: 'https://example.com/song.mp3' },
  }, 'user-a', 1_000, 'chat');
  assert.equal(blocked.changed, false);
  assert.equal(blocked.next, null);
});
