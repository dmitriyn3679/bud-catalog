import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import * as controller from '../controllers/user.controller';

export const userRouter = Router();

const updateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional(),
    address: z.string().max(300).optional(),
  }),
});

userRouter.get('/me', authMiddleware, asyncHandler(controller.getMe));
userRouter.patch('/me', authMiddleware, validate(updateSchema), asyncHandler(controller.updateMe));
