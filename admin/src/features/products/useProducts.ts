import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from './productsApi';
import type { BulkUpdatePayload, ProductFormData } from './productsApi';

export function useAdminProducts(params?: { search?: string; page?: number; brand?: string; category?: string }) {
  const { search, page = 1, brand, category } = params ?? {};
  return useQuery({
    queryKey: ['admin-products', search, page, brand, category],
    queryFn: () => productsApi.getAll({ search, page, limit: 20, brand, category }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  });
}

export function useAdminCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: productsApi.getCategories, staleTime: 5 * 60 * 1000 });
}

export function useAdminBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: productsApi.getBrands, staleTime: 5 * 60 * 1000 });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProductFormData>) => productsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product', id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}

export function useUploadImages(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => productsApi.uploadImages(id, files),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-product', id] }),
  });
}

export function useDeleteImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) => productsApi.deleteImage(id, publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-product', id] }),
  });
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: BulkUpdatePayload }) =>
      productsApi.bulkUpdate(ids, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });
}
