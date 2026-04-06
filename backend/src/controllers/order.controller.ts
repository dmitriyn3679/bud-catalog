import { Request, Response } from 'express';
import * as orderService from '../services/order.service';

type IdParam = { id: string };

export const createOrder = async (req: Request, res: Response) => {
  const order = await orderService.createFromCart(req.user!.id, req.body);
  res.status(201).json(order);
};

export const getUserOrders = async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const result = await orderService.getUserOrders(req.user!.id, page, limit);
  res.json(result);
};

export const getUserOrderById = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.getUserOrderById(req.user!.id, req.params.id);
  res.json(order);
};
