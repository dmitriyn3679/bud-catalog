import { api } from '../../api/axios';
import type { Brand } from '../../types';

export interface BrandFormData {
  name: string;
  slug: string;
}

export const brandsApi = {
  getAll: async (): Promise<Brand[]> => {
    const res = await api.get<Brand[]>('/brands');
    return res.data;
  },

  create: async (data: BrandFormData): Promise<Brand> => {
    const res = await api.post<Brand>('/brands', data);
    return res.data;
  },

  update: async (id: string, data: Partial<BrandFormData>): Promise<Brand> => {
    const res = await api.put<Brand>(`/brands/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
};
