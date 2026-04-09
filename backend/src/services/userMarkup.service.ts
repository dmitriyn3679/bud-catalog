import { Types } from 'mongoose';
import { User } from '../models/User';
import { UserMarkup } from '../models/UserMarkup';
import { Order } from '../models/Order';
import { AppError } from '../middlewares/errorHandler';

export async function getUsers() {
  const users = await User.find({ role: 'user' })
    .select('name email shopName city address phone globalMarkupPercent isBlocked createdAt')
    .sort({ createdAt: -1 })
    .lean();

  if (!users.length) return [];

  const userIds = users.map((u) => u._id as Types.ObjectId);

  const [countStats, markupStats] = await Promise.all([
    // orderCount + totalAmount: delivered only
    Order.aggregate([
      { $match: { userId: { $in: userIds }, status: 'delivered' } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]),
    // avgMarkup: only delivered orders, weighted by purchase cost * quantity
    Order.aggregate([
      { $match: { userId: { $in: userIds }, status: 'delivered' } },
      { $unwind: '$items' },
      { $match: { 'items.purchasePrice': { $gt: 0 } } },
      {
        $group: {
          _id: '$userId',
          totalProfit: {
            $sum: {
              $multiply: [
                { $subtract: ['$items.price', '$items.purchasePrice'] },
                '$items.quantity',
              ],
            },
          },
          totalCost: {
            $sum: { $multiply: ['$items.purchasePrice', '$items.quantity'] },
          },
        },
      },
      {
        $project: {
          avgMarkupPercent: {
            $cond: [
              { $gt: ['$totalCost', 0] },
              { $multiply: [{ $divide: ['$totalProfit', '$totalCost'] }, 100] },
              null,
            ],
          },
        },
      },
    ]),
  ]);

  const countMap = new Map(countStats.map((s) => [s._id.toString(), s]));
  const markupMap = new Map(markupStats.map((s) => [s._id.toString(), s]));

  return users.map((u) => {
    const id = (u._id as Types.ObjectId).toString();
    const cs = countMap.get(id);
    const ms = markupMap.get(id);
    return {
      ...u,
      stats: {
        orderCount: cs?.orderCount ?? 0,
        totalAmount: cs?.totalAmount ?? 0,
        avgMarkupPercent: ms?.avgMarkupPercent != null ? Math.round(ms.avgMarkupPercent * 10) / 10 : null,
      },
    };
  });
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
