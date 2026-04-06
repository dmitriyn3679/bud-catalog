import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import * as controller from '../controllers/cart.controller';

export const cartRouter = Router();

cartRouter.use(authMiddleware);

const addItemSchema = z.object({
  body: z.object({
    productId: z.string().length(24),
    quantity: z.number().int().min(1),
  }),
});

const updateItemSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(1),
  }),
});

cartRouter.get('/', asyncHandler(controller.getCart));
cartRouter.post('/items', validate(addItemSchema), asyncHandler(controller.addItem));
cartRouter.patch('/items/:productId', validate(updateItemSchema), asyncHandler(controller.updateItem));
cartRouter.delete('/items/:productId', asyncHandler(controller.removeItem));
cartRouter.delete('/', asyncHandler(controller.clearCart));
