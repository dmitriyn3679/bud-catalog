import { api } from '../../api/axios';
import type { Order, Paginated, User } from '../../types';

export const profileApi = {
  getOrders: async (page = 1): Promise<Paginated<Order>> => {
    const res = await api.get<Paginated<Order>>('/orders', { params: { page, limit: 10 } });
    return res.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get<Order>(`/orders/${id}`);
    return res.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; address?: string }): Promise<User> => {
    const res = await api.patch<User>('/users/me', data);
    return res.data;
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/auth/change-password', data);
  },
};
