import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import * as controller from '../controllers/order.controller';

export const orderRouter = Router();

orderRouter.use(authMiddleware);

const createOrderSchema = z.object({
  body: z.object({
    deliveryAddress: z.string().min(5).max(500),
    note: z.string().max(500).optional(),
  }),
});

orderRouter.post('/', validate(createOrderSchema), asyncHandler(controller.createOrder));
orderRouter.post('/:id/reorder', asyncHandler(controller.reorder));
orderRouter.get('/', asyncHandler(controller.getUserOrders));
orderRouter.get('/:id/invoice', asyncHandler(controller.downloadInvoice));
orderRouter.get('/:id', asyncHandler(controller.getUserOrderById));
