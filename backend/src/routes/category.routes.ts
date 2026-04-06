import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import { roleGuard } from '../middlewares/roleGuard';
import * as controller from '../controllers/category.controller';

export const categoryRouter = Router();

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
    parentId: z.string().nullable().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    parentId: z.string().nullable().optional(),
  }),
});

categoryRouter.get('/', asyncHandler(controller.getTree));
categoryRouter.post('/', authMiddleware, roleGuard('admin'), validate(createSchema), asyncHandler(controller.create));
categoryRouter.put('/:id', authMiddleware, roleGuard('admin'), validate(updateSchema), asyncHandler(controller.update));
categoryRouter.delete('/:id', authMiddleware, roleGuard('admin'), asyncHandler(controller.remove));
