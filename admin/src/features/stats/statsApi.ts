import { api } from '../../api/axios';
import type { Stats } from '../../types';

export const statsApi = {
  getStats: async (params?: { categoryId?: string; productId?: string; dateFrom?: string; dateTo?: string }): Promise<Stats> => {
    const res = await api.get<Stats>('/admin/stats', { params });
    return res.data;
  },
};
