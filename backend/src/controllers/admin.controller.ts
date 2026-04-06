import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import * as statsService from '../services/stats.service';
import * as userMarkupService from '../services/userMarkup.service';
import { OrderStatus } from '../models/Order';

type IdParam = { id: string };
type UserMarkupParam = { id: string; categoryId: string };

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

// User management
export const getUsers = async (_req: Request, res: Response) => {
  const users = await userMarkupService.getUsers();
  res.json(users);
};

export const getUserMarkups = async (req: Request<IdParam>, res: Response) => {
  const markups = await userMarkupService.getUserMarkups(req.params.id);
  res.json(markups);
};

export const upsertUserMarkup = async (req: Request<UserMarkupParam>, res: Response) => {
  const markup = await userMarkupService.upsertMarkup(
    req.params.id,
    req.params.categoryId,
    req.body.markupPercent,
  );
  res.json(markup);
};

export const deleteUserMarkup = async (req: Request<UserMarkupParam>, res: Response) => {
  await userMarkupService.deleteMarkup(req.params.id, req.params.categoryId);
  res.json({ message: 'Markup deleted' });
};

export const upsertUserGlobalMarkup = async (req: Request<IdParam>, res: Response) => {
  const user = await userMarkupService.upsertGlobalMarkup(req.params.id, req.body.markupPercent);
  res.json(user);
};
