import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canUseShortcut,
  executeShortcut,
  isAllowedAction,
  parseTrigger,
  pickShortcut,
  type ShortcutRecord,
} from '../src/engines/shortcutEngine.js';

function shortcut(overrides: Partial<ShortcutRecord>): ShortcutRecord {
  return {
    id: 's1',
    ownerId: 'owner',
    trigger: '/idiot',
    type: 'TEXT',
    content: 'You absolute idiot 😂❤️',
    actionType: null,
    visibility: 'private',
    conversationId: null,
    ...overrides,
  };
}

test('private shortcuts work for the owner and nobody else', () => {
  const item = shortcut({});
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'owner',
    conversationId: 'c1',
    share: null,
    isConversationMember: true,
  }), true);
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: { shortcutId: 's1', recipientId: 'friend', status: 'ACCEPTED' },
    isConversationMember: true,
  }), false);
});

test('a shared shortcut works only after it is accepted', () => {
  const item = shortcut({ visibility: 'shared' });
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: { shortcutId: 's1', recipientId: 'friend', status: 'PENDING' },
    isConversationMember: true,
  }), false);
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: { shortcutId: 's1', recipientId: 'friend', status: 'ACCEPTED' },
    isConversationMember: true,
  }), true);
});

test('revoking a shortcut stops it for the recipient', () => {
  const item = shortcut({ visibility: 'shared' });
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: { shortcutId: 's1', recipientId: 'friend', status: 'REVOKED' },
    isConversationMember: true,
  }), false);
});

test('conversation shortcuts stay inside that chat', () => {
  const item = shortcut({ visibility: 'conversation', conversationId: 'c1' });
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: null,
    isConversationMember: true,
  }), true);
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c2',
    share: null,
    isConversationMember: true,
  }), false);
  assert.equal(canUseShortcut({
    shortcut: item,
    userId: 'friend',
    conversationId: 'c1',
    share: null,
    isConversationMember: false,
  }), false);
});

test('chat-specific shortcuts win over a global one', () => {
  const globalOne = shortcut({ id: 'global', trigger: '/love', content: 'hey' });
  const local = shortcut({
    id: 'local',
    trigger: '/love',
    content: 'I love you ❤️',
    visibility: 'conversation',
    conversationId: 'c1',
  });
  const picked = pickShortcut([globalOne, local], 'owner', 'c1', [], true);
  assert.equal(picked?.id, 'local');
});

test('only predefined actions can run', () => {
  assert.equal(isAllowedAction('ghost'), true);
  assert.equal(isAllowedAction('eval'), false);
  assert.equal(isAllowedAction('process'), false);

  const bad = executeShortcut(shortcut({
    type: 'ACTION',
    actionType: 'rm -rf',
    content: '',
  }));
  assert.ok('error' in bad);

  const shrug = executeShortcut(shortcut({
    type: 'SYSTEM',
    actionType: 'shrug',
    content: '',
  }));
  assert.equal('kind' in shrug && shrug.kind === 'text', true);

  assert.equal(parseTrigger('  /GM '), '/gm');
  assert.equal(parseTrigger('hello /gm'), null);
});
