import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import { roleGuard } from '../middlewares/roleGuard';
import { ORDER_STATUSES } from '../models/Order';
import * as controller from '../controllers/admin.controller';

export const adminRouter = Router();

adminRouter.use(authMiddleware, roleGuard('admin'));

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(ORDER_STATUSES),
  }),
});

adminRouter.get('/orders', asyncHandler(controller.getOrders));
adminRouter.get('/orders/:id', asyncHandler(controller.getOrderById));
adminRouter.patch('/orders/:id/status', validate(updateStatusSchema), asyncHandler(controller.updateOrderStatus));
adminRouter.get('/stats', asyncHandler(controller.getStats));
