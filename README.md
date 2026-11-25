# Solace

Solace is a React Native / Expo wellness companion prototype with mood check-ins, a gentle reflection chat, a breathing pause, and a weekly reflection view.

## What’s included

- **Expo Router mobile app:** Today and Your space tabs, mood and optional journal-note check-ins, an AI reflection chat, and a guided breathing pause.
- **Guest browsing:** The Today homepage is available without an account. Sign in or create an account when opening check-ins, chat, breathing exercises, or private reflections.
- **Accounts:** Sign up and sign in with an email and password. Passwords are hashed on the API, and signed-in sessions are revocable.
- **Node.js API:** Express endpoints for authentication, check-ins, weekly reflections, and AI chat.
- **MongoDB persistence:** Accounts, check-ins, and AI conversation turns are saved by the API. Check-ins and chat requests are scoped to the signed-in account.
- **Private session storage:** Mobile session tokens use Expo SecureStore; browser sessions use per-tab session storage.
- **AI companion:** The server calls the Gemini GenerateContent API. The provider key stays on the server and is never bundled into the app.
- **Wellness guardrails:** The companion is not a therapist or diagnostic tool; the API responds to clear self-harm crisis language with crisis-support directions.

## Run the API

Requirements: Node.js 20+ and a reachable MongoDB instance. AI chat additionally needs a Gemini API key.

In PowerShell:

```powershell
cd server
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm install
```

Set `MONGODB_URI` in `server/.env`. The server binds to `0.0.0.0` in development so a phone on your local network can reach it. `AI_PROVIDER`, `AI_BASE_URL`, and `AI_MODEL` default to Gemini settings. Keep your Gemini key in `AI_API_KEY` in `server/.env`. To run only the API:

```powershell
npm run dev
```

The API listens on port `4000`. Check that MongoDB is available and visit `http://localhost:4000/api/health` on the computer running the API.

Gemini uses the `generateContent` endpoint. If you intentionally use an OpenAI-compatible provider instead, set `AI_PROVIDER=openai-compatible` and configure its `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`. AI chat returns a configuration error until a provider key is set; it does not pretend an offline response came from AI.

## Run the app and API

After configuring `server/.env` as described above, run these commands from the project root. Install the API dependencies once from its directory, then return to the project root. This starts the API and Expo together in the current terminal, so Expo can display its QR code and accept keyboard shortcuts such as `a`; press Ctrl+C to stop both.

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
cd server
npm install
cd ..
npm start
```

The API-only command is `npm run dev` from the `server` directory.

The checked-in app `.env.example` uses `http://10.226.209.111:4000/api` for the API. On web, this configured address is automatically replaced with `http://localhost:4000/api`. For a physical phone, use your computer’s current LAN IP in `EXPO_PUBLIC_API_URL`; keep both devices on the same network and allow port 4000 through the computer’s firewall if prompted. Restart Expo after changing `.env`.

Sign-up, sign-in, check-ins, and reflections require the API and MongoDB to be reachable. AI chat additionally requires a valid Gemini `AI_API_KEY` in `server/.env`; without it, the API returns a configuration error rather than an AI reply.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | API and MongoDB readiness |
| `POST` | `/api/auth/signup` | Create an account and sign in |
| `POST` | `/api/auth/login` | Sign in to an existing account |
| `GET` | `/api/auth/me` | Get the current signed-in account |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `POST` | `/api/check-ins` | Save a mood and optional note (authentication required) |
| `GET` | `/api/insights` | Recent check-ins and last-week counts (authentication required) |
| `POST` | `/api/chat` | Get and persist an AI companion response (authentication required) |

This is a hackathon prototype. It does not yet include email verification, password recovery, account deletion, or production privacy/retention safeguards. Use disposable development data and do not deploy it publicly with real sensitive reflections until those safeguards are in place. The companion is for general wellness, not medical or emergency care.
