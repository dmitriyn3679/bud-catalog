import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

const isProd = process.env.NODE_ENV === 'production';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name, phone, shopName, city, address } = req.body;
  const { tokens, user } = await authService.register(password, { name, email, phone, shopName, city, address });
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ accessToken: tokens.accessToken, user });
};

export const login = async (req: Request, res: Response) => {
  const { login, password } = req.body;
  const { tokens, user } = await authService.login(login, password);
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken: tokens.accessToken, user });
};

export const refreshTokens = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }
  const tokens = await authService.refresh(token);
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken: tokens.accessToken });
};

export const logout = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await authService.logout(userId);
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

export const changePassword = async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.id, oldPassword, newPassword);
  res.clearCookie('refreshToken');
  res.json({ message: 'Password changed' });
};
