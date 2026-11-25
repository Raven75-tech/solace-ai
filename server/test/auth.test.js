const assert = require('node:assert/strict');
const { test } = require('node:test');

const { hashPassword, hashToken, verifyPassword } = require('../src/auth');

test('passwords are stored as salted scrypt hashes and can be verified', async () => {
  const password = 'a secure test password';
  const passwordHash = await hashPassword(password);

  assert.match(passwordHash, /^scrypt\$/);
  assert.notEqual(passwordHash, password);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword('a different password', passwordHash), false);
});

test('session tokens are represented by a one-way hash', () => {
  const token = 'an opaque session token';
  const tokenHash = hashToken(token);

  assert.notEqual(tokenHash, token);
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
});
