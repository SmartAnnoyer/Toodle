import assert from 'node:assert/strict';
import test from 'node:test';
import { usernameAvailability, validateUsername } from '../src/utils/username.js';

test('accepts a normal username', () => {
  const result = validateUsername('@Akki');
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.username, 'akki');
});

test('rejects short and weird usernames', () => {
  assert.equal(validateUsername('ab').ok, false);
  assert.equal(validateUsername('has space').ok, false);
  assert.equal(validateUsername('no-dash').ok, false);
});

test('username availability respects the current owner', () => {
  assert.equal(usernameAvailability('moon', null).available, true);
  assert.equal(usernameAvailability('moon', 'user-1').available, false);
  assert.equal(usernameAvailability('moon', 'user-1', 'user-1').available, true);
});
