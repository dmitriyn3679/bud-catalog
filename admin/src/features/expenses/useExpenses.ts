import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expensesApi, type ExpenseFormData } from './expensesApi';

interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ['admin-expenses', filters],
    queryFn: () => expensesApi.list(filters),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseFormData) => expensesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => expensesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-expenses'] }),
  });
}
