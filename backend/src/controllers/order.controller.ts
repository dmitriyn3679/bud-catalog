import { Request, Response } from 'express';
import * as orderService from '../services/order.service';
import { generateInvoice } from '../utils/invoice';
import { Order } from '../models/Order';

type IdParam = { id: string };

export const createOrder = async (req: Request, res: Response) => {
  const order = await orderService.createFromCart(req.user!.id, req.body);
  res.status(201).json(order);
};

export const getUserOrders = async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  const result = await orderService.getUserOrders(req.user!.id, page, limit, {
    status: req.query.status as string | undefined,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  res.json(result);
};

export const getUserOrderById = async (req: Request<IdParam>, res: Response) => {
  const order = await orderService.getUserOrderById(req.user!.id, req.params.id);
  res.json(order);
};

export const reorder = async (req: Request<IdParam>, res: Response) => {
  const result = await orderService.reorderToCart(req.user!.id, req.params.id);
  res.json(result);
};

export const downloadInvoice = async (req: Request<IdParam>, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user!.id })
    .populate('userId', 'shopName phone isSystemRetail')
    .lean() as Record<string, unknown> | null;
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  const user = order.userId as { shopName?: string; phone?: string; isSystemRetail?: boolean } | null;
  const buffer = await generateInvoice({
    orderId: String(order._id),
    createdAt: order.createdAt as Date,
    items: order.items as Parameters<typeof generateInvoice>[0]['items'],
    deliveryAddress: order.deliveryAddress as string,
    customerName: user?.isSystemRetail ? undefined : user?.shopName,
    customerPhone: user?.isSystemRetail ? undefined : user?.phone,
    note: order.note as string | undefined,
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${String(order._id).slice(-6).toUpperCase()}.pdf"`);
  res.send(buffer);
};
