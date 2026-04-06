import { Favorite } from '../models/Favorite';
import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';

export async function getFavorites(userId: string) {
  const fav = await Favorite.findOne({ userId })
    .populate('productIds', 'title price images isActive brandId categoryId')
    .lean();
  return fav?.productIds ?? [];
}

export async function addFavorite(userId: string, productId: string) {
  const exists = await Product.exists({ _id: productId, isActive: true });
  if (!exists) throw new AppError('Product not found', 404);

  await Favorite.findOneAndUpdate(
    { userId },
    { $addToSet: { productIds: productId } },
    { upsert: true },
  );
}

export async function removeFavorite(userId: string, productId: string) {
  await Favorite.findOneAndUpdate(
    { userId },
    { $pull: { productIds: productId } },
  );
}
