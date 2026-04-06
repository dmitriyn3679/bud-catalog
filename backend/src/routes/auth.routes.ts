import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authMiddleware } from '../middlewares/auth';
import * as controller from '../controllers/auth.controller';

export const authRouter = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2).max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

authRouter.post('/register', validate(registerSchema), asyncHandler(controller.register));
authRouter.post('/login', validate(loginSchema), asyncHandler(controller.login));
authRouter.post('/refresh', asyncHandler(controller.refreshTokens));
authRouter.post('/logout', authMiddleware, asyncHandler(controller.logout));
authRouter.patch('/change-password', authMiddleware, validate(changePasswordSchema), asyncHandler(controller.changePassword));
