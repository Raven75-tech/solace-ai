const cors = require('cors');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { AuthSession, CheckIn, ChatTurn, User } = require('./models');
const { createSession, hashPassword, publicUser, requireAuth, verifyPassword } = require('./auth');
const { GeminiApiError, generateGeminiReply } = require('./gemini');

const app = express();
const moodValues = new Set(['very-low', 'low', 'okay', 'good', 'great']);
const crisisPattern =
  /\b(suicid(?:e|al)|kill myself|end my life|hurt myself|self[- ]?harm|don['’]?t want to live)\b/i;
const crisisReply =
  'I’m really sorry you’re carrying this. You deserve immediate support from a person who can be with you. If you may act soon, call your local emergency number or go to the nearest emergency department. In the U.S. or Canada, call or text 988; elsewhere, visit https://findahelpline.com to find a local crisis line. If you can, reach out to someone you trust and tell them you need support right now.';

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '16kb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please wait a little and try again.' },
  }),
);

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return '';
  return normalized;
}

app.post('/api/auth/signup', async (req, res, next) => {
  const { name, email, password } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName || trimmedName.length > 80) {
    return res.status(400).json({ error: 'Enter a name that is 1 to 80 characters long.' });
  }
  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Choose a password between 8 and 128 characters.' });
  }

  try {
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
    });
    const { token } = await createSession(user._id);
    return res.status(201).json({ user: publicUser(user), token });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
    }
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const { token } = await createSession(user._id);
    return res.json({ user: publicUser(user), token });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ user: publicUser(req.auth.user) });
});

app.post('/api/auth/logout', requireAuth, async (req, res, next) => {
  try {
    await AuthSession.deleteOne({ _id: req.auth.sessionId, tokenHash: req.auth.tokenHash });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get('/api/health', (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
  return res.json({ status: 'ok', database: 'connected' });
});

app.post('/api/check-ins', requireAuth, async (req, res, next) => {
  const { mood, note = '' } = req.body ?? {};
  if (!moodValues.has(mood)) {
    return res.status(400).json({ error: 'Choose one of the available moods to save your check-in.' });
  }
  if (typeof note !== 'string' || note.length > 500) {
    return res.status(400).json({ error: 'A check-in note must be 500 characters or fewer.' });
  }

  try {
    const checkIn = await CheckIn.create({ userId: req.auth.userId, mood, note: note.trim() });
    return res.status(201).json({
      checkIn: {
        mood: checkIn.mood,
        note: checkIn.note,
        createdAt: checkIn.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/insights', requireAuth, async (req, res, next) => {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 6);

  try {
    const recentCheckIns = await CheckIn.find({ userId: req.auth.userId, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const uniqueDays = new Set(recentCheckIns.map((item) => item.createdAt.toISOString().slice(0, 10)));

    return res.json({
      checkInCount: recentCheckIns.length,
      daysCheckedIn: uniqueDays.size,
      recentCheckIns: recentCheckIns.map((item) => ({
        mood: item.mood,
        note: item.note,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/chat', requireAuth, async (req, res, next) => {
  const { conversationId, messages } = req.body ?? {};
  if (
    typeof conversationId !== 'string' ||
    conversationId.length < 1 ||
    conversationId.length > 100 ||
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > 10
  ) {
    return res.status(400).json({ error: 'Send a conversation ID and up to 10 recent messages.' });
  }

  const validMessages = messages.every(
    (message) =>
      message &&
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0 &&
      message.content.length <= 2000,
  );
  if (!validMessages || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Messages must have a valid role and non-empty text of 2,000 characters or fewer.' });
  }

  const latestMessage = messages[messages.length - 1].content.trim();
  try {
    let reply;
    if (crisisPattern.test(latestMessage)) {
      reply = crisisReply;
    } else {
      const apiKey = process.env.AI_API_KEY;
      const aiProvider = process.env.AI_PROVIDER || 'gemini';
      const aiBaseUrl = process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
      const aiModel = process.env.AI_MODEL || 'gemini-3.6-flash';
      if (!apiKey) {
        return res.status(503).json({
          error: 'AI chat is not configured yet. Add AI_API_KEY to server/.env, then restart the API.',
        });
      }

      const systemPrompt =
        'You are Solace, a warm, calm wellness companion. Listen carefully, reflect feelings without judgment, and offer one small optional grounding idea or gentle question. Keep replies concise and human. Never diagnose, claim to provide therapy, or replace professional care. Do not prescribe medication. If someone may be in immediate danger, encourage contacting local emergency services and a trusted person.';

      if (aiProvider === 'gemini') {
        try {
          reply = await generateGeminiReply({
            apiKey,
            baseUrl: aiBaseUrl,
            model: aiModel,
            systemPrompt,
            messages,
          });
        } catch (error) {
          if (!(error instanceof GeminiApiError)) throw error;
          console.error(error.message);
          return res.status(502).json({ error: 'The AI companion could not respond right now. Please try again in a moment.' });
        }
      } else if (aiProvider !== 'openai-compatible') {
        console.error(`Unsupported AI_PROVIDER value: ${aiProvider}.`);
        return res.status(503).json({ error: 'AI chat provider configuration is invalid. Check AI_PROVIDER in server/.env.' });
      }

      if (aiProvider === 'openai-compatible') {
        const aiResponse = await fetch(`${aiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiModel,
          temperature: 0.7,
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(({ role, content }) => ({ role, content: content.trim() })),
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!aiResponse.ok) {
        console.error(`AI provider returned HTTP ${aiResponse.status}.`);
        return res.status(502).json({ error: 'The AI companion could not respond right now. Please try again in a moment.' });
      }
      const completion = await aiResponse.json();
      reply = completion.choices?.[0]?.message?.content?.trim();
      }
      if (typeof reply !== 'string' || !reply) {
        console.error('AI provider returned no assistant message.');
        return res.status(502).json({ error: 'The AI companion returned an empty reply. Please try again.' });
      }
    }

    await ChatTurn.create({
      userId: req.auth.userId,
      conversationId,
      userMessage: latestMessage,
      assistantMessage: reply,
    });
    return res.json({ reply });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('Solace API request failed:', error);
  if (error?.name === 'MongooseError' || error?.name === 'MongoServerError' || error?.name === 'MongooseServerSelectionError') {
    return res.status(503).json({ error: 'The Solace database is unavailable. Check the MongoDB connection and try again.' });
  }
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return res.status(504).json({ error: 'The AI companion took too long to respond. Please try again.' });
  }
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
