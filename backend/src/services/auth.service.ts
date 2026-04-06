import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';

const SALT_ROUNDS = 10;

function signAccess(id: string, role: string): string {
  return jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES || '15m') as jwt.SignOptions['expiresIn'],
  });
}

function signRefresh(id: string): string {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES || '30d') as jwt.SignOptions['expiresIn'],
  });
}

function makeTokenPair(id: string, role: string) {
  return {
    accessToken: signAccess(id, role),
    refreshToken: signRefresh(id),
  };
}

export async function register(
  email: string,
  password: string,
  profile: { name: string; shopName: string; city: string; address: string },
) {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email already in use', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, passwordHash, ...profile });

  const tokens = makeTokenPair(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
  await User.findByIdAndUpdate(user.id, { refreshTokenHash });

  return { tokens, user: { id: user.id, email: user.email, name: user.name, shopName: user.shopName, city: user.city, address: user.address, role: user.role } };
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash +refreshTokenHash');
  if (!user) throw new AppError('Invalid credentials', 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);

  const tokens = makeTokenPair(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
  await User.findByIdAndUpdate(user.id, { refreshTokenHash });

  return { tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function refresh(token: string) {
  let payload: { id: string };
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string };
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await User.findById(payload.id).select('+refreshTokenHash');
  if (!user?.refreshTokenHash) throw new AppError('Invalid refresh token', 401);

  const valid = await bcrypt.compare(token, user.refreshTokenHash);
  if (!valid) throw new AppError('Invalid refresh token', 401);

  const tokens = makeTokenPair(user.id, user.role);
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
  await User.findByIdAndUpdate(user.id, { refreshTokenHash });

  return tokens;
}

export async function logout(userId: string) {
  await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  // invalidate all refresh tokens on password change
  user.refreshTokenHash = undefined;
  await user.save();
}
