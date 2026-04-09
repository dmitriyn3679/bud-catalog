import mongoose, { Types } from 'mongoose';
import { Order, ORDER_STATUSES, OrderStatus, type IOrderItem } from '../models/Order';
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';
import { AppError } from '../middlewares/errorHandler';
import { applyUserPricing, type PricedProduct } from '../utils/pricing';

interface CreateOrderData {
  deliveryAddress: string;
  note?: string;
}

export async function createFromCart(userId: string, data: CreateOrderData) {
  const cart = await Cart.findOne({ userId })
    .populate<{
      items: { productId: typeof Product.prototype & { purchasePrice: number; categoryId: unknown; unlimitedStock: boolean; hidePrice: boolean }; quantity: number }[];
    }>({
      path: 'items.productId',
      select: '+purchasePrice title sku price categoryId stock isActive unlimitedStock hidePrice',
    })
    .lean();

  if (!cart?.items.length) throw new AppError('Cart is empty', 400);

  // Validate all items
  for (const item of cart.items) {
    const product = item.productId;
    if (!product || !product.isActive) throw new AppError(`Product "${product?.title}" is unavailable`, 400);
    if (!product.unlimitedStock && product.stock < item.quantity)
      throw new AppError(`Not enough stock for "${product.title}"`, 400);
  }

  // Apply per-user pricing to get actual prices (same as cart/catalog)
  const rawProducts = cart.items.map((item) => item.productId) as unknown as PricedProduct[];
  const pricedMap = new Map(
    (await applyUserPricing(rawProducts, userId)).map((p) => [
      String((p as Record<string, unknown>)._id),
      (p as Record<string, unknown>).price as number,
    ]),
  );

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const orderItems = cart.items.map((item) => {
      const product = item.productId;
      const userPrice = pricedMap.get(String(product._id)) ?? product.price;
      const hp = product.hidePrice ?? false;
      return {
        productId: product._id,
        title: product.title,
        sku: (product as unknown as { sku?: string }).sku || undefined,
        price: hp ? 0 : userPrice,
        purchasePrice: hp ? 0 : product.purchasePrice,
        hidePrice: hp,
        quantity: item.quantity,
      };
    });

    const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const [order] = await Order.create([{ userId, items: orderItems, total, ...data }], { session });

    // Decrement stock atomically (skip unlimited products)
    await Promise.all(
      cart.items
        .filter((item) => !item.productId.unlimitedStock)
        .map((item) =>
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

export async function createAdminOrder(
  userId: string,
  items: { productId: string; quantity: number }[],
  deliveryAddress: string,
  note?: string,
) {
  if (!items.length) throw new AppError('Items cannot be empty', 400);

  const productIds = items.map((i) => i.productId);
  const rawProducts = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select('+purchasePrice title sku price categoryId stock unlimitedStock hidePrice')
    .lean() as unknown as PricedProduct[];

  for (const item of items) {
    const product = rawProducts.find((p) => String((p as Record<string, unknown>)._id) === item.productId);
    if (!product) throw new AppError(`Товар ${item.productId} не знайдено або неактивний`, 404);
    const stock = (product as Record<string, unknown>).stock as number;
    const unlimited = (product as Record<string, unknown>).unlimitedStock as boolean;
    if (!unlimited && stock < item.quantity) {
      throw new AppError(`Недостатньо на складі: "${product.title}"`, 400);
    }
  }

  const pricedMap = new Map(
    (await applyUserPricing(rawProducts, userId)).map((p) => [
      String((p as Record<string, unknown>)._id),
      p.price as number,
    ]),
  );

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const orderItems = items.map((item) => {
      const product = rawProducts.find((p) => String((p as Record<string, unknown>)._id) === item.productId)!;
      const hp = ((product as Record<string, unknown>).hidePrice as boolean) ?? false;
      return {
        productId: new Types.ObjectId(item.productId),
        title: product.title as string,
        sku: ((product as Record<string, unknown>).sku as string) || undefined,
        price: hp ? 0 : (pricedMap.get(item.productId) ?? (product.price as number)),
        purchasePrice: hp ? 0 : product.purchasePrice,
        hidePrice: hp,
        quantity: item.quantity,
      };
    });

    const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const [order] = await Order.create(
      [{ userId, items: orderItems, total, deliveryAddress, note }],
      { session },
    );

    await Promise.all(
      items
        .filter((item) => {
          const p = rawProducts.find((pr) => String((pr as Record<string, unknown>)._id) === item.productId);
          return !((p as Record<string, unknown>)?.unlimitedStock as boolean);
        })
        .map((item) =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { session }),
        ),
    );

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

export async function getUserOrders(
  userId: string,
  page = 1,
  limit = 20,
  filters: { status?: string; dateFrom?: string; dateTo?: string } = {},
) {
  const { status, dateFrom, dateTo } = filters;
  const query: Record<string, unknown> = { userId };

  if (status && ORDER_STATUSES.includes(status as OrderStatus)) query.status = status;

  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    query.createdAt = range;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(query),
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
export async function getAllOrders(filters: { status?: string; isPaid?: boolean; page?: number; limit?: number; dateFrom?: string; dateTo?: string }) {
  const { status, isPaid, page = 1, limit = 20, dateFrom, dateTo } = filters;
  const query: Record<string, unknown> = {};
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) query.status = status;
  if (isPaid !== undefined) {
    query.isPaid = isPaid;
    if (!status) query.status = { $ne: 'cancelled' };
  }

  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
    query.createdAt = range;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Order.find(query).populate('userId', 'name shopName email phone isSystemRetail').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(query),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOrderById(orderId: string) {
  const order = await Order.findById(orderId).populate('userId', 'name shopName email phone isSystemRetail').lean();
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function updateOrderItems(
  orderId: string,
  newItems: Array<{ productId: string; quantity: number }>,
) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (!['pending', 'processing'].includes(order.status)) {
    throw new AppError('Cannot edit delivered or cancelled orders', 400);
  }

  const newItemMap = new Map(newItems.map((i) => [i.productId, i.quantity]));

  // Split current items into active and removed
  const currentActive = new Map<string, (typeof order.items)[number]>();
  const currentRemoved = new Map<string, (typeof order.items)[number]>();
  for (const item of order.items) {
    const key = String(item.productId);
    if (item.changeType === 'removed') currentRemoved.set(key, item);
    else currentActive.set(key, item);
  }

  const resultItems: IOrderItem[] = [];

  // Process desired items
  for (const ni of newItems) {
    const existingActive = currentActive.get(ni.productId);
    const existingRemoved = currentRemoved.get(ni.productId);

    if (existingActive) {
      const wasAdded = existingActive.changeType === 'added';
      const qtyChanged = existingActive.quantity !== ni.quantity;
      // Preserve the very first originalQuantity; clear if qty reverted back
      const baseOriginal = existingActive.originalQuantity ?? existingActive.quantity;
      const isBackToOriginal = !wasAdded && ni.quantity === baseOriginal;
      const originalQuantity = wasAdded || isBackToOriginal ? undefined : baseOriginal;
      resultItems.push({
        productId: existingActive.productId,
        title: existingActive.title,
        price: existingActive.price,
        purchasePrice: existingActive.purchasePrice,
        quantity: ni.quantity,
        originalQuantity,
        changeType: wasAdded ? 'added' : isBackToOriginal ? undefined : 'modified',
      });
    } else if (existingRemoved) {
      // Restoring a previously removed item
      resultItems.push({
        productId: existingRemoved.productId,
        title: existingRemoved.title,
        price: existingRemoved.price,
        purchasePrice: existingRemoved.purchasePrice,
        quantity: ni.quantity,
        changeType: 'added',
      });
    } else {
      // Brand new item — fetch current price
      const product = await Product.findOne({ _id: ni.productId, isActive: true })
        .select('+purchasePrice title sku price categoryId hidePrice')
        .populate('categoryId', '_id')
        .lean() as PricedProduct | null;
      if (!product) continue;

      const [priced] = await applyUserPricing([product], String(order.userId));
      const hp = ((product as Record<string, unknown>).hidePrice as boolean) ?? false;
      resultItems.push({
        productId: new Types.ObjectId(ni.productId),
        title: product.title as string,
        sku: ((product as Record<string, unknown>).sku as string) || undefined,
        price: hp ? 0 : (priced.price as number),
        purchasePrice: hp ? 0 : product.purchasePrice,
        hidePrice: hp,
        quantity: ni.quantity,
        changeType: 'added',
      });
    }
  }

  // Mark as removed: active items not present in newItems
  for (const [productId, item] of currentActive) {
    if (!newItemMap.has(productId)) {
      resultItems.push({
        productId: item.productId,
        title: item.title,
        price: item.price,
        purchasePrice: item.purchasePrice,
        quantity: item.quantity,
        changeType: 'removed',
      });
    }
  }

  // Preserve already-removed items not restored
  for (const [productId, item] of currentRemoved) {
    if (!newItemMap.has(productId)) {
      resultItems.push({
        productId: item.productId,
        title: item.title,
        price: item.price,
        purchasePrice: item.purchasePrice,
        quantity: item.quantity,
        changeType: 'removed',
      });
    }
  }

  // Recalculate total (non-removed only)
  const total = resultItems
    .filter((i) => i.changeType !== 'removed')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  order.set('items', resultItems);
  order.total = total;
  await order.save();
  return order;
}

export async function reorderToCart(userId: string, orderId: string) {
  const order = await Order.findOne({ _id: orderId, userId }).lean();
  if (!order) throw new AppError('Order not found', 404);

  const productIds = order.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select('stock unlimitedStock')
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let added = 0;
  let clamped = 0;
  let skipped = 0;

  for (const item of order.items) {
    const product = productMap.get(String(item.productId));
    if (!product) { skipped++; continue; }

    let quantity: number;
    if ((product as { unlimitedStock?: boolean }).unlimitedStock) {
      quantity = item.quantity;
    } else if (product.stock <= 0) {
      skipped++;
      continue;
    } else if (product.stock >= item.quantity) {
      quantity = item.quantity;
    } else {
      quantity = product.stock;
      clamped++;
    }

    const productId = item.productId as Types.ObjectId;
    const updated = await Cart.findOneAndUpdate(
      { userId, 'items.productId': productId },
      { $set: { 'items.$.quantity': quantity } },
    );
    if (!updated) {
      await Cart.findOneAndUpdate(
        { userId },
        { $push: { items: { productId, quantity } } },
        { upsert: true },
      );
    }
    added++;
  }

  return { added, clamped, skipped };
}

export async function updateActualPrices(
  orderId: string,
  items: { productId: string; price?: number | null; actualPurchasePrice?: number | null }[],
) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const updateMap = new Map(items.map((i) => [i.productId, i]));

  for (const item of order.items) {
    const upd = updateMap.get(String(item.productId));
    if (!upd) continue;
    if (upd.price !== undefined)               item.price = upd.price ?? item.price;
    if (upd.actualPurchasePrice !== undefined) {
      item.actualPurchasePrice = upd.actualPurchasePrice ?? undefined;
      if (upd.actualPurchasePrice != null)     item.hidePrice = false;
    }
  }

  order.total = order.items
    .filter((i) => i.changeType !== 'removed')
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  await order.save();

  // Sync products whose purchase price actually changed
  const toSync = order.items.filter(
    (item) => item.actualPurchasePrice != null && item.actualPurchasePrice !== item.purchasePrice,
  );

  let updatedProducts = 0;

  if (toSync.length > 0) {
    const productIds = toSync.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } })
      .select('+purchasePrice price')
      .lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    await Promise.all(
      toSync.map(async (item) => {
        const product = productMap.get(String(item.productId));
        if (!product) return;
        const updateFields: { purchasePrice: number; price?: number } = {
          purchasePrice: item.actualPurchasePrice!,
        };
        if (product.purchasePrice > 0) {
          const markupFactor = (product.price - product.purchasePrice) / product.purchasePrice;
          updateFields.price = Math.round(item.actualPurchasePrice! * (1 + markupFactor) * 100) / 100;
        }
        await Product.findByIdAndUpdate(item.productId, updateFields);
        updatedProducts++;
      }),
    );
  }

  return { order, updatedProducts };
}

export async function updatePaid(orderId: string, isPaid: boolean) {
  if (isPaid) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    const unpricedItems = order.items.filter((i) => {
      if (i.changeType === 'removed') return false;
      const effPurchasePrice = i.actualPurchasePrice ?? i.purchasePrice;
      return !i.price || !effPurchasePrice;
    });
    if (unpricedItems.length > 0) {
      const titles = unpricedItems.map((i) => `"${i.title}"`).join(', ');
      throw new AppError(
        `Неможливо позначити як сплачено: не встановлено ціни для товарів: ${titles}`,
        400,
      );
    }
    order.isPaid = true;
    await order.save();
    return order;
  }
  const order = await Order.findByIdAndUpdate(orderId, { isPaid }, { new: true });
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function updateStatus(orderId: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) throw new AppError('Invalid status', 400);

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (status === 'delivered') {
    const unpricedItems = order.items.filter((i) => {
      if (i.changeType === 'removed') return false;
      const effPurchasePrice = i.actualPurchasePrice ?? i.purchasePrice;
      return !i.price || !effPurchasePrice;
    });
    if (unpricedItems.length > 0) {
      const titles = unpricedItems.map((i) => `"${i.title}"`).join(', ');
      throw new AppError(
        `Неможливо виконати замовлення: не встановлено ціни для товарів: ${titles}`,
        400,
      );
    }
  }

  const wasCancelled = order.status === 'cancelled';
  const becomingCancelled = status === 'cancelled';

  order.status = status;
  await order.save();

  // Restore stock only when transitioning TO cancelled (not already cancelled)
  if (becomingCancelled && !wasCancelled) {
    const productIds = order.items.map((i) => i.productId);
    const unlimitedIds = new Set(
      (await Product.find({ _id: { $in: productIds }, unlimitedStock: true }).select('_id').lean())
        .map((p) => String(p._id)),
    );
    await Promise.all(
      order.items
        .filter((item) => !unlimitedIds.has(String(item.productId)))
        .map((item) =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }),
        ),
    );
  }

  return order;
}
