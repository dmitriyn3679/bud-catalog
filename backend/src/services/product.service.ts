import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';
import { getDescendantIds } from './category.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/upload';
import { applyUserPricing, type PricedProduct } from '../utils/pricing';

export type SortOption = 'recommended' | 'price_asc' | 'price_desc';

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

function buildSort(sort: SortOption | undefined, hasSearch: boolean): Record<string, unknown> {
  if (hasSearch) return { score: { $meta: 'textScore' } };
  switch (sort) {
    case 'price_asc':  return { price: 1 };
    case 'price_desc': return { price: -1 };
    case 'recommended':
    default:           return { isPromo: -1, createdAt: -1 };
  }
}

export async function getAll(filters: ProductFilters, userId?: string) {
  const { category, brand, search, sort, page = 1, limit = 20 } = filters;
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
      .sort(buildSort(sort, !!search))
      .skip(skip)
      .limit(limit)
      .lean() as Promise<PricedProduct[]>,
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
    .lean() as PricedProduct | null;

  if (!raw) throw new AppError('Product not found', 404);

  const [priced] = await applyUserPricing([raw], userId);
  return priced;
}

export interface ProductCreateData {
  sku?: string;
  title: string;
  description: string;
  price: number;
  purchasePrice: number;
  categoryId: string;
  brandId: string;
  stock: number;
  isActive?: boolean;
  isPromo?: boolean;
  unlimitedStock?: boolean;
  hidePrice?: boolean;
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

export interface BulkUpdateData {
  markupPercent?: number;
  isActive?: boolean;
  isPromo?: boolean;
  hidePrice?: boolean;
  unlimitedStock?: boolean;
}

export async function bulkUpdate(ids: string[], updates: BulkUpdateData) {
  if (!ids.length) return;
  const { markupPercent, ...boolFields } = updates;
  const ops: Promise<unknown>[] = [];

  if (Object.keys(boolFields).length) {
    ops.push(Product.updateMany({ _id: { $in: ids } }, { $set: boolFields }));
  }

  if (markupPercent !== undefined) {
    const factor = 1 + markupPercent / 100;
    ops.push(
      Product.updateMany(
        { _id: { $in: ids } },
        [{ $set: { price: { $round: [{ $multiply: ['$purchasePrice', factor] }, 2] } } }],
      ),
    );
  }

  await Promise.all(ops);
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
      .sort(search ? { score: { $meta: 'textScore' } } : { isPromo: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
