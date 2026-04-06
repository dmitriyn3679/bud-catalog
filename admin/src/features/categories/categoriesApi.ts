import { api } from '../../api/axios';
import type { Category } from '../../types';

export interface CategoryFormData {
  name: string;
  slug: string;
  parentId: string | null;
}

export const categoriesApi = {
  getTree: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },

  create: async (data: CategoryFormData): Promise<Category> => {
    const res = await api.post<Category>('/categories', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CategoryFormData>): Promise<Category> => {
    const res = await api.put<Category>(`/categories/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};
