import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';
import { applyUserPricing, type PricedProduct } from '../utils/pricing';

export async function getCart(userId: string) {
  const cart = await Cart.findOne({ userId })
    .populate('items.productId', 'title price purchasePrice categoryId images stock isActive unlimitedStock hidePrice')
    .lean();

  if (!cart) return { userId, items: [] };

  // Apply per-user pricing to each cart item
  const rawProducts = cart.items
    .map((item) => item.productId)
    .filter(Boolean) as unknown as PricedProduct[];

  const pricedProducts = await applyUserPricing(rawProducts, userId);
  const priceById = new Map(pricedProducts.map((p) => [String((p as { _id: unknown })._id), p.price as number]));

  return {
    ...cart,
    items: cart.items.map((item) => {
      const pid = item.productId as unknown as PricedProduct & { _id: unknown };
      const computedPrice = priceById.get(String(pid._id));
      return {
        ...item,
        productId: { ...pid, price: computedPrice ?? pid.price, purchasePrice: undefined },
      };
    }),
  };
}

export async function addItem(userId: string, productId: string, quantity: number) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw new AppError('Product not found', 404);
  if (!product.unlimitedStock && product.stock < quantity) throw new AppError('Not enough stock', 400);

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
  if (!product.unlimitedStock && product.stock < quantity) throw new AppError('Not enough stock', 400);

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
