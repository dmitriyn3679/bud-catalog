import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '../../types';
import { setAccessToken } from '../../api/axios';
import { authApi } from './authApi';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    authApi
      .refresh()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return import('../../api/axios').then(({ api }) =>
          api.get<User>('/users/me').then((r) => setUser(r.data)),
        );
      })
      .catch(() => {
        /* guest */
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    const { accessToken, user } = await authApi.login({ login, password });
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  const register = useCallback(async (password: string, name: string, shopName: string, city: string, address: string, email?: string, phone?: string) => {
    const { accessToken, user } = await authApi.register({ email: email || undefined, phone: phone!, password, name, shopName, city, address });
    setAccessToken(accessToken);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
