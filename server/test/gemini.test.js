const assert = require('node:assert/strict');
const { test } = require('node:test');

const { GeminiApiError, generateGeminiReply } = require('../src/gemini');

test('Gemini requests keep the API key in the header and map chat roles', async () => {
  const originalFetch = global.fetch;
  let requestUrl;
  let requestOptions;
  global.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'A gentle ' }, { text: 'reply.' }] } }],
      }),
    };
  };

  try {
    const reply = await generateGeminiReply({
      apiKey: 'test-api-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
      model: 'gemini-3.6-flash',
      systemPrompt: 'Be kind.',
      messages: [
        { role: 'user', content: '  Hello  ' },
        { role: 'assistant', content: 'Hi there.' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    assert.equal(reply, 'A gentle reply.');
    assert.equal(
      requestUrl,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    );
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers['x-goog-api-key'], 'test-api-key');

    const body = JSON.parse(requestOptions.body);
    assert.deepEqual(body.systemInstruction, { parts: [{ text: 'Be kind.' }] });
    assert.deepEqual(body.contents, [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there.' }] },
      { role: 'user', parts: [{ text: 'How are you?' }] },
    ]);
    assert.deepEqual(body.generationConfig, { temperature: 0.7, maxOutputTokens: 300 });
  } finally {
    global.fetch = originalFetch;
  }
});

test('Gemini provider errors expose the HTTP status without response secrets', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 403 });

  try {
    await assert.rejects(
      generateGeminiReply({
        apiKey: 'test-api-key',
        messages: [{ role: 'user', content: 'Hello.' }],
        systemPrompt: 'Be kind.',
      }),
      (error) => error instanceof GeminiApiError && error.status === 403 && !error.message.includes('test-api-key'),
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Gemini responses without generated text return null', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [] } }] }),
  });

  try {
    const reply = await generateGeminiReply({
      apiKey: 'test-api-key',
      messages: [{ role: 'user', content: 'Hello.' }],
      systemPrompt: 'Be kind.',
    });
    assert.equal(reply, null);
  } finally {
    global.fetch = originalFetch;
  }
});
