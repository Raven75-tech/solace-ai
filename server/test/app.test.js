const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const originalApiKey = process.env.AI_API_KEY;
delete process.env.AI_API_KEY;

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  if (originalApiKey !== undefined) process.env.AI_API_KEY = originalApiKey;
});

test('health reports that MongoDB is not ready before a database connection', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable', database: 'disconnected' });
});

test('check-ins require an authenticated account', async () => {
  const response = await fetch(`${baseUrl}/api/check-ins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood: 'angry' }),
  });
  assert.equal(response.status, 401);
});

test('insights require an authenticated account', async () => {
  const response = await fetch(`${baseUrl}/api/insights`);
  assert.equal(response.status, 401);
});

test('current-user route requires a valid session', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(response.status, 401);
});

test('chat requires an authenticated account', async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: 'test', messages: [{ role: 'system', content: 'hello' }] }),
  });
  assert.equal(response.status, 401);
});

test('signup validates account details before accessing MongoDB', async () => {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Solace User', email: 'not-an-email', password: 'long-enough-password' }),
  });
  assert.equal(response.status, 400);
});

test('login uses a generic response for invalid credentials', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-an-email',
      password: 'incorrect-password',
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'Email or password is incorrect.');
});
