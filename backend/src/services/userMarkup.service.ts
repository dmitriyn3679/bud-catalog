import { User } from '../models/User';
import { UserMarkup } from '../models/UserMarkup';
import { AppError } from '../middlewares/errorHandler';

export async function getUsers() {
  return User.find({ role: 'user' })
    .select('name email shopName city address phone globalMarkupPercent createdAt')
    .sort({ createdAt: -1 });
}

export async function getUserMarkups(userId: string) {
  return UserMarkup.find({ userId }).populate('categoryId', 'name slug').lean();
}

export async function upsertMarkup(userId: string, categoryId: string, markupPercent: number) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  return UserMarkup.findOneAndUpdate(
    { userId, categoryId },
    { markupPercent },
    { upsert: true, new: true, runValidators: true },
  );
}

export async function deleteMarkup(userId: string, categoryId: string) {
  const result = await UserMarkup.findOneAndDelete({ userId, categoryId });
  if (!result) throw new AppError('Markup not found', 404);
}

export async function upsertGlobalMarkup(userId: string, markupPercent: number | null) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  user.globalMarkupPercent = markupPercent ?? undefined;
  await user.save();
  return user;
}

// Returns a map of categoryId -> markupPercent for a given user
export async function getMarkupMap(userId: string): Promise<Map<string, number>> {
  const markups = await UserMarkup.find({ userId }).lean();
  const map = new Map<string, number>();
  for (const m of markups) {
    map.set(m.categoryId.toString(), m.markupPercent);
  }
  return map;
}
