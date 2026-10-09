import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFcmMessage, pushChannel, pushTag, shouldDeliver } from '../src/services/push.js';

test('a person already looking at the chat does not get a push', () => {
  assert.equal(shouldDeliver(true), false);
  assert.equal(shouldDeliver(false), true);
});

test('messages for one chat share a tag and requests share another', () => {
  assert.equal(pushTag('message', { conversationId: 'abc' }), 'chat:abc');
  assert.equal(pushTag('read', { conversationId: 'abc' }), 'chat:abc');
  assert.equal(pushTag('request', { requestId: '1' }), 'requests');
  assert.equal(pushTag('request_accepted', {}), 'requests');
  assert.equal(pushChannel('message'), 'messages');
  assert.equal(pushChannel('request'), 'requests');
});

test('each device token gets its own message and iOS is included', () => {
  const first = buildFcmMessage('token-a', {
    type: 'message',
    title: 'Ava',
    body: 'hey',
    payload: { conversationId: 'abc', messageId: 'm1' },
  });
  const second = buildFcmMessage('token-b', {
    type: 'message',
    title: 'Ava',
    body: 'hey',
    payload: { conversationId: 'abc', messageId: 'm1' },
  });
  assert.equal(first.message.token, 'token-a');
  assert.equal(second.message.token, 'token-b');
  assert.equal((first.message.data as { messageId: string }).messageId, 'm1');
  const apns = first.message.apns as { headers: { 'apns-collapse-id': string } };
  assert.equal(apns.headers['apns-collapse-id'], 'chat:abc');
});
