import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from './ordersApi';
import type { AdminOrder } from '../../types';

export function useAdminOrders(status?: string, page = 1, dateFrom?: string, dateTo?: string, isPaid?: boolean) {
  return useQuery({
    queryKey: ['admin-orders', status, page, dateFrom, dateTo, isPaid],
    queryFn: () => ordersApi.getAll({ status, isPaid, page, limit: 20, dateFrom, dateTo }),
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

export function useUpdateOrderPaid(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isPaid: boolean) => ordersApi.updatePaid(id, isPaid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
    },
  });
}

export function useUpdateOrderItems(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ productId: string; quantity: number }>) =>
      ordersApi.updateItems(id, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
    },
  });
}

export function useUpdateActualPrices(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ productId: string; price?: number | null; actualPurchasePrice?: number | null }>) =>
      ordersApi.updateActualPrices(id, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-order', id] });
    },
  });
}

export function useRetailUser() {
  return useQuery({
    queryKey: ['retail-user'],
    queryFn: () => ordersApi.getRetailUser(),
    staleTime: Infinity,
  });
}

export function useCreateAdminOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}
