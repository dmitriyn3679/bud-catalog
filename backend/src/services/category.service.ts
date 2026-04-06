import { Types } from 'mongoose';
import { Category, ICategory } from '../models/Category';
import { Product } from '../models/Product';
import { AppError } from '../middlewares/errorHandler';

type CategoryWithChildren = Omit<ICategory, keyof Document> & {
  _id: Types.ObjectId;
  children: CategoryWithChildren[];
};

export async function getTree() {
  const all = await Category.find().lean<CategoryWithChildren[]>();

  const map = new Map<string, CategoryWithChildren>();
  for (const cat of all) {
    map.set(cat._id.toString(), { ...cat, children: [] });
  }

  const roots: CategoryWithChildren[] = [];
  for (const cat of map.values()) {
    if (!cat.parentId) {
      roots.push(cat);
    } else {
      const parent = map.get(cat.parentId.toString());
      if (parent) parent.children.push(cat);
    }
  }
  return roots;
}

export async function getDescendantIds(categoryId: string): Promise<string[]> {
  const children = await Category.find({ parentId: categoryId }).lean();
  return [categoryId, ...children.map((c) => c._id.toString())];
}

export async function create(data: { name: string; slug: string; parentId?: string | null }) {
  const existing = await Category.findOne({ slug: data.slug });
  if (existing) throw new AppError('Slug already in use', 409);

  if (data.parentId) {
    const parent = await Category.findById(data.parentId);
    if (!parent) throw new AppError('Parent category not found', 404);
    if (parent.parentId) throw new AppError('Only one level of nesting allowed', 400);
  }

  return Category.create(data);
}

export async function update(id: string, data: { name?: string; slug?: string; parentId?: string | null }) {
  if (data.slug) {
    const existing = await Category.findOne({ slug: data.slug, _id: { $ne: id } });
    if (existing) throw new AppError('Slug already in use', 409);
  }
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  return category;
}

export async function remove(id: string) {
  const hasChildren = await Category.exists({ parentId: id });
  if (hasChildren) throw new AppError('Cannot delete category with subcategories', 400);

  const hasProducts = await Product.exists({ categoryId: id });
  if (hasProducts) throw new AppError('Cannot delete category with existing products', 400);

  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new AppError('Category not found', 404);
}
