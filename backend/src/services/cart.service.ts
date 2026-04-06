import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';

export async function getCart(userId: string) {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId', 'title price images stock isActive')
    .lean();
  return cart ?? { userId, items: [] };
}

export async function addItem(userId: string, productId: string, quantity: number) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError('Product not found', 404);
  if (product.stock < quantity) throw new AppError('Not enough stock', 400);

  const cart = await Cart.findOneAndUpdate(
    { userId, 'items.productId': productId },
    { $inc: { 'items.$.quantity': quantity } },
    { new: true },
  );

  if (cart) return cart;

  return Cart.findOneAndUpdate(
    { userId },
    { $push: { items: { productId, quantity } } },
    { new: true, upsert: true },
  );
}

export async function updateItem(userId: string, productId: string, quantity: number) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError('Product not found', 404);
  if (product.stock < quantity) throw new AppError('Not enough stock', 400);

  const cart = await Cart.findOneAndUpdate(
    { userId, 'items.productId': productId },
    { $set: { 'items.$.quantity': quantity } },
    { new: true },
  );
  if (!cart) throw new AppError('Item not in cart', 404);
  return cart;
}

export async function removeItem(userId: string, productId: string) {
  await Cart.findOneAndUpdate(
    { userId },
    { $pull: { items: { productId } } },
  );
}

export async function clearCart(userId: string) {
  await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
}
