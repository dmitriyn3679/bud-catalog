import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import { roleGuard } from '../middlewares/roleGuard';
import { ORDER_STATUSES } from '../models/Order';
import * as controller from '../controllers/admin.controller';
import * as adminAuthController from '../controllers/admin.auth.controller';

export const adminRouter = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

// Public admin auth routes — must be registered before authMiddleware
adminRouter.post('/auth/login', validate(loginSchema), asyncHandler(adminAuthController.adminAuthLogin));
adminRouter.post('/auth/refresh', asyncHandler(adminAuthController.adminAuthRefresh));
adminRouter.post('/auth/logout', authMiddleware, asyncHandler(adminAuthController.adminAuthLogout));

adminRouter.use(authMiddleware, roleGuard('admin'));

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(ORDER_STATUSES),
  }),
});

const updateItemsSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
    })),
  }),
});

const actualPricesSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      productId: z.string().min(1),
      price: z.number().min(0).nullable().optional(),
      actualPurchasePrice: z.number().min(0).nullable().optional(),
    })),
  }),
});

const updatePaidSchema = z.object({
  body: z.object({ isPaid: z.boolean() }),
});

const createOrderSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
    })).min(1),
    deliveryAddress: z.string().min(1),
    note: z.string().optional(),
  }),
});

adminRouter.get('/system/retail-user', asyncHandler(controller.getRetailUser));
adminRouter.get('/orders', asyncHandler(controller.getOrders));
adminRouter.post('/orders', validate(createOrderSchema), asyncHandler(controller.createOrder));
adminRouter.get('/orders/:id/invoice', asyncHandler(controller.downloadInvoice));
adminRouter.get('/orders/:id', asyncHandler(controller.getOrderById));
adminRouter.patch('/orders/:id/status', validate(updateStatusSchema), asyncHandler(controller.updateOrderStatus));
adminRouter.patch('/orders/:id/paid', validate(updatePaidSchema), asyncHandler(controller.updateOrderPaid));
adminRouter.patch('/orders/:id/items', validate(updateItemsSchema), asyncHandler(controller.updateOrderItems));
adminRouter.patch('/orders/:id/actual-prices', validate(actualPricesSchema), asyncHandler(controller.updateActualPrices));
adminRouter.get('/stats', asyncHandler(controller.getStats));

const markupSchema = z.object({
  body: z.object({ markupPercent: z.number().min(0) }),
});

adminRouter.get('/users', asyncHandler(controller.getUsers));
adminRouter.patch('/users/:id/block', asyncHandler(controller.toggleUserBlock));
adminRouter.get('/users/:id/markups', asyncHandler(controller.getUserMarkups));
adminRouter.put('/users/:id/global-markup', validate(markupSchema), asyncHandler(controller.upsertUserGlobalMarkup));
adminRouter.delete('/users/:id/global-markup', asyncHandler(controller.deleteUserGlobalMarkup));
adminRouter.put('/users/:id/markups/:categoryId', validate(markupSchema), asyncHandler(controller.upsertUserMarkup));
adminRouter.delete('/users/:id/markups/:categoryId', asyncHandler(controller.deleteUserMarkup));
