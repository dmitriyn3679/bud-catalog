import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from './profileApi';

export function useOrders(page: number) {
  return useQuery({
    queryKey: ['orders', page],
    queryFn: () => profileApi.getOrders(page),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: profileApi.changePassword });
}
