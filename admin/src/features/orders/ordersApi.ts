import { api } from '../../api/axios';
import type { AdminOrder, Paginated, RetailUser } from '../../types';

export const ordersApi = {
  getAll: async (params?: { status?: string; isPaid?: boolean; page?: number; limit?: number; dateFrom?: string; dateTo?: string }): Promise<Paginated<AdminOrder>> => {
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

  updatePaid: async (id: string, isPaid: boolean): Promise<AdminOrder> => {
    const res = await api.patch<AdminOrder>(`/admin/orders/${id}/paid`, { isPaid });
    return res.data;
  },

  updateItems: async (id: string, items: Array<{ productId: string; quantity: number }>): Promise<AdminOrder> => {
    const res = await api.patch<AdminOrder>(`/admin/orders/${id}/items`, { items });
    return res.data;
  },

  updateActualPrices: async (
    id: string,
    items: Array<{ productId: string; price?: number | null; actualPurchasePrice?: number | null }>,
  ): Promise<{ order: AdminOrder; updatedProducts: number }> => {
    const res = await api.patch<{ order: AdminOrder; updatedProducts: number }>(`/admin/orders/${id}/actual-prices`, { items });
    return res.data;
  },

  getRetailUser: async (): Promise<RetailUser> => {
    const res = await api.get<RetailUser>('/admin/system/retail-user');
    return res.data;
  },

  create: async (data: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress: string;
    note?: string;
  }): Promise<AdminOrder> => {
    const res = await api.post<AdminOrder>('/admin/orders', data);
    return res.data;
  },
};
