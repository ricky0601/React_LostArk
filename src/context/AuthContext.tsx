import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '../lib/supabase';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'unavailable';

interface AuthContextValue {
  readonly status: AuthStatus;
  readonly session: Session | null;
  readonly user: User | null;
  readonly isBusy: boolean;
  readonly errorMessage: string | null;
  readonly errorScope: 'callback' | 'action' | null;
  signInWithDiscord(): Promise<void>;
  signOut(): Promise<void>;
  clearError(): void;
}

const unavailableValue: AuthContextValue = {
  status: 'unavailable',
  session: null,
  user: null,
  isBusy: false,
  errorMessage: null,
  errorScope: null,
  signInWithDiscord: async () => undefined,
  signOut: async () => undefined,
  clearError: () => undefined,
};

const AuthContext = createContext<AuthContextValue>(unavailableValue);
const callbackExchanges = new Map<string, ReturnType<NonNullable<ReturnType<typeof getSupabaseBrowserClient>>['auth']['exchangeCodeForSession']>>();

const exchangeCallbackCode = (code: string) => {
  const existing = callbackExchanges.get(code);
  if (existing) return existing;

  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const exchange = client.auth.exchangeCodeForSession(code);
  callbackExchanges.set(code, exchange);
  return exchange;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<AuthStatus>(client ? 'loading' : 'unavailable');
  const [session, setSession] = useState<Session | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<'callback' | 'action' | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setErrorScope(null);
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
    };

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    const initialize = async () => {
      const params = new URLSearchParams(window.location.search);
      const isCallbackRoute = window.location.pathname === '/auth/callback';
      const callbackError = isCallbackRoute ? params.get('error') : null;
      const code = isCallbackRoute ? params.get('code') : null;

      if (callbackError) {
        if (!active) return;
        setErrorMessage('Discord 로그인이 취소되었거나 완료되지 않았습니다. 다시 시도해 주세요.');
        setErrorScope('callback');
        applySession(null);
        return;
      }

      try {
        const result = code
          ? await exchangeCallbackCode(code)
          : await client.auth.getSession();

        if (!active || !result) return;
        if (result.error) {
          setErrorMessage('로그인 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          setErrorScope(isCallbackRoute ? 'callback' : 'action');
          applySession(null);
          return;
        }
        applySession(result.data.session);
      } catch {
        if (!active) return;
        setErrorMessage('로그인 서버에 연결하지 못했습니다. 공개 기능은 계속 이용할 수 있습니다.');
        setErrorScope(isCallbackRoute ? 'callback' : 'action');
        applySession(null);
      }
    };

    void initialize();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [client]);

  const signInWithDiscord = useCallback(async () => {
    if (!client) return;
    setIsBusy(true);
    clearError();
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErrorMessage('Discord 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setErrorScope('action');
      }
    } catch {
      setErrorMessage('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrorScope('action');
    } finally {
      setIsBusy(false);
    }
  }, [clearError, client]);

  const signOut = useCallback(async () => {
    if (!client) return;
    setIsBusy(true);
    clearError();
    try {
      const { error } = await client.auth.signOut();
      if (error) {
        setErrorMessage('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        setErrorScope('action');
      } else {
        setSession(null);
        setStatus('anonymous');
      }
    } catch {
      setErrorMessage('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrorScope('action');
    } finally {
      setIsBusy(false);
    }
  }, [clearError, client]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    user: session?.user ?? null,
    isBusy,
    errorMessage,
    errorScope,
    signInWithDiscord,
    signOut,
    clearError,
  }), [clearError, errorMessage, errorScope, isBusy, session, signInWithDiscord, signOut, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => useContext(AuthContext);
export { isSupabaseConfigured };
