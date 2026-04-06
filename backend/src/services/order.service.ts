import mongoose from 'mongoose';
import { Order, ORDER_STATUSES, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { AppError } from '../middlewares/errorHandler';

interface CreateOrderData {
  deliveryAddress: string;
  note?: string;
}

export async function createFromCart(userId: string, data: CreateOrderData) {
  const cart = await Cart.findOne({ userId }).populate<{
    items: { productId: typeof Product.prototype & { purchasePrice: number }; quantity: number }[];
  }>({
    path: 'items.productId',
    select: '+purchasePrice title price stock isActive',
  });

  if (!cart?.items.length) throw new AppError('Cart is empty', 400);

  // Validate all items
  for (const item of cart.items) {
    const product = item.productId;
    if (!product || !product.isActive) throw new AppError(`Product "${product?.title}" is unavailable`, 400);
    if (product.stock < item.quantity)
      throw new AppError(`Not enough stock for "${product.title}"`, 400);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const orderItems = cart.items.map((item) => {
      const product = item.productId;
      return {
        productId: product._id,
        title: product.title,
        price: product.price,
        purchasePrice: product.purchasePrice,
        quantity: item.quantity,
      };
    });

    const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const [order] = await Order.create([{ userId, items: orderItems, total, ...data }], { session });

    // Decrement stock atomically
    await Promise.all(
      cart.items.map((item) =>
        Product.findByIdAndUpdate(
          item.productId._id,
          { $inc: { stock: -item.quantity } },
          { session },
        ),
      ),
    );

    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, { session });

    await session.commitTransaction();
    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

function stripPurchasePrice(order: Record<string, unknown>) {
  return {
    ...order,
    items: (order.items as Record<string, unknown>[]).map(({ purchasePrice: _, ...item }) => item),
  };
}

export async function getUserOrders(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments({ userId }),
  ]);
  return {
    items: items.map(stripPurchasePrice),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserOrderById(userId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, userId }).lean();
  if (!order) throw new AppError('Order not found', 404);
  return stripPurchasePrice(order as unknown as Record<string, unknown>);
}

// Admin
export async function getAllOrders(filters: { status?: string; page?: number; limit?: number }) {
  const { status, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = {};
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) query.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(query),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOrderById(orderId: string) {
  const order = await Order.findById(orderId).populate('userId', 'name email phone').lean();
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function updateStatus(orderId: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) throw new AppError('Invalid status', 400);
  const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}
