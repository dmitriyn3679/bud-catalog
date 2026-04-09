import { createContext, useContext } from 'react';
import type { User } from '../../types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User) => void;
  login: (login: string, password: string) => Promise<void>;
  register: (password: string, name: string, shopName: string, city: string, address: string, email?: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
