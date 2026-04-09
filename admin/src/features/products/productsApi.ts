import { api } from '../../api/axios';
import type { AdminProduct, Brand, Category, Paginated } from '../../types';

export interface BulkUpdatePayload {
  markupPercent?: number;
  isActive?: boolean;
  isPromo?: boolean;
  hidePrice?: boolean;
  unlimitedStock?: boolean;
}

export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  categoryId: string;
  brandId: string;
  stock: number;
  isActive: boolean;
}

export const productsApi = {
  getAll: async (params?: { search?: string; page?: number; limit?: number; brand?: string; category?: string }): Promise<Paginated<AdminProduct>> => {
    const res = await api.get<Paginated<AdminProduct>>('/products/admin/list', { params });
    return res.data;
  },

  getById: async (id: string): Promise<AdminProduct> => {
    const res = await api.get<AdminProduct>(`/products/admin/${id}`);
    return res.data;
  },

  create: async (data: ProductFormData): Promise<AdminProduct> => {
    const res = await api.post<AdminProduct>('/products', data);
    return res.data;
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<AdminProduct> => {
    const res = await api.put<AdminProduct>(`/products/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  uploadImages: async (id: string, files: File[]): Promise<AdminProduct['images']> => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    const res = await api.post<AdminProduct['images']>(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteImage: async (id: string, publicId: string): Promise<void> => {
    await api.delete(`/products/${id}/images/${encodeURIComponent(publicId)}`);
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },

  getBrands: async (): Promise<Brand[]> => {
    const res = await api.get<Brand[]>('/brands');
    return res.data;
  },

  bulkUpdate: async (ids: string[], updates: BulkUpdatePayload): Promise<void> => {
    await api.patch('/products/bulk', { ids, updates });
  },
};
