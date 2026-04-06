import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import { roleGuard } from '../middlewares/roleGuard';
import { upload } from '../utils/upload';
import * as controller from '../controllers/product.controller';

export const productRouter = Router();

const productBodySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    price: z.coerce.number().min(0),
    purchasePrice: z.coerce.number().min(0),
    categoryId: z.string().length(24),
    brandId: z.string().length(24),
    stock: z.coerce.number().min(0).default(0),
    isActive: z.coerce.boolean().optional(),
  }),
});

const updateBodySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    price: z.coerce.number().min(0).optional(),
    purchasePrice: z.coerce.number().min(0).optional(),
    categoryId: z.string().length(24).optional(),
    brandId: z.string().length(24).optional(),
    stock: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

// Public routes
productRouter.get('/', asyncHandler(controller.getAll));
productRouter.get('/:id', asyncHandler(controller.getById));

// Admin routes
productRouter.get('/admin/list', authMiddleware, roleGuard('admin'), asyncHandler(controller.getAllAdmin));
productRouter.get('/admin/:id', authMiddleware, roleGuard('admin'), asyncHandler(controller.getByIdAdmin));
productRouter.post('/', authMiddleware, roleGuard('admin'), validate(productBodySchema), asyncHandler(controller.create));
productRouter.put('/:id', authMiddleware, roleGuard('admin'), validate(updateBodySchema), asyncHandler(controller.update));
productRouter.delete('/:id', authMiddleware, roleGuard('admin'), asyncHandler(controller.remove));
productRouter.post('/:id/images', authMiddleware, roleGuard('admin'), upload.array('images', 10), asyncHandler(controller.addImages));
productRouter.delete('/:id/images/:publicId', authMiddleware, roleGuard('admin'), asyncHandler(controller.removeImage));
