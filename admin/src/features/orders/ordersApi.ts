import { api } from '../../api/axios';
import type { AdminOrder, Paginated } from '../../types';

export const ordersApi = {
  getAll: async (params?: { status?: string; page?: number; limit?: number }): Promise<Paginated<AdminOrder>> => {
    const res = await api.get<Paginated<AdminOrder>>('/admin/orders', { params });
    return res.data;
  },

  getById: async (id: string): Promise<AdminOrder> => {
    const res = await api.get<AdminOrder>(`/admin/orders/${id}`);
    return res.data;
  },

  updateStatus: async (id: string, status: AdminOrder['status']): Promise<AdminOrder> => {
    const res = await api.patch<AdminOrder>(`/admin/orders/${id}/status`, { status });
    return res.data;
  },
};
