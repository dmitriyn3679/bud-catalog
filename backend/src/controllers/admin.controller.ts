import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import * as statsService from '../services/stats.service';
import { OrderStatus } from '../models/Order';

type IdParam = { id: string };

export const getOrders = async (req: Request, res: Response) => {
  const result = await orderService.getAllOrders({
    status: req.query.status as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  res.json(result);
};

export const getOrderById = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json(order);
};

export const updateOrderStatus = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.updateStatus(req.params.id, req.body.status as OrderStatus);
  res.json(order);
};

export const getStats = async (req: Request, res: Response) => {
  const stats = await statsService.getStats({
    categoryId: req.query.categoryId as string | undefined,
    productId: req.query.productId as string | undefined,
  });
  res.json(stats);
};
