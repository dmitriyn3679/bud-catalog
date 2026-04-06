import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from './brandsApi';
import type { BrandFormData } from './brandsApi';

export function useAdminBrands() {
  return useQuery({
    queryKey: ['admin-brands'],
    queryFn: brandsApi.getAll,
    staleTime: 0,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BrandFormData) => brandsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-brands'] }),
  });
}

export function useUpdateBrand(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BrandFormData>) => brandsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-brands'] }),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => brandsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-brands'] }),
  });
}
