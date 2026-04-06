import { api, setAccessToken } from '../../api/axios';
import { User } from '../../types';

interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  register: async (data: { email: string; password: string; name: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const res = await api.post<{ accessToken: string }>('/auth/refresh');
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    setAccessToken(null);
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/auth/change-password', data);
    setAccessToken(null);
  },
};
