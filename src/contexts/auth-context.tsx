import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import {
  ApiError,
  getCurrentUser,
  setAuthToken,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  type AuthUser,
} from '@/lib/api';

const TOKEN_KEY = 'solace.authToken';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authError: string;
  authRequested: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestAuth: (onAuthenticated?: () => void) => void;
  cancelAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readToken() {
  if (Platform.OS === 'web') {
    try {
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY);
    } catch {
      throw new Error('Secure browser session storage is unavailable.');
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(TOKEN_KEY, token);
      return;
    } catch {
      throw new Error('Could not securely save your sign-in on this browser.');
    }
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function removeToken() {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(TOKEN_KEY);
      return;
    } catch {
      throw new Error('Could not clear your saved browser session.');
    }
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authRequested, setAuthRequested] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      let token: string | null = null;
      try {
        token = await readToken();
        if (token) {
          setAuthToken(token);
          const result = await getCurrentUser();
          if (active) setUser(result.user);
        }
      } catch (reason) {
        setAuthToken(null);
        if (reason instanceof ApiError && reason.status === 401) {
          try {
            await removeToken();
          } catch (storageError) {
            if (active) setAuthError(errorMessage(storageError));
          }
        } else if (active) {
          setAuthError(errorMessage(reason));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const acceptSession = useCallback(async (result: { user: AuthUser; token: string }) => {
    await storeToken(result.token);
    setAuthToken(result.token);
    setUser(result.user);
    setAuthError('');
    setAuthRequested(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await acceptSession(await signInRequest(email, password));
  }, [acceptSession]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await acceptSession(await signUpRequest(name, email, password));
  }, [acceptSession]);

  const signOut = useCallback(async () => {
    pendingAction.current = null;
    setAuthRequested(false);
    let failure = '';
    try {
      await removeToken();
    } catch (reason) {
      failure = errorMessage(reason);
    }

    try {
      await signOutRequest();
    } catch (reason) {
      failure = failure
        ? `${failure} The server session could not be revoked: ${errorMessage(reason)}`
        : `You’re signed out on this device, but the server session could not be revoked: ${errorMessage(reason)}`;
    } finally {
      setAuthToken(null);
      setUser(null);
      setAuthError(failure);
    }
  }, []);

  const requestAuth = useCallback((onAuthenticated?: () => void) => {
    if (user) {
      onAuthenticated?.();
      return;
    }

    pendingAction.current = onAuthenticated ?? null;
    setAuthRequested(true);
  }, [user]);

  const cancelAuth = useCallback(() => {
    pendingAction.current = null;
    setAuthRequested(false);
  }, []);

  const value = useMemo(
    () => ({ user, loading, authError, authRequested, signIn, signUp, signOut, requestAuth, cancelAuth }),
    [user, loading, authError, authRequested, signIn, signUp, signOut, requestAuth, cancelAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
