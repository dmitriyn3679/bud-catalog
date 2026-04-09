import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './usersApi';

export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-users'], queryFn: usersApi.getUsers });
}

export function useUserMarkups(userId: string) {
  return useQuery({
    queryKey: ['admin-user-markups', userId],
    queryFn: () => usersApi.getUserMarkups(userId),
    enabled: !!userId,
  });
}

export function useUpsertGlobalMarkup(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (markupPercent: number) => usersApi.upsertGlobalMarkup(userId, markupPercent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpsertCategoryMarkup(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, markupPercent }: { categoryId: string; markupPercent: number }) =>
      usersApi.upsertCategoryMarkup(userId, categoryId, markupPercent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user-markups', userId] }),
  });
}

export function useDeleteGlobalMarkup(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => usersApi.deleteGlobalMarkup(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useDeleteCategoryMarkup(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => usersApi.deleteCategoryMarkup(userId, categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-user-markups', userId] }),
  });
}

export function useToggleBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.toggleBlock(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}
