import { Category } from '../models/Category';
import { User } from '../models/User';
import { getMarkupMap } from '../services/userMarkup.service';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type PricedProduct = Record<string, unknown> & {
  purchasePrice: number;
  price: number;
  categoryId: { _id: unknown } | unknown;
};

export async function applyUserPricing(products: PricedProduct[], userId?: string): Promise<Record<string, unknown>[]> {
  const categories = await Category.find({}).select('_id parentId').lean();
  const parentMap = new Map<string, string | null>();
  for (const c of categories) {
    parentMap.set(c._id.toString(), c.parentId?.toString() ?? null);
  }

  let markupMap = new Map<string, number>();
  let globalMarkup: number | undefined;

  if (userId) {
    const [map, user] = await Promise.all([
      getMarkupMap(userId),
      User.findById(userId).select('globalMarkupPercent').lean(),
    ]);
    markupMap = map;
    globalMarkup = user?.globalMarkupPercent;
  }

  return products.map((product) => {
    const catId =
      product.categoryId && typeof product.categoryId === 'object' && '_id' in (product.categoryId as object)
        ? String((product.categoryId as { _id: unknown })._id)
        : String(product.categoryId);

    const parentId = parentMap.get(catId) ?? null;

    let price = product.price;

    if (markupMap.has(catId)) {
      price = round2(product.purchasePrice * (1 + markupMap.get(catId)! / 100));
    } else if (parentId && markupMap.has(parentId)) {
      price = round2(product.purchasePrice * (1 + markupMap.get(parentId)! / 100));
    } else if (globalMarkup !== undefined) {
      price = round2(product.purchasePrice * (1 + globalMarkup / 100));
    }

    const { purchasePrice, ...rest } = product;
    void purchasePrice;
    return { ...rest, price };
  });
}
