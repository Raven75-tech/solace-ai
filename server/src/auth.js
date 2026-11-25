const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const { AuthSession, User } = require('./models');

const scrypt = promisify(scryptCallback);
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

async function verifyPassword(password, passwordHash) {
  const [algorithm, encodedSalt, encodedKey] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !encodedSalt || !encodedKey) return false;

  const salt = Buffer.from(encodedSalt, 'base64url');
  const expectedKey = Buffer.from(encodedKey, 'base64url');
  if (salt.length !== 16 || expectedKey.length !== 64) return false;

  const actualKey = await scrypt(password, salt, expectedKey.length);
  return timingSafeEqual(actualKey, expectedKey);
}

async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  const session = await AuthSession.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, session };
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

function requireAuth(req, res, next) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get('authorization') || '');
  if (!match) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  const tokenHash = hashToken(match[1]);
  void (async () => {
    const session = await AuthSession.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      await AuthSession.deleteOne({ _id: session._id });
      return res.status(401).json({ error: 'Your session is no longer valid. Please sign in again.' });
    }

    req.auth = { user, userId: user._id, sessionId: session._id, tokenHash };
    return next();
  })().catch(next);
}

module.exports = {
  createSession,
  hashPassword,
  hashToken,
  publicUser,
  requireAuth,
  verifyPassword,
};
