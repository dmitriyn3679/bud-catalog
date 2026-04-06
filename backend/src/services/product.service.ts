import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';
import { getDescendantIds } from './category.service';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/upload';

export interface ProductFilters {
  category?: string;
  brand?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getAll(filters: ProductFilters) {
  const { category, brand, search, page = 1, limit = 20 } = filters;
  const query: Record<string, unknown> = { isActive: true };

  if (category) {
    const ids = await getDescendantIds(category);
    query.categoryId = { $in: ids };
  }
  if (brand) query.brandId = brand;
  if (search) query.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(query)
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

export async function getById(id: string) {
  const product = await Product.findOne({ _id: id, isActive: true })
    .populate('categoryId', 'name slug')
    .populate('brandId', 'name slug')
    .lean();
  if (!product) throw new AppError('Product not found', 404);
  return product;
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
