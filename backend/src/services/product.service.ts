import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { AppError } from '../middlewares/errorHandler';
import { getDescendantIds } from './category.service';
import { getMarkupMap } from './userMarkup.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/upload';

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type RawProduct = Record<string, unknown> & {
  purchasePrice: number;
  price: number;
  categoryId: { _id: unknown } | unknown;
};

async function applyUserPricing(products: RawProduct[], userId?: string): Promise<Record<string, unknown>[]> {
  // Build parentId lookup for category inheritance
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { purchasePrice, ...rest } = product;
    return { ...rest, price };
  });
}

export async function getAll(filters: ProductFilters, userId?: string) {
  const { category, brand, search, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = { isActive: true };

  if (category) {
    const ids = await getDescendantIds(category);
    query.categoryId = { $in: ids };
  }
  if (brand) query.brandId = brand;
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [rawItems, total] = await Promise.all([
    Product.find(query)
      .select('+purchasePrice')
      .populate('categoryId', 'name slug')
      .populate('brandId', 'name slug')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as Promise<RawProduct[]>,
    Product.countDocuments(query),
  ]);

  const items = await applyUserPricing(rawItems, userId);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getById(id: string, userId?: string) {
  const raw = await Product.findOne({ _id: id, isActive: true })
    .select('+purchasePrice')
    .populate('categoryId', 'name slug')
    .populate('brandId', 'name slug')
    .lean() as RawProduct | null;

  if (!raw) throw new AppError('Product not found', 404);

  const [priced] = await applyUserPricing([raw], userId);
  return priced;
}

export interface ProductCreateData {
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  categoryId: string;
  brandId: string;
  stock: number;
  isActive?: boolean;
}

export async function create(data: ProductCreateData) {
  return Product.create(data);
}

export async function update(id: string, data: Partial<ProductCreateData>) {
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

export async function remove(id: string) {
  const product = await Product.findById(id).select('+purchasePrice');
  if (!product) throw new AppError('Product not found', 404);

  await Promise.all(product.images.map((img) => deleteFromCloudinary(img.publicId)));
  await product.deleteOne();
}

export async function addImages(id: string, files: Express.Multer.File[]) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  const uploaded = await Promise.all(
    files.map((f) => uploadToCloudinary(f.buffer, `catalog-shop/products/${id}`)),
  );

  product.images.push(...uploaded);
  await product.save();
  return product.images;
}

export async function removeImage(id: string, publicId: string) {
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  const imageIndex = product.images.findIndex((img) => img.publicId === publicId);
  if (imageIndex === -1) throw new AppError('Image not found', 404);

  await deleteFromCloudinary(publicId);
  product.images.splice(imageIndex, 1);
  await product.save();
}

// Admin: returns product with purchasePrice
export async function getByIdAdmin(id: string) {
  const product = await Product.findById(id)
    .select('+purchasePrice')
    .populate('categoryId', 'name slug')
    .populate('brandId', 'name slug')
    .lean();
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

export async function getAllAdmin(filters: ProductFilters) {
  const { category, brand, search, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = {};

  if (category) {
    const ids = await getDescendantIds(category);
    query.categoryId = { $in: ids };
  }
  if (brand) query.brandId = brand;
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(query)
      .select('+purchasePrice')
      .populate('categoryId', 'name slug')
      .populate('brandId', 'name slug')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
