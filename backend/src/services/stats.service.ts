import { Types, PipelineStage } from 'mongoose';
import { Order } from '../models/Order';
import { getDescendantIds } from './category.service';

interface StatsFilters {
  categoryId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface StatsResult {
  totalOrders: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMarkupPercent: number;
}

export async function getStats(filters: StatsFilters): Promise<StatsResult> {
  const matchStage: Record<string, unknown> = { status: 'delivered' };

  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, Date> = {};
    if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    matchStage.createdAt = range;
  }
  const itemMatchStage: Record<string, unknown> = {};

  if (filters.productId) {
    itemMatchStage['items.productId'] = new Types.ObjectId(filters.productId);
  }

  if (filters.categoryId) {
    const ids = await getDescendantIds(filters.categoryId);
    // Will be applied after $unwind via $match on items
    itemMatchStage['items.categoryId'] = { $in: ids.map((id) => new Types.ObjectId(id)) };
  }

  const pipeline: PipelineStage[] = [
    { $match: matchStage },
    { $unwind: '$items' },
  ];

  if (Object.keys(itemMatchStage).length > 0) {
    pipeline.push({ $match: itemMatchStage });
  }

  pipeline.push(
    {
      $group: {
        _id: null,
        orderIds: { $addToSet: '$_id' },
        totalUnitsSold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        totalCost: { $sum: { $multiply: [{ $ifNull: ['$items.actualPurchasePrice', '$items.purchasePrice'] }, '$items.quantity'] } },
      },
    },
    {
      $project: {
        _id: 0,
        totalOrders: { $size: '$orderIds' },
        totalUnitsSold: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        totalCost: { $round: ['$totalCost', 2] },
        totalProfit: { $round: [{ $subtract: ['$totalRevenue', '$totalCost'] }, 2] },
        avgMarkupPercent: {
          $round: [
            {
              $multiply: [
                {
                  $cond: [
                    { $eq: ['$totalCost', 0] },
                    0,
                    { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalCost'] },
                  ],
                },
                100,
              ],
            },
            2,
          ],
        },
      },
    },
  );

  const [result] = await Order.aggregate(pipeline);

  return result ?? {
    totalOrders: 0,
    totalUnitsSold: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMarkupPercent: 0,
  };
}
