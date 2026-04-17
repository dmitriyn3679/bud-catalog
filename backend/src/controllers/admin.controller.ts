import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import { generateInvoice } from '../utils/invoice';
import * as statsService from '../services/stats.service';
import * as userMarkupService from '../services/userMarkup.service';
import { OrderStatus } from '../models/Order';
import { User } from '../models/User';

type IdParam = { id: string };
type UserMarkupParam = { id: string; categoryId: string };

export const getOrders = async (req: Request, res: Response) => {
  const isPaidRaw = req.query.isPaid;
  const isPaid = isPaidRaw === 'true' ? true : isPaidRaw === 'false' ? false : undefined;
  const result = await orderService.getAllOrders({
    status: req.query.status as string | undefined,
    isPaid,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
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

export const updateOrderItems = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.updateOrderItems(req.params.id, req.body.items);
  res.json(order);
};

export const updateActualPrices = async (req: Request<IdParam>, res: Response) => {
  const result = await orderService.updateActualPrices(req.params.id, req.body.items);
  res.json(result);
};

export const updateOrderPaid = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.updatePaid(req.params.id, req.body.isPaid);
  res.json(order);
};

export const createOrder = async (req: Request, res: Response) => {
  const { userId, items, deliveryAddress, note } = req.body;
  const order = await orderService.createAdminOrder(userId, items, deliveryAddress, note);
  res.status(201).json(order);
};

export const downloadInvoice = async (req: Request<{ id: string }>, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  const hidePrices = req.query.hidePrices === 'true';
  const hideCustomer = req.query.hideCustomer === 'true';
  const buffer = await generateInvoice({
    orderId: String(order._id),
    createdAt: (order as unknown as { createdAt: Date }).createdAt,
    items: order.items,
    deliveryAddress: order.deliveryAddress,
    customerName: (order.userId as unknown as { shopName?: string; isSystemRetail?: boolean }).isSystemRetail
      ? undefined
      : (order.userId as unknown as { shopName?: string }).shopName,
    customerPhone: (order.userId as unknown as { isSystemRetail?: boolean; phone?: string }).isSystemRetail
      ? undefined
      : (order.userId as unknown as { phone?: string }).phone,
    note: (order as unknown as { note?: string }).note,
    hidePrices,
    hideCustomer,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${String(order._id).slice(-6).toUpperCase()}.pdf"`);
  res.send(buffer);
};

export const getRetailUser = async (_req: Request, res: Response) => {
  const user = await User.findOne({ isSystemRetail: true }).select('_id name isSystemRetail').lean();
  if (!user) res.status(404).json({ message: 'Retail user not found' });
  else res.json(user);
};

export const getStats = async (req: Request, res: Response) => {
  const stats = await statsService.getStats({
    categoryId: req.query.categoryId as string | undefined,
    productId: req.query.productId as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  res.json(stats);
};

// User management
export const toggleUserBlock = async (req: Request<IdParam>, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  user.isBlocked = !user.isBlocked;
  await user.save();
  res.json({ isBlocked: user.isBlocked });
};

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

export const deleteUserGlobalMarkup = async (req: Request<IdParam>, res: Response) => {
  const user = await userMarkupService.upsertGlobalMarkup(req.params.id, null);
  res.json(user);
};
