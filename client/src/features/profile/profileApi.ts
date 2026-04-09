import { api } from '../../api/axios';
import type { Order, Paginated, User } from '../../types';

export interface OrderFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const profileApi = {
  getOrders: async (page = 1, filters: OrderFilters = {}): Promise<Paginated<Order>> => {
    const params: Record<string, unknown> = { page, limit: 10 };
    if (filters.status) params.status = filters.status;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    const res = await api.get<Paginated<Order>>('/orders', { params });
    return res.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const res = await api.get<Order>(`/orders/${id}`);
    return res.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; shopName?: string; city?: string; address?: string }): Promise<User> => {
    const res = await api.patch<User>('/users/me', data);
    return res.data;
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    await api.patch('/auth/change-password', data);
  },

  reorder: async (orderId: string): Promise<{ added: number; clamped: number; skipped: number }> => {
    const res = await api.post(`/orders/${orderId}/reorder`);
    return res.data;
  },
};
