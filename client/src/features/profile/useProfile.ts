import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi, type OrderFilters } from './profileApi';

export function useOrders(page: number, filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ['orders', page, filters],
    queryFn: () => profileApi.getOrders(page, filters),
    placeholderData: (prev) => prev,
  });
}

export function useOrderDetail(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => profileApi.getOrderById(id),
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: profileApi.updateProfile });
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword });
}

export function useReorder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.reorder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}
