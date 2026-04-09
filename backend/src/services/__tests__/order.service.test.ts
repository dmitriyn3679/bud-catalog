import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../models/Order', () => ({
  Order: { findById: vi.fn(), findOne: vi.fn() },
}));

vi.mock('../../models/Product', () => ({
  Product: { findOne: vi.fn(), find: vi.fn(), findByIdAndUpdate: vi.fn() },
}));

vi.mock('../../models/Cart', () => ({
  Cart: { findOneAndUpdate: vi.fn() },
}));

vi.mock('../../utils/pricing', () => ({
  applyUserPricing: vi.fn(),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { updateOrderItems, reorderToCart } from '../order.service';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { Cart } from '../../models/Cart';
import { applyUserPricing } from '../../utils/pricing';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => new Types.ObjectId();
const pid = () => new Types.ObjectId();
const str = (id: unknown) => String(id);

type OrderItem = {
  productId: Types.ObjectId;
  title: string;
  price: number;
  purchasePrice: number;
  quantity: number;
  originalQuantity?: number;
  changeType?: 'modified' | 'removed' | 'added';
};

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    productId: pid(),
    title: 'Product',
    price: 100,
    purchasePrice: 70,
    quantity: 2,
    ...overrides,
  };
}

/** Simulates a Mongoose Document returned by Order.findById.
 *  Uses a plain object with .set() / .save() and direct property mutation. */
function makeOrderDoc(status = 'pending', items: OrderItem[] = []) {
  const doc: Record<string, unknown> = {
    _id: uid(),
    userId: uid(),
    status,
    items,
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    save: vi.fn().mockResolvedValue(undefined),
  };
  doc.set = vi.fn((key: string, value: unknown) => { doc[key] = value; });
  return doc;
}

/** Chains: .select().populate().lean() and .select().lean() */
function mockQueryChain(result: unknown) {
  const lean = vi.fn().mockResolvedValue(result);
  const populate = vi.fn().mockReturnValue({ lean });
  const select = vi.fn().mockReturnValue({ lean, populate });
  return { select };
}

/** Chains: .select().lean() (no populate) */
function mockFindChain(result: unknown[]) {
  const lean = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ lean });
  return { select };
}

/** Wraps a value in { lean: () => value } for Order.findOne(...).lean() */
function mockLeanChain(result: unknown) {
  return { lean: vi.fn().mockResolvedValue(result) };
}

// ─── updateOrderItems ─────────────────────────────────────────────────────────

describe('updateOrderItems', () => {
  const mockFindById     = vi.mocked(Order.findById);
  const mockProductFindOne = vi.mocked(Product.findOne);
  const mockApplyPricing   = vi.mocked(applyUserPricing);

  beforeEach(() => vi.clearAllMocks());

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('throws 404 when order not found', async () => {
      mockFindById.mockResolvedValue(null as never);
      await expect(updateOrderItems('id', [])).rejects.toMatchObject({
        message: 'Order not found',
        statusCode: 404,
      });
    });

    it('throws 400 for delivered orders', async () => {
      mockFindById.mockResolvedValue(makeOrderDoc('delivered') as never);
      await expect(updateOrderItems('id', [])).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 for cancelled orders', async () => {
      mockFindById.mockResolvedValue(makeOrderDoc('cancelled') as never);
      await expect(updateOrderItems('id', [])).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows editing pending orders', async () => {
      const item = makeItem();
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: item.quantity }]);
      expect(doc.save).toHaveBeenCalled();
    });

    it('allows editing processing orders', async () => {
      const item = makeItem();
      const doc  = makeOrderDoc('processing', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: item.quantity }]);
      expect(doc.save).toHaveBeenCalled();
    });
  });

  // ── Helpers for reading saved items ────────────────────────────────────────

  function getSavedItems(doc: Record<string, unknown>) {
    return doc.items as OrderItem[];
  }

  function getSaved(doc: Record<string, unknown>, productId: Types.ObjectId) {
    return getSavedItems(doc).find((i) => str(i.productId) === str(productId));
  }

  // ── changeType assignment ────────────────────────────────────────────────────

  describe('changeType assignment', () => {
    it('keeps changeType undefined when quantity is unchanged', async () => {
      const item = makeItem({ quantity: 3 });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 3 }]);

      expect(getSaved(doc, item.productId)?.changeType).toBeUndefined();
    });

    it("sets changeType to 'modified' when quantity changes", async () => {
      const item = makeItem({ quantity: 5 });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 3 }]);

      expect(getSaved(doc, item.productId)?.changeType).toBe('modified');
    });

    it('stores originalQuantity on first modification', async () => {
      const item = makeItem({ quantity: 5 });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 2 }]);

      expect(getSaved(doc, item.productId)?.originalQuantity).toBe(5);
    });

    it('preserves originalQuantity across subsequent edits', async () => {
      // Simulates: was 5 → edited to 3 (originalQuantity=5 stored) → now editing to 1
      const item = makeItem({ quantity: 3, originalQuantity: 5, changeType: 'modified' });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 1 }]);

      expect(getSaved(doc, item.productId)?.originalQuantity).toBe(5); // must NOT become 3
    });

    it('resets changeType and originalQuantity when quantity returns to original', async () => {
      const item = makeItem({ quantity: 3, originalQuantity: 5, changeType: 'modified' });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 5 }]); // back to 5

      const saved = getSaved(doc, item.productId);
      expect(saved?.changeType).toBeUndefined();
      expect(saved?.originalQuantity).toBeUndefined();
    });

    it("marks missing active items as 'removed'", async () => {
      const kept = makeItem({ title: 'Kept' });
      const gone = makeItem({ title: 'Gone' });
      const doc  = makeOrderDoc('pending', [kept, gone]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(kept.productId), quantity: kept.quantity }]);

      expect(getSaved(doc, gone.productId)?.changeType).toBe('removed');
    });

    it("preserves already-removed items", async () => {
      const active  = makeItem();
      const removed = makeItem({ changeType: 'removed' });
      const doc     = makeOrderDoc('pending', [active, removed]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(active.productId), quantity: active.quantity }]);

      expect(getSaved(doc, removed.productId)?.changeType).toBe('removed');
    });

    it("preserves 'added' changeType when quantity of added item changes", async () => {
      const item = makeItem({ quantity: 2, changeType: 'added' });
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 5 }]);

      const saved = getSaved(doc, item.productId);
      expect(saved?.changeType).toBe('added');
      expect(saved?.originalQuantity).toBeUndefined(); // no originalQuantity for added items
    });
  });

  // ── Adding new items ─────────────────────────────────────────────────────────

  describe('adding new items', () => {
    it("marks brand-new items as 'added' with user-priced value", async () => {
      const existingItem = makeItem();
      const doc = makeOrderDoc('pending', [existingItem]);
      mockFindById.mockResolvedValue(doc as never);

      const newProductId = pid();
      const productRow = {
        _id: newProductId,
        title: 'New Product',
        price: 200,
        purchasePrice: 130,
        categoryId: { _id: uid() },
      };

      mockProductFindOne.mockReturnValue(mockQueryChain(productRow) as never);
      mockApplyPricing.mockResolvedValue([{ ...productRow, price: 220 }]);

      await updateOrderItems('id', [
        { productId: str(existingItem.productId), quantity: existingItem.quantity },
        { productId: str(newProductId), quantity: 1 },
      ]);

      const savedNew = getSaved(doc, newProductId);
      expect(savedNew?.changeType).toBe('added');
      expect(savedNew?.price).toBe(220);
      expect(savedNew?.purchasePrice).toBe(130);
      expect(savedNew?.title).toBe('New Product');
    });

    it('skips new item when product not found in DB', async () => {
      const existingItem = makeItem();
      const doc = makeOrderDoc('pending', [existingItem]);
      mockFindById.mockResolvedValue(doc as never);

      const nonExistentId = pid();
      mockProductFindOne.mockReturnValue(mockQueryChain(null) as never);

      await updateOrderItems('id', [
        { productId: str(existingItem.productId), quantity: existingItem.quantity },
        { productId: str(nonExistentId), quantity: 1 },
      ]);

      expect(getSaved(doc, nonExistentId)).toBeUndefined();
    });
  });

  // ── Restore removed items ────────────────────────────────────────────────────

  describe('restoring removed items', () => {
    it("restores previously removed item as 'added'", async () => {
      const removedItem = makeItem({ quantity: 3, changeType: 'removed' });
      const doc = makeOrderDoc('pending', [removedItem]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(removedItem.productId), quantity: 2 }]);

      const saved = getSaved(doc, removedItem.productId);
      expect(saved?.changeType).toBe('added');
      expect(saved?.quantity).toBe(2);
    });
  });

  // ── Total recalculation ──────────────────────────────────────────────────────

  describe('total recalculation', () => {
    it('excludes removed items from total', async () => {
      const active  = makeItem({ price: 100, quantity: 3 }); // 300
      const removed = makeItem({ price: 200, quantity: 2 }); // must NOT be counted
      const doc = makeOrderDoc('pending', [active, removed]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(active.productId), quantity: 3 }]);

      expect(doc.total).toBe(300);
    });

    it('includes modified items with their new quantity in total', async () => {
      const item = makeItem({ price: 100, quantity: 5 }); // 500 before
      const doc  = makeOrderDoc('pending', [item]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [{ productId: str(item.productId), quantity: 2 }]); // 200 after

      expect(doc.total).toBe(200);
    });

    it('sums all non-removed items correctly', async () => {
      const a = makeItem({ price: 100, quantity: 2 }); // 200
      const b = makeItem({ price: 50,  quantity: 4 }); // 200
      const doc = makeOrderDoc('pending', [a, b]);
      mockFindById.mockResolvedValue(doc as never);

      await updateOrderItems('id', [
        { productId: str(a.productId), quantity: 2 },
        { productId: str(b.productId), quantity: 4 },
      ]);

      expect(doc.total).toBe(400);
    });
  });
});

// ─── reorderToCart ────────────────────────────────────────────────────────────

describe('reorderToCart', () => {
  const mockOrderFindOne        = vi.mocked(Order.findOne);
  const mockProductFind         = vi.mocked(Product.find);
  const mockCartFindOneAndUpdate = vi.mocked(Cart.findOneAndUpdate);

  beforeEach(() => {
    vi.clearAllMocks();
    mockCartFindOneAndUpdate.mockResolvedValue(null as never);
  });

  function setupOrder(items: { productId: Types.ObjectId; quantity: number }[]) {
    const order = { _id: uid(), userId: uid(), items };
    mockOrderFindOne.mockReturnValue(mockLeanChain(order) as never);
    return order;
  }

  function setupProducts(products: { _id: Types.ObjectId; stock: number; unlimitedStock?: boolean }[]) {
    mockProductFind.mockReturnValue(mockFindChain(products) as never);
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('validation', () => {
    it('throws 404 when order not found', async () => {
      mockOrderFindOne.mockReturnValue(mockLeanChain(null) as never);
      await expect(reorderToCart('userId', 'orderId')).rejects.toMatchObject({
        message: 'Order not found',
        statusCode: 404,
      });
    });
  });

  // ── Stock handling ───────────────────────────────────────────────────────────

  describe('stock handling', () => {
    it('adds item with original quantity when stock is sufficient', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 3 }]);
      setupProducts([{ _id: productId, stock: 10 }]);

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.added).toBe(1);
      expect(result.clamped).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('clamps quantity to available stock when stock < ordered quantity', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 10 }]);
      setupProducts([{ _id: productId, stock: 4 }]);

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.added).toBe(1);
      expect(result.clamped).toBe(1);

      // $push call — the second call after $set returns null
      const pushCall = mockCartFindOneAndUpdate.mock.calls.find(
        (c) => (c[1] as Record<string, unknown>)['$push'],
      );
      expect(pushCall?.[1]).toMatchObject({ $push: { items: { productId, quantity: 4 } } });
    });

    it('skips item when stock is 0', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 5 }]);
      setupProducts([{ _id: productId, stock: 0 }]);

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.added).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockCartFindOneAndUpdate).not.toHaveBeenCalled();
    });

    it('skips item when product is not found (inactive or deleted)', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 2 }]);
      setupProducts([]); // empty — product not returned

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.skipped).toBe(1);
      expect(result.added).toBe(0);
    });

    it('uses full quantity for unlimitedStock products regardless of stock value', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 999 }]);
      setupProducts([{ _id: productId, stock: 0, unlimitedStock: true }]);

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.added).toBe(1);
      expect(result.clamped).toBe(0);

      const pushCall = mockCartFindOneAndUpdate.mock.calls.find(
        (c) => (c[1] as Record<string, unknown>)['$push'],
      );
      expect(pushCall?.[1]).toMatchObject({ $push: { items: { productId, quantity: 999 } } });
    });
  });

  // ── Mixed order ──────────────────────────────────────────────────────────────

  describe('mixed order scenarios', () => {
    it('handles multiple items with different stock situations', async () => {
      const pA = pid(); // sufficient stock → added
      const pB = pid(); // clamped
      const pC = pid(); // inactive → skipped
      const order = setupOrder([
        { productId: pA, quantity: 3 },
        { productId: pB, quantity: 10 },
        { productId: pC, quantity: 5 },
      ]);
      setupProducts([
        { _id: pA, stock: 20 },
        { _id: pB, stock: 6 },
        // pC not returned
      ]);

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result.added).toBe(2);
      expect(result.clamped).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('returns all zeros when order has no processable items', async () => {
      const order = setupOrder([{ productId: pid(), quantity: 5 }]);
      setupProducts([]); // nothing available

      const result = await reorderToCart(str(order.userId), str(order._id));

      expect(result).toEqual({ added: 0, clamped: 0, skipped: 1 });
    });
  });

  // ── Cart upsert behaviour ────────────────────────────────────────────────────

  describe('cart upsert', () => {
    it('updates existing cart item via $set when item already in cart', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 3 }]);
      setupProducts([{ _id: productId, stock: 10 }]);

      // First findOneAndUpdate ($set) finds the item → no $push needed
      mockCartFindOneAndUpdate.mockResolvedValueOnce({ _id: uid() } as never);

      await reorderToCart(str(order.userId), str(order._id));

      expect(mockCartFindOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockCartFindOneAndUpdate.mock.calls[0][1]).toMatchObject({
        $set: { 'items.$.quantity': 3 },
      });
    });

    it('pushes new item via $push with upsert when not in cart', async () => {
      const productId = pid();
      const order = setupOrder([{ productId, quantity: 2 }]);
      setupProducts([{ _id: productId, stock: 10 }]);

      mockCartFindOneAndUpdate
        .mockResolvedValueOnce(null as never)   // $set: not found
        .mockResolvedValueOnce({} as never);    // $push upsert

      await reorderToCart(str(order.userId), str(order._id));

      expect(mockCartFindOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(mockCartFindOneAndUpdate.mock.calls[1][1]).toMatchObject({
        $push: { items: { productId, quantity: 2 } },
      });
      expect(mockCartFindOneAndUpdate.mock.calls[1][2]).toMatchObject({ upsert: true });
    });
  });
});
