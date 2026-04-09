import { api } from '../../api/axios';
import type { Brand, Category, Paginated, Product } from '../../types';

export type SortOption = 'recommended' | 'price_asc' | 'price_desc';

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export const catalogApi = {
  getProducts: async (filters: ProductFilters): Promise<Paginated<Product>> => {
    const res = await api.get<Paginated<Product>>('/products', { params: filters });
    return res.data;
  },

  getProductById: async (id: string): Promise<Product> => {
    const res = await api.get<Product>(`/products/${id}`);
    return res.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },

  getBrands: async (): Promise<Brand[]> => {
    const res = await api.get<Brand[]>('/brands');
    return res.data;
  },
};
