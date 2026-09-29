import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeSend, canDeleteMessage, decideRequestAction } from '../src/engines/access.js';

test('only the recipient can accept a pending ping', () => {
  const accepted = decideRequestAction({
    action: 'accept',
    status: 'pending',
    toUserId: 'b',
    actorId: 'b',
  });
  assert.deepEqual(accepted, { ok: true, status: 'accepted' });

  const stranger = decideRequestAction({
    action: 'accept',
    status: 'pending',
    toUserId: 'b',
    actorId: 'a',
  });
  assert.equal(stranger.ok, false);

  const already = decideRequestAction({
    action: 'ignore',
    status: 'accepted',
    toUserId: 'b',
    actorId: 'b',
  });
  assert.equal(already.ok, false);
});

test('message send authorization follows membership and chat status', () => {
  assert.equal(authorizeSend({ isMember: true, hasLeft: false, status: 'active' }).ok, true);
  assert.equal(authorizeSend({ isMember: false, hasLeft: false, status: 'active' }).ok, false);
  assert.equal(authorizeSend({ isMember: true, hasLeft: true, status: 'active' }).ok, false);
  assert.equal(authorizeSend({ isMember: true, hasLeft: false, status: 'expired' }).ok, false);
});

test('only the sender can delete a message', () => {
  assert.equal(canDeleteMessage('a', 'a'), true);
  assert.equal(canDeleteMessage('a', 'b'), false);
  assert.equal(canDeleteMessage(null, 'a'), false);
});
