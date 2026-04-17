import { api } from '../../api/axios';
import type { Expense, ExpenseCategory } from '../../types';

export interface ExpenseFormData {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string;
}

export const expensesApi = {
  list: async (params?: { dateFrom?: string; dateTo?: string }): Promise<Expense[]> => {
    const res = await api.get<Expense[]>('/admin/expenses', { params });
    return res.data;
  },

  create: async (data: ExpenseFormData): Promise<Expense> => {
    const res = await api.post<Expense>('/admin/expenses', data);
    return res.data;
  },

  update: async (id: string, data: ExpenseFormData): Promise<Expense> => {
    const res = await api.put<Expense>(`/admin/expenses/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/expenses/${id}`);
  },
};
