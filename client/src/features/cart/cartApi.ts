import { api } from '../../api/axios';
import type { Cart } from '../../types';

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const res = await api.get<Cart>('/cart');
    return res.data;
  },

  addItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.post<Cart>('/cart/items', { productId, quantity });
    return res.data;
  },

  updateItem: async (productId: string, quantity: number): Promise<Cart> => {
    const res = await api.patch<Cart>(`/cart/items/${productId}`, { quantity });
    return res.data;
  },

  removeItem: async (productId: string): Promise<void> => {
    await api.delete(`/cart/items/${productId}`);
  },

  clearCart: async (): Promise<void> => {
    await api.delete('/cart');
  },
};
