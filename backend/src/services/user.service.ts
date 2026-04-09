import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';

export async function getMe(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function updateMe(userId: string, data: { name?: string; phone?: string; shopName?: string; city?: string; address?: string }) {
  const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true }).lean();
  if (!user) throw new AppError('User not found', 404);
  return user;
}
