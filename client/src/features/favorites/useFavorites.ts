import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from './favoritesApi';
import { useAuth } from '../auth/useAuth';

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.getFavorites,
    enabled: !!user,
  });
}

export function useIsFavorite(productId: string): boolean {
  const { data } = useFavorites();
  return data?.some((p) => p._id === productId) ?? false;
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) =>
      isFavorite ? favoritesApi.remove(productId) : favoritesApi.add(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}
