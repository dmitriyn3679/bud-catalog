import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from './ordersApi';
import type { AdminOrder } from '../../types';

export function useAdminOrders(status?: string, page = 1) {
  return useQuery({
    queryKey: ['admin-orders', status, page],
    queryFn: () => ordersApi.getAll({ status, page, limit: 20 }),
    placeholderData: (prev) => prev,
  });
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: AdminOrder['status']) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
    },
  });
}
