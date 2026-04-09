import { api } from '../../api/axios';
import type { AdminUser, UserMarkup } from '../../types';

export const usersApi = {
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  },

  getUserMarkups: async (userId: string): Promise<UserMarkup[]> => {
    const res = await api.get<UserMarkup[]>(`/admin/users/${userId}/markups`);
    return res.data;
  },

  upsertGlobalMarkup: async (userId: string, markupPercent: number): Promise<AdminUser> => {
    const res = await api.put<AdminUser>(`/admin/users/${userId}/global-markup`, { markupPercent });
    return res.data;
  },

  upsertCategoryMarkup: async (userId: string, categoryId: string, markupPercent: number): Promise<UserMarkup> => {
    const res = await api.put<UserMarkup>(`/admin/users/${userId}/markups/${categoryId}`, { markupPercent });
    return res.data;
  },

  deleteGlobalMarkup: async (userId: string): Promise<AdminUser> => {
    const res = await api.delete<AdminUser>(`/admin/users/${userId}/global-markup`);
    return res.data;
  },

  deleteCategoryMarkup: async (userId: string, categoryId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}/markups/${categoryId}`);
  },

  toggleBlock: async (userId: string): Promise<{ isBlocked: boolean }> => {
    const res = await api.patch<{ isBlocked: boolean }>(`/admin/users/${userId}/block`);
    return res.data;
  },
};
