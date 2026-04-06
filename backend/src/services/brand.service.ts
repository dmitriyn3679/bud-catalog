import { Brand } from '../models/Brand';
import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';

export async function getAll() {
  return Brand.find().sort({ name: 1 }).lean();
}

export async function create(data: { name: string; slug: string }) {
  const existing = await Brand.findOne({ slug: data.slug });
  if (existing) throw new AppError('Slug already in use', 409);
  return Brand.create(data);
}

export async function update(id: string, data: { name?: string; slug?: string }) {
  if (data.slug) {
    const existing = await Brand.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existing) throw new AppError('Slug already in use', 409);
  }
  const brand = await Brand.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!brand) throw new AppError('Brand not found', 404);
  return brand;
}

export async function remove(id: string) {
  const inUse = await Product.exists({ brandId: id });
  if (inUse) throw new AppError('Cannot delete brand with existing products', 400);
  const brand = await Brand.findByIdAndDelete(id);
  if (!brand) throw new AppError('Brand not found', 404);
}
