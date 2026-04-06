import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from './categoriesApi';
import type { CategoryFormData } from './categoriesApi';

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoriesApi.getTree,
    staleTime: 0,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryFormData) => categoriesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CategoryFormData>) => categoriesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-categories'] }),
  });
}
