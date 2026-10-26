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
  assert.equal(pushChannel('message'), 'messages_v2');
  assert.equal(pushChannel('request'), 'requests_v2');
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
  const data = first.message.data as { title: string; body: string; channelId: string };
  assert.equal(data.title, 'Ava');
  assert.equal(data.body, 'hey');
  assert.equal(data.channelId, 'messages_v2');
  const android = first.message.android as { priority: string; collapse_key?: string; notification?: unknown };
  assert.equal(android.priority, 'HIGH');
  assert.equal(android.collapse_key, undefined);
  assert.equal(android.notification, undefined);
  assert.equal(first.message.notification, undefined);
  const apns = first.message.apns as { headers: { 'apns-priority': string } };
  assert.equal(apns.headers['apns-priority'], '10');
});
