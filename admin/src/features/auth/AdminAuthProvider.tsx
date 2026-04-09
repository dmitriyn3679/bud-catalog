import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setAccessToken } from '../../api/axios';
import type { User } from '../../types';
import { AdminAuthContext } from './useAdminAuth';

async function tryRestoreSession(): Promise<{ token: string; user: User } | null> {
  try {
    const { data } = await api.post<{ accessToken: string }>('/admin/auth/refresh');
    setAccessToken(data.accessToken);
    const me = await api.get<User>('/users/me');
    if (me.data.role !== 'admin') return null;
    return { token: data.accessToken, user: me.data };
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    tryRestoreSession()
      .then((result) => { if (result) setUser(result.user); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: User }>('/admin/auth/login', { email, password });
    if (data.user.role !== 'admin') throw new Error('Access denied');
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/admin/auth/logout');
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
