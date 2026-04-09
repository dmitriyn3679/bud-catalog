import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must be before imports that use these modules) ───────────────────

vi.mock('../../models/Category', () => ({
  Category: { find: vi.fn() },
}));

vi.mock('../../models/User', () => ({
  User: { findById: vi.fn() },
}));

vi.mock('../../services/userMarkup.service', () => ({
  getMarkupMap: vi.fn(),
}));

import { applyUserPricing, type PricedProduct } from '../pricing';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { getMarkupMap } from '../../services/userMarkup.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockCategoryFind = vi.mocked(Category.find);
const mockUserFindById = vi.mocked(User.findById);
const mockGetMarkupMap = vi.mocked(getMarkupMap);

/** Category IDs used across tests */
const PARENT_CAT = 'aaaa00000000000000000001';
const CHILD_CAT  = 'aaaa00000000000000000002';
const OTHER_CAT  = 'aaaa00000000000000000003';

/** Flat category list: CHILD_CAT belongs to PARENT_CAT */
const DB_CATEGORIES = [
  { _id: { toString: () => PARENT_CAT }, parentId: null },
  { _id: { toString: () => CHILD_CAT },  parentId: { toString: () => PARENT_CAT } },
  { _id: { toString: () => OTHER_CAT },  parentId: null },
];

function setupCategories(cats = DB_CATEGORIES) {
  mockCategoryFind.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(cats),
    }),
  } as never);
}

function setupUser(globalMarkupPercent?: number) {
  mockUserFindById.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(
        globalMarkupPercent !== undefined ? { globalMarkupPercent } : {},
      ),
    }),
  } as never);
}

function makeProduct(overrides: Partial<PricedProduct> & Record<string, unknown> = {}): PricedProduct {
  return {
    _id: 'prod1',
    title: 'Test Product',
    price: 150,
    purchasePrice: 100,
    categoryId: PARENT_CAT,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('applyUserPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCategories();
  });

  // ── Guest (no userId) ────────────────────────────────────────────────────

  describe('guest (no userId)', () => {
    it('returns base price unchanged', async () => {
      const product = makeProduct({ price: 150, purchasePrice: 100 });
      const [result] = await applyUserPricing([product]);
      expect(result.price).toBe(150);
    });

    it('strips purchasePrice from result', async () => {
      const product = makeProduct();
      const [result] = await applyUserPricing([product]);
      expect(result).not.toHaveProperty('purchasePrice');
    });

    it('returns empty array for empty input', async () => {
      const result = await applyUserPricing([]);
      expect(result).toEqual([]);
    });
  });

  // ── No markups set for user ──────────────────────────────────────────────

  describe('user with no markups configured', () => {
    beforeEach(() => {
      setupUser(undefined); // no globalMarkupPercent
      mockGetMarkupMap.mockResolvedValue(new Map());
    });

    it('falls back to base price when no markup configured', async () => {
      const product = makeProduct({ price: 200, purchasePrice: 100 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(200);
    });
  });

  // ── Global markup ────────────────────────────────────────────────────────

  describe('global markup', () => {
    beforeEach(() => {
      mockGetMarkupMap.mockResolvedValue(new Map());
    });

    it('applies global markup: price = purchasePrice * (1 + global/100)', async () => {
      setupUser(25);
      const product = makeProduct({ purchasePrice: 100 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(125);
    });

    it('applies global markup to multiple products independently', async () => {
      setupUser(20);
      const products = [
        makeProduct({ _id: 'p1', purchasePrice: 100 }),
        makeProduct({ _id: 'p2', purchasePrice: 200 }),
      ];
      const results = await applyUserPricing(products, 'user1');
      expect(results[0].price).toBe(120);
      expect(results[1].price).toBe(240);
    });

    it('rounds result to 2 decimal places', async () => {
      setupUser(10);
      const product = makeProduct({ purchasePrice: 33.33 });
      const [result] = await applyUserPricing([product], 'user1');
      // 33.33 * 1.10 = 36.663 → 36.66
      expect(result.price).toBe(36.66);
    });

    it('zero global markup: price equals purchasePrice', async () => {
      setupUser(0);
      const product = makeProduct({ purchasePrice: 100, price: 150 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(100);
    });
  });

  // ── Category-specific markup ─────────────────────────────────────────────

  describe('category-specific markup', () => {
    it('applies category markup instead of base price', async () => {
      setupUser(undefined);
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 30]]));

      const product = makeProduct({ purchasePrice: 100, categoryId: PARENT_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(130);
    });

    it('category markup overrides global markup', async () => {
      setupUser(10); // global = 10%
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 50]])); // category = 50%

      const product = makeProduct({ purchasePrice: 100, categoryId: PARENT_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      // Must use category markup (50%), not global (10%)
      expect(result.price).toBe(150);
    });

    it('zero category markup: price equals purchasePrice', async () => {
      setupUser(20);
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 0]]));

      const product = makeProduct({ purchasePrice: 100, categoryId: PARENT_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(100);
    });

    it('handles populated categoryId object { _id }', async () => {
      setupUser(undefined);
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 40]]));

      // categoryId comes as a populated object (e.g. from catalog/cart populate)
      const product = makeProduct({
        purchasePrice: 100,
        categoryId: { _id: PARENT_CAT, name: 'Electronics', slug: 'electronics' },
      });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(140);
    });
  });

  // ── Parent category markup inheritance ───────────────────────────────────

  describe('parent category markup inheritance', () => {
    it('subcategory product inherits parent category markup', async () => {
      setupUser(undefined);
      // Markup set for PARENT_CAT, product is in CHILD_CAT
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 25]]));

      const product = makeProduct({ purchasePrice: 100, categoryId: CHILD_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(125);
    });

    it('parent category markup overrides global markup', async () => {
      setupUser(5); // global = 5%
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 35]])); // parent = 35%

      const product = makeProduct({ purchasePrice: 100, categoryId: CHILD_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      // Must use parent markup (35%), not global (5%)
      expect(result.price).toBe(135);
    });

    it('direct category markup takes priority over parent markup', async () => {
      setupUser(undefined);
      mockGetMarkupMap.mockResolvedValue(new Map([
        [PARENT_CAT, 20], // parent = 20%
        [CHILD_CAT,  45], // direct = 45% → must win
      ]));

      const product = makeProduct({ purchasePrice: 100, categoryId: CHILD_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(145);
    });

    it('subcategory markup does NOT apply to root category product', async () => {
      setupUser(10); // global = 10%
      // Markup only for CHILD_CAT; product is in PARENT_CAT (root)
      mockGetMarkupMap.mockResolvedValue(new Map([[CHILD_CAT, 50]]));

      const product = makeProduct({ purchasePrice: 100, price: 999, categoryId: PARENT_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      // PARENT_CAT has no markup, its parent is null → falls back to global (10%)
      expect(result.price).toBe(110);
    });

    it('product with no category match falls back to global markup', async () => {
      setupUser(15);
      mockGetMarkupMap.mockResolvedValue(new Map()); // no category markups

      const product = makeProduct({ purchasePrice: 100, categoryId: OTHER_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(115);
    });
  });

  // ── Multiple products ────────────────────────────────────────────────────

  describe('multiple products with mixed markup sources', () => {
    it('prices each product by its own category markup', async () => {
      setupUser(10); // global fallback
      mockGetMarkupMap.mockResolvedValue(new Map([
        [PARENT_CAT, 30],
        [CHILD_CAT,  20],
      ]));

      const products = [
        makeProduct({ _id: 'p1', purchasePrice: 100, categoryId: PARENT_CAT }),
        makeProduct({ _id: 'p2', purchasePrice: 100, categoryId: CHILD_CAT }),
        makeProduct({ _id: 'p3', purchasePrice: 100, categoryId: OTHER_CAT }), // falls back to global
      ];

      const results = await applyUserPricing(products, 'user1');
      expect(results[0].price).toBe(130); // PARENT_CAT markup
      expect(results[1].price).toBe(120); // CHILD_CAT markup (direct, overrides parent's 30%)
      expect(results[2].price).toBe(110); // global 10%
    });

    it('strips purchasePrice from every product in the result', async () => {
      setupUser(20);
      mockGetMarkupMap.mockResolvedValue(new Map());

      const products = [
        makeProduct({ _id: 'p1' }),
        makeProduct({ _id: 'p2' }),
      ];
      const results = await applyUserPricing(products, 'user1');
      results.forEach((r) => expect(r).not.toHaveProperty('purchasePrice'));
    });

    it('preserves other product fields unchanged', async () => {
      setupUser(undefined);
      mockGetMarkupMap.mockResolvedValue(new Map([[PARENT_CAT, 20]]));

      const product = makeProduct({ _id: 'p1', title: 'Laptop', stock: 5 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result._id).toBe('p1');
      expect(result.title).toBe('Laptop');
      expect(result.stock).toBe(5);
    });
  });

  // ── Priority matrix summary ──────────────────────────────────────────────

  describe('markup priority: category > parent category > global > base price', () => {
    it('all four levels present: category markup wins', async () => {
      setupUser(5); // global = 5%
      mockGetMarkupMap.mockResolvedValue(new Map([
        [PARENT_CAT, 15], // parent category = 15%
        [CHILD_CAT,  40], // direct category = 40% → must win
      ]));

      const product = makeProduct({ purchasePrice: 100, categoryId: CHILD_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(140);
    });

    it('parent + global, no direct: parent markup wins', async () => {
      setupUser(5); // global = 5%
      mockGetMarkupMap.mockResolvedValue(new Map([
        [PARENT_CAT, 25], // parent = 25% → must win over global
      ]));

      const product = makeProduct({ purchasePrice: 100, categoryId: CHILD_CAT });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(125);
    });

    it('global only, no category: global markup wins over base price', async () => {
      setupUser(20); // global = 20%
      mockGetMarkupMap.mockResolvedValue(new Map());

      const product = makeProduct({ purchasePrice: 100, price: 999 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(120);
    });

    it('nothing configured: base price is preserved as-is', async () => {
      setupUser(undefined);
      mockGetMarkupMap.mockResolvedValue(new Map());

      const product = makeProduct({ purchasePrice: 100, price: 999 });
      const [result] = await applyUserPricing([product], 'user1');
      expect(result.price).toBe(999);
    });
  });
});
