import { Request, Response } from 'express';
import { AppError } from '../middlewares/errorHandler';
import * as authService from '../services/auth.service';

const ADMIN_COOKIE = 'adminRefreshToken';

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const adminAuthLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { tokens, user } = await authService.login(email, password);
  if (user.role !== 'admin') throw new AppError('Access denied', 403);
  res.cookie(ADMIN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: tokens.accessToken, user });
};

export const adminAuthRefresh = async (req: Request, res: Response) => {
  const token = req.cookies?.[ADMIN_COOKIE] as string | undefined;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }
  const tokens = await authService.refresh(token);
  res.cookie(ADMIN_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);
  res.json({ accessToken: tokens.accessToken });
};

export const adminAuthLogout = async (req: Request, res: Response) => {
  await authService.logout(req.user!.id);
  res.clearCookie(ADMIN_COOKIE);
  res.json({ message: 'Logged out' });
};
