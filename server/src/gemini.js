class GeminiApiError extends Error {
  constructor(status) {
    super(`Gemini API returned HTTP ${status}.`);
    this.name = 'GeminiApiError';
    this.status = status;
  }
}

async function generateGeminiReply({
  apiKey,
  baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  model = 'gemini-3.6-flash',
  systemPrompt,
  messages,
}) {
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map(({ role, content }) => ({
          role: role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content.trim() }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      }),
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    throw new GeminiApiError(response.status);
  }

  const result = await response.json();
  const reply = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text) => typeof text === 'string')
    .join('')
    .trim();

  return typeof reply === 'string' && reply ? reply : null;
}

module.exports = { GeminiApiError, generateGeminiReply };
