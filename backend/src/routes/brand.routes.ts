import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import { roleGuard } from '../middlewares/roleGuard';
import * as controller from '../controllers/brand.controller';

export const brandRouter = Router();

const bodySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  }),
});

const updateBodySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  }),
});

brandRouter.get('/', asyncHandler(controller.getAll));
brandRouter.post('/', authMiddleware, roleGuard('admin'), validate(bodySchema), asyncHandler(controller.create));
brandRouter.put('/:id', authMiddleware, roleGuard('admin'), validate(updateBodySchema), asyncHandler(controller.update));
brandRouter.delete('/:id', authMiddleware, roleGuard('admin'), asyncHandler(controller.remove));
