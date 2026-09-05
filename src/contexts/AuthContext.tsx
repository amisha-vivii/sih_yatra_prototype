import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError, getToken, setToken } from '../api/client';
import type { PublicUser } from '../types';

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {full_name: string;email: string;password: string;home_city: string;phone: string;}) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get<{user: PublicUser;}>('/api/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{token: string;user: PublicUser;}>('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: Parameters<AuthState['register']>[0]) => {
    const data = await api.post<{token: string;user: PublicUser;}>('/api/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // token already invalid on the service side — clearing locally is enough
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}