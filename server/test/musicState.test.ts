import assert from 'node:assert/strict';
import test from 'node:test';
import { guessMatches } from '../src/socket/guessMatch.js';
import { expireGuess, liveMusicPosition, projectMusic, reduceMusic, type RoomMusic, type TrackCommand } from '../src/socket/musicState.js';

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

test('a guesser never receives the answer until it is revealed', () => {
  const invited = reduceMusic(null, { type: 'guess-invite', pickerId: 'picker', guesserId: 'guesser' }, 'picker', 1_000, 'chat');
  const started = reduceMusic(invited.next, {
    type: 'guess-start',
    track,
    seconds: 60,
  }, 'picker', 2_000, 'chat');
  const hidden = projectMusic(started.next as RoomMusic, 'guesser');
  assert.equal(hidden.mystery, true);
  assert.equal(hidden.title, undefined);
  assert.equal(hidden.artist, undefined);
  assert.equal(hidden.trackId, undefined);
  assert.equal(hidden.audioUrl?.startsWith('/api/music/mystery/'), true);
  assert.equal(hidden.audioUrl?.includes('pink-room'), false);
  const picker = projectMusic(started.next as RoomMusic, 'picker');
  assert.equal(picker.title, 'Pink Room');
  assert.equal(picker.sealed, true);
  const spoken = reduceMusic(started.next, { type: 'guess-submit', text: 'pink rome' }, 'guesser', 3_000, 'chat');
  assert.equal(spoken.next?.game?.revealed, false);
  assert.equal(spoken.next?.game?.lastGuess?.pending, true);
  assert.equal(projectMusic(spoken.next as RoomMusic, 'guesser').title, undefined);
  const blocked = reduceMusic(spoken.next, { type: 'guess-judge', correct: true }, 'guesser', 3_500, 'chat');
  assert.equal(blocked.changed, false);
  const marked = reduceMusic(spoken.next, { type: 'guess-judge', correct: true }, 'picker', 4_000, 'chat');
  assert.equal(marked.next?.game?.revealed, true);
  assert.equal(projectMusic(marked.next as RoomMusic, 'guesser').title, 'Pink Room');
  assert.equal(marked.next?.game?.scores.guesser, 1);
});

test('a guess loops a short clip until someone scores, and a named hint stays hidden', () => {
  const invited = reduceMusic(null, { type: 'guess-invite', pickerId: 'picker', guesserId: 'guesser' }, 'picker', 1_000, 'chat');
  const started = reduceMusic(invited.next, {
    type: 'guess-start',
    track,
    seconds: 10,
  }, 'picker', 2_000, 'chat');
  assert.equal(started.next?.game?.clipSeconds, 10);
  assert.equal(started.next?.game?.revealAt, null);
  const paused = reduceMusic(started.next, { type: 'pause' }, 'picker', 14_000, 'chat');
  assert.equal(paused.next?.position, 2);
  assert.equal(expireGuess(started.next, 40_000).changed, false);
  const hint = reduceMusic(started.next, { type: 'guess-hint', text: 'soft opening' }, 'picker', 3_000, 'chat');
  const hidden = projectMusic(hint.next as RoomMusic, 'guesser');
  assert.equal(hidden.title, undefined);
  assert.equal(hidden.clipSeconds, 10);
  assert.deepEqual(hidden.hints, ['soft opening']);
  const spoiler = reduceMusic(hint.next, { type: 'guess-hint', text: 'Pink Room' }, 'picker', 4_000, 'chat');
  assert.equal(spoiler.changed, false);
  assert.equal(spoiler.next?.game?.hints.length, 1);
  const swapped = reduceMusic(hint.next, {
    type: 'guess-next',
    pickerId: 'guesser',
    guesserId: 'picker',
  }, 'guesser', 5_000, 'chat');
  const replay = reduceMusic(swapped.next, { type: 'guess-start', track, seconds: 10 }, 'guesser', 6_000, 'chat');
  const spoken = reduceMusic(replay.next, { type: 'guess-submit', text: 'Pink Room' }, 'picker', 7_000, 'chat');
  assert.equal(spoken.next?.game?.revealed, false);
  const won = reduceMusic(spoken.next, { type: 'guess-judge', correct: true }, 'guesser', 8_000, 'chat');
  assert.equal(won.next?.game?.revealed, true);
  assert.equal(won.next?.game?.scores.picker, 1);
});

test('guess matching accepts a casual title and ignores a near miss', () => {
  assert.equal(guessMatches('Is it Pink Room?', 'Pink Room', 'Toodle Originals'), true);
  assert.equal(guessMatches('pink', 'Pink Room', 'Toodle Originals'), true);
  assert.equal(guessMatches('pin', 'Pink Room'), false);
  assert.equal(guessMatches('rooms', 'Pink Room'), false);
});
