import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, isSessionValid } from '../functions/_lib/auth.js';

test('session rejects expiry and tampering', async () => {
  const secret = 'test-secret-that-is-not-used-in-production';
  const session = await createSession(secret, 1_000);
  assert.equal(await isSessionValid(session.value, secret, 1_001), true);
  assert.equal(await isSessionValid(session.value, secret, 1_000 + 12 * 60 * 60 * 1000 + 1), false);
  assert.equal(await isSessionValid(`${session.value}x`, secret, 1_001), false);
});
