import { api } from '../../api/axios';
import { Order } from '../../types';

export const checkoutApi = {
  placeOrder: async (data: { deliveryAddress: string; note?: string }): Promise<Order> => {
    const res = await api.post<Order>('/orders', data);
    return res.data;
  },
};
