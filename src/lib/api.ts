import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type Mood = 'very-low' | 'low' | 'okay' | 'good' | 'great';

export type CheckIn = {
  mood: Mood;
  note?: string;
  createdAt: string;
};

export type WeeklyInsight = {
  checkInCount: number;
  daysCheckedIn: number;
  recentCheckIns: CheckIn[];
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const localNetworkApiUrl = 'http://10.226.209.111:4000/api';
const expoHostUri = Constants.expoConfig?.hostUri;
const developmentHost = expoHostUri
  ? (() => {
      try {
        return new URL(expoHostUri.includes('://') ? expoHostUri : `http://${expoHostUri}`).hostname;
      } catch {
        return null;
      }
    })()
  : null;
const API_URL = (
  Platform.OS === 'web' && configuredApiUrl === localNetworkApiUrl
    ? 'http://localhost:4000/api'
    : configuredApiUrl ||
      (Platform.OS === 'web'
        ? 'http://localhost:4000/api'
        : developmentHost
          ? `http://${developmentHost}:4000/api`
          : '')
).replace(/\/$/, '');
let authToken: string | null = null;

export type AuthUser = { id: string; name: string; email: string };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error('Solace API URL is not configured. Set EXPO_PUBLIC_API_URL and restart the app.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      `Can’t reach the Solace API at ${API_URL}. Start the API, connect both devices to the same network, and set HOST=0.0.0.0 in server/.env.`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(payload.error || `The request didn’t complete (${response.status}).`, response.status);
  }
  return payload;
}

export function signUp(name: string, email: string, password: string) {
  return request<{ user: AuthUser; token: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function signIn(email: string, password: string) {
  return request<{ user: AuthUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser() {
  return request<{ user: AuthUser }>('/auth/me');
}

export function signOut() {
  return request<void>('/auth/logout', { method: 'POST' });
}

export function saveCheckIn(mood: Mood, note: string) {
  return request<{ checkIn: CheckIn }>('/check-ins', {
    method: 'POST',
    body: JSON.stringify({ mood, note }),
  });
}

export function getWeeklyInsight() {
  return request<WeeklyInsight>('/insights');
}

export function sendChatMessage(conversationId: string, messages: ChatMessage[]) {
  return request<{ reply: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ conversationId, messages }),
  });
}
